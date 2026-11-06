'use strict';
/* Registro Torii — clientes.js: clientes, categorías, plazo de 45 días e historial.
   Usa las funciones de app.js (se cargan antes de que se ejecute cualquier cosa de aquí). */

const DIAS_LIMITE = 45;
const norm = s => String(s || '').trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const sumarDias = (iso, n) => { const d = aFecha(iso); d.setDate(d.getDate() + n); return isoDe(d); };

/* ---------- plazo de apartados ---------- */
const fechaApartado = r => r.fechaApartado || (r.estado === 'apartado' ? r.fecha : null);
const limiteDe = r => { 
  if (r.corteVip) return r.corteVip; 
  const f = fechaApartado(r); 
  return f ? sumarDias(f, DIAS_LIMITE) : null; 
};

function estadoLimite(r){                                   // solo para apartados pendientes
  const dias = Math.round((aFecha(limiteDe(r)) - aFecha(hoyISO())) / 864e5);
  if(dias < 0) return { cls: 'vencido', txt: `Vencido hace ${-dias} ${-dias === 1 ? 'día' : 'días'}` };
  if(dias === 0) return { cls: 'pronto', txt: 'Vence hoy' };
  return { cls: dias <= 7 ? 'pronto' : 'ok', txt: `Quedan ${dias} ${dias === 1 ? 'día' : 'días'}` };
}
function limiteHtml(r){
  if(r.estado !== 'apartado') return '';
  return `<small class="lim ${estadoLimite(r).cls}">Hasta ${fmtFecha(limiteDe(r))}</small>`;
}
function plazoDatos(r){
  const v = estado.vendedores.find(x => x.id === r.vendedorId);
  const vd = v ? `<div class="m-dato"><span>Vendedor</span><b>${esc(v.nombre)} · ${esc(v.ide)}</b></div>` : '';
  const fa = fechaApartado(r);
  if(!fa) return vd;
  const e = r.estado === 'apartado' ? estadoLimite(r) : null;
  return vd + `<div class="m-dato"><span>Apartado el</span><b>${fmtFecha(fa)}</b></div>
    <div class="m-dato"><span>Límite de pago (${DIAS_LIMITE} días)</span><b class="${e ? 'lim ' + e.cls : ''}">${fmtFecha(limiteDe(r))}${e ? ' · ' + e.txt : ''}</b></div>
    ${r.estado === 'pagado' ? `<div class="m-dato"><span>Pagado el</span><b>${fmtFecha(r.fechaPago || r.fecha)}</b></div>` : ''}`;
}

/* ---------- vínculo registro ↔ cliente ---------- */
const clientePorNombre = n => estado.clientes.find(c => norm(c.nombre) === norm(n));
const regsDe = c => estado.registros.filter(r => r.clienteId === c.id);
function primeraCompra(c){ const f = regsDe(c).map(r => r.fecha).filter(Boolean).sort(); return f[0] || ''; }

function autoVincular(){
  let cambio = false;
  estado.registros.forEach(r => {
    if(r.clienteId && estado.clientes.some(c => c.id === r.clienteId)) return;
    const c = clientePorNombre(r.nombre);
    if(c){ r.clienteId = c.id; r.nombre = c.nombre; cambio = true; } else if(r.clienteId){ delete r.clienteId; cambio = true; }
  });
  return cambio;
}
function migrar(){                                          // completa datos de versiones anteriores
  let cambio = false;
  estado.vendedores = estado.vendedores || [];
  estado.clientes.forEach(c => { if(!Array.isArray(c.categorias)) c.categorias = []; });
  [...estado.clientes].filter(c => !c.idc).sort((a, b) => (a.creado || '').localeCompare(b.creado || '')).forEach(c => { c.idc = nuevoIdc(); cambio = true; });
  [...estado.registros].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).forEach(r => {   // nombres sueltos → perfil de cliente
    if(!r.nombre || r.clienteId || clientePorNombre(r.nombre)) return;
    estado.clientes.push({ id: uid(), idc: nuevoIdc(), nombre: r.nombre, cedula: '', telefono: '', categorias: [], creado: r.creado || new Date().toISOString() });
    cambio = true;
  });
  estado.registros.forEach(r => {
    if(r.estado === 'apartado' && !r.fechaApartado){ r.fechaApartado = r.fecha; cambio = true; }
    if(r.estado === 'pagado' && !r.fechaPago){ r.fechaPago = r.fecha; cambio = true; }
  });
  if(autoVincular()) cambio = true;
  if(cambio) guardar();
}
function prepararRegistro(b, prev){                         // se llama al guardar un registro
  const c = estado.clientes.find(k => k.id === $('#rCliente').value);
  b.clienteId = c.id; b.nombre = c.nombre;
  if(b.estado === 'apartado'){ b.fechaApartado = b.fecha; b.fechaPago = undefined; return; }
  const fa = prev && (prev.fechaApartado || (prev.estado === 'apartado' ? prev.fecha : null));
  b.fechaApartado = fa || undefined;
  b.fechaPago = prev && prev.estado === 'apartado' ? hoyISO() : (prev && prev.fechaPago) || b.fecha;
}

/* ---------- ayudas del formulario de registro ---------- */
function pintarExtrasForm(){
  const ap = estadoForm() === 'apartado' && $('#rFecha').value;
  
  const cliId = $('#rCliente').value;
  const cli = estado.clientes.find(c => c.id === cliId);
  const esVip = cli && cli.categorias && cli.categorias.some(c => c.toLowerCase().includes('vip'));
  
  const divVip = $('#zonaVip');
  if(divVip) {
      if(ap && esVip) divVip.hidden = false;
      else divVip.hidden = true;
  }

  const corteVip = $('#rCorteVip') ? $('#rCorteVip').value : null;
  const fCorte = corteVip ? corteVip : sumarDias($('#rFecha').value, DIAS_LIMITE);

  $('#plazoBox').innerHTML = ap
    ? `Apartado el <b>${fmtFecha($('#rFecha').value)}</b> · Límite: <b>${fmtFecha(fCorte)}</b> ${corteVip ? '<span style="color:#FFBC002D">(VIP)</span>' : `(${DIAS_LIMITE} días)`}` : '';
}

/* ---------- lista de clientes ---------- */
function tagsHtml(c){ return c.categorias.map(t => `<span class="tag tag-r">${esc(t)}</span>`).join(''); }

function pintarClientes(){
  const q = norm($('#cBuscar').value), cat = $('#cCategoria').value, ord = $('#cOrden').value;
  const datos = estado.clientes.filter(c => (!q || norm(c.nombre + ' ' + c.idc + ' ' + (c.cedula || '')).includes(q)) && (!cat || c.categorias.includes(cat))).map(c => {
    const rs = regsDe(c);
    return { c, n: rs.length, pag: rs.filter(r => r.estado === 'pagado').length, apa: rs.filter(r => r.estado === 'apartado').length,
      total: rs.filter(r => r.estado === 'pagado').reduce((s, r) => s + (+r.precio || 0), 0), pf: primeraCompra(c) };
  });
  datos.sort((a, b) => ord === 'compras' ? b.n - a.n : ord === 'primera' ? a.c.idc.localeCompare(b.c.idc) : a.c.nombre.localeCompare(b.c.nombre, 'es'));
  $('#resumenClientes').innerHTML = `<b>${datos.length}</b> ${datos.length === 1 ? 'cliente' : 'clientes'}`;
  $('#listaClientes').innerHTML = datos.length ? datos.map(d => `
    <button class="cli" data-id="${d.c.id}">
      <b class="cli-nombre">${esc(d.c.nombre)} <span class="idc">${esc(d.c.idc)}</span></b>
      <div class="tags">${tagsHtml(d.c)}</div>
      <div class="cli-datos"><span>Primera compra <b>${d.pf ? fmtFecha(d.pf) : '—'}</b></span><span>${d.pag} pagadas · ${d.apa} apartadas</span><span>Total pagado <b>${usd(d.total)}</b></span></div>
    </button>`).join('')
    : `<div class="vacio"><b>Sin clientes</b>${estado.clientes.length ? 'Ningún cliente coincide con la búsqueda.' : 'Añade tu primer cliente con “Nuevo cliente”.'}</div>`;
  $$('#listaClientes .cli').forEach(b => b.addEventListener('click', () => abrirCliente(b.dataset.id)));
  const sel = $('#cCategoria'), act = sel.value;
  sel.innerHTML = '<option value="">Todas las categorías</option>' + estado.config.categoriasCliente.map(t => `<option>${esc(t)}</option>`).join('');
  sel.value = estado.config.categoriasCliente.includes(act) ? act : '';
  const orden = [...estado.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  $('#dlClientes').innerHTML = orden.map(c => `<option value="${esc(etiquetaCliente(c))}">`).join('');
  [['#xCliente', 'Elige un cliente…']].forEach(([id, ph]) => {
    const el = $(id), v = el.value;
    el.innerHTML = `<option value="">${ph}</option>` + orden.map(c => `<option value="${c.id}">${esc(etiquetaCliente(c))}</option>`).join('');
    el.value = estado.clientes.some(c => c.id === v) ? v : '';
  });
  if(typeof comboCliente !== 'undefined' && comboCliente) comboCliente.refrescar();
}

/* ---------- ficha e historial ---------- */
function abrirCliente(id){
  const c = estado.clientes.find(k => k.id === id);
  if(!c) return;
  const rs = regsDe(c).sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.creado || '').localeCompare(a.creado || ''));
  const pag = rs.filter(r => r.estado === 'pagado'), apa = rs.filter(r => r.estado === 'apartado'), pf = primeraCompra(c);
  const total = pag.reduce((s, r) => s + (+r.precio || 0), 0), cobrar = apa.reduce((s, r) => s + restante(r), 0);
  const tel = c.telefono ? `<div class="m-dato tel"><span>Teléfono</span><b>${esc(c.telefono)}</b>
      <div class="tel-btns"><a class="btn btn-linea" href="${hrefTel(c.telefono)}">${ICO_TEL} Llamar</a><a class="btn btn-verde" href="${hrefWa(c.telefono)}" target="_blank" rel="noopener">${ICO_WA} WhatsApp</a></div></div>` : '';
  $('#modalContenido').innerHTML = `
    <div class="m-head"><h2 id="mFigura">${esc(c.nombre)} - <span class="idc">${esc(c.idc)}</span></h2><div class="tags">${tagsHtml(c) || '<small class="hint">Sin categoría</small>'}</div></div>
    <div class="m-datos">
      <div class="m-dato"><span>Primera compra</span><b>${pf ? fmtFecha(pf) : 'Aún sin compras'}</b></div>
      <div class="m-dato"><span>Registrado en la app</span><b>${c.creado ? fmtFecha(fechaAlta(c)) : '—'}</b></div>
      ${c.cedula ? `<div class="m-dato"><span>Cédula</span><b>${esc(c.cedula)}</b></div>` : ''}
      <div class="m-dato"><span>Figuras</span><b>${pag.length} pagadas · ${apa.length} apartadas</b></div>
      <div class="m-dato"><span>Total pagado</span><b>${usd(total)} · ${bs(total)}</b></div>
      <div class="m-dato"><span>Por cobrar</span><b>${usd(cobrar)}</b></div>
      ${tel}
    </div>
    <div class="m-abonos"><h3>Historial de figuras</h3>
      <ul class="abono-lista hist">${rs.map(r => `<li data-id="${r.id}"><span>${fmtFecha(r.fecha)} · ${esc(r.figura)}<br><small>${esc(r.metodo || '—')} · ${r.estado === 'pagado' ? 'Pagado el ' + fmtFecha(r.fechaPago || r.fecha) : 'Límite ' + fmtFecha(limiteDe(r))}</small></span>
        <span><b>${usd(r.precio)}</b> <i class="badge ${r.estado}">${r.estado === 'pagado' ? 'Pagado' : 'Apartado'}</i></span></li>`).join('') || '<li><span>Todavía no tiene registros.</span></li>'}</ul></div>
    <div class="m-acciones">
      <button class="btn btn-rojo" id="cNuevoReg">Nuevo registro</button>
      <button class="btn btn-linea" id="cExcel">Excel</button>
      <button class="btn btn-linea" id="cEditar">Editar perfil</button>
      <button class="btn btn-peligro" id="cEliminar">Eliminar</button>
    </div>`;
  $('#modal').hidden = false; document.body.style.overflow = 'hidden';
  $$('#modalContenido .hist li[data-id]').forEach(li => li.addEventListener('click', () => abrirDetalle(li.dataset.id)));
  $('#cEditar').addEventListener('click', () => formCliente(id));
  $('#cExcel').addEventListener('click', () => exportarCliente(id));
  $('#cNuevoReg').addEventListener('click', () => { cerrarModal(); irA('registro'); $('#rCliente').value = id; });
  $('#cEliminar').addEventListener('click', () => {
    if(!confirm(`¿Eliminar el perfil de "${c.nombre}"? Sus ${rs.length} registros NO se borran.`)) return;
    estado.clientes = estado.clientes.filter(k => k.id !== id);
    estado.registros.forEach(r => { if(r.clienteId === id) delete r.clienteId; });
    guardar(); cerrarModal(); pintarClientes(); aviso('Perfil eliminado.', 'info');
  });
}

function formCliente(id, alGuardar){
  const c = id ? estado.clientes.find(k => k.id === id) : { nombre: '', cedula: '', telefono: '', categorias: [] };
  const pf = id ? primeraCompra(c) : '';
  $('#modalContenido').innerHTML = `
    <div class="m-head"><h2 id="mFigura">${id ? 'Editar cliente' : 'Nuevo cliente'} ${id ? `<span class="idc">${esc(c.idc)}</span>` : ''}</h2></div>
    <form id="formCliente" class="form-cli">
      <label>Nombre completo <input type="text" id="kNombre" required value="${esc(c.nombre)}" placeholder="Ej. Ana María Pérez"></label>
      <div class="form-grid">
        <label>Cédula de identidad <span class="opcional">opcional</span><input type="text" id="kCedula" value="${esc(c.cedula || '')}" placeholder="Ej. V-12345678"></label>
        <label>Teléfono <span class="opcional">opcional</span><input type="tel" id="kTelefono" value="${esc(c.telefono || '')}" placeholder="Ej. +58 412 1234567"></label>
        <label>ID del cliente (IDC) <span class="opcional">vacío = automático</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <b style="font-family:var(--mono); color:var(--gris-2); font-size:14px; padding-left:4px;">IDC</b>
            <input type="number" id="kIdcNum" min="1" max="99999" value="${c.idc ? Number(soloDig(c.idc)) : ''}" placeholder="Ej. 15" style="flex:1;">
          </div>
        </label>
      </div>
      <div class="campo"><span class="campo-label">Categoría (puedes marcar varias)</span>
        <div class="tags">${estado.config.categoriasCliente.map(t => `<label class="chk-tag"><input type="checkbox" value="${esc(t)}" ${c.categorias.includes(t) ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('') || '<small class="hint">Añade categorías en Configuración.</small>'}</div></div>
      <div class="m-datos">
        <div class="m-dato"><span>Primera compra (automática)</span><b>${pf ? fmtFecha(pf) : 'Al registrar su primera figura'}</b></div>
      </div>
      <div class="m-acciones"><button class="btn btn-rojo" type="submit">Guardar cliente</button><button class="btn btn-ghost" type="button" id="kCancelar">Cancelar</button></div>
    </form>`;
  $('#modal').hidden = false; document.body.style.overflow = 'hidden';
  $('#kCancelar').addEventListener('click', () => id ? abrirCliente(id) : cerrarModal());
  $('#formCliente').addEventListener('submit', e => {
    e.preventDefault();
    const nombre = $('#kNombre').value.trim().replace(/\s+/g, ' ');
    const cats = $$('#formCliente input[type=checkbox]:checked').map(i => i.value);
    
    let finalIdc = '';
    const inputIdc = $('#kIdcNum').value.trim();
    if(inputIdc){
      finalIdc = 'IDC' + inputIdc.padStart(5, '0');
      if(estado.clientes.some(x => x.idc === finalIdc && x.id !== id)){
        aviso('Ese IDC ya está ocupado por otro cliente.', 'error');
        return;
      }
    } else {
      finalIdc = id ? c.idc : nuevoIdc();
    }
    
    const datos = { nombre, cedula: $('#kCedula').value.trim(), telefono: $('#kTelefono').value.trim(), categorias: cats, idc: finalIdc };
    let k = c;
    if(id){ estado.registros.forEach(r => { if(r.clienteId === id) r.nombre = nombre; }); Object.assign(c, datos); }
    else { k = Object.assign({ id: uid(), creado: new Date().toISOString() }, datos); estado.clientes.push(k); }
    guardar(); pintarClientes(); pintarLista();
    aviso(id ? 'Perfil actualizado.' : `Cliente añadido (${k.idc}).`);
    if(alGuardar){ cerrarModal(); alGuardar(k); } else abrirCliente(k.id);
  });
}

/* ---------- Configuración: categorías de rango ---------- */
function pintarConfigClientes(){
  const cats = estado.config.categoriasCliente;
  $('#listaCategorias').innerHTML = cats.map((t, i) => `<span class="tag">${esc(t)} <button data-cat="${i}" aria-label="Quitar ${esc(t)}">✕</button></span>`).join('')
    || '<span style="color:var(--gris-2);font-size:13px">No hay categorías. Añade la primera.</span>';
  $$('#listaCategorias button').forEach(b => b.addEventListener('click', () => {
    const t = cats[+b.dataset.cat];
    if(!confirm(`¿Quitar la categoría “${t}”? También se quitará de los perfiles que la tengan.`)) return;
    cats.splice(+b.dataset.cat, 1);
    estado.clientes.forEach(c => { c.categorias = c.categorias.filter(x => x !== t); });
    guardar(); pintarConfigClientes(); pintarClientes();
  }));
  pintarVendedores();
}

let clientesListo = false;
function iniciarClientes(){
  if(!clientesListo){
    clientesListo = true;
    $('#cBuscar').addEventListener('input', pintarClientes);
    ['#cCategoria', '#cOrden'].forEach(s => $(s).addEventListener('change', pintarClientes));
    iniciarComboCliente();
    $('#btnNuevoCliente').addEventListener('click', () => formCliente(null));
    $('#btnNuevoCli').addEventListener('click', () => formCliente(null, k => { $('#rCliente').value = k.id; }));
    $('#formCategoria').addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#nuevaCategoria').value.trim(), cats = estado.config.categoriasCliente;
      if(!v) return;
      if(cats.some(t => norm(t) === norm(v))){ aviso('Esa categoría ya existe.', 'error'); return; }
      cats.push(v); guardar(); $('#nuevaCategoria').value = ''; pintarConfigClientes(); pintarClientes();
      aviso(`Categoría “${v}” añadida.`);
    });
    $('#rFecha').addEventListener('input', pintarExtrasForm);
    $$('#rEstado .seg').forEach(b => b.addEventListener('click', pintarExtrasForm));
    $('#btnXRegistros').addEventListener('click', exportarRegistros);
    $('#btnXCliente').addEventListener('click', () => exportarCliente());
    $('#btnNuevoVendedor').addEventListener('click', () => formVendedor(null));
    $('#btnCampana').addEventListener('click', () => irA('notif'));
    $('#btnVolverNotif').addEventListener('click', () => irA('dashboard'));
    $('#btnTasas').addEventListener('click', abrirTasas);
    $('#chipTasa').addEventListener('click', abrirTasas);
    $('#btnTasas').addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); abrirTasas(); } });
    $$('.estado-box[data-ir]').forEach(b => b.addEventListener('click', () => {      // atajo del Dashboard → lista filtrada
      irA('lista'); $('#btnLimpiar').click(); $('#fEstado').value = b.dataset.ir; pintarLista();
    }));
  }
  pintarClientes(); pintarConfigClientes(); pintarExtrasForm(); pintarCampana();
}

/* ---------- datos de contacto ---------- */
const fechaAlta = c => c.creado ? isoDe(new Date(c.creado)) : '';
const etiquetaCliente = c => `${c.nombre} ${c.idc}`;
const soloDig = t => String(t || '').replace(/\D/g, '');
const hrefTel = t => 'tel:' + (String(t).trim().startsWith('+') ? '+' : '') + soloDig(t);
const hrefWa = t => { let d = soloDig(t); if(d.startsWith('0')) d = '58' + d.slice(1); return 'https://wa.me/' + d; };   // un 0 inicial se toma como Venezuela (58)
const ICO_TEL = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z"/></svg>';
const ICO_WA = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.3.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></svg>';

function nuevoIdc(){
  const mx = Math.max(0, ...estado.clientes.map(c => +soloDig(c.idc) || 0)), n = Math.max(+estado.config.contIDC || 0, mx) + 1;
  estado.config.contIDC = n; return 'IDC' + String(n).padStart(5, '0');
}
function nuevoIde(){
  const mx = Math.max(0, ...estado.vendedores.map(v => +soloDig(v.ide) || 0)), n = Math.max(+estado.config.contIDE || 0, mx) + 1;
  estado.config.contIDE = n; return 'IDE' + String(n).padStart(3, '0');
}
function coincideCliente(r, t){                               // por nombre o por IDC (acepta "Ana Pérez IDC00001")
  const m = String(t).match(/IDC\d+/i);
  if(m){ const c = estado.clientes.find(k => k.id === r.clienteId); return !!c && c.idc.toUpperCase().startsWith(m[0].toUpperCase()); }
  return norm(r.nombre).includes(norm(t));
}

/* ---------- vendedores ---------- */
function pintarVendedores(){
  const vs = estado.vendedores;
  const llenar = (sel, primero) => { const a = $(sel).value; $(sel).innerHTML = `<option value="">${primero}</option>` + vs.map(v => `<option value="${v.id}">${esc(v.nombre)} ${esc(v.ide)}</option>`).join(''); $(sel).value = vs.some(v => v.id === a) ? a : ''; };
  llenar('#rVendedor', 'Sin vendedor'); llenar('#fVendedor', 'Todos');
  $('#listaVendedores').innerHTML = vs.length ? vs.map(v => `
    <div class="campo-item"><div class="campo-item-head">
      <div><b>${esc(v.nombre)}</b><span class="campo-tipo">${esc(v.ide)}</span><br><small class="hint">Ingreso ${v.ingreso ? fmtFecha(v.ingreso) : '—'} · ${esc(v.telefono || 'sin teléfono')}</small></div>
      <div><button class="btn btn-ghost" data-ev="${v.id}">Editar</button><button class="btn btn-ghost" data-qv="${v.id}">Quitar</button></div></div></div>`).join('')
    : '<p style="color:var(--gris-2);font-size:13px;margin:0 0 12px">Aún no hay vendedores.</p>';
  $$('#listaVendedores [data-ev]').forEach(b => b.addEventListener('click', () => formVendedor(b.dataset.ev)));
  $$('#listaVendedores [data-qv]').forEach(b => b.addEventListener('click', () => {
    const v = vs.find(x => x.id === b.dataset.qv);
    if(!confirm(`¿Quitar al vendedor “${v.nombre}”? Sus ventas conservan el registro pero dejan de mostrar su nombre.`)) return;
    estado.vendedores = vs.filter(x => x.id !== v.id); guardar(); pintarVendedores(); pintarLista();
  }));
}
function formVendedor(id){
  const v = id ? estado.vendedores.find(x => x.id === id) : { nombre: '', ingreso: '', telefono: '' };
  $('#modalContenido').innerHTML = `
    <div class="m-head"><h2 id="mFigura">${id ? 'Editar vendedor' : 'Nuevo vendedor'} ${id ? `<span class="idc">${esc(v.ide)}</span>` : ''}</h2></div>
    <form id="formVend" class="form-cli">
      <label>Nombre del vendedor <input type="text" id="vNombre" required value="${esc(v.nombre)}"></label>
      <div class="form-grid">
        <label>Fecha de ingreso a la empresa <input type="date" id="vIngreso" value="${esc(v.ingreso || '')}"></label>
        <label>Número de teléfono <input type="tel" id="vTelefono" value="${esc(v.telefono || '')}"></label>
      </div>
      <div class="m-dato"><span>ID del empleado</span><b>${id ? esc(v.ide) : 'Se genera al guardar'}</b></div>
      <div class="m-acciones"><button class="btn btn-rojo" type="submit">Guardar vendedor</button><button class="btn btn-ghost" type="button" data-cerrar>Cancelar</button></div>
    </form>`;
  $('#modal').hidden = false; document.body.style.overflow = 'hidden';
  $('#modalContenido [data-cerrar]').addEventListener('click', cerrarModal);
  $('#formVend').addEventListener('submit', e => {
    e.preventDefault();
    const datos = { nombre: $('#vNombre').value.trim(), ingreso: $('#vIngreso').value, telefono: $('#vTelefono').value.trim() };
    if(id) Object.assign(v, datos); else estado.vendedores.push(Object.assign({ id: uid(), ide: nuevoIde() }, datos));
    guardar(); cerrarModal(); pintarVendedores(); pintarLista(); aviso(id ? 'Vendedor actualizado.' : 'Vendedor añadido.');
  });
}

/* ---------- notificaciones de pago ---------- */
function avisosPago(){
  return estado.registros.filter(r => r.estado === 'apartado').map(r => ({ r, dias: Math.round((aFecha(limiteDe(r)) - aFecha(hoyISO())) / 864e5) }))
    .filter(x => x.dias <= 7).sort((a, b) => a.dias - b.dias).map(x => Object.assign(x, { nivel: x.dias <= 3 ? 'rojo' : 'amarillo' }));
}
function pintarCampana(){
  const n = avisosPago().length, b = $('#cntNotif');
  b.textContent = n; b.hidden = !n;
  $('#btnCampana').classList.toggle('urgente', avisosPago().some(a => a.nivel === 'rojo'));
}
function pintarNotif(){
  $('#fechaNotif').textContent = fmtLargo(hoyISO()).replace(/^\w/, c => c.toUpperCase());
  const av = avisosPago();
  $('#listaNotif').innerHTML = av.length ? av.map(({ r, dias, nivel }) => {
    const c = estado.clientes.find(k => k.id === r.clienteId);
    const cuando = dias < 0 ? `Vencido hace ${-dias} ${-dias === 1 ? 'día' : 'días'}` : dias === 0 ? 'Vence hoy' : `Quedan ${dias} ${dias === 1 ? 'día' : 'días'}`;
    return `<button class="notif ${nivel}" data-id="${r.id}"><span class="notif-tag">${nivel === 'rojo' ? 'Urgente' : 'Recordatorio'}</span>
      <b>${esc(r.nombre)}${c ? ' · ' + esc(c.idc) : ''}</b><span>${esc(r.figura)} · Falta ${usd(restante(r))}</span><small>Fecha límite ${fmtFecha(limiteDe(r))} · ${cuando}</small></button>`;
  }).join('') : '<div class="vacio"><b>Sin recordatorios</b>Ningún apartado vence en los próximos 7 días.</div>';
  $$('#listaNotif .notif').forEach(b => b.addEventListener('click', () => abrirDetalle(b.dataset.id)));
}

/* ---------- tasas: edición rápida y recordatorio diario ---------- */
let alCerrarModal = null;                                     // lo ejecuta cerrarModal() (X, fondo, Esc o botón)
function aplicarTasas(){
  if(!$('#tBs')) return;
  const b = parseFloat($('#tBs').value), p = parseFloat($('#tPeso').value), c = estado.config;
  let cambio = false;
  if(b > 0 && b !== c.tasaBs){ c.tasaBs = b; cambio = true; }
  if(p > 0 && p !== c.tasaPeso){ c.tasaPeso = p; cambio = true; }
  if(!cambio) return;
  c.tasasFecha = hoyISO(); guardar();
  $('#cTasaBs').value = c.tasaBs || ''; $('#cTasaPeso').value = c.tasaPeso || '';
  pintarTasasNav(); pintarDashboard(); pintarLista(); previewPrecio();
  aviso('Tasa del día guardada.');
}
function abrirTasas(){
  const c = estado.config;
  $('#modalContenido').innerHTML = `
    <div class="m-head"><h2 id="mFigura">Tasa del día</h2><p>Se guarda al confirmar o al cerrar con la X.</p></div>
    <form id="formTasaDia" class="form-cli">
      <label>Bolívares por 1 dólar <input type="number" id="tBs" min="0" step="any" value="${c.tasaBs || ''}"></label>
      <label>Pesos por 1 dólar <input type="number" id="tPeso" min="0" step="any" value="${c.tasaPeso || ''}"></label>
      <small class="hint">${c.tasasFecha ? 'Última actualización: ' + fmtFecha(c.tasasFecha) : 'Aún sin configurar'}</small>
      <button class="btn btn-rojo" type="submit">Confirmar</button>
    </form>`;
  $('#modal').hidden = false; document.body.style.overflow = 'hidden';
  alCerrarModal = aplicarTasas;
  $('#formTasaDia').addEventListener('submit', e => { e.preventDefault(); cerrarModal(); });
  $('#tBs').focus();
}
function recordarTasa(){
  const hoy = hoyISO(), CL = 'registroTorii.ui.tasaAviso';
  let visto = ''; try { visto = localStorage.getItem(CL); } catch(e){}
  if(visto === hoy || estado.config.tasasFecha === hoy) return;
  try { localStorage.setItem(CL, hoy); } catch(e){}
  aviso('Recuerda mantener actualizada la tasa del día.', 'info', { texto: 'Actualizar', fn: abrirTasas, auto: true });
}


/* ==========================================================
   Cliente con autocompletado (pantalla «Nuevo registro»)
   - #rClienteTxt: lo que se escribe / se ve
   - #rCliente (hidden): guarda el id del cliente elegido. Todo el código
     existente sigue haciendo  $('#rCliente').value = id  y funciona igual.
   ========================================================== */
let comboCliente = null;
function iniciarComboCliente(){
  const txt = $('#rClienteTxt'), hid = $('#rCliente'), lista = $('#rClienteLista');
  if(!txt || !hid || !lista || comboCliente) return;
  const MAX = 40, desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const crudo = v => desc.set.call(hid, v);                  // cambia el id sin tocar el texto
  let abierto = false, idx = -1, items = [];

  const elegido = () => estado.clientes.find(k => k.id === hid.value);
  const mostrar = () => { const k = elegido(); txt.value = k ? etiquetaCliente(k) : ''; };

  // Cuando otro código asigna $('#rCliente').value = id, el texto se actualiza solo.
  Object.defineProperty(hid, 'value', { get(){ return desc.get.call(this); }, set(v){ desc.set.call(this, v); mostrar(); } });

  function buscar(q){
    const ts = norm(q).split(' ').filter(Boolean);
    const base = [...estado.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    if(!ts.length) return base;
    const hit = base.filter(k => { const p = norm(`${k.nombre} ${k.idc} ${k.cedula || ''} ${k.telefono || ''}`); return ts.every(t => p.includes(t)); });
    const q0 = ts.join(' ');                                  // los que empiezan igual van primero
    return hit.sort((a, b) => (norm(b.nombre).startsWith(q0) - norm(a.nombre).startsWith(q0)) || a.nombre.localeCompare(b.nombre, 'es'));
  }
  function resaltar(t, q){
    const ts = norm(q).split(' ').filter(Boolean);
    if(!ts.length) return esc(t);
    // se busca sobre el texto sin tildes (misma longitud) para marcar la coincidencia en el original
    const plano = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if(plano.length !== t.length) return esc(t);
    const marca = new Array(t.length).fill(false);
    ts.forEach(w => { let i = plano.indexOf(w); while(i > -1){ for(let j = i; j < i + w.length; j++) marca[j] = true; i = plano.indexOf(w, i + w.length); } });
    let out = '', on = false;
    for(let i = 0; i < t.length; i++){ if(marca[i] !== on){ out += on ? '</mark>' : '<mark>'; on = marca[i]; } out += esc(t[i]); }
    return out + (on ? '</mark>' : '');
  }
  function pintar(){
    const q = txt.value, todos = buscar(q); items = todos.slice(0, MAX);
    if(idx >= items.length) idx = items.length - 1;
    lista.innerHTML = items.length
      ? items.map((k, i) => `<li class="combo-op${i === idx ? ' is-sel' : ''}" role="option" data-i="${i}" id="rcOp${i}"><span>${resaltar(k.nombre, q)}</span><span class="idc">${esc(k.idc)}</span></li>`).join('')
        + (todos.length > MAX ? `<li class="combo-mas">Hay ${todos.length - MAX} más… sigue escribiendo para filtrar.</li>` : '')
      : `<li class="combo-vacio">${estado.clientes.length ? 'Ningún cliente coincide. Usa “+ Nuevo” para crearlo.' : 'Aún no hay clientes. Usa “+ Nuevo” para crear el primero.'}</li>`;
    const sel = lista.querySelector('.is-sel'); if(sel) sel.scrollIntoView({ block: 'nearest' });
    if(sel) txt.setAttribute('aria-activedescendant', sel.id); else txt.removeAttribute('aria-activedescendant');
  }
  function abrir(){ abierto = true; lista.hidden = false; txt.setAttribute('aria-expanded', 'true'); pintar(); }
  function cerrar(){ abierto = false; lista.hidden = true; idx = -1; txt.setAttribute('aria-expanded', 'false'); }
  function elegir(k){ hid.value = k.id; cerrar(); }          // el setter ya escribe el texto

  txt.addEventListener('focus', () => { txt.select(); abrir(); });
  txt.addEventListener('click', () => { if(!abierto) abrir(); });
  txt.addEventListener('input', () => {
    if(hid.value) crudo('');                                  // al escribir se deshace la elección anterior
    idx = txt.value.trim() ? 0 : -1;                          // la primera coincidencia queda lista para Enter
    abrir();
  });
  txt.addEventListener('keydown', e => {
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault(); if(!abierto) abrir();
      if(items.length){ idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; pintar(); }
    } else if(e.key === 'Enter'){
      if(abierto && items[idx]){ e.preventDefault(); elegir(items[idx]); }
      else if(abierto && items.length === 1){ e.preventDefault(); elegir(items[0]); }
    } else if(e.key === 'Escape'){
      if(abierto){ e.preventDefault(); e.stopPropagation(); cerrar(); }
    }
  });
  txt.addEventListener('blur', () => {
    cerrar();
    if(hid.value) { mostrar(); return; }
    const q = norm(txt.value); if(!q) return;
    const ex = estado.clientes.filter(k => norm(k.nombre) === q || norm(etiquetaCliente(k)) === q || norm(k.idc) === q);
    if(ex.length === 1) hid.value = ex[0].id;                 // texto exacto = cliente elegido
  });
  // mousedown (no click) para elegir antes de que el campo pierda el foco
  lista.addEventListener('mousedown', e => {
    e.preventDefault();
    const li = e.target.closest('.combo-op'); if(li) elegir(items[+li.dataset.i]);
  });
  lista.addEventListener('mousemove', e => {
    const li = e.target.closest('.combo-op');
    if(li && +li.dataset.i !== idx){ idx = +li.dataset.i; lista.querySelectorAll('.combo-op').forEach((o, i) => o.classList.toggle('is-sel', i === idx)); }
  });
  $('#formRegistro').addEventListener('reset', () => setTimeout(() => { crudo(''); txt.value = ''; cerrar(); }, 0));

  comboCliente = { refrescar: () => { if(document.activeElement !== txt) mostrar(); } };
  mostrar();
}


/* Mientras haya una ventana abierta se oculta la barra inferior (clase hay-modal en <body>). */
(function vigilarModal(){
  const m = document.getElementById('modal');
  if(!m) return;
  const sync = () => document.body.classList.toggle('hay-modal', !m.hidden);
  new MutationObserver(sync).observe(m, { attributes: true, attributeFilter: ['hidden'] });
  sync();
})();
