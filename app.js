/* ============================================================
   BlychLife · app.js
   Controlador: navegación, render, modales y acciones (CRUD).
   ============================================================ */

const VIEWS = {
  dashboard: { label: "Inicio", icon: "🏠", render: renderDashboard },
  objetivos: { label: "Objetivos y metas", icon: "🎯", render: renderObjetivos },
  tareas:    { label: "Tareas (Eisenhower)", icon: "🗂️", render: renderTareas },
  habitos:   { label: "Hábitos", icon: "🔁", render: renderHabitos },
  areas:     { label: "Áreas de Vida", icon: "🧭", render: renderAreas },
  calendario:{ label: "Calendario", icon: "🗓️", render: renderCalendario },
  mood:      { label: "Ánimo y energía", icon: "⚡", render: renderMood },
  reflexion: { label: "Reflexión", icon: "📓", render: renderReflexion },
};

let moodDraft = { mood: null, energy: null };

/* ---------- Render principal ---------- */
function render() {
  const content = document.getElementById("content");
  const v = VIEWS[AppState.view] || VIEWS.dashboard;
  content.innerHTML = v.render();
  // Navegación activa (lateral + barra inferior)
  document.querySelectorAll(".nav-item, .tab-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === AppState.view);
  });
  // Reiniciar borrador de ánimo al entrar (ahora se añaden varios registros)
  if (AppState.view === "mood") {
    moodDraft = { mood: null, energy: null };
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

function go(view) {
  AppState.view = view;
  AppState.metaId = null;
  render();
}

/* ============================================================
   MODAL / FORMULARIOS
   ============================================================ */
function openModal(title, bodyHtml, onSubmit) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2>${esc(title)}</h2>
        <button class="icon-btn" id="modal-close" aria-label="Cerrar">✕</button>
      </div>
      <form id="modal-form" class="modal-body">${bodyHtml}
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" id="modal-cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => closeModal();
  overlay.querySelector("#modal-close").onclick = close;
  overlay.querySelector("#modal-cancel").onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  overlay.querySelector("#modal-form").onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    onSubmit(data);
    closeModal();
  };
  const first = overlay.querySelector("input, textarea, select");
  if (first) first.focus();
}
function closeModal() {
  const m = document.getElementById("modal-overlay");
  if (m) m.remove();
}

/* Campos reutilizables */
function fText(name, label, value = "", required = true) {
  return `<label class="field"><span>${label}</span>
    <input type="text" name="${name}" value="${esc(value)}" ${required ? "required" : ""}></label>`;
}
function fArea(value) {
  return `<label class="field"><span>Área de Vida</span>
    <select name="areaId">${areaOptions(value)}</select></label>`;
}
function fTextarea(name, label, value = "") {
  return `<label class="field"><span>${label}</span>
    <textarea name="${name}" rows="3">${esc(value)}</textarea></label>`;
}
function fDate(name, label, value = "") {
  return `<label class="field"><span>${label}</span>
    <input type="date" name="${name}" value="${esc(value)}"></label>`;
}
function fNumber(name, label, value = "") {
  return `<label class="field"><span>${label}</span>
    <input type="number" min="0" name="${name}" value="${esc(value)}"></label>`;
}
function fBool(name, label, checked) {
  return `<label class="switch-field">
    <input type="checkbox" name="${name}" ${checked ? "checked" : ""}>
    <span class="switch"></span><span class="switch-label">${label}</span></label>`;
}

/* Selector de color del bloque + degradado opcional */
const BLOCK_PALETTE = ["#2F6BFF", "#22B8A6", "#F59E0B", "#A855F7", "#EC4899", "#10B981", "#EF4444", "#6366F1", "#0EA5E9", "#475569"];
function fColorGradient(color, color2, useGrad) {
  const swatches = (name, sel) => BLOCK_PALETTE.map((c) =>
    `<label class="color-pick"><input type="radio" name="${name}" value="${c}" ${sel === c ? "checked" : ""}>
      <span style="background:${c}"></span></label>`).join("");
  return `
    <label class="field"><span>Color del bloque</span>
      <div class="color-row">${swatches("color", color || BLOCK_PALETTE[0])}</div></label>
    ${fBool("useGrad", "Usar degradado", !!useGrad)}
    <label class="field"><span>Segundo color (si usas degradado)</span>
      <div class="color-row">${swatches("color2", color2 || BLOCK_PALETTE[1])}</div></label>`;
}

/* ---------- Formularios concretos ---------- */
function formObjetivo(o) {
  const isEdit = !!o;
  openModal(isEdit ? "Editar objetivo" : "Nuevo objetivo",
    fText("title", "Título del objetivo", o ? o.title : "") +
    fArea(o ? o.areaId : DB.areas[0] && DB.areas[0].id) +
    fTextarea("description", "Descripción (opcional)", o ? o.description : "") +
    fDate("targetDate", "Fecha objetivo (opcional)", o ? o.targetDate : "") +
    fColorGradient(o && o.color, o && o.color2, o && o.useGrad),
    (d) => {
      d.useGrad = !!d.useGrad;
      if (isEdit) {
        Object.assign(o, d);
      } else {
        DB.objetivos.push({ id: uid("obj"), createdAt: new Date().toISOString(), ...d });
      }
      saveDB(); render();
    });
}

function formMeta(m, objetivoId) {
  const isEdit = !!m;
  const objOptions = `<label class="field"><span>Objetivo (opcional)</span>
    <select name="objetivoId">
      <option value="">— Sin objetivo —</option>
      ${DB.objetivos.map((o) => `<option value="${o.id}" ${((m && m.objetivoId) || objetivoId) === o.id ? "selected" : ""}>${esc(o.title)}</option>`).join("")}
    </select></label>`;
  openModal(isEdit ? "Editar meta" : "Nueva meta",
    fText("title", "Título de la meta", m ? m.title : "") +
    objOptions +
    fArea(m ? m.areaId : DB.areas[0] && DB.areas[0].id) +
    fTextarea("description", "Descripción (opcional)", m ? m.description : "") +
    fDate("targetDate", "Fecha objetivo (opcional)", m ? m.targetDate : "") +
    fColorGradient(m && m.color, m && m.color2, m && m.useGrad),
    (d) => {
      d.useGrad = !!d.useGrad;
      if (isEdit) {
        Object.assign(m, d);
      } else {
        DB.metas.push({ id: uid("meta"), createdAt: new Date().toISOString(), progress: 0, ...d });
      }
      saveDB(); render();
    });
}

function formTask(t, metaId) {
  const isEdit = !!t;
  const metaOptions = `<label class="field"><span>Meta asociada (opcional)</span>
    <select name="metaId">
      <option value="">— Sin meta —</option>
      ${DB.metas.map((m) => `<option value="${m.id}" ${((t && t.metaId) || metaId) === m.id ? "selected" : ""}>${esc(m.title)}</option>`).join("")}
    </select></label>`;
  openModal(isEdit ? "Editar tarea" : "Nueva tarea",
    fText("title", "¿Qué hay que hacer?", t ? t.title : "") +
    metaOptions +
    fArea(t ? t.areaId : "") +
    `<div class="eisenhower-q">
      ${fBool("urgent", "¿Es urgente?", t ? t.urgent : false)}
      ${fBool("important", "¿Es importante para mis metas?", t ? t.important : false)}
      <p class="hint">BlychLife clasificará la tarea automáticamente en la matriz.</p>
     </div>` +
    fDate("dueDate", "Fecha límite (opcional)", t ? t.dueDate : "") +
    fNumber("estMinutes", "Tiempo estimado en minutos (opcional)", t ? t.estMinutes : ""),
    (d) => {
      d.urgent = !!d.urgent;
      d.important = !!d.important;
      if (isEdit) {
        Object.assign(t, d);
      } else {
        DB.tareas.push({
          id: uid("task"), createdAt: new Date().toISOString(),
          done: false, progress: 0, ...d,
        });
      }
      saveDB(); render();
    });
}

function formHabit() {
  openModal("Nuevo hábito",
    fText("name", "Nombre del hábito", "") +
    fArea(DB.areas[0] && DB.areas[0].id) +
    `<label class="field"><span>Frecuencia</span>
      <select name="frequency"><option value="diario">Diario</option><option value="semanal">Semanal</option></select></label>`,
    (d) => {
      DB.habitos.push({ id: uid("hab"), createdAt: new Date().toISOString(), history: {}, lastCelebrated: 0, ...d });
      saveDB(); render();
    });
}

function formArea(a) {
  const palette = ["#22B8A6", "#3B82F6", "#F59E0B", "#A855F7", "#EC4899", "#10B981", "#EF4444", "#6366F1"];
  const swatches = palette.map((c) =>
    `<label class="color-pick"><input type="radio" name="color" value="${c}" ${((a && a.color) || palette[0]) === c ? "checked" : ""}>
      <span style="background:${c}"></span></label>`).join("");
  openModal(a ? "Editar área" : "Nueva Área de Vida",
    fText("name", "Nombre del área", a ? a.name : "") +
    `<label class="field"><span>Color</span><div class="color-row">${swatches}</div></label>`,
    (d) => {
      if (a) Object.assign(a, d);
      else DB.areas.push({ id: uid("area"), ...d });
      saveDB(); render();
    });
}

/* ============================================================
   ACCIONES (toggles, borrados, celebraciones)
   ============================================================ */
function toggleHabit(id) {
  const h = DB.habitos.find((x) => x.id === id);
  if (!h) return;
  const today = todayYMD();
  h.history = h.history || {};
  if (h.history[today]) delete h.history[today];
  else h.history[today] = true;

  // Celebración al completar una semana (racha múltiplo de 7 en diarios, o nueva semana en semanales)
  const streak = habitStreak(h);
  const milestone = h.frequency === "semanal" ? streak : Math.floor(streak / 7);
  if (h.history[today] && milestone > 0 && milestone > (h.lastCelebrated || 0)) {
    h.lastCelebrated = milestone;
    const txt = h.frequency === "semanal"
      ? `¡${streak} semana(s) seguidas con "${h.name}"! No rompas la cadena.`
      : `¡Una semana completa de "${h.name}"! Racha de ${streak} días. 🔥`;
    saveDB();
    celebrate(txt);
  } else {
    if (h.history[today] === undefined && (h.lastCelebrated || 0) > milestone) {
      h.lastCelebrated = milestone; // permite volver a celebrar si rehace la racha
    }
    saveDB();
  }
  render();
}

function toggleTask(id) {
  const t = DB.tareas.find((x) => x.id === id);
  if (!t) return;
  const meta = t.metaId ? DB.metas.find((m) => m.id === t.metaId) : null;
  const obj = meta && meta.objetivoId ? DB.objetivos.find((o) => o.id === meta.objetivoId) : null;
  const prevMeta = meta ? metaIsComplete(meta.id) : false;
  const prevObj = obj ? objetivoIsComplete(obj.id) : false;

  t.done = !t.done;
  if (t.done) { t.progress = 100; t.completedAt = new Date().toISOString(); }
  else { t.completedAt = null; if (t.progress === 100) t.progress = 0; }

  // Registrar (o limpiar) la fecha de logro de la meta y el objetivo
  const nowISO = new Date().toISOString();
  if (meta) {
    const mc = metaIsComplete(meta.id);
    if (mc && !prevMeta) meta.completedAt = nowISO;
    else if (!mc && prevMeta) meta.completedAt = null;
  }
  if (obj) {
    const oc = objetivoIsComplete(obj.id);
    if (oc && !prevObj) obj.completedAt = nowISO;
    else if (!oc && prevObj) obj.completedAt = null;
  }
  saveDB();
  render();

  if (t.done) {
    const objNow = obj ? objetivoIsComplete(obj.id) : false;
    const metaNow = meta ? metaIsComplete(meta.id) : false;
    if (obj && objNow && !prevObj) {
      fireworks({ big: true });
      toast(`🏆 ¡Objetivo cumplido: ${esc(obj.title)}!`, "success");
    } else if (meta && metaNow && !prevMeta) {
      fireworks({ big: false });
      toast(`🎉 ¡Meta lograda: ${esc(meta.title)}!`, "success");
    } else {
      fireworks({ big: false });
      toast(`Tarea completada: ${esc(t.title)} ✓`, "success");
    }
  }
}

function confirmDel(message, fn) {
  if (window.confirm(message)) { fn(); saveDB(); render(); }
}

/* ============================================================
   DELEGACIÓN DE EVENTOS
   ============================================================ */
function handleAction(action, el) {
  el = el || {};
  const id = (el.dataset || {}).id;
  switch (action) {
    case "goto": go(el.dataset.view); break;

    /* Objetivos / Metas */
    case "new-objetivo": formObjetivo(null); break;
    case "edit-objetivo": formObjetivo(DB.objetivos.find((o) => o.id === id)); break;
    case "del-objetivo":
      confirmDel("¿Eliminar este objetivo? Sus metas quedarán sin objetivo.", () => {
        DB.objetivos = DB.objetivos.filter((o) => o.id !== id);
        DB.metas.forEach((m) => { if (m.objetivoId === id) m.objetivoId = ""; });
      });
      break;
    case "new-meta": formMeta(null, null); break;
    case "add-meta-to": formMeta(null, id); break;
    case "edit-meta": formMeta(DB.metas.find((m) => m.id === id)); break;
    case "del-meta":
      confirmDel("¿Eliminar esta meta? También se eliminarán sus tareas.", () => {
        DB.metas = DB.metas.filter((m) => m.id !== id);
        DB.tareas = DB.tareas.filter((t) => t.metaId !== id);
        if (AppState.metaId === id) AppState.metaId = null;
      });
      break;
    case "open-meta": AppState.metaId = id; AppState.view = "objetivos"; render(); break;
    case "back-objetivos": AppState.metaId = null; render(); break;
    case "meta-manual": {
      const m = DB.metas.find((x) => x.id === id);
      if (!m) break;
      const obj = m.objetivoId ? DB.objetivos.find((o) => o.id === m.objetivoId) : null;
      const prevMeta = metaIsComplete(m.id);
      const prevObj = obj ? objetivoIsComplete(obj.id) : false;
      m.progress = Number(el.value);
      const nowISO = new Date().toISOString();
      const mc = metaIsComplete(m.id);
      if (mc && !prevMeta) m.completedAt = nowISO;
      else if (!mc && prevMeta) m.completedAt = null;
      const objComplete = obj ? objetivoIsComplete(obj.id) : false;
      if (obj) {
        if (objComplete && !prevObj) obj.completedAt = nowISO;
        else if (!objComplete && prevObj) obj.completedAt = null;
      }
      saveDB();
      const lbl = document.getElementById("manual-val");
      if (lbl) lbl.textContent = m.progress + "%";
      const objNow = objComplete;
      if (obj && objNow && !prevObj) {
        fireworks({ big: true });
        toast(`🏆 ¡Objetivo cumplido: ${esc(obj.title)}!`, "success");
      } else if (m.progress === 100 && !prevMeta) {
        fireworks({ big: false });
        toast(`🎉 ¡Meta lograda: ${esc(m.title)}!`, "success");
      }
      break;
    }

    /* Tareas */
    case "new-task": formTask(null, null); break;
    case "new-task-for": formTask(null, id); break;
    case "edit-task": formTask(DB.tareas.find((t) => t.id === id)); break;
    case "toggle-task": toggleTask(id); break;
    case "del-task":
      confirmDel("¿Eliminar esta tarea?", () => { DB.tareas = DB.tareas.filter((t) => t.id !== id); });
      break;

    /* Hábitos */
    case "new-habit": formHabit(); break;
    case "toggle-habit": toggleHabit(id); break;
    case "del-habit":
      confirmDel("¿Eliminar este hábito y su historial?", () => { DB.habitos = DB.habitos.filter((h) => h.id !== id); });
      break;

    /* Áreas */
    case "new-area": formArea(null); break;
    case "del-area": {
      const inUse = DB.metas.some((m) => m.areaId === id) || DB.objetivos.some((o) => o.areaId === id) || DB.habitos.some((h) => h.areaId === id);
      if (inUse) { alert("No puedes eliminar un área en uso. Reasigna primero sus objetivos, metas o hábitos."); break; }
      confirmDel("¿Eliminar esta área?", () => { DB.areas = DB.areas.filter((a) => a.id !== id); });
      break;
    }

    /* Ánimo (varios registros por día, máx 10) */
    case "pick-mood":
      moodDraft.mood = el.dataset.val;
      document.querySelectorAll("#mood-row .pick").forEach((b) => b.classList.toggle("sel", b.dataset.val === el.dataset.val));
      break;
    case "pick-energy":
      moodDraft.energy = el.dataset.val;
      document.querySelectorAll("#energy-row .pick").forEach((b) => b.classList.toggle("sel", b.dataset.val === el.dataset.val));
      break;
    case "add-mood-entry": {
      if (!moodDraft.mood || !moodDraft.energy) { toast("Elige tu ánimo y tu energía.", "warn"); break; }
      const today = todayYMD();
      if (moodsOn(today).length >= 10) { toast("Máximo 10 registros por día.", "warn"); break; }
      const note = (document.getElementById("mood-note") || {}).value || "";
      DB.moods.push({ id: uid("mood"), date: today, time: nowHM(), mood: moodDraft.mood, energy: moodDraft.energy, note });
      moodDraft = { mood: null, energy: null };
      saveDB();
      toast("Registro añadido.", "success");
      render();
      break;
    }
    case "del-mood-entry":
      confirmDel("¿Eliminar este registro de ánimo?", () => { DB.moods = DB.moods.filter((m) => m.id !== id); });
      break;

    /* Reflexión */
    case "save-reflexion": {
      const today = todayYMD();
      const logro = (document.getElementById("reflex-logro") || {}).value || "";
      const auto = (document.getElementById("reflex-auto") || {}).value || "";
      if (!logro && !auto) { toast("Escribe al menos una respuesta.", "warn"); break; }
      const existing = DB.reflexiones.find((r) => r.date === today);
      if (existing) Object.assign(existing, { logro, autoConversacion: auto });
      else DB.reflexiones.push({ id: uid("ref"), date: today, logro, autoConversacion: auto });
      saveDB();
      toast("Reflexión guardada. Bien hecho por cerrar el día.", "success");
      render();
      break;
    }

    /* Notas del día (calendario) */
    case "add-note": {
      const input = document.getElementById("cal-note-input");
      const text = (input && input.value || "").trim();
      if (!text) { toast("Escribe algo en la nota.", "warn"); break; }
      DB.notas.push({ id: uid("nota"), date: AppState.calSel, text, createdAt: new Date().toISOString() });
      saveDB();
      render();
      break;
    }
    case "del-note":
      confirmDel("¿Eliminar esta nota?", () => { DB.notas = DB.notas.filter((n) => n.id !== id); });
      break;

    /* Calendario */
    case "cal-prev": AppState.calMonth = addMonths(AppState.calMonth, -1); render(); break;
    case "cal-next": AppState.calMonth = addMonths(AppState.calMonth, 1); render(); break;
    case "cal-day": AppState.calSel = el.dataset.date; render(); break;

    /* Datos */
    case "export": exportDB(); break;
    case "import": document.getElementById("import-file").click(); break;
    case "reset":
      if (confirm("Esto borrará TODOS tus datos de BlychLife en este navegador. ¿Continuar?")) {
        localStorage.removeItem(STORAGE_KEY); loadDB(); go("dashboard");
      }
      break;
  }
}

/* ============================================================
   INIT
   ============================================================ */
function buildNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = Object.entries(VIEWS).map(([key, v]) =>
    `<button class="nav-item" data-view="${key}">
      <span class="nav-icon">${v.icon}</span><span class="nav-label">${v.label}</span>
    </button>`).join("");
}

/* Barra inferior anclada (solo teléfonos): inicio al centro, resto a los lados */
function buildTabbar() {
  const bar = document.getElementById("tabbar");
  if (!bar) return;
  const order = ["objetivos", "tareas", "habitos", "dashboard", "areas", "calendario", "mood", "reflexion"];
  const short = {
    dashboard: "Inicio", objetivos: "Objetivos", tareas: "Tareas", habitos: "Hábitos",
    areas: "Áreas", calendario: "Calendario", mood: "Ánimo", reflexion: "Reflexión",
  };
  bar.innerHTML = order.map((key) => {
    const v = VIEWS[key];
    if (!v) return "";
    const home = key === "dashboard" ? " tab-home" : "";
    return `<button class="tab-item${home}" data-view="${key}" aria-label="${v.label}">
      <span class="tab-icon">${v.icon}</span><span class="tab-label">${short[key] || v.label}</span>
    </button>`;
  }).join("");
}

function init() {
  loadDB();
  buildNav();
  buildTabbar();
  render();

  // Delegación global
  document.body.addEventListener("click", (e) => {
    const navBtn = e.target.closest(".nav-item, .tab-item");
    if (navBtn) { go(navBtn.dataset.view); document.body.classList.remove("nav-open"); return; }
    const actionEl = e.target.closest("[data-action]");
    if (actionEl) { e.preventDefault(); handleAction(actionEl.dataset.action, actionEl); }
  });
  // Acción en sliders (range) y buscador de objetivos
  document.body.addEventListener("input", (e) => {
    const el = e.target.closest("[data-action='meta-manual']");
    if (el) { handleAction("meta-manual", el); return; }
    if (e.target.id === "obj-search") applyObjetivoFilter();
  });
  document.body.addEventListener("change", (e) => {
    if (e.target.id === "obj-area") applyObjetivoFilter();
  });
  // Teclado para filas tipo botón (metas)
  document.body.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches('[data-action="open-meta"]')) {
      e.preventDefault(); handleAction("open-meta", e.target);
    }
    if (e.key === "Escape") closeModal();
  });
  // Menú móvil
  document.getElementById("menu-toggle").addEventListener("click", () => {
    document.body.classList.toggle("nav-open");
  });
  // Importar archivo
  document.getElementById("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { importDB(reader.result); go("dashboard"); toast("Datos importados.", "success"); }
      catch (err) { alert("Archivo inválido."); }
    };
    reader.readAsText(file);
  });
}

document.addEventListener("DOMContentLoaded", init);
