'use strict';
/* Registro Torii — excel.js
   Escribe .xlsx reales sin librerías (funciona sin internet): tablas, listas desplegables, fórmulas y formato condicional. */
const ExcelLite = (() => {
  const te = new TextEncoder();
  const CT = []; for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CT[n] = c >>> 0; }
  const crc = b => { let c = -1; for(let i = 0; i < b.length; i++) c = CT[(c ^ b[i]) & 255] ^ (c >>> 8); return (~c) >>> 0; };
  const x = s => String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const col = n => { let s = ''; for(n++; n; n = ((n - 1) / 26) | 0) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
  const ser = iso => { const [a, m, d] = iso.split('-').map(Number); return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5); };

  // estilos: [fuente, relleno, borde, formato numérico, alineación, ajustar texto]
  const ST = { def:[0,0,0,0], tit:[2,2,0,0,'l'], sub:[3,0,0,0,'l'], band:[6,2,0,0,'l'], enc:[1,2,1,0,'c',1], txt:[0,0,1,0], txtc:[0,0,1,0,'c'],
    fec:[0,0,1,164,'c'], usd:[0,0,1,165], rojo:[5,0,1,165], ent:[0,0,1,1,'c'], lbl:[4,3,1,0], sel:[4,3,2,0,'c'], tot:[1,2,1,0], totusd:[1,2,1,165],
    totrojo:[1,4,1,165], fpl:[4,3,1,164,'l'], nota:[3,0,0,0,'l',1] };
  const KEYS = Object.keys(ST), FECHAS = ['fec', 'fpl'];
  const F = (b, c, sz) => `<font>${b ? '<b/>' : ''}${c === 'i' ? '<i/>' : ''}<sz val="${sz}"/>${c && c !== 'i' ? `<color rgb="${c}"/>` : c === 'i' ? '<color rgb="FF666666"/>' : ''}<name val="Calibri"/></font>`;

  const styles = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd\\-mm\\-yyyy"/><numFmt numFmtId="165" formatCode="&quot;$&quot;#,##0.00"/></numFmts>
<fonts count="7">${F(0, '', 11)}${F(1, 'FFFFFFFF', 11)}${F(1, 'FFFFFFFF', 18)}${F(0, 'i', 10)}${F(1, '', 11)}${F(1, 'FFBC002D', 11)}${F(1, 'FFFFFFFF', 12)}</fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${['FF0B0B0C', 'FFEDEDED', 'FFBC002D'].map(c => `<fill><patternFill patternType="solid"><fgColor rgb="${c}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills>
<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border>${['left', 'right', 'top', 'bottom'].map(l => `<${l} style="thin"><color rgb="FFC8C8C8"/></${l}>`).join('')}<diagonal/></border><border>${['left', 'right', 'top', 'bottom'].map(l => `<${l} style="medium"><color rgb="FFBC002D"/></${l}>`).join('')}<diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${KEYS.length}">${KEYS.map(k => { const [f, fl, b, n, al, w] = ST[k];
  return `<xf numFmtId="${n}" fontId="${f}" fillId="${fl}" borderId="${b}" xfId="0" applyFont="1"${fl ? ' applyFill="1"' : ''}${b ? ' applyBorder="1"' : ''} applyNumberFormat="1"${al ? ` applyAlignment="1"><alignment horizontal="${al === 'c' ? 'center' : 'left'}" vertical="center"${w ? ' wrapText="1"' : ''}/></xf>` : '/>'}`; }).join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="2"><dxf><font><b/><color rgb="FFBC002D"/></font><fill><patternFill><bgColor rgb="FFFBE0E5"/></patternFill></fill></dxf><dxf><font><b/><color rgb="FF000000"/></font><fill><patternFill><bgColor rgb="FFE4E4E4"/></patternFill></fill></dxf></dxfs>
</styleSheet>`;

  const SSm = new Map(), SSl = [];
  const ss = s => { s = String(s); if(!SSm.has(s)){ SSm.set(s, SSl.length); SSl.push(s); } return SSm.get(s); };

  const celda = (c, r, i) => {
    if(!c) return '';
    let [v, s = 'txt', f] = Array.isArray(c) ? c : [c];
    const ref = col(i) + (r + 1), si = KEYS.indexOf(s);
    if(FECHAS.includes(s) && typeof v === 'string' && v) v = ser(v);
    if(f){
      const ft = `<f>${x(f)}</f>`;
      return typeof v === 'number' ? `<c r="${ref}" s="${si}">${ft}<v>${v}</v></c>` : `<c r="${ref}" s="${si}" t="str">${ft}<v>${x(v ?? '')}</v></c>`;
    }
    if(v === '' || v == null) return `<c r="${ref}" s="${si}"/>`;
    if(typeof v === 'number') return `<c r="${ref}" s="${si}"><v>${v}</v></c>`;
    return `<c r="${ref}" s="${si}" t="s"><v>${ss(v)}</v></c>`;
  };

  const hoja = sh => {
    const filas = sh.filas, nc = Math.max(...filas.map(r => r.length)), al = sh.alturas || {};
    let prio = 0;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr>${sh.color ? `<tabColor rgb="${sh.color}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${col(nc - 1)}${filas.length}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"${sh.activa ? ' tabSelected="1"' : ''}>${sh.congelar ? `<pane ySplit="${sh.congelar}" topLeftCell="A${sh.congelar + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/>` : ''}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/><cols>${sh.anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${filas.map((r, ri) => `<row r="${ri + 1}"${al[ri] ? ` ht="${al[ri]}" customHeight="1"` : ''}>${r.map((c, i) => celda(c, ri, i)).join('')}</row>`).join('')}</sheetData>
${sh.filtro && !sh.tabla ? `<autoFilter ref="${sh.filtro}"/>` : ''}${(sh.condicional || []).map(cf => `<conditionalFormatting sqref="${cf.sqref}">${cf.reglas.map(g => `<cfRule type="cellIs" dxfId="${g.dxf}" priority="${++prio}" operator="equal"><formula>"${x(g.texto)}"</formula></cfRule>`).join('')}</conditionalFormatting>`).join('')}${sh.validaciones ? `<dataValidations count="${sh.validaciones.length}">${sh.validaciones.map(v => `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" errorTitle="Valor no válido" error="${x(v.error || 'Elige un valor de la lista.')}" sqref="${v.sqref}"><formula1>${x(v.f)}</formula1></dataValidation>`).join('')}</dataValidations>` : ''}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>${sh.tabla ? '<tableParts count="1"><tablePart r:id="rId1"/></tableParts>' : ''}</worksheet>`;
  };

  const tablaXml = (t, id) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${id}" name="${t.nombre}" displayName="${t.nombre}" ref="${t.ref}" totalsRowShown="0"><autoFilter ref="${t.ref}"/><tableColumns count="${t.cols.length}">${t.cols.map((c, i) => `<tableColumn id="${i + 1}" name="${x(c.n)}"${c.f ? `><calculatedColumnFormula>${x(c.f)}</calculatedColumnFormula></tableColumn>` : '/>'}`).join('')}</tableColumns><tableStyleInfo name="TableStyleLight1" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`;

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

  const build = (hojas, nombresDef = []) => {
    SSm.clear(); SSl.length = 0;
    const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const RT = 'http://schemas.openxmlformats.org/package/2006/relationships', M = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
    const nombres = hojas.map(h => h.nombre.replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31));
    const hojasXml = hojas.map(h => hoja(h)), tablas = [];
    hojas.forEach((h, i) => { if(h.tabla) tablas.push([i, h.tabla]); });
    return zip([
      ['[Content_Types].xml', `${H}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${M}.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="${M}.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="${M}.sharedStrings+xml"/>${hojas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${M}.worksheet+xml"/>`).join('')}${tablas.map((_, k) => `<Override PartName="/xl/tables/table${k + 1}.xml" ContentType="${M}.table+xml"/>`).join('')}</Types>`],
      ['_rels/.rels', `${H}<Relationships xmlns="${RT}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', `${H}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${nombres.map((n, i) => `<sheet name="${x(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${nombresDef.length ? `<definedNames>${nombresDef.map(d => `<definedName name="${d.nombre}">${x(d.ref)}</definedName>`).join('')}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
      ['xl/_rels/workbook.xml.rels', `${H}<Relationships xmlns="${RT}">${hojas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${R}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${hojas.length + 1}" Type="${R}/styles" Target="styles.xml"/><Relationship Id="rId${hojas.length + 2}" Type="${R}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`],
      ['xl/styles.xml', styles()],
      ['xl/sharedStrings.xml', `${H}<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${SSl.length}" uniqueCount="${SSl.length}">${SSl.map(s => `<si><t xml:space="preserve">${x(s)}</t></si>`).join('')}</sst>`],
      ...hojasXml.map((xml, i) => [`xl/worksheets/sheet${i + 1}.xml`, xml]),
      ...tablas.map(([i], k) => [`xl/worksheets/_rels/sheet${i + 1}.xml.rels`, `${H}<Relationships xmlns="${RT}"><Relationship Id="rId1" Type="${R}/table" Target="../tables/table${k + 1}.xml"/></Relationships>`]),
      ...tablas.map(([, t], k) => [`xl/tables/table${k + 1}.xml`, tablaXml(t, k + 1)])
    ]);
  };
  return { build, col };
})();

/* ==========================================================
   Libro de Excel de la aplicación
   ========================================================== */
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const TBL = 'tblRegistro';
const COLS = ['Fecha', 'Nombre del Cliente', 'Figura/Producto', 'Tipo de operación', 'Precio total', 'Método de pago', 'Monto pagado', 'Deuda anterior', 'Restante por cobrar', 'Estado', 'Notas y observación'];
const DEFINIDOS = [
  { nombre: 'ListaMetodos', ref: 'OFFSET(Listas!$A$2,0,0,MAX(1,COUNTA(Listas!$A$2:$A$200)),1)' },
  { nombre: 'ListaTipos', ref: 'OFFSET(Listas!$B$2,0,0,MAX(1,COUNTA(Listas!$B$2:$B$100)),1)' }
];
const CF_ESTADO = [{ texto: 'Pendiente', dxf: 0 }, { texto: 'Pagado', dxf: 1 }];

/* Cada pago es una operación: apartado, cada abono (con su fecha) o venta. */
function operacionesDe(rs){
  const ops = []; let seq = 0;
  rs.forEach(r => {
    const P = +r.precio || 0, fa = fechaApartado(r);
    const base = { cliente: r.nombre, figura: r.figura, precio: P, metodo: r.metodo || '' };
    let deuda = P;
    const pagar = (fecha, monto, tipo, nota) => {
      const rest = Math.max(0, deuda - monto);
      ops.push({ ...base, fecha, tipo, monto, deudaAnt: deuda, restante: rest, estado: rest <= 0 ? 'Pagado' : 'Pendiente', nota, seq: seq++ });
      deuda = rest;
    };
    if(!fa){ pagar(r.fechaPago || r.fecha, P, 'Venta', ''); return; }
    const ab = [...(r.abonos || [])].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ini = ab.filter(a => a.fecha === fa), resto = ab.filter(a => a.fecha !== fa);
    const notaIni = [...ini.map(a => a.nota).filter(Boolean), r.estado === 'apartado' ? `Límite de pago: ${fmtFecha(limiteDe(r))}` : ''].filter(Boolean).join(' · ');
    pagar(fa, ini.reduce((s, a) => s + (+a.monto || 0), 0), 'Apartado', notaIni);
    resto.forEach(a => pagar(a.fecha, +a.monto || 0, 'Abono', a.nota || ''));
    if(r.estado === 'pagado' && deuda > 0) pagar(r.fechaPago || r.fecha, deuda, 'Abono', 'Pago del saldo');
  });
  return ops.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.seq - b.seq);
}

const tr = c => `${TBL}[[#This Row],[${c}]]`, rg = c => `${TBL}[${c}]`;
const F_DEUDA = `IF(${tr('Nombre del Cliente')}="","",IF(${tr('Tipo de operación')}=Listas!$B$3,${tr('Precio total')}-SUMPRODUCT((${rg('Nombre del Cliente')}=${tr('Nombre del Cliente')})*(${rg('Figura/Producto')}=${tr('Figura/Producto')})*((${rg('Fecha')}<${tr('Fecha')})+(${rg('Fecha')}=${tr('Fecha')})*(ROW(${rg('Fecha')})<ROW()))*${rg('Monto pagado')}),${tr('Precio total')}))`;
const F_REST = `IF(${tr('Nombre del Cliente')}="","",MAX(0,${tr('Deuda anterior')}-${tr('Monto pagado')}))`;
const F_ESTADO = `IF(${tr('Nombre del Cliente')}="","",IF(${tr('Restante por cobrar')}<=0,"Pagado","Pendiente"))`;

function hojaRegistro(ops){
  const filas = [
    [['REGISTRO TORII · REGISTRO DIARIO', 'tit'], ...Array(10).fill(['', 'tit'])],
    [['Agrega filas debajo de la última: Deuda anterior, Restante y Estado se calculan solos. Método y Tipo tienen lista (se editan en la hoja Listas). Filtra meses con la flecha de la columna Fecha ▸ Filtros de fecha.', 'sub']],
    [], COLS.map(c => [c, 'enc'])
  ];
  ops.forEach(o => filas.push([[o.fecha, 'fec'], [o.cliente, 'txt'], [o.figura, 'txt'], [o.tipo, 'txtc'], [o.precio, 'usd'], [o.metodo, 'txt'], [o.monto, 'usd'],
    [o.deudaAnt, 'usd', F_DEUDA], [o.restante, 'usd', F_REST], [o.estado, 'txtc', F_ESTADO], [o.nota, 'txt']]));
  return { nombre: 'Registro', color: 'FF0B0B0C', filas, anchos: [14, 26, 32, 18, 14, 20, 14, 14, 18, 13, 42], congelar: 4, alturas: { 0: 32, 3: 34 },
    tabla: { nombre: TBL, ref: `A4:K${4 + ops.length}`, cols: COLS.map((n, i) => ({ n, f: i === 7 ? F_DEUDA : i === 8 ? F_REST : i === 9 ? F_ESTADO : null })) },
    validaciones: [{ sqref: 'D5:D5000', f: 'ListaTipos', error: 'Elige un tipo de la lista (puedes añadir más en la hoja Listas).' }, { sqref: 'F5:F5000', f: 'ListaMetodos', error: 'Elige un método de la lista (puedes añadir más en la hoja Listas).' }],
    condicional: [{ sqref: 'J5:J5000', reglas: CF_ESTADO }] };
}

function hojaListas(){
  const met = estado.config.metodosPago, tipos = ['Apartado', 'Abono', 'Venta'];
  const ayuda = ['Cómo editar esta hoja', 'Métodos de pago: escribe uno nuevo debajo del último y aparecerá en la lista.', 'Tipos de operación: las 3 primeras filas las usan las fórmulas; puedes renombrarlas aquí y todo se actualiza.', 'Años y Meses alimentan los menús del Dashboard (hasta 2080).'];
  const filas = [[['Métodos de pago', 'enc'], ['Tipos de operación', 'enc'], '', ['Años', 'enc'], ['Meses', 'enc'], '', ['Ayuda', 'enc']]];
  for(let i = 0; i < 60; i++) filas.push([[met[i] || '', 'txt'], [tipos[i] || '', 'txt'], '', i < 57 ? [2024 + i, 'ent'] : '', i < 12 ? [MESES[i], 'txt'] : '', '', ayuda[i] ? [ayuda[i], i ? 'sub' : 'lbl'] : '']);
  return { nombre: 'Listas', color: 'FF8C8C96', filas, anchos: [26, 24, 3, 10, 16, 3, 90], congelar: 1, alturas: { 0: 28 } };
}

function hojaDashboard(ops){
  const hoy = new Date(), yr = hoy.getFullYear(), mo = hoy.getMonth() + 1;
  const iso = (y, m, d) => isoDe(new Date(y, m - 1, d)), dim = (y, m) => new Date(y, m, 0).getDate();
  const ing = (a, b) => ops.filter(o => o.fecha >= a && o.fecha <= b).reduce((s, o) => s + o.monto, 0);
  const pc = f => ops.filter(o => o.fecha <= f).reduce((s, o) => s + (o.tipo === 'Apartado' ? o.precio : 0) - (o.tipo === 'Venta' ? 0 : o.monto), 0);
  const ING = (a, b) => `SUMIFS(${rg('Monto pagado')},${rg('Fecha')},">="&${a},${rg('Fecha')},"<="&${b})`;
  const A = rg('Tipo de operación');
  const PC = f => `SUMIFS(${rg('Precio total')},${A},Listas!$B$2,${rg('Fecha')},"<="&${f})-SUMIFS(${rg('Monto pagado')},${A},Listas!$B$2,${rg('Fecha')},"<="&${f})-SUMIFS(${rg('Monto pagado')},${A},Listas!$B$3,${rg('Fecha')},"<="&${f})`;
  const filas = []; const L = (n, f) => { filas[n - 1] = f; };
  const banda = (n, t) => L(n, ['', [t, 'band'], ['', 'band'], ['', 'band'], ['', 'band'], ['', 'band']]);
  L(1, [['', 'tit'], ['REGISTRO TORII · DASHBOARD', 'tit'], ['', 'tit'], ['', 'tit'], ['', 'tit'], ['', 'tit']]);
  L(2, ['', ['Cambia las casillas grises con lista desplegable (Año / Mes) y las tablas se actualizan solas. Los datos salen de la hoja Registro.', 'sub']]);

  // --- Resumen mensual ---
  banda(4, 'RESUMEN MENSUAL');
  L(5, ['', ['Año', 'lbl'], [yr, 'sel']]);
  L(7, ['', ['Mes', 'enc'], ['Ingresos cobrados', 'enc'], ['Por cobrar al cierre', 'enc']]);
  let totIng = 0;
  for(let i = 1; i <= 12; i++){
    const a = iso(yr, i, 1), b = iso(yr, i, dim(yr, i)), v = ing(a, b); totIng += v;
    L(7 + i, ['', [MESES[i - 1], 'txt'], [v, 'usd', ING(`DATE($C$5,${i},1)`, `EOMONTH(DATE($C$5,${i},1),0)`)], [pc(b), 'rojo', PC(`EOMONTH(DATE($C$5,${i},1),0)`)]]);
  }
  L(20, ['', ['Total del año', 'tot'], [totIng, 'totusd', 'SUM(C8:C19)'], [pc(iso(yr, 12, 31)), 'totrojo', 'D19']]);

  // --- Detalle diario ---
  const MN = c => `MATCH(${c},Listas!$E$2:$E$13,0)`;
  const selector = n => L(n, ['', ['Mes', 'lbl'], [MESES[mo - 1], 'sel'], ['Año', 'lbl'], [yr, 'sel']]);
  banda(23, 'DETALLE DIARIO'); selector(24);
  L(26, ['', ['Día', 'enc'], ['Fecha', 'enc'], ['Ingresos cobrados', 'enc'], ['Por cobrar al cierre', 'enc']]);
  const m24 = MN('$C$24'), eom = dim(yr, mo);
  let totMes = 0;
  for(let n = 1; n <= 31; n++){
    const r = 26 + n, ok = n <= eom, f = ok ? iso(yr, mo, n) : '';
    if(ok) totMes += ing(f, f);
    L(r, ['', [ok ? n : '', 'ent', `IF(C${r}="","",${n})`], [f, 'fec', `IF(${n}<=DAY(EOMONTH(DATE($E$24,${m24},1),0)),DATE($E$24,${m24},${n}),"")`],
      [ok ? ing(f, f) : '', 'usd', `IF(C${r}="","",${ING(`C${r}`, `C${r}`)})`], [ok ? pc(f) : '', 'rojo', `IF(C${r}="","",${PC(`C${r}`)})`]]);
  }
  const finMes = `EOMONTH(DATE($E$24,${m24},1),0)`;
  L(58, ['', ['Total del mes', 'tot'], ['', 'tot'], [totMes, 'totusd', 'SUM(D27:D57)'], [pc(iso(yr, mo, eom)), 'totrojo', PC(finMes)]]);

  // --- Resumen semanal (lunes a domingo; la semana 1 empieza el día 1) ---
  banda(61, 'RESUMEN SEMANAL'); selector(62);
  L(64, ['', ['Semana', 'enc'], ['Desde', 'enc'], ['Hasta', 'enc'], ['Ingresos cobrados', 'enc'], ['Por cobrar al cierre', 'enc']]);
  const m62 = MN('$C$62'), ini62 = `DATE($E$62,${m62},1)`, fin62 = `EOMONTH(${ini62},0)`, sem = []; let d = 1, totSem = 0;
  while(d <= eom){ const dow = (new Date(yr, mo - 1, d).getDay() + 6) % 7 + 1, h = Math.min(eom, d + 7 - dow); sem.push([d, h]); d = h + 1; }
  for(let i = 0; i < 6; i++){
    const r = 65 + i, s = sem[i], a = s ? iso(yr, mo, s[0]) : '', b = s ? iso(yr, mo, s[1]) : '', v = s ? ing(a, b) : '';
    if(s) totSem += v;
    L(r, ['', [s ? `Semana ${i + 1}` : '', 'txtc', `IF(C${r}="","","Semana ${i + 1}")`],
      [a, 'fec', i ? `IF(OR(D${r - 1}="",D${r - 1}>=${fin62}),"",D${r - 1}+1)` : ini62], [b, 'fec', `IF(C${r}="","",MIN(${fin62},C${r}+7-WEEKDAY(C${r},2)))`],
      [v, 'usd', `IF(C${r}="","",${ING(`C${r}`, `D${r}`)})`], [s ? pc(b) : '', 'rojo', `IF(C${r}="","",${PC(`D${r}`)})`]]);
  }
  L(71, ['', ['Total del mes', 'tot'], ['', 'tot'], ['', 'tot'], [totSem, 'totusd', 'SUM(E65:E70)'], [pc(iso(yr, mo, eom)), 'totrojo', PC(fin62)]]);

  for(let i = 0; i < filas.length; i++) if(!filas[i]) filas[i] = [];
  return { nombre: 'Dashboard', color: 'FFBC002D', activa: true, filas, anchos: [3, 24, 18, 22, 22, 22], alturas: { 0: 36 },
    validaciones: [{ sqref: 'C5 E24 E62', f: 'Listas!$D$2:$D$58', error: 'Elige un año de la lista (2024 a 2080).' }, { sqref: 'C24 C62', f: 'Listas!$E$2:$E$13', error: 'Elige un mes de la lista.' }] };
}

function bajarXlsx(nombre, hojas, definidos){
  descargar(nombre, ExcelLite.build(hojas, definidos), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  aviso('Excel descargado.');
}

/* ---------- Excel 1: libro completo (Dashboard + Registro + Listas) ---------- */
function exportarRegistros(){
  if(!estado.registros.length){ aviso('Aún no hay registros para exportar.', 'error'); return; }
  const ops = operacionesDe([...estado.registros].sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.creado || '').localeCompare(b.creado || '')));
  bajarXlsx(`registro-torii_${hoyISO()}.xlsx`, [hojaDashboard(ops), hojaRegistro(ops), hojaListas()], DEFINIDOS);
}

/* ---------- Excel 2: historial de un cliente (incluye cada abono con su fecha) ---------- */
function exportarCliente(id){
  const c = estado.clientes.find(k => k.id === (id || $('#xCliente').value));
  if(!c){ aviso('Elige un cliente.', 'error'); return; }
  const rs = regsDe(c);
  if(!rs.length){ aviso('Este cliente aún no tiene registros.', 'error'); return; }
  const ops = operacionesDe(rs), cobrar = rs.filter(r => r.estado === 'apartado').reduce((s, r) => s + restante(r), 0);
  const cab = ['Fecha', 'Figura/Producto', 'Tipo de operación', 'Precio total', 'Método de pago', 'Monto pagado', 'Deuda anterior', 'Restante por cobrar', 'Estado', 'Notas y observación'];
  const dato = (t, v, s = 'txt') => ['', [t, 'lbl'], [v, s]];
  const filas = [[['REGISTRO TORII · HISTORIAL DE CLIENTE', 'tit'], ...Array(9).fill(['', 'tit'])],
    [], dato('Cliente', `${c.nombre} - ${c.idc || ''}`), dato('Cédula', c.cedula || '—'), dato('Teléfono', c.telefono || '—'), dato('Categorías', c.categorias.join(', ') || '—'),
    dato('Primera compra', primeraCompra(c), 'fpl'), dato('Total pagado', ops.reduce((s, o) => s + o.monto, 0), 'usd'), dato('Por cobrar', cobrar, 'rojo'), [], cab.map(t => [t, 'enc'])];
  const hr = filas.length;
  ops.forEach(o => filas.push([[o.fecha, 'fec'], [o.figura, 'txt'], [o.tipo, 'txtc'], [o.precio, 'usd'], [o.metodo, 'txt'], [o.monto, 'usd'], [o.deudaAnt, 'usd'], [o.restante, 'usd'], [o.estado, 'txtc'], [o.nota, 'txt']]));
  filas.push([['TOTAL PAGADO', 'tot'], ['', 'tot'], ['', 'tot'], ['', 'tot'], ['', 'tot'], [ops.reduce((s, o) => s + o.monto, 0), 'totusd', `SUBTOTAL(109,F${hr + 1}:F${hr + ops.length})`], ['', 'tot'], ['', 'tot'], ['', 'tot'], ['', 'tot']]);
  const hojaC = { nombre: 'Historial', color: 'FF0B0B0C', filas, anchos: [16, 32, 18, 14, 20, 14, 14, 18, 13, 42], congelar: hr, alturas: { 0: 32 }, filtro: `A${hr}:J${hr + ops.length}`,
    condicional: [{ sqref: `I${hr + 1}:I${hr + ops.length}`, reglas: CF_ESTADO }] };
  bajarXlsx(`cliente-${norm(c.nombre).replace(/[^a-z0-9]+/g, '-')}.xlsx`, [hojaC]);
}
