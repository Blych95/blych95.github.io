/* ============================================================
   BlychLife · utils.js
   Helpers de fechas, IDs, sanitización y gráficos SVG sin librerías.
   ============================================================ */

function uid(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/* ---------- Fechas ---------- */
function ymd(date) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function todayYMD() {
  return ymd(new Date());
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(date, n) {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return d;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

/* Días restantes hasta una fecha (negativo si ya pasó) */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

/* Clave de semana ISO, ej "2026-W26" */
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekKeyToOrdinal(key) {
  const [y, w] = key.split("-W");
  return Number(y) * 53 + Number(w);
}

/* Hora actual HH:MM */
function nowHM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

/* Lunes de la semana de una fecha */
function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - day);
  return d;
}

/* Las 7 fechas (YYYY-MM-DD) de la semana de una fecha, de lunes a domingo */
function weekDates(date) {
  const s = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => ymd(addDays(s, i)));
}

/* Nombre del mes y año, ej "junio 2026" */
function monthLabel(date) {
  return new Date(date).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

/* ---------- Seguridad de texto ---------- */
function esc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ============================================================
   GRÁFICOS SVG (sin dependencias)
   ============================================================ */

/* Barra de progreso lineal */
function progressBar(percent, opts = {}) {
  const p = clamp(Math.round(percent), 0, 100);
  const color = opts.color || "var(--accent)";
  const label = opts.label === false ? "" : `<span class="bar-label">${p}%</span>`;
  return `
    <div class="bar-wrap">
      <div class="bar-track">
        <div class="bar-fill" style="width:${p}%; background:${color}"></div>
      </div>
      ${label}
    </div>`;
}

/* Barra de límite de tiempo: cuánto del plazo se ha consumido.
   createdAt -> dueDate. Roja si está vencida. */
function timeLimitBar(createdAt, dueDate) {
  if (!dueDate) return `<div class="time-bar muted">Sin fecha límite</div>`;
  const start = createdAt ? new Date(createdAt) : new Date();
  const end = new Date(dueDate);
  const now = new Date();
  const total = end - start;
  const elapsed = now - start;
  let pct = total > 0 ? clamp((elapsed / total) * 100, 0, 100) : (now > end ? 100 : 0);
  const left = daysUntil(dueDate);
  let color = "#22B8A6", text = "";
  if (left < 0) { color = "#DC2626"; text = `Vencida hace ${Math.abs(left)} d`; pct = 100; }
  else if (left === 0) { color = "#D97706"; text = "Vence hoy"; }
  else if (left <= 3) { color = "#D97706"; text = `Faltan ${left} d`; }
  else { color = "#22B8A6"; text = `Faltan ${left} d`; }
  return `
    <div class="time-bar">
      <div class="time-track"><div class="time-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="time-text" style="color:${color}">${text}</span>
    </div>`;
}

/* Anillo de progreso (donut) */
function progressRing(percent, size = 120, color = "var(--accent)") {
  const p = clamp(Math.round(percent), 0, 100);
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (p / 100) * c;
  return `
    <svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--ring-track)" stroke-width="${stroke}" />
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${size / 2} ${size / 2})" />
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="ring-text">${p}%</text>
    </svg>`;
}

/* Gráfico de pastel. segments: [{value, color, label}] */
function pieChart(segments, size = 200) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) {
    return `<div class="pie-empty">Aún no hay datos para mostrar el reparto.</div>`;
  }
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  let angle = -Math.PI / 2;
  let paths = "";
  segments.forEach((s) => {
    if (s.value <= 0) return;
    const slice = (s.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += slice;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = slice > Math.PI ? 1 : 0;
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z"
      fill="${s.color}" stroke="var(--surface)" stroke-width="2"></path>`;
  });
  const legend = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const pct = Math.round((s.value / total) * 100);
      return `<div class="legend-item">
        <span class="legend-dot" style="background:${s.color}"></span>
        <span class="legend-name">${esc(s.label)}</span>
        <span class="legend-pct">${pct}%</span>
      </div>`;
    })
    .join("");
  return `
    <div class="pie-wrap">
      <svg class="pie" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>
      <div class="pie-legend">${legend}</div>
    </div>`;
}

/* ---------- Toast / felicitaciones ---------- */
function toast(message, type = "info") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 400);
  }, 4200);
}

/* Confeti ligero en SVG para celebraciones */
function celebrate(message) {
  toast(`🎉 ${message}`, "success");
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  const colors = ["#3B82F6", "#22B8A6", "#F59E0B", "#A855F7", "#fff"];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = Math.random() * 0.6 + "s";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3200);
}

/* ---------- Fuegos artificiales (canvas) ----------
   opts.big = explosión mucho más grande (para objetivos). */
function fireworks(opts = {}) {
  const big = !!opts.big;
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return; // respeta la preferencia de menos movimiento
  }
  const canvas = document.createElement("canvas");
  canvas.className = "fx-canvas";
  document.body.appendChild(canvas);
  let ctx = null;
  try { ctx = canvas.getContext ? canvas.getContext("2d") : null; } catch (e) { ctx = null; }
  if (!ctx) { canvas.remove(); return; }

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * DPR);
    canvas.height = Math.floor(window.innerHeight * DPR);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  };
  resize();
  window.addEventListener("resize", resize);

  const colors = ["#3B82F6", "#22B8A6", "#F59E0B", "#A855F7", "#EC4899", "#10B981", "#FFD166", "#FFFFFF"];
  const G = 0.05 * DPR;
  const shells = [];
  const sparks = [];
  const totalShells = big ? 18 : 6;
  const sparkBase = big ? 95 : 55;
  let spawned = 0;
  let frame = 0;
  const maxFrames = big ? 300 : 160;
  let raf = 0;

  function W() { return canvas.width; }
  function H() { return canvas.height; }

  function spawnShell() {
    const x = (0.12 + Math.random() * 0.76) * W();
    const apex = (0.16 + Math.random() * 0.3) * H();
    const vy = -Math.sqrt(2 * G * (H() - apex));
    shells.push({ x, y: H(), vy, color: colors[(Math.random() * colors.length) | 0] });
  }
  function explode(x, y, color) {
    const n = sparkBase + (Math.random() * 25 | 0);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (Math.random() * (big ? 6.5 : 4.2) + 1) * DPR;
      sparks.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        color: Math.random() < 0.16 ? "#FFFFFF" : color,
        size: (Math.random() * 2 + 1) * DPR,
      });
    }
  }
  function tick() {
    frame++;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(8,23,46,0.22)";
    ctx.fillRect(0, 0, W(), H());
    ctx.globalCompositeOperation = "lighter";

    const every = big ? 6 : 11;
    if (spawned < totalShells && frame % every === 0) { spawnShell(); spawned++; }

    for (let i = shells.length - 1; i >= 0; i--) {
      const s = shells[i];
      s.vy += G; s.y += s.vy;
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.2 * DPR, 0, Math.PI * 2); ctx.fill();
      if (s.vy >= 0) { explode(s.x, s.y, s.color); shells.splice(i, 1); }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.vx *= 0.985; p.vy = p.vy * 0.985 + G * 0.6;
      p.x += p.vx; p.y += p.vy; p.life -= 0.012;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (frame < maxFrames || sparks.length || shells.length) {
      raf = window.requestAnimationFrame(tick);
    } else {
      window.removeEventListener("resize", resize);
      canvas.remove();
    }
  }
  raf = window.requestAnimationFrame(tick);
}
