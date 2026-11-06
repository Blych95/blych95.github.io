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
  campos: [],
  categoriasCliente: ['Estrella', 'Nuevo', 'Frecuente', 'VIP']
};

let estado = { registros: [], clientes: [], vendedores: [], config: clonar(CONFIG_BASE) };
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
    estado.clientes = Array.isArray(data.clientes) ? data.clientes : [];
    estado.vendedores = Array.isArray(data.vendedores) ? data.vendedores : [];
    estado.config = Object.assign(clonar(CONFIG_BASE), data.config || {});
    if(!Array.isArray(estado.config.metodosPago)) estado.config.metodosPago = clonar(CONFIG_BASE.metodosPago);
    if(!Array.isArray(estado.config.campos)) estado.config.campos = [];
    
    if(!estado.config.categoriasCliente) estado.config.categoriasCliente = clonar(CONFIG_BASE.categoriasCliente);
    if(!estado.config.categoriasCliente.includes('VIP')) estado.config.categoriasCliente.push('VIP');
    
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

function aFecha(iso){
  if(!iso) return null;
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}
function fmtFecha(iso){
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
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
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
function aviso(texto, tipo = 'ok', accion = null){
  const cont = $('#toasts');
  if(!cont) return;
  const t = document.createElement('div');
  t.className = 'toast ' + tipo;

  const p = document.createElement('span');
  p.textContent = texto;
  t.appendChild(p);

  if(accion){
    const b = document.createElement('button');
    b.className = 'toast-btn';
    b.textContent = accion.texto;
    b.addEventListener('click', () => { t.remove(); accion.fn(); });
    t.appendChild(b);
  }

  cont.appendChild(t);
  if(!accion || accion.auto){
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, accion ? 9000 : 3200);
  }
}

/* ==========================================================
   4. Navegación
   ========================================================== */
function irA(vista){
  $$('.vista').forEach(v => v.classList.toggle('is-active', v.id === 'vista-' + vista));
  $$('.nav-item, .tab').forEach(b => b.classList.toggle('is-active', b.dataset.vista === (vista === 'notif' ? 'dashboard' : vista)));
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

  if($('#kpiHoy')) $('#kpiHoy').textContent    = regs.filter(r => r.fecha === hoy).length;
  if($('#kpiSemana')) $('#kpiSemana').textContent = regs.filter(r => r.fecha >= lunes && r.fecha <= hoy).length;
  if($('#kpiMes')) $('#kpiMes').textContent    = regs.filter(r => (r.fecha || '').slice(0, 7) === mes).length;
  if($('#kpiTotal')) $('#kpiTotal').textContent  = regs.length;

  const pagados   = regs.filter(r => r.estado === 'pagado');
  const apartados = regs.filter(r => r.estado === 'apartado');
  const totalPagado = pagados.reduce((s, r) => s + (Number(r.precio) || 0), 0);
  const totalApartado = apartados.reduce((s, r) => s + (Number(r.precio) || 0), 0);
  const totalAbonado = apartados.reduce((s, r) => s + abonado(r), 0);
  const porCobrar = apartados.reduce((s, r) => s + restante(r), 0);

  if($('#dineroUsd')) $('#dineroUsd').textContent  = num(totalPagado);
  if($('#dineroBs')) $('#dineroBs').textContent   = bs(totalPagado);
  if($('#dineroPeso')) $('#dineroPeso').textContent = pesos(totalPagado);

  if($('#kpiPagados')) $('#kpiPagados').textContent        = pagados.length;
  if($('#kpiPagadosMonto')) $('#kpiPagadosMonto').textContent   = usd(totalPagado);
  if($('#kpiApartados')) $('#kpiApartados').textContent      = apartados.length;
  if($('#kpiApartadosMonto')) $('#kpiApartadosMonto').textContent = usd(totalApartado);
  if($('#kpiAbonado')) $('#kpiAbonado').textContent        = usd(totalAbonado);
  if($('#kpiPorCobrar')) $('#kpiPorCobrar').textContent      = usd(porCobrar);

  if($('#fechaHoy')) $('#fechaHoy').textContent = fmtLargo(hoy).replace(/^\w/, c => c.toUpperCase());
  if(typeof pintarCampana === 'function') pintarCampana();

  const dias = [];
  for(let i = 6; i >= 0; i--){
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = isoDe(d);
    dias.push({ dia: DIAS[d.getDay()], n: regs.filter(r => r.fecha === iso).length });
  }
  const max = Math.max(1, ...dias.map(d => d.n));
  if($('#chart7')) {
    $('#chart7').innerHTML = dias.map(d => `
      <div class="chart-col">
        <span class="chart-val">${d.n}</span>
        <div class="chart-bar ${d.n === 0 ? 'vacia' : ''}" style="height:${d.n === 0 ? 3 : Math.round((d.n / max) * 100)}%"></div>
        <span class="chart-dia">${d.dia}</span>
      </div>`).join('');
  }

  const ult = [...regs].sort((a, b) => (b.creado || '').localeCompare(a.creado || '')).slice(0, 6);
  if($('#recientes')) {
    $('#recientes').innerHTML = ult.length
      ? ult.map(r => `
        <li data-id="${r.id}" style="cursor:pointer">
          <span class="punto" style="background:${r.estado === 'pagado' ? 'var(--matsu)' : 'var(--kaki)'}"></span>
          <span class="rec-txt">${esc(r.figura)} <small>· ${esc(r.nombre)} · ${fmtFecha(r.fecha)}</small></span>
          <span class="rec-monto">${usd(r.precio)}</span>
        </li>`).join('')
      : '<li style="color:var(--gris-2)">Todavía no hay registros.</li>';
    
    $$('#recientes li[data-id]').forEach(li => li.addEventListener('click', () => abrirDetalle(li.dataset.id)));
  }
  pintarTasasNav();
}

function pintarTasasNav(){
  const c = estado.config;
  if($('#chipBs')) $('#chipBs').textContent = c.tasaBs > 0 ? num(c.tasaBs) : '—';
  if($('#chipPeso')) $('#chipPeso').textContent = c.tasaPeso > 0 ? num(c.tasaPeso, 0) : '—';
  if($('#navTasaBs')) $('#navTasaBs').textContent   = c.tasaBs > 0 ? num(c.tasaBs) : '—';
  if($('#navTasaPeso')) $('#navTasaPeso').textContent = c.tasaPeso > 0 ? num(c.tasaPeso, 0) : '—';
  if($('#navTasaFecha')) $('#navTasaFecha').textContent = c.tasasFecha ? 'Actualizadas el ' + fmtFecha(c.tasasFecha) : 'Sin configurar';
}

/* ==========================================================
   6. Lista y búsqueda
   ========================================================== */
let rangoActivo = 'todo';

const CLAVE_UI = 'registroTorii.ui.filtros';
let filtrosAbiertos = false;
try { filtrosAbiertos = localStorage.getItem(CLAVE_UI) === '1'; } catch(e){}

function pintarPanelFiltros(){
  if($('#filtrosCuerpo')) $('#filtrosCuerpo').hidden = !filtrosAbiertos;
  if($('#panelFiltros')) $('#panelFiltros').classList.toggle('abierto', filtrosAbiertos);
  if($('#btnFiltros')) $('#btnFiltros').setAttribute('aria-expanded', String(filtrosAbiertos));
}

if($('#btnFiltros')) {
  $('#btnFiltros').addEventListener('click', () => {
    filtrosAbiertos = !filtrosAbiertos;
    try { localStorage.setItem(CLAVE_UI, filtrosAbiertos ? '1' : '0'); } catch(e){}
    pintarPanelFiltros();
  });
}

function contarFiltros(){
  let n = rangoActivo === 'todo' ? 0 : 1;
  ['#fNombre','#fFigura','#fPrecioMin','#fPrecioMax','#fEstado','#fMetodo','#fVendedor'].forEach(s => {
    if($(s) && $(s).value.trim() !== '') n++;
  });
  estado.config.campos.forEach(c => {
    const el = $(`#fx-${c.id}`);
    if(el && el.value.trim() !== '') n++;
  });
  const badge = $('#contadorFiltros');
  if(badge) {
    badge.textContent = n;
    badge.hidden = n === 0;
  }
  if($('#btnLimpiar')) $('#btnLimpiar').hidden = n === 0;
  if($('#ftTexto')) {
    $('#ftTexto').textContent = n === 0
      ? 'Búsqueda y filtros'
      : `Filtrando · ${n} ${n === 1 ? 'filtro activo' : 'filtros activos'}`;
  }
}

$$('#chipsFecha .chip').forEach(c => c.addEventListener('click', () => {
  rangoActivo = c.dataset.rango;
  $$('#chipsFecha .chip').forEach(x => x.classList.toggle('is-active', x === c));
  if($('#rangoCustom')) $('#rangoCustom').hidden = rangoActivo !== 'custom';
  pintarLista();
}));

['#fNombre','#fFigura','#fPrecioMin','#fPrecioMax','#fDesde','#fHasta'].forEach(s => {
  if($(s)) $(s).addEventListener('input', pintarLista);
});
['#fEstado','#fMetodo','#fVendedor','#fOrden'].forEach(s => {
  if($(s)) $(s).addEventListener('change', pintarLista);
});

if($('#btnLimpiar')){
  $('#btnLimpiar').addEventListener('click', () => {
    ['#fNombre','#fFigura','#fPrecioMin','#fPrecioMax','#fDesde','#fHasta'].forEach(s => { if($(s)) $(s).value = ''; });
    if($('#fEstado')) $('#fEstado').value = ''; 
    if($('#fMetodo')) $('#fMetodo').value = ''; 
    if($('#fVendedor')) $('#fVendedor').value = ''; 
    if($('#fOrden')) $('#fOrden').value = 'fecha-desc';
    $$('#filtrosExtra input, #filtrosExtra select').forEach(i => i.value = '');
    rangoActivo = 'todo';
    $$('#chipsFecha .chip').forEach(x => x.classList.toggle('is-active', x.dataset.rango === 'todo'));
    if($('#rangoCustom')) $('#rangoCustom').hidden = true;
    pintarLista();
  });
}

function rangoFechas(){
  const hoy = hoyISO();
  if(rangoActivo === 'hoy')    return [hoy, hoy];
  if(rangoActivo === 'semana') return [isoDe(inicioSemana(new Date())), hoy];
  if(rangoActivo === 'mes')    return [hoy.slice(0,7) + '-01', hoy];
  if(rangoActivo === 'custom') return [$('#fDesde') ? $('#fDesde').value || '' : '', $('#fHasta') ? $('#fHasta').value || '' : ''];
  return ['', ''];
}

function filtrar(){
  const [desde, hasta] = rangoFechas();
  const nombre = $('#fNombre') ? $('#fNombre').value.trim().toLowerCase() : '';
  const figura = $('#fFigura') ? $('#fFigura').value.trim().toLowerCase() : '';
  const est    = $('#fEstado') ? $('#fEstado').value : '';
  const vend   = $('#fVendedor') ? $('#fVendedor').value : '';
  const met    = $('#fMetodo') ? $('#fMetodo').value : '';
  const pMin   = ($('#fPrecioMin') && $('#fPrecioMin').value !== '') ? Number($('#fPrecioMin').value) : null;
  const pMax   = ($('#fPrecioMax') && $('#fPrecioMax').value !== '') ? Number($('#fPrecioMax').value) : null;

  const extras = estado.config.campos
    .map(c => ({ campo: c, valor: ($(`#fx-${c.id}`)?.value || '').trim().toLowerCase() }))
    .filter(f => f.valor !== '');

  let res = estado.registros.filter(r => {
    if(desde && (r.fecha || '') < desde) return false;
    if(hasta && (r.fecha || '') > hasta) return false;
    if(nombre && (typeof coincideCliente === 'function' ? !coincideCliente(r, nombre) : !(r.nombre||'').toLowerCase().includes(nombre))) return false;
    if(vend && r.vendedorId !== vend) return false;
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

  const orden = $('#fOrden') ? $('#fOrden').value : 'fecha-desc';
  res.sort((a, b) => {
    if(orden === 'fecha-asc')   return (a.fecha||'').localeCompare(b.fecha||'') || (a.creado||'').localeCompare(b.creado||'');
    if(orden === 'precio-desc') return (Number(b.precio)||0) - (Number(a.precio)||0);
    if(orden === 'precio-asc')  return (Number(a.precio)||0) - (Number(b.precio)||0);
    if(orden === 'nombre-asc')  return (a.nombre||'').localeCompare(b.nombre||'', 'es');
    return (b.fecha||'').localeCompare(a.fecha||'') || (b.creado||'').localeCompare(b.creado||'');
  });
  return res;
}

function pintarLista(){
  const res = filtrar();
  const total = res.reduce((s, r) => s + (Number(r.precio) || 0), 0);

  if($('#resumenBusqueda')) {
    $('#resumenBusqueda').innerHTML =
      `<b>${res.length}</b> ${res.length === 1 ? 'registro' : 'registros'} · <b>${usd(total)}</b> · ${bs(total)} · ${pesos(total)}`;
  }

  if($('#lista')) {
    $('#lista').innerHTML = res.length ? res.map(r => `
      <button class="reg ${esc(r.estado)}" data-id="${r.id}">
        <span class="c-fecha">${fmtFecha(r.fecha)}</span>
        <span class="c-nombre">${esc(r.nombre)}</span>
        <span class="c-figura">${esc(r.figura)}</span>
        <span class="c-metodo">${esc(r.metodo || '—')}</span>
        <span class="c-precio">${usd(r.precio)}</span>
        <span class="c-estado"><span class="badge ${esc(r.estado)}">${r.estado === 'pagado' ? 'Pagado' : 'Apartado'}</span>${typeof limiteHtml === 'function' ? limiteHtml(r) : ''}</span>
      </button>`).join('')
      : `<div class="vacio"><b>Sin resultados</b>${estado.registros.length
          ? 'Ningún registro coincide con estos filtros. Prueba a limpiarlos.'
          : 'Aún no has guardado registros. Empieza en “Nuevo registro”.'}</div>`;

    $$('#lista .reg').forEach(el => el.addEventListener('click', () => abrirDetalle(el.dataset.id)));
  }
  contarFiltros();
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
      <span>${fmtFecha(a.fecha)}${a.nota ? ' · ' + esc(a.nota) : ''} <br><small style="color:var(--gris-2)">Vía: ${esc(a.metodo || 'No definido')}</small></span>
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
        <label>Fecha <input type="date" id="aFecha" required value="${hoyISO()}"></label>
        <label>Monto en dólares <input type="number" id="aMonto" min="0.01" step="0.01" required placeholder="0.00"></label>
        <label>Método
          <select id="aMetodo" required>
            <option value="" disabled selected>Elige un método...</option>
            ${estado.config.metodosPago.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}
          </select>
        </label>
        <label>Nota <input type="text" id="aNota" placeholder="opcional"></label>
        <button class="btn btn-linea" type="submit">Añadir abono</button>
      </form>` : ''}
    </div>` : '';

  if($('#modalContenido')) {
    $('#modalContenido').innerHTML = `
      <div class="m-head">
        <h2 id="mFigura">${esc(r.figura)}</h2>
        <p>${esc(r.nombre)}</p>
        <span class="badge ${esc(r.estado)}">${r.estado === 'pagado' ? 'Pagado' : 'Apartado'}</span>
      </div>

      <div class="m-datos">
        <div class="m-dato"><span>Fecha de Registro</span><b>${fmtFecha(r.fecha)}</b></div>
        ${r.fechaPagoPrevista ? `<div class="m-dato"><span>Fecha de Pago Acordada</span><b>${fmtFecha(r.fechaPagoPrevista)}</b></div>` : ''}
        ${r.fechaCorte ? `<div class="m-dato"><span>Fecha de Corte</span><b>${fmtFecha(r.fechaCorte)}</b></div>` : ''}
        <div class="m-dato"><span>Método de pago</span><b>${esc(r.metodo || '—')}</b></div>
        ${typeof plazoDatos === 'function' ? plazoDatos(r) : ''}
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
        ${r.clienteId ? '<button class="btn btn-linea" id="btnVerCliente">Ver cliente</button>' : ''}
        <button class="btn btn-linea" id="btnEditar">Editar</button>
        <button class="btn btn-peligro" id="btnEliminar">Eliminar</button>
      </div>`;
  }

  if($('#modal')) $('#modal').hidden = false;
  document.body.style.overflow = 'hidden';

  if($('#btnEditar')) $('#btnEditar').addEventListener('click', () => { cerrarModal(); editarRegistro(id); });
  const bv = $('#btnVerCliente'); if(bv) bv.addEventListener('click', () => { if(typeof abrirCliente === 'function') abrirCliente(r.clienteId); });
  if($('#btnEliminar')) $('#btnEliminar').addEventListener('click', () => eliminarRegistro(id));
  const bp = $('#btnPagado');
  if(bp) bp.addEventListener('click', () => marcarPagado(id));

  const fa = $('#formAbono');
  if(fa) fa.addEventListener('submit', e => {
    e.preventDefault();
    const monto = Number($('#aMonto').value);
    if(!(monto > 0)) return;
    r.abonos = r.abonos || [];
    r.abonos.push({ 
      id: uid(), 
      fecha: $('#aFecha').value, 
      monto, 
      metodo: $('#aMetodo').value,
      nota: $('#aNota').value.trim() 
    });
    
    if(abonado(r) >= (Number(r.precio) || 0)){
      r.estado = 'pagado'; r.fechaPago = hoyISO();
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

let alCerrarModal = null;

function cerrarModal(){
  if(alCerrarModal){ const f = alCerrarModal; alCerrarModal = null; f(); }   
  if($('#modal')) $('#modal').hidden = true;
  document.body.style.overflow = '';
  detalleId = null;
}
$$('[data-cerrar]').forEach(el => el.addEventListener('click', cerrarModal));
document.addEventListener('keydown', e => { if(e.key === 'Escape' && $('#modal') && !$('#modal').hidden) cerrarModal(); });

function marcarPagado(id){
  const r = estado.registros.find(x => x.id === id);
  if(!r) return;
  r.estado = 'pagado'; r.fechaPago = hoyISO();
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
  if($('#abonoInicial')) $('#abonoInicial').hidden = b.dataset.estado !== 'apartado';
}));

function estadoForm(){ 
  const seg = $('#rEstado .seg.is-active');
  return seg ? seg.dataset.estado : 'pagado'; 
}

function ponerEstadoForm(v){
  $$('#rEstado .seg').forEach(x => x.classList.toggle('is-active', x.dataset.estado === v));
  if($('#abonoInicial')) $('#abonoInicial').hidden = v !== 'apartado';
}

if($('#rFecha')) {
  $('#rFecha').addEventListener('change', () => {
    if($('#rFechaHint')) $('#rFechaHint').textContent = $('#rFecha').value ? fmtFecha($('#rFecha').value) : '—';
  });
}
if($('#rPrecio')) $('#rPrecio').addEventListener('input', previewPrecio);

function previewPrecio(){
  const p = Number($('#rPrecio') ? $('#rPrecio').value : 0) || 0;
  if($('#prevBs')) $('#prevBs').textContent   = bs(p);
  if($('#prevPeso')) $('#prevPeso').textContent = pesos(p);
  if(typeof pintarExtrasForm === 'function') pintarExtrasForm();
}

function pintarMetodos(){
  const opciones = estado.config.metodosPago;
  const htmlDisabled = '<option value="" disabled selected>Elige un método…</option>' + opciones.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
  const htmlTodos = '<option value="">Todos</option>' + opciones.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
  
  if($('#rMetodo')) $('#rMetodo').innerHTML = htmlDisabled;
  if($('#rAbonoMetodo')) $('#rAbonoMetodo').innerHTML = htmlDisabled;

  const actual = $('#fMetodo') ? $('#fMetodo').value : '';
  if($('#fMetodo')) {
    $('#fMetodo').innerHTML = htmlTodos;
    if(opciones.includes(actual)) $('#fMetodo').value = actual;
  }
}

function pintarCamposForm(valores = {}){
  if(!$('#camposExtra')) return;
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
  if(!$('#filtrosExtra')) return;
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

if($('#formRegistro')){
  $('#formRegistro').addEventListener('submit', e => {
    e.preventDefault();
    if(!$('#rCliente').value){ aviso('Elige un cliente o créalo con “+ Nuevo”.', 'error'); return; }
    const precio = Number($('#rPrecio').value);
    if(!($('#rMetodo').value)){ aviso('Elige un método de pago.', 'error'); return; }
    if(!(precio >= 0)){ aviso('El precio no es válido.', 'error'); return; }

    const clienteId = $('#rCliente').value;
    const clienteObj = estado.clientes.find(c => c.id === clienteId);
    const isVIP = clienteObj && clienteObj.categoria === 'VIP';
    
    const fechaReg = aFecha($('#rFecha').value);
    const rFechaPagoVal = $('#rFechaPago') ? $('#rFechaPago').value : '';
    const rFechaCorteVal = $('#rFechaCorte') ? $('#rFechaCorte').value : '';

    if(rFechaPagoVal) {
      const fp = aFecha(rFechaPagoVal);
      if((fp - fechaReg) / (1000*60*60*24) > 45 && !isVIP) {
        aviso('La fecha de pago supera los 45 días. Solo para clientes VIP.', 'error'); return;
      }
    }
    if(rFechaCorteVal) {
      const fc = aFecha(rFechaCorteVal);
      if((fc - fechaReg) / (1000*60*60*24) > 45 && !isVIP) {
        aviso('La fecha de corte supera los 45 días. Solo para clientes VIP.', 'error'); return;
      }
    }

    const extra = {};
    estado.config.campos.forEach(c => {
      const el = $(`#cx-${c.id}`);
      if(el && el.value !== '') extra[c.id] = el.value;
    });

    const base = {
      fecha:  $('#rFecha').value,
      fechaPagoPrevista: rFechaPagoVal,
      fechaCorte: rFechaCorteVal,
      nombre: '',
      vendedorId: ($('#rVendedor') && $('#rVendedor').value) ? $('#rVendedor').value : undefined,
      figura: $('#rFigura') ? $('#rFigura').value.trim() : '',
      metodo: $('#rMetodo').value,
      precio,
      estado: estadoForm(),
      extra,
      actualizado: new Date().toISOString()
    };
    
    if(typeof prepararRegistro === 'function') {
      prepararRegistro(base, editandoId ? estado.registros.find(x => x.id === editandoId) : null);
    }

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
      const ab = $('#rAbono') ? Number($('#rAbono').value) : 0;
      
      if(nuevo.estado === 'apartado' && ab > 0){
        nuevo.abonos.push({ 
          id: uid(), 
          fecha: ($('#rAbonoFecha') && $('#rAbonoFecha').value) ? $('#rAbonoFecha').value : nuevo.fecha, 
          monto: ab, 
          metodo: ($('#rAbonoMetodo') && $('#rAbonoMetodo').value) ? $('#rAbonoMetodo').value : nuevo.metodo,
          nota: $('#rNota') ? $('#rNota').value.trim() : '' 
        });
        if(ab >= precio){ nuevo.estado = 'pagado'; nuevo.fechaPago = nuevo.fecha; }
      }
      estado.registros.push(nuevo);
      guardar();
      aviso(`Registro guardado como ${nuevo.estado === 'pagado' ? 'pagado' : 'apartado'}.`);
      limpiarForm();
    }
    pintarLista();
    pintarDashboard();
  });
}

if($('#btnVaciar')) $('#btnVaciar').addEventListener('click', limpiarForm);

function limpiarForm(){
  if($('#formRegistro')) $('#formRegistro').reset();
  if($('#rFecha')) $('#rFecha').value = hoyISO();
  if($('#rFechaHint')) $('#rFechaHint').textContent = fmtFecha(hoyISO());
  
  if($('#rFechaPago')) $('#rFechaPago').value = '';
  if($('#rFechaCorte')) $('#rFechaCorte').value = '';
  if($('#rAbonoFecha')) $('#rAbonoFecha').value = hoyISO();
  if($('#rAbonoMetodo')) $('#rAbonoMetodo').value = '';

  ponerEstadoForm('pagado');
  pintarCamposForm();
  previewPrecio();
}

function editarRegistro(id){
  const r = estado.registros.find(x => x.id === id);
  if(!r) return;
  editandoId = id;
  irA('registro');
  if($('#tituloRegistro')) $('#tituloRegistro').textContent = 'Editar registro';
  if($('#btnGuardar')) $('#btnGuardar').textContent = 'Guardar cambios';
  if($('#btnCancelarEdicion')) $('#btnCancelarEdicion').hidden = false;
  
  if($('#rFecha')) $('#rFecha').value = r.fecha;
  if($('#rFechaHint')) $('#rFechaHint').textContent = fmtFecha(r.fecha);
  
  if($('#rFechaPago')) $('#rFechaPago').value = r.fechaPagoPrevista || '';
  if($('#rFechaCorte')) $('#rFechaCorte').value = r.fechaCorte || '';

  if($('#rCliente')) $('#rCliente').value = r.clienteId || ''; 
  if($('#rVendedor')) $('#rVendedor').value = r.vendedorId || '';
  if($('#rFigura')) $('#rFigura').value = r.figura;
  pintarMetodos();
  
  if($('#rMetodo')) {
    if(r.metodo && !estado.config.metodosPago.includes(r.metodo)){
      $('#rMetodo').insertAdjacentHTML('beforeend', `<option value="${esc(r.metodo)}">${esc(r.metodo)}</option>`);
    }
    $('#rMetodo').value = r.metodo || '';
  }
  
  if($('#rPrecio')) $('#rPrecio').value = r.precio;
  ponerEstadoForm(r.estado);
  if($('#abonoInicial')) $('#abonoInicial').hidden = true;
  pintarCamposForm(r.extra || {});
  previewPrecio();
}

function salirEdicion(){
  editandoId = null;
  if($('#tituloRegistro')) $('#tituloRegistro').textContent = 'Nuevo registro';
  if($('#btnGuardar')) $('#btnGuardar').textContent = 'Guardar registro';
  if($('#btnCancelarEdicion')) $('#btnCancelarEdicion').hidden = true;
  limpiarForm();
}
if($('#btnCancelarEdicion')) $('#btnCancelarEdicion').addEventListener('click', () => { salirEdicion(); irA('lista'); });

/* ==========================================================
   9. Configuración
   ========================================================== */
if($('#formTasas')) {
  $('#formTasas').addEventListener('submit', e => {
    e.preventDefault();
    estado.config.tasaBs   = Number($('#cTasaBs').value) || 0;
    estado.config.tasaPeso = Number($('#cTasaPeso').value) || 0;
    estado.config.tasasFecha = hoyISO();
    guardar();
    pintarConfig(); pintarDashboard(); pintarLista(); previewPrecio();
    aviso('Tasas guardadas.');
  });
}

if($('#formMetodo')) {
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
}

if($('#cCampoTipo')) {
  $('#cCampoTipo').addEventListener('change', () => {
    if($('#wrapOpciones')) $('#wrapOpciones').hidden = $('#cCampoTipo').value !== 'lista';
  });
}

if($('#formCampo')){
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
    $('#formCampo').reset(); if($('#wrapOpciones')) $('#wrapOpciones').hidden = true;
    pintarConfig(); pintarCamposForm(); pintarFiltrosExtra();
    aviso(`Campo “${etiqueta}” añadido al registro y a la búsqueda.`);
  });
}

function pintarConfig(){
  const c = estado.config;
  if($('#cTasaBs')) $('#cTasaBs').value   = c.tasaBs   || '';
  if($('#cTasaPeso')) $('#cTasaPeso').value = c.tasaPeso || '';
  if($('#tasaEjemplo')) {
    $('#tasaEjemplo').innerHTML = (c.tasaBs > 0 || c.tasaPeso > 0)
      ? `<b>$1</b> = ${c.tasaBs > 0 ? '<b>Bs ' + num(c.tasaBs) + '</b>' : 'Bs —'} = ${c.tasaPeso > 0 ? '<b>' + num(c.tasaPeso, 0) + ' COP</b>' : '— COP'}`
      : 'Aún no has puesto las tasas: los precios solo se mostrarán en dólares.';
  }

  if($('#listaMetodos')) {
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
  }

  if($('#listaCampos')) {
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
  }

  const bytes = new Blob([JSON.stringify(estado)]).size;
  if(typeof pintarConfigClientes === 'function') pintarConfigClientes();
  if($('#infoAlmacen')) {
    $('#infoAlmacen').textContent =
      `${estado.registros.length} registros guardados en este navegador · ${(bytes / 1024).toFixed(1)} KB`;
  }

  pintarTasasNav();
}

/* ==========================================================
   10. Respaldo y EXPORTACIÓN EXCEL
   ========================================================== */
function descargar(nombre, contenido, tipo){
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if($('#btnExportar')){
  $('#btnExportar').addEventListener('click', () => {
    descargar(`registro-torii-${hoyISO()}.json`, JSON.stringify(estado, null, 2), 'application/json');
    aviso('Respaldo JSON descargado.');
  });
}

if($('#btnExportarExcel')){
  $('#btnExportarExcel').addEventListener('click', () => {
    if(!estado.registros.length) { aviso('No hay registros para exportar.', 'error'); return; }
    
    let csv = 'ID,Fecha de Registro,Cliente,Figura,Método Principal,Precio Total ($),Abonado ($),Restante ($),Estado,Fecha Pago,Fecha Corte,Abonos Detallados\n';
    
    estado.registros.forEach(r => {
      const cli = estado.clientes.find(c => c.id === r.clienteId);
      const nombreCli = cli ? cli.nombre : '';
      
      const abs = (r.abonos || []).map(a => `${a.monto}$ vía ${a.metodo} (${a.fecha})`).join(' | ');
      const fp = r.fechaPagoPrevista || '';
      const fc = r.fechaCorte || '';
      const totalA = abonado(r);
      const falta = restante(r);
      
      csv += `"${r.id}","${r.fecha}","${nombreCli}","${r.figura}","${r.metodo}","${r.precio}","${totalA}","${falta}","${r.estado}","${fp}","${fc}","${abs}"\n`;
    });

    const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Reporte_Torii_Excel_${hoyISO()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    aviso('Reporte Excel descargado correctamente.');
  });
}

if($('#inputImportar')){
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
        estado.clientes = Array.isArray(data.clientes) ? data.clientes : [];
        estado.vendedores = Array.isArray(data.vendedores) ? data.vendedores : [];
        estado.config = Object.assign(clonar(CONFIG_BASE), data.config || {});
        if(typeof migrar === 'function') migrar(); 
        guardar(); iniciarUI();
        aviso('Respaldo importado.');
      }catch(err){
        aviso('Ese archivo no es un respaldo de Registro Torii.', 'error');
      }
    };
    lector.readAsText(file);
    e.target.value = '';
  });
}

if($('#btnBorrarTodo')){
  $('#btnBorrarTodo').addEventListener('click', () => {
    if(!confirm('Esto borra todos los registros y la configuración de este navegador. ¿Seguro?')) return;
    if(!confirm('Última confirmación: se perderá todo si no tienes respaldo. ¿Borrar?')) return;
    estado = { registros: [], clientes: [], vendedores: [], config: clonar(CONFIG_BASE) };
    guardar(); iniciarUI();
    aviso('Todos los datos fueron borrados.', 'info');
  });
}

/* ==========================================================
   11. Arranque
   ========================================================== */
function iniciarUI(){
  if(typeof iniciarClientes === 'function') iniciarClientes();
  pintarPanelFiltros();
  pintarMetodos();
  pintarCamposForm();
  pintarFiltrosExtra();
  limpiarForm();
  pintarConfig();
  pintarLista();
  pintarDashboard();
}

cargar();
if(typeof migrar === 'function') migrar();
iniciarUI();
irA('dashboard');

/* ==========================================================
   12. Funcionamiento sin internet
   ========================================================== */
function pintarEstadoRed(){
  if($('#estadoRed')) $('#estadoRed').hidden = navigator.onLine !== false;
}
window.addEventListener('online',  () => { pintarEstadoRed(); aviso('Conexión restablecida.', 'info'); });
window.addEventListener('offline', () => { pintarEstadoRed(); aviso('Sin conexión: la app sigue funcionando.', 'info'); });
pintarEstadoRed();

if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updateflow', () => {});
    }).catch(() => { });
  });

  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if(recargando) return;
    recargando = true;
    location.reload();
  });
}
