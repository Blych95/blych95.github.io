'use strict';
/* Registro Torii — clientes.js: clientes, categorías, plazo de 45 días e historial.
   Usa las funciones de app.js (se cargan antes de que se ejecute cualquier cosa de aquí). */

const DIAS_LIMITE = 45;
const norm = s => String(s || '').trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const sumarDias = (iso, n) => { const d = aFecha(iso); d.setDate(d.getDate() + n); return isoDe(d); };

/* ---------- plazo de apartados ---------- */
const fechaApartado = r => r.fechaApartado || (r.estado === 'apartado' ? r.fecha : null);
const limiteDe = r => { const f = fechaApartado(r); return f ? sumarDias(f, DIAS_LIMITE) : null; };

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
  const fa = fechaApartado(r);
  if(!fa) return '';
  const e = r.estado === 'apartado' ? estadoLimite(r) : null;
  return `<div class="m-dato"><span>Apartado el</span><b>${fmtFecha(fa)}</b></div>
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
  estado.clientes.forEach(c => { if(!Array.isArray(c.categorias)) c.categorias = []; });
  estado.registros.forEach(r => {
    if(r.estado === 'apartado' && !r.fechaApartado){ r.fechaApartado = r.fecha; cambio = true; }
    if(r.estado === 'pagado' && !r.fechaPago){ r.fechaPago = r.fecha; cambio = true; }
  });
  if(autoVincular()) cambio = true;
  if(cambio) guardar();
}
function prepararRegistro(b, prev){                         // se llama al guardar un registro
  let c = clientePorNombre(b.nombre);
  if(!c && $('#rAddCliente').checked){
    c = { id: uid(), nombre: b.nombre, categorias: [], creado: new Date().toISOString() };
    estado.clientes.push(c);
  }
  b.clienteId = c ? c.id : undefined;
  if(c) b.nombre = c.nombre;
  if(b.estado === 'apartado'){ b.fechaApartado = b.fecha; b.fechaPago = undefined; return; }
  const fa = prev && (prev.fechaApartado || (prev.estado === 'apartado' ? prev.fecha : null));
  b.fechaApartado = fa || undefined;
  b.fechaPago = prev && prev.estado === 'apartado' ? hoyISO() : (prev && prev.fechaPago) || b.fecha;
}

/* ---------- ayudas del formulario de registro ---------- */
function pintarExtrasForm(){
  const nombre = $('#rNombre').value, c = clientePorNombre(nombre);
  $('#rNombreHint').textContent = c ? '✓ Cliente registrado' + (c.categorias.length ? ' · ' + c.categorias.join(', ') : '') : '';
  $('#wrapAddCliente').hidden = !nombre.trim() || !!c;
  const ap = estadoForm() === 'apartado' && $('#rFecha').value;
  $('#plazoBox').innerHTML = ap
    ? `Apartado el <b>${fmtFecha($('#rFecha').value)}</b> · Tiene hasta el <b>${fmtFecha(sumarDias($('#rFecha').value, DIAS_LIMITE))}</b> para pagar el resto (${DIAS_LIMITE} días)` : '';
}

/* ---------- lista de clientes ---------- */
function tagsHtml(c){ return c.categorias.map(t => `<span class="tag tag-r">${esc(t)}</span>`).join(''); }

function pintarClientes(){
  const q = norm($('#cBuscar').value), cat = $('#cCategoria').value, ord = $('#cOrden').value;
  const datos = estado.clientes.filter(c => (!q || norm(c.nombre).includes(q)) && (!cat || c.categorias.includes(cat))).map(c => {
    const rs = regsDe(c);
    return { c, n: rs.length, pag: rs.filter(r => r.estado === 'pagado').length, apa: rs.filter(r => r.estado === 'apartado').length,
      total: rs.filter(r => r.estado === 'pagado').reduce((s, r) => s + (+r.precio || 0), 0), pf: primeraCompra(c) };
  });
  datos.sort((a, b) => ord === 'compras' ? b.n - a.n : ord === 'primera' ? (a.pf || '9').localeCompare(b.pf || '9') : a.c.nombre.localeCompare(b.c.nombre, 'es'));
  $('#resumenClientes').innerHTML = `<b>${datos.length}</b> ${datos.length === 1 ? 'cliente' : 'clientes'}`;
  $('#listaClientes').innerHTML = datos.length ? datos.map(d => `
    <button class="cli" data-id="${d.c.id}">
      <b class="cli-nombre">${esc(d.c.nombre)}</b>
      <div class="tags">${tagsHtml(d.c)}</div>
      <div class="cli-datos"><span>Primera compra <b>${d.pf ? fmtFecha(d.pf) : '—'}</b></span><span>${d.pag} pagadas · ${d.apa} apartadas</span><span>Total pagado <b>${usd(d.total)}</b></span></div>
    </button>`).join('')
    : `<div class="vacio"><b>Sin clientes</b>${estado.clientes.length ? 'Ningún cliente coincide con la búsqueda.' : 'Añade tu primer cliente con “Nuevo cliente”.'}</div>`;
  $$('#listaClientes .cli').forEach(b => b.addEventListener('click', () => abrirCliente(b.dataset.id)));
  const sel = $('#cCategoria'), act = sel.value;
  sel.innerHTML = '<option value="">Todas las categorías</option>' + estado.config.categoriasCliente.map(t => `<option>${esc(t)}</option>`).join('');
  sel.value = estado.config.categoriasCliente.includes(act) ? act : '';
  $('#dlClientes').innerHTML = estado.clientes.map(c => `<option value="${esc(c.nombre)}">`).join('');
  const xs = $('#xCliente'), xa = xs.value;
  xs.innerHTML = '<option value="">Elige un cliente…</option>' + [...estado.clientes].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
  xs.value = xa;
}

/* ---------- ficha e historial ---------- */
function abrirCliente(id){
  const c = estado.clientes.find(k => k.id === id);
  if(!c) return;
  const rs = regsDe(c).sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.creado || '').localeCompare(a.creado || ''));
  const pag = rs.filter(r => r.estado === 'pagado'), apa = rs.filter(r => r.estado === 'apartado'), pf = primeraCompra(c);
  const total = pag.reduce((s, r) => s + (+r.precio || 0), 0), cobrar = apa.reduce((s, r) => s + restante(r), 0);
  $('#modalContenido').innerHTML = `
    <div class="m-head"><h2 id="mFigura">${esc(c.nombre)}</h2><div class="tags">${tagsHtml(c) || '<small class="hint">Sin categoría</small>'}</div></div>
    <div class="m-datos">
      <div class="m-dato"><span>Primera compra</span><b>${pf ? fmtFecha(pf) : 'Aún sin compras'}</b></div>
      <div class="m-dato"><span>Figuras</span><b>${pag.length} pagadas · ${apa.length} apartadas</b></div>
      <div class="m-dato"><span>Total pagado</span><b>${usd(total)} · ${bs(total)}</b></div>
      <div class="m-dato"><span>Por cobrar</span><b>${usd(cobrar)}</b></div>
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
  $('#cNuevoReg').addEventListener('click', () => { cerrarModal(); irA('registro'); $('#rNombre').value = c.nombre; pintarExtrasForm(); });
  $('#cEliminar').addEventListener('click', () => {
    if(!confirm(`¿Eliminar el perfil de "${c.nombre}"? Sus ${rs.length} registros NO se borran.`)) return;
    estado.clientes = estado.clientes.filter(k => k.id !== id);
    estado.registros.forEach(r => { if(r.clienteId === id) delete r.clienteId; });
    guardar(); cerrarModal(); pintarClientes(); aviso('Perfil eliminado.', 'info');
  });
}

function formCliente(id){
  const c = id ? estado.clientes.find(k => k.id === id) : { nombre: '', categorias: [] };
  const pf = id ? primeraCompra(c) : '';
  $('#modalContenido').innerHTML = `
    <div class="m-head"><h2 id="mFigura">${id ? 'Editar cliente' : 'Nuevo cliente'}</h2></div>
    <form id="formCliente" class="form-cli">
      <label>Nombre completo <input type="text" id="kNombre" required value="${esc(c.nombre)}" placeholder="Ej. Ana María Pérez"></label>
      <div class="campo"><span class="campo-label">Categoría (puedes marcar varias)</span>
        <div class="tags">${estado.config.categoriasCliente.map(t => `<label class="chk-tag"><input type="checkbox" value="${esc(t)}" ${c.categorias.includes(t) ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('') || '<small class="hint">Añade categorías en Configuración.</small>'}</div></div>
      <div class="m-dato"><span>Primera compra (automática)</span><b>${pf ? fmtFecha(pf) : 'Se pondrá al registrar su primera compra'}</b></div>
      <div class="m-acciones"><button class="btn btn-rojo" type="submit">Guardar cliente</button><button class="btn btn-ghost" type="button" id="kCancelar">Cancelar</button></div>
    </form>`;
  $('#modal').hidden = false; document.body.style.overflow = 'hidden';
  $('#kCancelar').addEventListener('click', () => id ? abrirCliente(id) : cerrarModal());
  $('#formCliente').addEventListener('submit', e => {
    e.preventDefault();
    const nombre = $('#kNombre').value.trim().replace(/\s+/g, ' ');
    const otro = clientePorNombre(nombre);
    if(otro && otro.id !== id){ aviso('Ya existe un cliente con ese nombre.', 'error'); return; }
    const cats = $$('#formCliente input[type=checkbox]:checked').map(i => i.value);
    let k = c;
    if(id){ estado.registros.forEach(r => { if(r.clienteId === id) r.nombre = nombre; }); c.nombre = nombre; c.categorias = cats; }
    else { k = { id: uid(), nombre, categorias: cats, creado: new Date().toISOString() }; estado.clientes.push(k); }
    autoVincular(); guardar(); pintarClientes(); pintarLista();
    aviso(id ? 'Perfil actualizado.' : 'Cliente añadido.'); abrirCliente(k.id);
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
}

let clientesListo = false;
function iniciarClientes(){
  if(!clientesListo){
    clientesListo = true;
    ['#cBuscar'].forEach(s => $(s).addEventListener('input', pintarClientes));
    ['#cCategoria', '#cOrden'].forEach(s => $(s).addEventListener('change', pintarClientes));
    $('#btnNuevoCliente').addEventListener('click', () => formCliente(null));
    $('#formCategoria').addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#nuevaCategoria').value.trim(), cats = estado.config.categoriasCliente;
      if(!v) return;
      if(cats.some(t => norm(t) === norm(v))){ aviso('Esa categoría ya existe.', 'error'); return; }
      cats.push(v); guardar(); $('#nuevaCategoria').value = ''; pintarConfigClientes(); pintarClientes();
      aviso(`Categoría “${v}” añadida.`);
    });
    ['#rNombre', '#rFecha'].forEach(s => $(s).addEventListener('input', pintarExtrasForm));
    $$('#rEstado .seg').forEach(b => b.addEventListener('click', pintarExtrasForm));
    $('#btnXRegistros').addEventListener('click', exportarRegistros);
    $('#btnXCliente').addEventListener('click', () => exportarCliente());
  }
  pintarClientes(); pintarConfigClientes(); pintarExtrasForm();
}
