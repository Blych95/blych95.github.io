/* ==========================================================
   Registro Torii — app.js
   Datos guardados en el navegador (localStorage).
   ========================================================== */
'use strict';

const CLAVE = 'registroTorii.v1';

const CONFIG_BASE = {
  tasaBs: 0,
  tasaPeso: 0,
  tasasFecha: null,
  metodosPago: ['Efectivo $', 'Zelle', 'Pago móvil', 'Binance', 'Transferencia Bs', 'Pesos'],
  campos: []
};

let estado = { registros: [], config: clonar(CONFIG_BASE) };
let editandoId = null;
let detalleId = null;

const $  = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

/* ==========================================================
   1. Almacenamiento
   ========================================================== */
function clonar(o){ return JSON.parse(JSON.stringify(o)); }

function cargar(){
  let crudo = null;
  try { crudo = localStorage.getItem(CLAVE); }
  catch(e){ aviso('El navegador tiene bloqueado el almacenamiento. Los datos no se guardarán.', 'error'); return; }
  if(!crudo) return;
  try{
    const data = JSON.parse(crudo);
    estado.registros = Array.isArray(data.registros) ? data.registros : [];
    estado.config = Object.assign(clonar(CONFIG_BASE), data.config || {});
    if(!Array.isArray(estado.config.metodosPago)) estado.config.metodosPago = clonar(CONFIG_BASE.metodosPago);
    if(!Array.isArray(estado.config.campos)) estado.config.campos = [];
  }catch(e){
    aviso('El respaldo guardado está dañado. Descarga un respaldo nuevo antes de seguir.', 'error');
  }
}

function guardar(){
  try{ localStorage.setItem(CLAVE, JSON.stringify(estado)); }
  catch(e){ aviso('No se pudo guardar: el almacenamiento está lleno o bloqueado.', 'error'); }
}

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ==========================================================
   2. Utilidades de fecha y número
   ========================================================== */
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function hoyISO(){
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function pad(n){ return String(n).padStart(2, '0'); }

function aFecha(iso){                       // 'YYYY-MM-DD' -> Date local
  if(!iso) return null;
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}
function fmtFecha(iso){                     // -> 'DD-MM-AAAA'
  if(!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d}-${m}-${a}`;
}
function fmtLargo(iso){
  const f = aFecha(iso);
  if(!f) return '—';
  return f.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}
function inicioSemana(fecha){
  const d = new Date(fecha);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));   // lunes
  return d;
}
function isoDe(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

function num(n, dec = 2){
  return (Number(n) || 0).toLocaleString('es-VE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function usd(n){ return '$' + num(n); }
function bs(n){
  const t = Number(estado.config.tasaBs) || 0;
  return t > 0 ? 'Bs ' + num(n * t) : 'Sin tasa';
}
function pesos(n){
  const t = Number(estado.config.tasaPeso) || 0;
  return t > 0 ? '$ ' + num(n * t, 0) + ' COP' : 'Sin tasa';
}
function esc(t){
  return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function abonado(r){
  return (r.abonos || []).reduce((s, a) => s + (Number(a.monto) || 0), 0);
}
function restante(r){
  if(r.estado === 'pagado') return 0;
  return Math.max(0, (Number(r.precio) || 0) - abonado(r));
}

/* ==========================================================
   3. Avisos
   ========================================================== */
function aviso(texto, tipo = 'ok'){
  const cont = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + tipo;
  t.textContent = texto;
  cont.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3200);
}

/* ==========================================================
   4. Navegación
   ========================================================== */
function irA(vista){
  $$('.vista').forEach(v => v.classList.toggle('is-active', v.id === 'vista-' + vista));
  $$('.nav-item, .tab').forEach(b => b.classList.toggle('is-active', b.dataset.vista === vista));
  window.scrollTo(0, 0);
  if(vista === 'dashboard') pintarDashboard();
  if(vista === 'lista') pintarLista();
  if(vista === 'config') pintarConfig();
}
$$('.nav-item, .tab').forEach(b => b.addEventListener('click', () => irA(b.dataset.vista)));

/* ==========================================================
   5. Dashboard
   ========================================================== */
function pintarDashboard(){
  const regs = estado.registros;
  const hoy = hoyISO();
  const lunes = isoDe(inicioSemana(new Date()));
  const mes = hoy.slice(0, 7);

  $('#kpiHoy').textContent    = regs.filter(r => r.fecha === hoy).length;
  $('#kpiSemana').textContent = regs.filter(r => r.fecha >= lunes && r.fecha <= hoy).length;
  $('#kpiMes').textContent    = regs.filter(r => (r.fecha || '').slice(0, 7) === mes).length;
  $('#kpiTotal').textContent  = regs.length;

  const pagados   = regs.filter(r => r.estado === 'pagado');
  const apartados = regs.filter(r => r.estado === 'apartado');
  const totalPagado = pagados.reduce((s, r) => s + (Number(r.precio) || 0), 0);
  const totalApartado = apartados.reduce((s, r) => s + (Number(r.precio) || 0), 0);
  const totalAbonado = apartados.reduce((s, r) => s + abonado(r), 0);
  const porCobrar = apartados.reduce((s, r) => s + restante(r), 0);

  $('#dineroUsd').textContent  = num(totalPagado);
  $('#dineroBs').textContent   = bs(totalPagado);
  $('#dineroPeso').textContent = pesos(totalPagado);

  $('#kpiPagados').textContent        = pagados.length;
  $('#kpiPagadosMonto').textContent   = usd(totalPagado);
  $('#kpiApartados').textContent      = apartados.length;
  $('#kpiApartadosMonto').textContent = usd(totalApartado);
  $('#kpiAbonado').textContent        = usd(totalAbonado);
  $('#kpiPorCobrar').textContent      = usd(porCobrar);

  $('#fechaHoy').textContent = fmtLargo(hoy).replace(/^\w/, c => c.toUpperCase());

  // gráfico de los últimos 7 días
  const dias = [];
  for(let i = 6; i >= 0; i--){
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = isoDe(d);
    dias.push({ dia: DIAS[d.getDay()], n: regs.filter(r => r.fecha === iso).length });
  }
  const max = Math.max(1, ...dias.map(d => d.n));
  $('#chart7').innerHTML = dias.map(d => `
    <div class="chart-col">
      <span class="chart-val">${d.n}</span>
      <div class="chart-bar ${d.n === 0 ? 'vacia' : ''}" style="height:${d.n === 0 ? 3 : Math.round((d.n / max) * 100)}%"></div>
      <span class="chart-dia">${d.dia}</span>
    </div>`).join('');

  // movimientos recientes
  const ult = [...regs].sort((a, b) => (b.creado || '').localeCompare(a.creado || '')).slice(0, 6);
  $('#recientes').innerHTML = ult.length
    ? ult.map(r => `
      <li data-id="${r.id}" style="cursor:pointer">
        <span class="punto" style="background:${r.estado === 'pagado' ? 'var(--matsu)' : 'var(--kaki)'}"></span>
        <span class="rec-txt">${esc(r.figura)} <small>· ${esc(r.nombre)} · ${fmtFecha(r.fecha)}</small></span>
        <span class="rec-monto">${usd(r.precio)}</span>
      </li>`).join('')
    : '<li style="color:var(--gris-2)">Todavía no hay registros.</li>';

  $$('#recientes li[data-id]').forEach(li => li.addEventListener('click', () => abrirDetalle(li.dataset.id)));
  pintarTasasNav();
}

function pintarTasasNav(){
  const c = estado.config;
  $('#navTasaBs').textContent   = c.tasaBs > 0 ? num(c.tasaBs) : '—';
  $('#navTasaPeso').textContent = c.tasaPeso > 0 ? num(c.tasaPeso, 0) : '—';
  $('#navTasaFecha').textContent = c.tasasFecha
    ? 'Actualizadas el ' + fmtFecha(c.tasasFecha)
    : 'Sin configurar';
}

/* ==========================================================
   6. Lista y búsqueda
   ========================================================== */
let rangoActivo = 'todo';

$$('#chipsFecha .chip').forEach(c => c.addEventListener('click', () => {
  rangoActivo = c.dataset.rango;
  $$('#chipsFecha .chip').forEach(x => x.classList.toggle('is-active', x === c));
  $('#rangoCustom').hidden = rangoActivo !== 'custom';
  pintarLista();
}));

['#fNombre','#fFigura','#fPrecioMin','#fPrecioMax','#fDesde','#fHasta'].forEach(s =>
  $(s).addEventListener('input', pintarLista));
['#fEstado','#fMetodo','#fOrden'].forEach(s =>
  $(s).addEventListener('change', pintarLista));

$('#btnLimpiar').addEventListener('click', () => {
  ['#fNombre','#fFigura','#fPrecioMin','#fPrecioMax','#fDesde','#fHasta'].forEach(s => $(s).value = '');
  $('#fEstado').value = ''; $('#fMetodo').value = ''; $('#fOrden').value = 'fecha-desc';
  $$('#filtrosExtra input, #filtrosExtra select').forEach(i => i.value = '');
  rangoActivo = 'todo';
  $$('#chipsFecha .chip').forEach(x => x.classList.toggle('is-active', x.dataset.rango === 'todo'));
  $('#rangoCustom').hidden = true;
  pintarLista();
});

function rangoFechas(){
  const hoy = hoyISO();
  if(rangoActivo === 'hoy')    return [hoy, hoy];
  if(rangoActivo === 'semana') return [isoDe(inicioSemana(new Date())), hoy];
  if(rangoActivo === 'mes')    return [hoy.slice(0,7) + '-01', hoy];
  if(rangoActivo === 'custom') return [$('#fDesde').value || '', $('#fHasta').value || ''];
  return ['', ''];
}

function filtrar(){
  const [desde, hasta] = rangoFechas();
  const nombre = $('#fNombre').value.trim().toLowerCase();
  const figura = $('#fFigura').value.trim().toLowerCase();
  const est    = $('#fEstado').value;
  const met    = $('#fMetodo').value;
  const pMin   = $('#fPrecioMin').value === '' ? null : Number($('#fPrecioMin').value);
  const pMax   = $('#fPrecioMax').value === '' ? null : Number($('#fPrecioMax').value);

  const extras = estado.config.campos
    .map(c => ({ campo: c, valor: ($(`#fx-${c.id}`)?.value || '').trim().toLowerCase() }))
    .filter(f => f.valor !== '');

  let res = estado.registros.filter(r => {
    if(desde && (r.fecha || '') < desde) return false;
    if(hasta && (r.fecha || '') > hasta) return false;
    if(nombre && !(r.nombre || '').toLowerCase().includes(nombre)) return false;
    if(figura && !(r.figura || '').toLowerCase().includes(figura)) return false;
    if(est && r.estado !== est) return false;
    if(met && r.metodo !== met) return false;
    if(pMin !== null && (Number(r.precio) || 0) < pMin) return false;
    if(pMax !== null && (Number(r.precio) || 0) > pMax) return false;
    for(const f of extras){
      const v = String((r.extra || {})[f.campo.id] ?? '').toLowerCase();
      if(f.campo.tipo === 'lista' || f.campo.tipo === 'fecha'){ if(v !== f.valor) return false; }
      else if(!v.includes(f.valor)) return false;
    }
    return true;
  });

  const orden = $('#fOrden').value;
  res.sort((a, b) => {
    if(orden === 'fecha-asc')   return (a.fecha||'').localeCompare(b.fecha||'') || (a.creado||'').localeCompare(b.creado||'');
    if(orden === 'precio-desc') return (Number(b.precio)||0) - (Number(a.precio)||0);
    if(orden === 'precio-asc')  return (Number(a.precio)||0) - (Number(b.precio)||0);
    if(orden === 'nombre-asc')  return (a.nombre||'').localeCompare(b.nombre||'', 'es');
    return (b.fecha||'').localeCompare(a.fecha||'') || (b.creado||'').localeCompare(a.creado||'');
  });
  return res;
}

function pintarLista(){
  const res = filtrar();
  const total = res.reduce((s, r) => s + (Number(r.precio) || 0), 0);

  $('#resumenBusqueda').innerHTML =
    `<b>${res.length}</b> ${res.length === 1 ? 'registro' : 'registros'} · <b>${usd(total)}</b> · ${bs(total)} · ${pesos(total)}`;

  $('#lista').innerHTML = res.length ? res.map(r => `
    <button class="reg ${esc(r.estado)}" data-id="${r.id}">
      <span class="c-fecha">${fmtFecha(r.fecha)}</span>
      <span class="c-nombre">${esc(r.nombre)}</span>
      <span class="c-figura">${esc(r.figura)}</span>
      <span class="c-metodo">${esc(r.metodo || '—')}</span>
      <span class="c-precio">${usd(r.precio)}</span>
      <span class="c-estado"><span class="badge ${esc(r.estado)}">${r.estado === 'pagado' ? 'Pagado' : 'Apartado'}</span></span>
    </button>`).join('')
    : `<div class="vacio"><b>Sin resultados</b>${estado.registros.length
        ? 'Ningún registro coincide con estos filtros. Prueba a limpiarlos.'
        : 'Aún no has guardado registros. Empieza en “Nuevo registro”.'}</div>`;

  $$('#lista .reg').forEach(el => el.addEventListener('click', () => abrirDetalle(el.dataset.id)));
}

/* ==========================================================
   7. Detalle del registro
   ========================================================== */
function abrirDetalle(id){
  const r = estado.registros.find(x => x.id === id);
  if(!r) return;
  detalleId = id;

  const extras = estado.config.campos
    .filter(c => (r.extra || {})[c.id] !== undefined && (r.extra || {})[c.id] !== '')
    .map(c => `<div class="m-dato"><span>${esc(c.etiqueta)}</span><b>${c.tipo === 'fecha' ? fmtFecha(r.extra[c.id]) : esc(r.extra[c.id])}</b></div>`)
    .join('');

  const listaAbonos = (r.abonos || []).map(a => `
    <li>
      <span>${fmtFecha(a.fecha)}${a.nota ? ' · ' + esc(a.nota) : ''}</span>
      <span><b>${usd(a.monto)}</b> <button class="quitar" data-abono="${a.id}" title="Quitar abono">✕</button></span>
    </li>`).join('');

  const esApartado = r.estado === 'apartado';
  const bloqueAbonos = (esApartado || (r.abonos || []).length) ? `
    <div class="m-abonos">
      <h3>Abonos</h3>
      <ul class="abono-lista">${listaAbonos || '<li><span>Todavía sin abonos</span></li>'}</ul>
      <div class="saldo">
        <span>Abonado: ${usd(abonado(r))}</span>
        ${esApartado ? `<b>Falta: ${usd(restante(r))}</b>` : '<b style="color:var(--matsu)">Cubierto</b>'}
      </div>
      ${esApartado ? `
      <form class="form-abono" id="formAbono">
        <label>Monto en dólares <input type="number" id="aMonto" min="0.01" step="0.01" required placeholder="0.00"></label>
        <label>Nota <input type="text" id="aNota" placeholder="opcional"></label>
        <button class="btn btn-linea" type="submit">Añadir abono</button>
      </form>` : ''}
    </div>` : '';

  $('#modalContenido').innerHTML = `
    <div class="m-head">
      <h2 id="mFigura">${esc(r.figura)}</h2>
      <p>${esc(r.nombre)}</p>
      <span class="badge ${esc(r.estado)}">${r.estado === 'pagado' ? 'Pagado' : 'Apartado'}</span>
    </div>

    <div class="m-datos">
      <div class="m-dato"><span>Fecha</span><b>${fmtFecha(r.fecha)}</b></div>
      <div class="m-dato"><span>Método de pago</span><b>${esc(r.metodo || '—')}</b></div>
      ${extras}
    </div>

    <div class="m-precios">
      <div class="m-precio-usd"><small>$</small>${num(r.precio)}</div>
      <div class="m-conv">
        <div><span>Bolívares</span><b>${bs(r.precio)}</b></div>
        <div><span>Pesos</span><b>${pesos(r.precio)}</b></div>
      </div>
    </div>

    ${bloqueAbonos}

    <div class="m-acciones">
      ${r.estado === 'apartado' ? '<button class="btn btn-verde" id="btnPagado">Marcar como pagado</button>' : ''}
      <button class="btn btn-linea" id="btnEditar">Editar</button>
      <button class="btn btn-peligro" id="btnEliminar">Eliminar</button>
    </div>`;

  $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';

  $('#btnEditar').addEventListener('click', () => { cerrarModal(); editarRegistro(id); });
  $('#btnEliminar').addEventListener('click', () => eliminarRegistro(id));
  const bp = $('#btnPagado');
  if(bp) bp.addEventListener('click', () => marcarPagado(id));

  const fa = $('#formAbono');
  if(fa) fa.addEventListener('submit', e => {
    e.preventDefault();
    const monto = Number($('#aMonto').value);
    if(!(monto > 0)) return;
    r.abonos = r.abonos || [];
    r.abonos.push({ id: uid(), fecha: hoyISO(), monto, nota: $('#aNota').value.trim() });
    if(abonado(r) >= (Number(r.precio) || 0)){
      r.estado = 'pagado';
      aviso('Apartado completado. El registro pasó a Pagado.');
    } else {
      aviso('Abono añadido. Faltan ' + usd(restante(r)) + '.');
    }
    r.actualizado = new Date().toISOString();
    guardar(); pintarLista(); pintarDashboard(); abrirDetalle(id);
  });

  $$('#modalContenido .quitar').forEach(b => b.addEventListener('click', () => {
    r.abonos = (r.abonos || []).filter(a => a.id !== b.dataset.abono);
    guardar(); pintarLista(); pintarDashboard(); abrirDetalle(id);
    aviso('Abono eliminado.', 'info');
  }));
}

function cerrarModal(){
  $('#modal').hidden = true;
  document.body.style.overflow = '';
  detalleId = null;
}
$$('[data-cerrar]').forEach(el => el.addEventListener('click', cerrarModal));
document.addEventListener('keydown', e => { if(e.key === 'Escape' && !$('#modal').hidden) cerrarModal(); });

function marcarPagado(id){
  const r = estado.registros.find(x => x.id === id);
  if(!r) return;
  r.estado = 'pagado';
  r.actualizado = new Date().toISOString();
  guardar(); pintarLista(); pintarDashboard(); abrirDetalle(id);
  aviso('Registro marcado como pagado.');
}

function eliminarRegistro(id){
  const r = estado.registros.find(x => x.id === id);
  if(!r) return;
  if(!confirm(`¿Eliminar el registro de "${r.figura}" (${r.nombre})? No se puede deshacer.`)) return;
  estado.registros = estado.registros.filter(x => x.id !== id);
  guardar(); cerrarModal(); pintarLista(); pintarDashboard();
  aviso('Registro eliminado.', 'info');
}

/* ==========================================================
   8. Formulario de registro
   ========================================================== */
$$('#rEstado .seg').forEach(b => b.addEventListener('click', () => {
  $$('#rEstado .seg').forEach(x => x.classList.toggle('is-active', x === b));
  $('#abonoInicial').hidden = b.dataset.estado !== 'apartado';
}));

function estadoForm(){ return $('#rEstado .seg.is-active').dataset.estado; }
function ponerEstadoForm(v){
  $$('#rEstado .seg').forEach(x => x.classList.toggle('is-active', x.dataset.estado === v));
  $('#abonoInicial').hidden = v !== 'apartado';
}

$('#rFecha').addEventListener('change', () => {
  $('#rFechaHint').textContent = $('#rFecha').value ? fmtFecha($('#rFecha').value) : '—';
});
$('#rPrecio').addEventListener('input', previewPrecio);

function previewPrecio(){
  const p = Number($('#rPrecio').value) || 0;
  $('#prevBs').textContent   = bs(p);
  $('#prevPeso').textContent = pesos(p);
}

function pintarMetodos(){
  const opciones = estado.config.metodosPago;
  $('#rMetodo').innerHTML = '<option value="" disabled selected>Elige un método…</option>' +
    opciones.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
  const actual = $('#fMetodo').value;
  $('#fMetodo').innerHTML = '<option value="">Todos</option>' +
    opciones.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
  if(opciones.includes(actual)) $('#fMetodo').value = actual;
}

function pintarCamposForm(valores = {}){
  $('#camposExtra').innerHTML = estado.config.campos.map(c => {
    const v = valores[c.id] ?? '';
    if(c.tipo === 'lista'){
      return `<label>${esc(c.etiqueta)}
        <select id="cx-${c.id}">
          <option value="">—</option>
          ${(c.opciones || []).map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}
        </select></label>`;
    }
    const tipo = c.tipo === 'numero' ? 'number' : c.tipo === 'fecha' ? 'date' : 'text';
    return `<label>${esc(c.etiqueta)}<input type="${tipo}" id="cx-${c.id}" value="${esc(v)}" ${tipo === 'number' ? 'step="0.01"' : ''}></label>`;
  }).join('');
}

function pintarFiltrosExtra(){
  $('#filtrosExtra').innerHTML = estado.config.campos.map(c => {
    if(c.tipo === 'lista'){
      return `<label>${esc(c.etiqueta)}
        <select id="fx-${c.id}"><option value="">Todos</option>
          ${(c.opciones || []).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
        </select></label>`;
    }
    const tipo = c.tipo === 'fecha' ? 'date' : 'text';
    return `<label>${esc(c.etiqueta)}<input type="${tipo}" id="fx-${c.id}" placeholder="${tipo === 'text' ? 'Buscar…' : ''}"></label>`;
  }).join('');
  $$('#filtrosExtra input').forEach(i => i.addEventListener('input', pintarLista));
  $$('#filtrosExtra select').forEach(i => i.addEventListener('change', pintarLista));
}

$('#formRegistro').addEventListener('submit', e => {
  e.preventDefault();
  const precio = Number($('#rPrecio').value);
  if(!($('#rMetodo').value)){ aviso('Elige un método de pago.', 'error'); return; }
  if(!(precio >= 0)){ aviso('El precio no es válido.', 'error'); return; }

  const extra = {};
  estado.config.campos.forEach(c => {
    const el = $(`#cx-${c.id}`);
    if(el && el.value !== '') extra[c.id] = el.value;
  });

  const base = {
    fecha:  $('#rFecha').value,
    nombre: $('#rNombre').value.trim(),
    figura: $('#rFigura').value.trim(),
    metodo: $('#rMetodo').value,
    precio,
    estado: estadoForm(),
    extra,
    actualizado: new Date().toISOString()
  };

  if(editandoId){
    const r = estado.registros.find(x => x.id === editandoId);
    Object.assign(r, base);
    if(r.estado === 'pagado') r.abonos = r.abonos || [];
    guardar();
    aviso('Registro actualizado.');
    salirEdicion();
    irA('lista');
  } else {
    const nuevo = Object.assign({ id: uid(), creado: new Date().toISOString(), abonos: [] }, base);
    const ab = Number($('#rAbono').value);
    if(nuevo.estado === 'apartado' && ab > 0){
      nuevo.abonos.push({ id: uid(), fecha: nuevo.fecha, monto: ab, nota: $('#rNota').value.trim() });
      if(ab >= precio) nuevo.estado = 'pagado';
    }
    estado.registros.push(nuevo);
    guardar();
    aviso(`Registro guardado como ${nuevo.estado === 'pagado' ? 'pagado' : 'apartado'}.`);
    limpiarForm();
  }
  pintarLista();
  pintarDashboard();
});

$('#btnVaciar').addEventListener('click', limpiarForm);

function limpiarForm(){
  $('#formRegistro').reset();
  $('#rFecha').value = hoyISO();
  $('#rFechaHint').textContent = fmtFecha(hoyISO());
  ponerEstadoForm('pagado');
  pintarCamposForm();
  previewPrecio();
}

function editarRegistro(id){
  const r = estado.registros.find(x => x.id === id);
  if(!r) return;
  editandoId = id;
  irA('registro');
  $('#tituloRegistro').textContent = 'Editar registro';
  $('#btnGuardar').textContent = 'Guardar cambios';
  $('#btnCancelarEdicion').hidden = false;
  $('#rFecha').value = r.fecha;
  $('#rFechaHint').textContent = fmtFecha(r.fecha);
  $('#rNombre').value = r.nombre;
  $('#rFigura').value = r.figura;
  pintarMetodos();
  if(r.metodo && !estado.config.metodosPago.includes(r.metodo)){
    $('#rMetodo').insertAdjacentHTML('beforeend', `<option value="${esc(r.metodo)}">${esc(r.metodo)}</option>`);
  }
  $('#rMetodo').value = r.metodo || '';
  $('#rPrecio').value = r.precio;
  ponerEstadoForm(r.estado);
  $('#abonoInicial').hidden = true;      // los abonos se gestionan en el detalle
  pintarCamposForm(r.extra || {});
  previewPrecio();
}

function salirEdicion(){
  editandoId = null;
  $('#tituloRegistro').textContent = 'Nuevo registro';
  $('#btnGuardar').textContent = 'Guardar registro';
  $('#btnCancelarEdicion').hidden = true;
  limpiarForm();
}
$('#btnCancelarEdicion').addEventListener('click', () => { salirEdicion(); irA('lista'); });

/* ==========================================================
   9. Configuración
   ========================================================== */
$('#formTasas').addEventListener('submit', e => {
  e.preventDefault();
  estado.config.tasaBs   = Number($('#cTasaBs').value) || 0;
  estado.config.tasaPeso = Number($('#cTasaPeso').value) || 0;
  estado.config.tasasFecha = hoyISO();
  guardar();
  pintarConfig(); pintarDashboard(); pintarLista(); previewPrecio();
  aviso('Tasas guardadas.');
});

$('#formMetodo').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#nuevoMetodo').value.trim();
  if(!v) return;
  if(estado.config.metodosPago.some(m => m.toLowerCase() === v.toLowerCase())){
    aviso('Ese método ya está en la lista.', 'error'); return;
  }
  estado.config.metodosPago.push(v);
  guardar(); $('#nuevoMetodo').value = '';
  pintarConfig(); pintarMetodos();
  aviso(`Método “${v}” añadido al registro y a la búsqueda.`);
});

$('#cCampoTipo').addEventListener('change', () => {
  $('#wrapOpciones').hidden = $('#cCampoTipo').value !== 'lista';
});

$('#formCampo').addEventListener('submit', e => {
  e.preventDefault();
  const etiqueta = $('#cCampoNombre').value.trim();
  const tipo = $('#cCampoTipo').value;
  if(!etiqueta) return;
  const opciones = tipo === 'lista'
    ? $('#cCampoOpciones').value.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  if(tipo === 'lista' && !opciones.length){ aviso('Escribe al menos una opción para la lista.', 'error'); return; }
  estado.config.campos.push({ id: uid(), etiqueta, tipo, opciones });
  guardar();
  $('#formCampo').reset(); $('#wrapOpciones').hidden = true;
  pintarConfig(); pintarCamposForm(); pintarFiltrosExtra();
  aviso(`Campo “${etiqueta}” añadido al registro y a la búsqueda.`);
});

function pintarConfig(){
  const c = estado.config;
  $('#cTasaBs').value   = c.tasaBs   || '';
  $('#cTasaPeso').value = c.tasaPeso || '';
  $('#tasaEjemplo').innerHTML = (c.tasaBs > 0 || c.tasaPeso > 0)
    ? `<b>$1</b> = ${c.tasaBs > 0 ? '<b>Bs ' + num(c.tasaBs) + '</b>' : 'Bs —'} = ${c.tasaPeso > 0 ? '<b>' + num(c.tasaPeso, 0) + ' COP</b>' : '— COP'}`
    : 'Aún no has puesto las tasas: los precios solo se mostrarán en dólares.';

  $('#listaMetodos').innerHTML = c.metodosPago.map((m, i) =>
    `<span class="tag">${esc(m)} <button data-metodo="${i}" title="Quitar" aria-label="Quitar ${esc(m)}">✕</button></span>`).join('')
    || '<span style="color:var(--gris-2);font-size:13px">No hay métodos. Añade el primero.</span>';

  $$('#listaMetodos button').forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.metodo);
    const nombre = c.metodosPago[i];
    if(!confirm(`¿Quitar el método “${nombre}”? Los registros que ya lo usan lo conservan.`)) return;
    c.metodosPago.splice(i, 1);
    guardar(); pintarConfig(); pintarMetodos(); pintarLista();
  }));

  $('#listaCampos').innerHTML = c.campos.length ? c.campos.map(campo => `
    <div class="campo-item">
      <div class="campo-item-head">
        <div><b>${esc(campo.etiqueta)}</b><span class="campo-tipo">${esc(campo.tipo)}</span></div>
        <button class="btn btn-ghost" data-borrar-campo="${campo.id}">Quitar</button>
      </div>
      ${campo.tipo === 'lista' ? `
        <div class="tags" style="margin:12px 0 0">
          ${(campo.opciones || []).map((o, i) => `<span class="tag">${esc(o)} <button data-campo="${campo.id}" data-op="${i}" aria-label="Quitar ${esc(o)}">✕</button></span>`).join('')}
        </div>
        <form class="inline-form" data-add-op="${campo.id}" style="margin-top:10px">
          <input type="text" placeholder="Nueva opción" required>
          <button class="btn btn-ghost" type="submit">Añadir opción</button>
        </form>` : ''}
    </div>`).join('')
    : '<p style="color:var(--gris-2);font-size:13px;margin:0">Todavía no hay campos personalizados.</p>';

  $$('[data-borrar-campo]').forEach(b => b.addEventListener('click', () => {
    const campo = c.campos.find(x => x.id === b.dataset.borrarCampo);
    if(!confirm(`¿Quitar el campo “${campo.etiqueta}”? Dejará de verse en el registro y en la búsqueda.`)) return;
    c.campos = c.campos.filter(x => x.id !== b.dataset.borrarCampo);
    guardar(); pintarConfig(); pintarCamposForm(); pintarFiltrosExtra(); pintarLista();
  }));

  $$('#listaCampos [data-op]').forEach(b => b.addEventListener('click', () => {
    const campo = c.campos.find(x => x.id === b.dataset.campo);
    campo.opciones.splice(Number(b.dataset.op), 1);
    guardar(); pintarConfig(); pintarCamposForm(); pintarFiltrosExtra();
  }));

  $$('[data-add-op]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const campo = c.campos.find(x => x.id === f.dataset.addOp);
    const input = f.querySelector('input');
    const v = input.value.trim();
    if(!v) return;
    if(campo.opciones.some(o => o.toLowerCase() === v.toLowerCase())){ aviso('Esa opción ya existe.', 'error'); return; }
    campo.opciones.push(v);
    guardar(); pintarConfig(); pintarCamposForm(); pintarFiltrosExtra();
    aviso(`Opción “${v}” añadida.`);
  }));

  const bytes = new Blob([JSON.stringify(estado)]).size;
  $('#infoAlmacen').textContent =
    `${estado.registros.length} registros guardados en este navegador · ${(bytes / 1024).toFixed(1)} KB`;

  pintarTasasNav();
}

/* ==========================================================
   10. Respaldo
   ========================================================== */
function descargar(nombre, contenido, tipo){
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('#btnExportar').addEventListener('click', () => {
  descargar(`registro-torii-${hoyISO()}.json`, JSON.stringify(estado, null, 2), 'application/json');
  aviso('Respaldo descargado.');
});

$('#btnCsv').addEventListener('click', () => {
  const campos = estado.config.campos;
  const cab = ['Fecha','Cliente','Figura','Metodo','Precio USD','Precio Bs','Precio COP','Estado','Abonado','Restante', ...campos.map(c => c.etiqueta)];
  const filas = [...estado.registros].sort((a, b) => (a.fecha||'').localeCompare(b.fecha||'')).map(r => {
    const p = Number(r.precio) || 0;
    return [
      fmtFecha(r.fecha), r.nombre, r.figura, r.metodo, p,
      (estado.config.tasaBs || 0) * p, (estado.config.tasaPeso || 0) * p,
      r.estado, abonado(r), restante(r),
      ...campos.map(c => (r.extra || {})[c.id] ?? '')
    ];
  });
  const csv = [cab, ...filas]
    .map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  descargar(`registro-torii-${hoyISO()}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
  aviso('CSV descargado.');
});

$('#inputImportar').addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;
  const lector = new FileReader();
  lector.onload = () => {
    try{
      const data = JSON.parse(lector.result);
      if(!Array.isArray(data.registros)) throw new Error('formato');
      if(!confirm(`El respaldo trae ${data.registros.length} registros y reemplazará todo lo que hay ahora. ¿Continuar?`)) return;
      estado.registros = data.registros;
      estado.config = Object.assign(clonar(CONFIG_BASE), data.config || {});
      guardar(); iniciarUI();
      aviso('Respaldo importado.');
    }catch(err){
      aviso('Ese archivo no es un respaldo de Registro Torii.', 'error');
    }
  };
  lector.readAsText(file);
  e.target.value = '';
});

$('#btnBorrarTodo').addEventListener('click', () => {
  if(!confirm('Esto borra todos los registros y la configuración de este navegador. ¿Seguro?')) return;
  if(!confirm('Última confirmación: se perderá todo si no tienes respaldo. ¿Borrar?')) return;
  estado = { registros: [], config: clonar(CONFIG_BASE) };
  guardar(); iniciarUI();
  aviso('Todos los datos fueron borrados.', 'info');
});

/* ==========================================================
   11. Arranque
   ========================================================== */
function iniciarUI(){
  pintarMetodos();
  pintarCamposForm();
  pintarFiltrosExtra();
  limpiarForm();
  pintarConfig();
  pintarLista();
  pintarDashboard();
}

cargar();
iniciarUI();
irA('dashboard');
