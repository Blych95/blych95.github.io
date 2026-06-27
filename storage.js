/* ============================================================
   BlychLife · storage.js
   Capa de datos: persistencia en localStorage, modelo y cálculos.
   ============================================================ */

const STORAGE_KEY = "blychlife_data_v1";

/* Áreas de Vida por defecto (las categorías madre) */
const DEFAULT_AREAS = [
  { id: "a_salud",    name: "Salud / Físico",            color: "#22B8A6" },
  { id: "a_prof",     name: "Profesional / Estudios",    color: "#3B82F6" },
  { id: "a_fin",      name: "Finanzas",                  color: "#F59E0B" },
  { id: "a_mental",   name: "Desarrollo Mental / Emocional", color: "#A855F7" },
];

/* Estructura vacía */
function emptyDB() {
  return {
    areas: DEFAULT_AREAS.map((a) => ({ ...a })),
    objetivos: [],
    metas: [],
    tareas: [],
    habitos: [],
    moods: [],
    reflexiones: [],
    notas: [],
    meta: { createdAt: new Date().toISOString() },
  };
}

let DB = emptyDB();

/* ---------- Persistencia ---------- */
function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      DB = emptyDB();
      saveDB();
      return DB;
    }
    const parsed = JSON.parse(raw);
    // Mezcla defensiva por si faltan claves nuevas
    DB = Object.assign(emptyDB(), parsed);
    migrateDB();
    return DB;
  } catch (e) {
    console.error("No se pudieron leer los datos, se reinicia.", e);
    DB = emptyDB();
    return DB;
  }
}

function saveDB() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
  } catch (e) {
    console.error("No se pudieron guardar los datos.", e);
    alert("No se pudieron guardar los cambios. Revisa el espacio del navegador.");
  }
}

/* ---------- Exportar / Importar (respaldo) ---------- */
function exportDB() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `blychlife-respaldo-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importDB(jsonText) {
  const parsed = JSON.parse(jsonText);
  DB = Object.assign(emptyDB(), parsed);
  migrateDB();
  saveDB();
}

/* Asegura que los datos viejos tengan los campos nuevos */
function migrateDB() {
  if (!Array.isArray(DB.notas)) DB.notas = [];
  // Varios registros de ánimo por día: cada uno con id y hora
  DB.moods = (DB.moods || []).map((m) => ({
    id: m.id || uid("mood"),
    time: m.time || "",
    note: m.note || "",
    ...m,
  }));
  // Tareas: campo de fecha de completado
  DB.tareas = (DB.tareas || []).map((t) => ({ completedAt: t.completedAt || (t.done ? (t.createdAt || null) : null), ...t }));
}

/* ============================================================
   CÁLCULOS DE PROGRESO
   Jerarquía:  Área  >  Objetivo  >  Meta  >  Tarea
   El progreso fluye hacia arriba.
   ============================================================ */

/* Progreso de una tarea (0–100) */
function taskProgress(t) {
  if (t.done) return 100;
  return clamp(Number(t.progress) || 0, 0, 100);
}

/* Progreso de una meta: promedio de sus tareas, o su valor manual */
function metaProgress(metaId) {
  const tasks = DB.tareas.filter((t) => t.metaId === metaId);
  if (tasks.length === 0) {
    const m = DB.metas.find((x) => x.id === metaId);
    return clamp(Number(m && m.progress) || 0, 0, 100);
  }
  const sum = tasks.reduce((acc, t) => acc + taskProgress(t), 0);
  return Math.round(sum / tasks.length);
}

/* Progreso de un objetivo: promedio del progreso de sus metas */
function objetivoProgress(objId) {
  const metas = DB.metas.filter((m) => m.objetivoId === objId);
  if (metas.length === 0) return 0;
  const sum = metas.reduce((acc, m) => acc + metaProgress(m.id), 0);
  return Math.round(sum / metas.length);
}

/* ============================================================
   MATRIZ DE EISENHOWER (automática)
   ============================================================ */
const QUADRANTS = {
  q1: { key: "q1", title: "Urgente e Importante", action: "Hazlo ya",            color: "#DC2626" },
  q2: { key: "q2", title: "Importante, no urgente", action: "Prográmalo (aquí nacen las metas)", color: "#2563EB" },
  q3: { key: "q3", title: "Urgente, no importante", action: "Delega o simplifica", color: "#D97706" },
  q4: { key: "q4", title: "Ni urgente ni importante", action: "Elimina o déjalo para el ocio", color: "#64748B" },
};

function quadrantOf(task) {
  if (task.urgent && task.important) return "q1";
  if (!task.urgent && task.important) return "q2";
  if (task.urgent && !task.important) return "q3";
  return "q4";
}

/* "Carga cognitiva alta" = tareas importantes (Q1 y Q2). Se usa para
   el modo de baja energía. */
function isHighCognitive(task) {
  return !!task.important;
}

/* ============================================================
   HÁBITOS · rachas (streaks)
   ============================================================ */

/* ¿El hábito está hecho en una fecha (YYYY-MM-DD)? */
function habitDoneOn(habit, dateStr) {
  return !!(habit.history && habit.history[dateStr]);
}

/* Racha de un hábito diario: días consecutivos hechos terminando hoy o ayer */
function dailyStreak(habit) {
  let streak = 0;
  let d = new Date();
  // Si hoy no está hecho, empezamos a contar desde ayer (sin romper la racha aún)
  if (!habitDoneOn(habit, ymd(d))) d = addDays(d, -1);
  while (habitDoneOn(habit, ymd(d))) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

/* Racha de un hábito semanal: semanas consecutivas con al menos un registro */
function weeklyStreak(habit) {
  const weeks = new Set();
  Object.keys(habit.history || {}).forEach((dateStr) => {
    if (habit.history[dateStr]) weeks.add(isoWeekKey(new Date(dateStr)));
  });
  let streak = 0;
  let cursor = new Date();
  if (!weeks.has(isoWeekKey(cursor))) cursor = addDays(cursor, -7);
  while (weeks.has(isoWeekKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

function habitStreak(habit) {
  return habit.frequency === "semanal" ? weeklyStreak(habit) : dailyStreak(habit);
}

/* Mejor racha histórica (recorre el historial) */
function habitBestStreak(habit) {
  const dates = Object.keys(habit.history || {})
    .filter((d) => habit.history[d])
    .sort();
  if (dates.length === 0) return 0;
  if (habit.frequency === "semanal") {
    const weeks = [...new Set(dates.map((d) => isoWeekKey(new Date(d))))].sort();
    return longestConsecutive(weeks.map(weekKeyToOrdinal));
  }
  return longestConsecutive(dates.map((d) => Math.floor(new Date(d).getTime() / 86400000)));
}

function longestConsecutive(ordinals) {
  if (ordinals.length === 0) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < ordinals.length; i++) {
    if (ordinals[i] === ordinals[i - 1] + 1) cur++;
    else if (ordinals[i] !== ordinals[i - 1]) cur = 1;
    best = Math.max(best, cur);
  }
  return best;
}

/* ============================================================
   REGISTROS POR DÍA (ánimo, notas, hábitos, tareas)
   ============================================================ */

/* Todos los registros de ánimo/energía de un día, ordenados por hora */
function moodsOn(dateStr) {
  return DB.moods
    .filter((m) => m.date === dateStr)
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
}

/* Último registro de ánimo de un día (para el dashboard) */
function latestMoodOn(dateStr) {
  const list = moodsOn(dateStr);
  return list.length ? list[list.length - 1] : null;
}

function notesOn(dateStr) {
  return DB.notas
    .filter((n) => n.date === dateStr)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
}

function reflexionOn(dateStr) {
  return DB.reflexiones.find((r) => r.date === dateStr) || null;
}

function habitsDoneOn(dateStr) {
  return DB.habitos.filter((h) => habitDoneOn(h, dateStr));
}

function tasksCompletedOn(dateStr) {
  return DB.tareas.filter((t) => t.done && t.completedAt && ymd(t.completedAt) === dateStr);
}

/* ============================================================
   PRODUCTIVIDAD
   Mezcla hábitos, tareas, reflexión y registro de ánimo.
   Devuelve 0–100.
   ============================================================ */
function dailyProductivity(dateStr) {
  const dailyHabits = DB.habitos.filter((h) => h.frequency !== "semanal");
  let score = 0, weight = 0;

  if (dailyHabits.length) {
    const done = dailyHabits.filter((h) => habitDoneOn(h, dateStr)).length;
    score += (done / dailyHabits.length) * 0.4; weight += 0.4;
  }
  // Tareas: 3 o más completadas en el día = puntuación llena
  const tDone = tasksCompletedOn(dateStr).length;
  score += Math.min(1, tDone / 3) * 0.3; weight += 0.3;
  // Reflexión escrita
  score += (reflexionOn(dateStr) ? 1 : 0) * 0.15; weight += 0.15;
  // Ánimo registrado
  score += (moodsOn(dateStr).length ? 1 : 0) * 0.15; weight += 0.15;

  return weight ? Math.round((score / weight) * 100) : 0;
}

/* Productividad de la semana que contiene a dateStr (lun–dom).
   Solo promedia días hasta hoy (no penaliza el futuro). */
function weeklyProductivity(dateStr) {
  const days = weekDates(dateStr);
  const today = todayYMD();
  const past = days.filter((d) => d <= today);
  const useDays = past.length ? past : days;
  const sum = useDays.reduce((a, d) => a + dailyProductivity(d), 0);
  return Math.round(sum / useDays.length);
}

/* ¿Está completa una meta / objetivo? */
function metaIsComplete(metaId) { return metaProgress(metaId) === 100; }
function objetivoIsComplete(objId) {
  const metas = DB.metas.filter((m) => m.objetivoId === objId);
  return metas.length > 0 && objetivoProgress(objId) === 100;
}

/* ============================================================
   FECHAS DE LOGRO (para el calendario)
   ============================================================ */

/* Día (YYYY-MM-DD) en que se completó una meta, o null.
   Usa completedAt si existe; si no, deriva de la última tarea completada. */
function metaCompletedDate(m) {
  if (!metaIsComplete(m.id)) return null;
  if (m.completedAt) return ymd(m.completedAt);
  const tasks = DB.tareas.filter((t) => t.metaId === m.id && t.completedAt);
  if (tasks.length) {
    const last = tasks.map((t) => t.completedAt).sort().slice(-1)[0];
    return ymd(last);
  }
  return null;
}

/* Día en que se completó un objetivo, o null. */
function objetivoCompletedDate(o) {
  if (!objetivoIsComplete(o.id)) return null;
  if (o.completedAt) return ymd(o.completedAt);
  const metas = DB.metas.filter((m) => m.objetivoId === o.id);
  const dates = metas.map(metaCompletedDate).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}

/* Logros (tareas, metas, objetivos) completados un día concreto */
function achievementsOn(dateStr) {
  return {
    tasks: tasksCompletedOn(dateStr),
    metas: DB.metas.filter((m) => metaCompletedDate(m) === dateStr),
    objetivos: DB.objetivos.filter((o) => objetivoCompletedDate(o) === dateStr),
  };
}

/* Vencimientos (fechas de plazo) de un día concreto */
function deadlinesOn(dateStr) {
  return {
    tasks: DB.tareas.filter((t) => !t.done && t.dueDate === dateStr),
    metas: DB.metas.filter((m) => !metaIsComplete(m.id) && m.targetDate === dateStr),
    objetivos: DB.objetivos.filter((o) => !objetivoIsComplete(o.id) && o.targetDate === dateStr),
  };
}

function hasAchievementsOn(dateStr) {
  const a = achievementsOn(dateStr);
  return a.tasks.length + a.metas.length + a.objetivos.length > 0;
}
function hasDeadlinesOn(dateStr) {
  const d = deadlinesOn(dateStr);
  return d.tasks.length + d.metas.length + d.objetivos.length > 0;
}

/* ============================================================
   PROMEDIOS DE ÁNIMO Y ENERGÍA
   ============================================================ */
const MOOD_ORDER = ["mal", "bajo", "neutral", "bien", "genial"];   // 1..5
const ENERGY_ORDER = ["baja", "media", "alta"];                    // 1..3
function moodScore(k) { const i = MOOD_ORDER.indexOf(k); return i < 0 ? null : i + 1; }
function energyScore(k) { const i = ENERGY_ORDER.indexOf(k); return i < 0 ? null : i + 1; }
function moodKeyFromScore(s) { return MOOD_ORDER[clamp(Math.round(s), 1, 5) - 1]; }
function energyKeyFromScore(s) { return ENERGY_ORDER[clamp(Math.round(s), 1, 3) - 1]; }

/* Promedio de ánimo/energía sobre una lista de fechas */
function moodAverageOver(dates) {
  const set = new Set(dates);
  const regs = DB.moods.filter((m) => set.has(m.date));
  if (!regs.length) return null;
  let ms = 0, mc = 0, es = 0, ec = 0;
  regs.forEach((r) => {
    const a = moodScore(r.mood); if (a) { ms += a; mc++; }
    const b = energyScore(r.energy); if (b) { es += b; ec++; }
  });
  return {
    count: regs.length,
    moodScore: mc ? ms / mc : null,
    energyScore: ec ? es / ec : null,
    moodKey: mc ? moodKeyFromScore(ms / mc) : null,
    energyKey: ec ? energyKeyFromScore(es / ec) : null,
  };
}
function weekMoodAverage(dateStr) { return moodAverageOver(weekDates(dateStr)); }
function monthMoodAverage(year, month) {
  const days = new Date(year, month + 1, 0).getDate();
  const dates = [];
  for (let d = 1; d <= days; d++) dates.push(ymd(new Date(year, month, d)));
  return moodAverageOver(dates);
}
