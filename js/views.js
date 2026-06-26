/* ============================================================
   BlychLife · views.js
   Construye el HTML de cada vista. Las acciones se gestionan por
   delegación de eventos en app.js (data-action).
   ============================================================ */

const AppState = {
  view: "dashboard",
  metaId: null,
  calMonth: new Date(),
  calSel: todayYMD(),
};

function areaById(id) { return DB.areas.find((a) => a.id === id); }
function areaColor(id) { const a = areaById(id); return a ? a.color : "#94a3b8"; }
function areaName(id) { const a = areaById(id); return a ? a.name : "Sin área"; }

function areaOptions(selected) {
  return DB.areas
    .map((a) => `<option value="${a.id}" ${a.id === selected ? "selected" : ""}>${esc(a.name)}</option>`)
    .join("");
}

/* Etiqueta visual de área */
function areaTag(id) {
  return `<span class="area-tag" style="--c:${areaColor(id)}">${esc(areaName(id))}</span>`;
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard() {
  const today = todayYMD();
  const mood = latestMoodOn(today);
  const moodCount = moodsOn(today).length;
  const reflexionHoy = DB.reflexiones.find((r) => r.date === today);

  const totalMetas = DB.metas.length;
  const avgProgress = totalMetas
    ? Math.round(DB.metas.reduce((a, m) => a + metaProgress(m.id), 0) / totalMetas)
    : 0;
  const pendientes = DB.tareas.filter((t) => !t.done).length;
  const habitosHoy = DB.habitos.filter((h) => h.frequency !== "semanal");

  /* Enfoque de hoy según energía */
  let focusPanel;
  if (!mood) {
    focusPanel = `
      <div class="focus-panel neutral">
        <div class="focus-icon">🧭</div>
        <div>
          <h3>¿Cómo amaneces hoy?</h3>
          <p>Registra tu energía para que BlychLife adapte tu enfoque del día.</p>
          <button class="btn btn-light" data-action="goto" data-view="mood">Registrar ánimo y energía</button>
        </div>
      </div>`;
  } else if (mood.energy === "baja") {
    const light = DB.tareas.filter((t) => !t.done && !isHighCognitive(t)).slice(0, 4);
    const list = light.length
      ? light.map((t) => `<li>${esc(t.title)} ${quadrantPill(quadrantOf(t))}</li>`).join("")
      : `<li class="muted">No hay tareas mecánicas pendientes. Descansa con tranquilidad.</li>`;
    focusPanel = `
      <div class="focus-panel low">
        <div class="focus-icon">🌙</div>
        <div>
          <h3>Energía baja: protege tu mente</h3>
          <p>Hoy no fuerces la carga cognitiva alta. Pospón lo importante-complejo y avanza en lo mecánico, o descansa.</p>
          <ul class="focus-list">${list}</ul>
        </div>
      </div>`;
  } else {
    const heavy = DB.tareas
      .filter((t) => !t.done && isHighCognitive(t))
      .sort((a, b) => quadrantOf(a).localeCompare(quadrantOf(b)))
      .slice(0, 4);
    const list = heavy.length
      ? heavy.map((t) => `<li>${esc(t.title)} ${quadrantPill(quadrantOf(t))}</li>`).join("")
      : `<li class="muted">Sin tareas importantes pendientes. Buen momento para planear una meta nueva.</li>`;
    focusPanel = `
      <div class="focus-panel high">
        <div class="focus-icon">⚡</div>
        <div>
          <h3>Buena energía: ataca lo importante</h3>
          <p>Aprovecha para tus tareas de mayor carga cognitiva (Hazlo ya y Programado).</p>
          <ul class="focus-list">${list}</ul>
        </div>
      </div>`;
  }

  /* Hábitos de hoy (rápidos) */
  const habitRows = habitosHoy.length
    ? habitosHoy.map((h) => {
        const done = habitDoneOn(h, today);
        const streak = habitStreak(h);
        return `
          <div class="habit-quick ${done ? "done" : ""}">
            <button class="check ${done ? "on" : ""}" data-action="toggle-habit" data-id="${h.id}" aria-label="Marcar ${esc(h.name)}">
              ${done ? "✓" : ""}
            </button>
            <span class="habit-quick-name">${esc(h.name)}</span>
            <span class="streak">🔥 ${streak}</span>
          </div>`;
      }).join("")
    : `<p class="muted">No tienes hábitos diarios. <a href="#" data-action="goto" data-view="habitos">Crea uno</a>.</p>`;

  /* Tareas de hoy (Q1 primero) */
  const hoyTareas = DB.tareas
    .filter((t) => !t.done)
    .sort((a, b) => quadrantOf(a).localeCompare(quadrantOf(b)))
    .slice(0, 5);
  const tareaRows = hoyTareas.length
    ? hoyTareas.map((t) => `
        <div class="task-mini">
          <button class="check" data-action="toggle-task" data-id="${t.id}"></button>
          <span class="task-mini-title">${esc(t.title)}</span>
          ${quadrantPill(quadrantOf(t))}
        </div>`).join("")
    : `<p class="muted">Sin tareas pendientes.</p>`;

  return `
    <header class="view-head">
      <div>
        <p class="eyebrow">${capitalize(new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }))}</p>
        <h1>Tu vida, en equilibrio</h1>
      </div>
    </header>

    ${focusPanel}

    <section class="grid-4 stat-row">
      ${statCard("Objetivos", DB.objetivos.length, "🎯", "objetivos")}
      ${statCard("Metas", totalMetas, "🏁", "objetivos")}
      ${statCard("Tareas pendientes", pendientes, "🗂️", "tareas")}
      ${statCard("Hábitos", DB.habitos.length, "🔁", "habitos")}
    </section>

    <section class="grid-2">
      <div class="card center-card">
        <h2 class="card-title">Progreso global de tus metas</h2>
        ${progressRing(avgProgress, 150, "var(--accent)")}
        <p class="muted small">Promedio de avance de todas tus metas.</p>
      </div>

      <div class="card">
        <div class="card-title-row">
          <h2 class="card-title">Reparto de enfoque por Área</h2>
          <button class="btn-text" data-action="goto" data-view="areas">Ver áreas →</button>
        </div>
        ${areaDistribution()}
      </div>
    </section>

    <section class="grid-2">
      <div class="card">
        <div class="card-title-row">
          <h2 class="card-title">Hábitos de hoy</h2>
          <button class="btn-text" data-action="goto" data-view="habitos">Gestionar →</button>
        </div>
        <div class="habit-quick-list">${habitRows}</div>
      </div>

      <div class="card">
        <div class="card-title-row">
          <h2 class="card-title">Próximas tareas</h2>
          <button class="btn-text" data-action="goto" data-view="tareas">Ver matriz →</button>
        </div>
        <div class="task-mini-list">${tareaRows}</div>
      </div>
    </section>

    <section class="grid-2">
      ${reflexionHoy ? reflexionDoneCard(reflexionHoy) : reflexionPromptCard()}
      ${mood ? moodDoneCard(mood, moodCount) : moodPromptCard()}
    </section>
  `;
}

function statCard(label, value, icon, view) {
  return `
    <button class="card stat-card" data-action="goto" data-view="${view}">
      <span class="stat-icon">${icon}</span>
      <span class="stat-value">${value}</span>
      <span class="stat-label">${label}</span>
    </button>`;
}

/* Distribución por área: suma objetivos + metas + hábitos */
function areaDistribution() {
  const counts = {};
  const add = (areaId) => { if (areaId) counts[areaId] = (counts[areaId] || 0) + 1; };
  DB.objetivos.forEach((o) => add(o.areaId));
  DB.metas.forEach((m) => add(m.areaId));
  DB.habitos.forEach((h) => add(h.areaId));
  const segments = DB.areas.map((a) => ({ value: counts[a.id] || 0, color: a.color, label: a.name }));
  const total = segments.reduce((s, x) => s + x.value, 0);

  let warning = "";
  if (total >= 3) {
    const top = segments.reduce((a, b) => (b.value > a.value ? b : a), segments[0]);
    const share = top.value / total;
    if (share >= 0.9) {
      warning = `<div class="warn warn-strong">⚠️ El ${Math.round(share * 100)}% de tu enfoque (objetivos, metas y hábitos) está en <b>${esc(top.label)}</b>. Tu vida está muy desbalanceada; abre espacio a otras áreas.</div>`;
    } else if (share >= 0.6) {
      warning = `<div class="warn">🔎 El ${Math.round(share * 100)}% de tu enfoque está en <b>${esc(top.label)}</b>. Considera equilibrar con otras áreas.</div>`;
    }
  }
  return pieChart(segments, 180) + warning;
}

function moodPromptCard() {
  return `
    <div class="card">
      <h2 class="card-title">Ánimo y energía</h2>
      <p class="muted">Aún no has registrado tu día. Toma 5 segundos.</p>
      <button class="btn btn-primary" data-action="goto" data-view="mood">Registrar ahora</button>
    </div>`;
}
function moodDoneCard(m, count = 1) {
  return `
    <div class="card">
      <h2 class="card-title">Tu día hoy ${count > 1 ? `<span class="chip">${count} registros</span>` : ""}</h2>
      <div class="mood-summary">
        <span class="big-emoji">${MOOD_ICONS[m.mood] || "🙂"}</span>
        <div>
          <p>Último ánimo: <b>${esc(MOOD_LABELS[m.mood] || m.mood)}</b>${m.time ? ` <span class="muted small">(${esc(m.time)})</span>` : ""}</p>
          <p>Energía: <b class="energy-${m.energy}">${capitalize(m.energy)}</b></p>
        </div>
      </div>
      ${m.note ? `<p class="muted small">"${esc(m.note)}"</p>` : ""}
      <button class="btn-text" data-action="goto" data-view="mood">Añadir otro registro →</button>
    </div>`;
}
function reflexionPromptCard() {
  return `
    <div class="card">
      <h2 class="card-title">Reflexión del día</h2>
      <p class="muted">Cierra el día vaciando la mente: ¿qué lograste y cómo te hablaste?</p>
      <button class="btn btn-primary" data-action="goto" data-view="reflexion">Escribir reflexión</button>
    </div>`;
}
function reflexionDoneCard(r) {
  return `
    <div class="card">
      <h2 class="card-title">Reflexión de hoy ✓</h2>
      <p class="small"><b>Logré:</b> ${esc(r.logro) || "—"}</p>
      <p class="small"><b>Me hablé:</b> ${esc(r.autoConversacion) || "—"}</p>
      <button class="btn-text" data-action="goto" data-view="reflexion">Ver diario →</button>
    </div>`;
}

/* ============================================================
   OBJETIVOS y METAS
   ============================================================ */
function renderObjetivos() {
  if (AppState.metaId) return renderMetaDetail(AppState.metaId);

  const objHtml = DB.objetivos.length
    ? DB.objetivos.map(renderObjetivoCard).join("")
    : emptyState("🎯", "Sin objetivos todavía", "Un objetivo es una dirección amplia en tu vida. Crea el primero y cuélgale metas concretas.");

  /* Metas sueltas (sin objetivo) */
  const sueltas = DB.metas.filter((m) => !m.objetivoId);
  const sueltasHtml = sueltas.length
    ? `<div class="card" data-objcard data-area="" data-text="${esc(sueltas.map((m) => m.title).join(" ").toLowerCase())}">
        <h2 class="card-title">Metas sin objetivo</h2>
        <div class="meta-list">${sueltas.map(renderMetaRow).join("")}</div>
       </div>`
    : "";

  const areaFilter = `<select id="obj-area" class="search-area">
      <option value="">Todas las áreas</option>
      ${DB.areas.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}
    </select>`;

  return `
    <header class="view-head">
      <div><p class="eyebrow">Área › Objetivo › Meta › Tarea</p><h1>Objetivos y metas</h1></div>
      <div class="head-actions">
        <button class="btn btn-light" data-action="new-meta">+ Meta</button>
        <button class="btn btn-primary" data-action="new-objetivo">+ Objetivo</button>
      </div>
    </header>
    <div class="search-bar">
      <input type="search" id="obj-search" class="search-input" placeholder="🔎 Buscar objetivo o meta...">
      ${areaFilter}
    </div>
    <div class="stack">${objHtml}${sueltasHtml}</div>
  `;
}

/* Estilo del bloque coloreable (color sólido o degradado) */
function blockStyle(item, fallback) {
  const c1 = item.color || fallback;
  if (item.useGrad && item.color2) {
    return `--block:${c1}; --block2:${item.color2}; --block-bg:linear-gradient(135deg, ${c1}, ${item.color2});`;
  }
  return `--block:${c1}; --block2:${c1}; --block-bg:${c1};`;
}

function renderObjetivoCard(o) {
  const metas = DB.metas.filter((m) => m.objetivoId === o.id);
  const prog = objetivoProgress(o.id);
  const metasHtml = metas.length
    ? metas.map(renderMetaRow).join("")
    : `<p class="muted small">Sin metas. Añade una para empezar a avanzar.</p>`;
  const searchText = [o.title, ...metas.map((m) => m.title)].join(" ").toLowerCase();
  return `
    <div class="card objetivo-card has-block" style="${blockStyle(o, areaColor(o.areaId))}"
         data-objcard data-area="${o.areaId || ""}" data-text="${esc(searchText)}">
      <span class="block-strip"></span>
      <div class="obj-head">
        <div>
          <div class="obj-title-row">
            <h2 class="obj-title">${esc(o.title)}</h2>
            ${areaTag(o.areaId)}
          </div>
          ${o.description ? `<p class="muted small">${esc(o.description)}</p>` : ""}
          ${o.targetDate ? `<p class="muted small">Meta para: ${formatDate(o.targetDate)}</p>` : ""}
        </div>
        <div class="obj-actions">
          <button class="icon-btn" data-action="add-meta-to" data-id="${o.id}" title="Añadir meta">＋</button>
          <button class="icon-btn" data-action="edit-objetivo" data-id="${o.id}" title="Editar">✎</button>
          <button class="icon-btn danger" data-action="del-objetivo" data-id="${o.id}" title="Eliminar">🗑</button>
        </div>
      </div>
      ${progressBar(prog, { color: o.color || areaColor(o.areaId) })}
      <h3 class="meta-label">Metas</h3>
      <div class="meta-list">${metasHtml}</div>
    </div>`;
}

function renderMetaRow(m) {
  const prog = metaProgress(m.id);
  const nTasks = DB.tareas.filter((t) => t.metaId === m.id).length;
  return `
    <div class="meta-row has-block" style="${blockStyle(m, areaColor(m.areaId))}"
         data-metarow data-area="${m.areaId || ""}" data-text="${esc(m.title.toLowerCase())}">
      <span class="block-strip"></span>
      <div class="meta-row-main" data-action="open-meta" data-id="${m.id}" role="button" tabindex="0">
        <span class="meta-name">${esc(m.title)}</span>
        <span class="meta-sub">${areaTag(m.areaId)} · ${nTasks} tarea(s)${m.targetDate ? " · " + formatDate(m.targetDate) : ""}</span>
        <div class="meta-row-bar">${progressBar(prog, { color: m.color || areaColor(m.areaId) })}</div>
      </div>
      <button class="icon-btn danger meta-del" data-action="del-meta" data-id="${m.id}" title="Eliminar meta">🗑</button>
    </div>`;
}

function renderMetaDetail(metaId) {
  const m = DB.metas.find((x) => x.id === metaId);
  if (!m) { AppState.metaId = null; return renderObjetivos(); }
  const obj = DB.objetivos.find((o) => o.id === m.objetivoId);
  const tasks = DB.tareas.filter((t) => t.metaId === m.id);
  const prog = metaProgress(m.id);

  const taskHtml = tasks.length
    ? tasks.map(renderTaskCard).join("")
    : `<p class="muted">Sin tareas. Divide esta meta en pasos accionables.</p>`;

  /* Si no hay tareas, permitir progreso manual */
  const manual = tasks.length === 0
    ? `<div class="manual-progress">
        <label>Progreso manual de la meta: <b id="manual-val">${m.progress || 0}%</b></label>
        <input type="range" min="0" max="100" value="${m.progress || 0}" data-action="meta-manual" data-id="${m.id}">
       </div>`
    : `<p class="muted small">El progreso se calcula automáticamente con tus tareas.</p>`;

  return `
    <header class="view-head">
      <div>
        <button class="btn-text" data-action="back-objetivos">← Objetivos y metas</button>
        <div class="obj-title-row">${areaTag(m.areaId)}<h1>${esc(m.title)}</h1></div>
        ${obj ? `<p class="eyebrow">Objetivo: ${esc(obj.title)}</p>` : ""}
      </div>
      <div class="head-actions">
        <button class="btn btn-light" data-action="edit-meta" data-id="${m.id}">Editar meta</button>
        <button class="btn btn-light danger-outline" data-action="del-meta" data-id="${m.id}">Eliminar meta</button>
        <button class="btn btn-primary" data-action="new-task-for" data-id="${m.id}">+ Tarea</button>
      </div>
    </header>

    <section class="grid-2">
      <div class="card center-card">
        <h2 class="card-title">¿Qué tan cerca estás?</h2>
        ${progressRing(prog, 150, areaColor(m.areaId))}
        ${m.targetDate ? `<p class="muted">Fecha objetivo: <b>${formatDate(m.targetDate)}</b></p>` : ""}
      </div>
      <div class="card">
        <h2 class="card-title">Detalle</h2>
        ${m.description ? `<p>${esc(m.description)}</p>` : `<p class="muted">Sin descripción.</p>`}
        ${manual}
        ${m.targetDate ? `<h3 class="mini-title">Tiempo restante</h3>${timeLimitBar(m.createdAt, m.targetDate)}` : ""}
      </div>
    </section>

    <div class="card">
      <h2 class="card-title">Tareas de esta meta</h2>
      <div class="stack-sm">${taskHtml}</div>
    </div>
  `;
}

/* ============================================================
   TAREAS · Matriz de Eisenhower
   ============================================================ */
function renderTareas() {
  const buckets = { q1: [], q2: [], q3: [], q4: [] };
  DB.tareas.forEach((t) => buckets[quadrantOf(t)].push(t));

  const quad = (key) => {
    const q = QUADRANTS[key];
    const items = buckets[key]
      .sort((a, b) => Number(a.done) - Number(b.done))
      .map(renderTaskCard).join("");
    return `
      <div class="quadrant" style="--q:${q.color}">
        <div class="quad-head">
          <h3>${q.title}</h3>
          <span class="quad-action">${q.action}</span>
        </div>
        <div class="quad-body">${items || `<p class="muted small">Vacío</p>`}</div>
      </div>`;
  };

  return `
    <header class="view-head">
      <div><p class="eyebrow">Clasificación automática por urgencia × importancia</p><h1>Matriz de Eisenhower</h1></div>
      <div class="head-actions">
        <button class="btn btn-primary" data-action="new-task">+ Tarea</button>
      </div>
    </header>
    <div class="matrix">
      ${quad("q1")}${quad("q2")}${quad("q3")}${quad("q4")}
    </div>
  `;
}

function renderTaskCard(t) {
  const q = QUADRANTS[quadrantOf(t)];
  const meta = DB.metas.find((m) => m.id === t.metaId);
  return `
    <div class="task-card ${t.done ? "done" : ""}" style="--q:${q.color}">
      <div class="task-top">
        <button class="check ${t.done ? "on" : ""}" data-action="toggle-task" data-id="${t.id}" aria-label="Completar tarea">${t.done ? "✓" : ""}</button>
        <span class="task-title">${esc(t.title)}</span>
        <div class="task-actions">
          <button class="icon-btn" data-action="edit-task" data-id="${t.id}" title="Editar">✎</button>
          <button class="icon-btn danger" data-action="del-task" data-id="${t.id}" title="Eliminar">🗑</button>
        </div>
      </div>
      <div class="task-meta">
        ${quadrantPill(quadrantOf(t))}
        ${meta ? `<span class="chip">${esc(meta.title)}</span>` : ""}
        ${t.areaId ? areaTag(t.areaId) : ""}
        ${t.estMinutes ? `<span class="chip">⏱ ${t.estMinutes} min</span>` : ""}
      </div>
      ${!t.done ? progressBar(taskProgress(t), { color: q.color }) : ""}
      ${t.dueDate ? timeLimitBar(t.createdAt, t.dueDate) : ""}
    </div>`;
}

function quadrantPill(key) {
  const q = QUADRANTS[key];
  return `<span class="q-pill" style="background:${q.color}">${q.action}</span>`;
}

/* ============================================================
   HÁBITOS
   ============================================================ */
function renderHabitos() {
  const today = todayYMD();
  const cards = DB.habitos.length
    ? DB.habitos.map((h) => {
        const done = habitDoneOn(h, today) || (h.frequency === "semanal" && weeklyDoneThisWeek(h));
        const streak = habitStreak(h);
        const best = habitBestStreak(h);
        const unit = h.frequency === "semanal" ? "sem" : "días";
        return `
          <div class="card habit-card ${done ? "done" : ""}">
            <div class="habit-head">
              <button class="check big ${done ? "on" : ""}" data-action="toggle-habit" data-id="${h.id}">${done ? "✓" : ""}</button>
              <div class="habit-info">
                <h3>${esc(h.name)}</h3>
                <div class="habit-sub">${areaTag(h.areaId)} <span class="chip">${h.frequency === "semanal" ? "Semanal" : "Diario"}</span></div>
              </div>
              <button class="icon-btn danger" data-action="del-habit" data-id="${h.id}" title="Eliminar">🗑</button>
            </div>
            <div class="habit-stats">
              <div class="streak-big"><span class="flame">🔥</span><b>${streak}</b> <span>${unit} seguidos</span></div>
              <div class="best">Mejor: <b>${best}</b> ${unit}</div>
            </div>
            ${habitDots(h)}
          </div>`;
      }).join("")
    : emptyState("🔁", "Sin hábitos aún", "Crea hábitos como calistenia, leer o programar. No se atan a una meta única, sino a un Área de Vida.");

  return `
    <header class="view-head">
      <div><p class="eyebrow">Encadena días, no rompas la cadena</p><h1>Hábitos</h1></div>
      <div class="head-actions"><button class="btn btn-primary" data-action="new-habit">+ Hábito</button></div>
    </header>
    <div class="grid-3">${cards}</div>
  `;
}

/* Últimos 14 días como puntos */
function habitDots(h) {
  let dots = "";
  for (let i = 13; i >= 0; i--) {
    const d = ymd(addDays(new Date(), -i));
    const on = habitDoneOn(h, d);
    dots += `<span class="dot ${on ? "on" : ""}" title="${formatDate(d)}"></span>`;
  }
  return `<div class="habit-dots">${dots}</div>`;
}

function weeklyDoneThisWeek(h) {
  const wk = isoWeekKey(new Date());
  return Object.keys(h.history || {}).some((d) => h.history[d] && isoWeekKey(new Date(d)) === wk);
}

/* ============================================================
   ÁREAS DE VIDA
   ============================================================ */
function renderAreas() {
  const cards = DB.areas.map((a) => {
    const nMetas = DB.metas.filter((m) => m.areaId === a.id).length;
    const nObj = DB.objetivos.filter((o) => o.areaId === a.id).length;
    const nHab = DB.habitos.filter((h) => h.areaId === a.id).length;
    return `
      <div class="card area-card" style="--c:${a.color}">
        <div class="area-card-head">
          <span class="area-swatch" style="background:${a.color}"></span>
          <h3>${esc(a.name)}</h3>
          <button class="icon-btn danger" data-action="del-area" data-id="${a.id}" title="Eliminar">🗑</button>
        </div>
        <div class="area-counts">
          <span><b>${nObj}</b> objetivos</span>
          <span><b>${nMetas}</b> metas</span>
          <span><b>${nHab}</b> hábitos</span>
        </div>
      </div>`;
  }).join("");

  return `
    <header class="view-head">
      <div><p class="eyebrow">Las categorías madre de tu vida</p><h1>Áreas de Vida</h1></div>
      <div class="head-actions"><button class="btn btn-primary" data-action="new-area">+ Área</button></div>
    </header>
    <div class="grid-2">
      <div class="card">
        <h2 class="card-title">Reparto de tu enfoque</h2>
        ${areaDistribution()}
      </div>
      <div class="card">
        <h2 class="card-title">Tus áreas</h2>
        <div class="grid-2 tight">${cards}</div>
      </div>
    </div>
  `;
}

/* ============================================================
   ÁNIMO y ENERGÍA
   ============================================================ */
const MOOD_ICONS = { genial: "😄", bien: "🙂", neutral: "😐", bajo: "😟", mal: "😣" };
const MOOD_LABELS = { genial: "Genial", bien: "Bien", neutral: "Neutral", bajo: "Bajo", mal: "Mal" };
const ENERGY_ICONS = { alta: "⚡", media: "🔋", baja: "🪫" };

function renderMood() {
  const today = todayYMD();
  const todays = moodsOn(today);
  const moodBtns = Object.keys(MOOD_ICONS).map((k) =>
    `<button class="pick ${moodDraft.mood === k ? "sel" : ""}" data-action="pick-mood" data-val="${k}">
      <span>${MOOD_ICONS[k]}</span><small>${MOOD_LABELS[k]}</small></button>`).join("");
  const energyBtns = ["alta", "media", "baja"].map((k) =>
    `<button class="pick ${moodDraft.energy === k ? "sel" : ""}" data-action="pick-energy" data-val="${k}">
      <span>${ENERGY_ICONS[k]}</span><small>${capitalize(k)}</small></button>`).join("");

  const full = todays.length >= 10;
  const todayList = todays.length
    ? todays.map((m) => `
        <div class="mood-entry">
          <span class="mood-entry-emoji">${MOOD_ICONS[m.mood] || ""} ${ENERGY_ICONS[m.energy] || ""}</span>
          <div class="mood-entry-main">
            <b>${esc(MOOD_LABELS[m.mood] || m.mood)}</b> · <span class="energy-${m.energy}">${capitalize(m.energy)}</span>
            ${m.time ? `<span class="muted small"> · ${esc(m.time)}</span>` : ""}
            ${m.note ? `<div class="muted small">"${esc(m.note)}"</div>` : ""}
          </div>
          <button class="icon-btn danger" data-action="del-mood-entry" data-id="${m.id}" title="Eliminar">🗑</button>
        </div>`).join("")
    : `<p class="muted">Aún no hay registros hoy. Añade al menos uno.</p>`;

  const history = [...DB.moods]
    .sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")))
    .slice(0, 12)
    .map((m) =>
      `<div class="mood-hist-row">
        <span>${formatDate(m.date)}${m.time ? " · " + esc(m.time) : ""}</span>
        <span>${MOOD_ICONS[m.mood] || ""} ${ENERGY_ICONS[m.energy] || ""}</span>
        <span class="muted small">${esc(m.note || "")}</span>
      </div>`).join("");

  return `
    <header class="view-head">
      <div><p class="eyebrow">Gestiona tu energía, no solo tu tiempo</p><h1>Ánimo y energía</h1></div>
    </header>
    <div class="card">
      <h2 class="card-title">Añadir registro ${todays.length ? `<span class="chip">${todays.length}/10 hoy</span>` : ""}</h2>
      <p class="muted small">Puedes registrar tu ánimo varias veces al día (hasta 10).</p>
      <h3 class="mini-title">¿Cómo te sientes?</h3>
      <div class="pick-row" id="mood-row">${moodBtns}</div>
      <h3 class="mini-title">¿Qué energía tienes?</h3>
      <div class="pick-row" id="energy-row">${energyBtns}</div>
      <label class="field">
        <span>Nota rápida (opcional)</span>
        <input type="text" id="mood-note" maxlength="140" placeholder="Una palabra o frase...">
      </label>
      <button class="btn btn-primary" data-action="add-mood-entry" ${full ? "disabled" : ""}>
        ${full ? "Llegaste al máximo de hoy" : "Añadir registro"}
      </button>
    </div>
    <div class="card">
      <h2 class="card-title">Registros de hoy</h2>
      <div class="mood-entries">${todayList}</div>
    </div>
    <div class="card">
      <h2 class="card-title">Historial reciente</h2>
      ${history || `<p class="muted">Aún no hay registros.</p>`}
    </div>
  `;
}

/* ============================================================
   REFLEXIÓN / DIARIO
   ============================================================ */
function renderReflexion() {
  const today = todayYMD();
  const existing = DB.reflexiones.find((r) => r.date === today);
  const entries = [...DB.reflexiones].sort((a, b) => b.date.localeCompare(a.date)).map((r) =>
    `<div class="reflex-entry">
      <div class="reflex-date">${formatDate(r.date)}</div>
      <p><b>¿Qué logré hoy?</b><br>${esc(r.logro) || "<span class='muted'>—</span>"}</p>
      <p><b>¿Cómo me hablé a mí mismo hoy?</b><br>${esc(r.autoConversacion) || "<span class='muted'>—</span>"}</p>
    </div>`).join("");

  return `
    <header class="view-head">
      <div><p class="eyebrow">Vacía la mente, entrena la amabilidad contigo</p><h1>Reflexión del día</h1></div>
    </header>
    <div class="card">
      <h2 class="card-title">${existing ? "Editar reflexión de hoy" : "Cierra tu día"}</h2>
      <label class="field">
        <span>¿Qué logré hoy?</span>
        <textarea id="reflex-logro" rows="3" placeholder="Por pequeño que parezca, cuenta...">${esc(existing && existing.logro || "")}</textarea>
      </label>
      <label class="field">
        <span>¿Cómo me hablé a mí mismo hoy?</span>
        <textarea id="reflex-auto" rows="3" placeholder="¿Con dureza o con amabilidad?">${esc(existing && existing.autoConversacion || "")}</textarea>
      </label>
      <button class="btn btn-primary" data-action="save-reflexion">Guardar reflexión</button>
    </div>
    <div class="card">
      <h2 class="card-title">Tu diario</h2>
      <div class="reflex-list">${entries || `<p class="muted">Aún no escribes en tu diario.</p>`}</div>
    </div>
  `;
}

/* ---------- Helpers UI ---------- */
function emptyState(icon, title, text) {
  return `<div class="empty"><div class="empty-icon">${icon}</div><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/* ============================================================
   FILTRO / BUSCADOR de objetivos y metas (sin re-render)
   ============================================================ */
function applyObjetivoFilter() {
  const qEl = document.getElementById("obj-search");
  const aEl = document.getElementById("obj-area");
  const q = (qEl ? qEl.value : "").trim().toLowerCase();
  const area = aEl ? aEl.value : "";

  document.querySelectorAll("[data-objcard]").forEach((card) => {
    const rows = card.querySelectorAll("[data-metarow]");
    let anyRow = false;
    rows.forEach((r) => {
      const ra = r.getAttribute("data-area") || "";
      const rt = r.getAttribute("data-text") || "";
      const show = (!area || ra === area) && (!q || rt.includes(q));
      r.classList.toggle("filtered-out", !show);
      if (show) anyRow = true;
    });
    const ca = card.getAttribute("data-area") || "";
    const ct = card.getAttribute("data-text") || "";
    const areaMatch = !area || ca === area || anyRow;
    const textMatch = !q || ct.includes(q);
    card.classList.toggle("filtered-out", !(areaMatch && textMatch));
  });
}

/* ============================================================
   CALENDARIO
   ============================================================ */
const WD_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

function renderCalendario() {
  const month = AppState.calMonth;
  const y = month.getFullYear();
  const m = month.getMonth();
  const sel = AppState.calSel;
  const today = todayYMD();

  // Primer día (lunes=0) y número de días del mes
  const first = new Date(y, m, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  let cells = "";
  for (let i = 0; i < startPad; i++) cells += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = ymd(new Date(y, m, d));
    const moods = moodsOn(ds);
    const habits = habitsDoneOn(ds);
    const hasReflex = !!reflexionOn(ds);
    const notes = notesOn(ds);
    const lastMood = moods.length ? moods[moods.length - 1] : null;
    const dots = `
      ${habits.length ? `<span class="cal-dot hab" title="${habits.length} hábito(s)"></span>` : ""}
      ${hasReflex ? `<span class="cal-dot ref" title="Reflexión"></span>` : ""}
      ${notes.length ? `<span class="cal-dot note" title="${notes.length} nota(s)"></span>` : ""}`;
    cells += `
      <button class="cal-cell ${ds === sel ? "sel" : ""} ${ds === today ? "today" : ""}"
              data-action="cal-day" data-date="${ds}">
        <span class="cal-num">${d}</span>
        <span class="cal-emoji">${lastMood ? (MOOD_ICONS[lastMood.mood] || "") : ""}</span>
        <span class="cal-dots">${dots}</span>
      </button>`;
  }

  const weekPct = weeklyProductivity(sel);

  return `
    <header class="view-head">
      <div><p class="eyebrow">Tu mes de un vistazo</p><h1>Calendario</h1></div>
    </header>

    <div class="grid-2 cal-layout">
      <div class="card">
        <div class="cal-head">
          <button class="icon-btn" data-action="cal-prev" title="Mes anterior">‹</button>
          <h2 class="card-title">${capitalize(monthLabel(month))}</h2>
          <button class="icon-btn" data-action="cal-next" title="Mes siguiente">›</button>
        </div>
        <div class="cal-grid cal-weekdays">${WD_SHORT.map((w) => `<div class="cal-wd">${w}</div>`).join("")}</div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-legend">
          <span><span class="cal-dot hab"></span> hábitos</span>
          <span><span class="cal-dot ref"></span> reflexión</span>
          <span><span class="cal-dot note"></span> notas</span>
        </div>
      </div>

      <div class="card center-card">
        <h2 class="card-title">Productividad semanal</h2>
        ${progressRing(weekPct, 150, "var(--accent)")}
        <p class="muted small">Semana del día seleccionado. Combina hábitos, tareas, reflexión y registro de ánimo.</p>
      </div>
    </div>

    ${renderDayDetail(sel)}
  `;
}

function renderDayDetail(ds) {
  const moods = moodsOn(ds);
  const habits = habitsDoneOn(ds);
  const reflex = reflexionOn(ds);
  const notes = notesOn(ds);
  const isFuture = ds > todayYMD();

  const moodHtml = moods.length
    ? `<div class="day-moods">${moods.map((m) => `
        <span class="day-mood">${MOOD_ICONS[m.mood] || ""} ${ENERGY_ICONS[m.energy] || ""}
          <small>${esc(MOOD_LABELS[m.mood] || m.mood)} · ${capitalize(m.energy)}${m.time ? " · " + esc(m.time) : ""}</small>
        </span>`).join("")}</div>`
    : `<p class="muted small">Sin registros de ánimo este día.</p>`;

  const habitHtml = habits.length
    ? `<ul class="day-habits">${habits.map((h) => `<li>✅ ${esc(h.name)}</li>`).join("")}</ul>`
    : `<p class="muted small">No culminaste hábitos este día.</p>`;

  const reflexHtml = reflex
    ? `<p class="small"><b>¿Qué logré?</b> ${esc(reflex.logro) || "—"}</p>
       <p class="small"><b>¿Cómo me hablé?</b> ${esc(reflex.autoConversacion) || "—"}</p>`
    : `<p class="muted small">Sin reflexión este día.</p>`;

  const notesHtml = notes.length
    ? notes.map((n) => `
        <div class="day-note">
          <span>${esc(n.text)}</span>
          <button class="icon-btn danger" data-action="del-note" data-id="${n.id}" title="Eliminar nota">🗑</button>
        </div>`).join("")
    : `<p class="muted small">Sin notas. Añade lo que hiciste este día.</p>`;

  return `
    <div class="card">
      <h2 class="card-title">${capitalize(new Date(ds + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</h2>
      <div class="grid-2">
        <div>
          <h3 class="mini-title">Ánimo y energía</h3>
          ${moodHtml}
          <h3 class="mini-title">Hábitos culminados</h3>
          ${habitHtml}
        </div>
        <div>
          <h3 class="mini-title">Reflexión</h3>
          ${reflexHtml}
          <h3 class="mini-title">Notas del día</h3>
          <div class="day-notes">${notesHtml}</div>
          <div class="note-add">
            <input type="text" id="cal-note-input" maxlength="280" placeholder="¿Qué hiciste este día?">
            <button class="btn btn-primary" data-action="add-note">Añadir nota</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
