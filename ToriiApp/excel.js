'use strict';
/* Registro Torii — excel.js: escribe .xlsx reales sin librerías (funciona sin internet). */
const ExcelLite = (() => {
  const te = new TextEncoder();
  const T = []; for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  const crc = b => { let c = -1; for(let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (~c) >>> 0; };
  const x = s => String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const col = n => { let s = ''; for(n++; n; n = ((n - 1) / 26) | 0) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
  const ser = iso => { const [a, m, d] = iso.split('-').map(Number); return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5); };

  // estilos: [fuente, relleno, borde, formato numérico, alineación]
  const ST = { def:[0,0,0,0], tit:[2,0,0,0], nota:[3,0,0,0], fpl:[0,0,0,164,'l'], lbl:[4,5,1,0], enc:[1,2,1,0,'c'], txt:[0,0,1,0],
    fec:[0,0,1,164,'c'], usd:[0,0,1,165], bs:[0,0,1,166], cop:[0,0,1,167], ok:[5,3,1,0,'c'], ap:[6,4,1,0,'c'], ven:[7,6,1,164,'c'],
    tl:[4,5,1,0], tusd:[4,5,1,165], tbs:[4,5,1,166], tcop:[4,5,1,167] };
  const KEYS = Object.keys(ST);
  const FECHAS = ['fec', 'ven', 'fpl'];

  const styles = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4"><numFmt numFmtId="164" formatCode="dd\\-mm\\-yyyy"/><numFmt numFmtId="165" formatCode="&quot;$&quot;#,##0.00"/><numFmt numFmtId="166" formatCode="&quot;Bs &quot;#,##0.00"/><numFmt numFmtId="167" formatCode="#,##0&quot; COP&quot;"/></numFmts>
<fonts count="8"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FFBC002D"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF666666"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF1E8E5E"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFC96A0A"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFBC002D"/><name val="Calibri"/></font></fonts>
<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${['FF0B0B0C','FFDFF5EA','FFFCE9D2','FFF2F2F2','FFFBE0E5'].map(c => `<fill><patternFill patternType="solid"><fgColor rgb="${c}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border>${['left','right','top','bottom'].map(l => `<${l} style="thin"><color rgb="FFD0D0D0"/></${l}>`).join('')}<diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${KEYS.length}">${KEYS.map(k => { const [f, fl, b, n, al] = ST[k];
  return `<xf numFmtId="${n}" fontId="${f}" fillId="${fl}" borderId="${b}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"${al ? ` applyAlignment="1"><alignment horizontal="${al === 'c' ? 'center' : 'left'}" vertical="center"${k === 'enc' ? ' wrapText="1"' : ''}/></xf>` : '/>'}`; }).join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  const celda = (c, r, i) => {
    if(!c) return '';
    let [v, s = 'txt', f] = Array.isArray(c) ? c : [c];
    const ref = col(i) + (r + 1), si = KEYS.indexOf(s);
    if(FECHAS.includes(s) && typeof v === 'string' && v) v = ser(v);
    if(v === '' || v == null) return `<c r="${ref}" s="${si}"/>`;
    if(typeof v === 'number') return `<c r="${ref}" s="${si}">${f ? `<f>${x(f)}</f>` : ''}<v>${v}</v></c>`;
    return `<c r="${ref}" s="${si}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
  };

  const hoja = sh => {
    const filas = sh.filas, nc = Math.max(...filas.map(r => r.length)), fin = col(nc - 1) + filas.length;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${fin}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0">${sh.congelar ? `<pane ySplit="${sh.congelar}" topLeftCell="A${sh.congelar + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/>` : ''}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/><cols>${sh.anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${filas.map((r, ri) => `<row r="${ri + 1}"${ri === sh.congelar - 1 ? ' ht="30" customHeight="1"' : ri === 0 ? ' ht="26" customHeight="1"' : ''}>${r.map((c, i) => celda(c, ri, i)).join('')}</row>`).join('')}</sheetData>
${sh.filtro ? `<autoFilter ref="${sh.filtro}"/>` : ''}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  };

  const zip = files => {
    const partes = [], cen = []; let off = 0;
    const d = new Date(), dd = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for(const [nombre, txt] of files){
      const nb = te.encode(nombre), db = te.encode(txt), c = crc(db);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, dd, true);
      h.setUint32(14, c, true); h.setUint32(18, db.length, true); h.setUint32(22, db.length, true); h.setUint16(26, nb.length, true);
      const e = new DataView(new ArrayBuffer(46));
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint16(14, dd, true);
      e.setUint32(16, c, true); e.setUint32(20, db.length, true); e.setUint32(24, db.length, true); e.setUint16(28, nb.length, true); e.setUint32(42, off, true);
      partes.push(new Uint8Array(h.buffer), nb, db); cen.push(new Uint8Array(e.buffer), nb);
      off += 30 + nb.length + db.length;
    }
    const cs = cen.reduce((s, p) => s + p.length, 0), z = new DataView(new ArrayBuffer(22));
    z.setUint32(0, 0x06054b50, true); z.setUint16(8, files.length, true); z.setUint16(10, files.length, true); z.setUint32(12, cs, true); z.setUint32(16, off, true);
    const todo = [...partes, ...cen, new Uint8Array(z.buffer)], out = new Uint8Array(off + cs + 22); let p = 0;
    todo.forEach(a => { out.set(a, p); p += a.length; });
    return out;
  };

  const build = hojas => {
    const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const nombres = hojas.map(h => h.nombre.replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31));
    return zip([
      ['[Content_Types].xml', `${H}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
      ['_rels/.rels', `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', `${H}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><sheets>${nombres.map((n, i) => `<sheet name="${x(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${R}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="${R}/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', styles()],
      ...hojas.map((h, i) => [`xl/worksheets/sheet${i + 1}.xml`, hoja(h)])
    ]);
  };
  return { build, col };
})();

/* ---------- construcción de la hoja de registros (compartida por ambas exportaciones) ---------- */
function hojaRegistros(nombre, bloque, rs, conPago){
  const cp = estado.config.campos, tb = +estado.config.tasaBs || 0, tp = +estado.config.tasaPeso || 0, hoy = hoyISO();
  const cab = [conPago ? 'Fecha de registro / apartado' : 'Fecha', ...(conPago ? [] : ['Cliente']), 'Figura', 'Método de pago', 'Precio USD', 'Precio Bs', 'Precio COP',
    'Estado', 'Fecha límite de pago', ...(conPago ? ['Fecha de pago'] : []), 'Abonado USD', 'Por pagar USD', ...cp.map(c => c.etiqueta)];
  const filas = [...bloque, [], cab.map(t => [t, 'enc'])];
  const hr = filas.length;                                   // fila (1-based) del encabezado
  rs.forEach(r => {
    const p = +r.precio || 0, lim = limiteDe(r), pag = r.estado === 'pagado';
    filas.push([[r.fecha, 'fec'], ...(conPago ? [] : [[r.nombre, 'txt']]), [r.figura, 'txt'], [r.metodo || '', 'txt'], [p, 'usd'], [p * tb, 'bs'], [p * tp, 'cop'],
      [pag ? 'Pagado' : 'Apartado', pag ? 'ok' : 'ap'], [lim || '', !pag && lim < hoy ? 'ven' : 'fec'],
      ...(conPago ? [[pag ? (r.fechaPago || r.fecha) : '', 'fec']] : []), [abonado(r), 'usd'], [restante(r), 'usd'], ...cp.map(c => [(r.extra || {})[c.id] ?? '', 'txt'])]);
  });
  const n = rs.length, ini = col => `${ExcelLite.col(col)}${hr + 1}:${ExcelLite.col(col)}${hr + n}`;
  const i0 = conPago ? 3 : 4, suma = (k, f) => [rs.reduce((s, r) => s + f(r), 0), k, `SUBTOTAL(109,${ini(i0 + (k === 'tusd' ? 0 : k === 'tbs' ? 1 : 2))})`];
  const p = r => +r.precio || 0, resto = cab.length - (i0 + 3);
  filas.push([['TOTAL', 'tl'], ...Array(i0 - 1).fill(['', 'tl']), suma('tusd', p), suma('tbs', r => p(r) * tb), suma('tcop', r => p(r) * tp),
    ...Array(resto).fill(['', 'tl'])].map((c, i) => i === 1 && !conPago ? [`${n} registros`, 'tl'] : c));
  const anchos = [16, ...(conPago ? [] : [24]), 30, 20, 13, 17, 17, 13, 16, ...(conPago ? [16] : []), 13, 13, ...cp.map(() => 18)];
  return { nombre, filas, anchos, congelar: hr, filtro: `A${hr}:${ExcelLite.col(cab.length - 1)}${hr + n}` };
}

function bajarXlsx(nombre, hojas){
  descargar(nombre, ExcelLite.build(hojas), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  aviso('Excel descargado.');
}

/* ---------- Excel 1: registros por rango de fechas ---------- */
function exportarRegistros(){
  const d = $('#xDesde').value, h = $('#xHasta').value;
  const rs = estado.registros.filter(r => (!d || r.fecha >= d) && (!h || r.fecha <= h))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.creado || '').localeCompare(b.creado || ''));
  if(!rs.length){ aviso('No hay registros en ese rango de fechas.', 'error'); return; }
  const bloque = [[['Registro Torii — Registros', 'tit']],
    [[`Del ${d ? fmtFecha(d) : fmtFecha(rs[0].fecha)} al ${h ? fmtFecha(h) : fmtFecha(hoyISO())} · Tasa Bs: ${num(estado.config.tasaBs)} · Tasa COP: ${num(estado.config.tasaPeso, 0)} · Plazo de apartados: ${DIAS_LIMITE} días`, 'nota']]];
  bajarXlsx(`registros-torii_${d || 'inicio'}_a_${h || hoyISO()}.xlsx`, [hojaRegistros('Registros', bloque, rs, false)]);
}

/* ---------- Excel 2: historial completo de un cliente ---------- */
function exportarCliente(id){
  const c = estado.clientes.find(k => k.id === (id || $('#xCliente').value));
  if(!c){ aviso('Elige un cliente.', 'error'); return; }
  const rs = regsDe(c).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if(!rs.length){ aviso('Este cliente aún no tiene registros.', 'error'); return; }
  const lbl = (t, v, s = 'def') => [[t, 'lbl'], [v, s]];
  const bloque = [[['Registro Torii — Historial de cliente', 'tit']],
    lbl('Cliente', c.nombre), lbl('Categorías', c.categorias.join(', ') || '—'), lbl('Primera compra', primeraCompra(c), 'fpl'),
    lbl('Pagadas', rs.filter(r => r.estado === 'pagado').length), lbl('Apartadas', rs.filter(r => r.estado === 'apartado').length)];
  bajarXlsx(`cliente-${norm(c.nombre).replace(/[^a-z0-9]+/g, '-')}.xlsx`, [hojaRegistros('Historial', bloque, rs, true)]);
}
