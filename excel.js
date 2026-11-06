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
  const ST = { 
    def:[0,0,0,0], bg:[0,8,0,0], bg_b:[0,8,1,0], tit:[2,9,0,0], tit_dash:[8,9,2,0,'c'], nota:[3,0,0,0], fpl:[0,0,0,164,'l'], 
    lbl:[4,0,1,0], lbl_b:[4,5,1,0], sel:[4,4,1,0,'c'], enc_blk:[1,2,1,0,'c'], enc_red:[1,9,1,0,'c'], txt:[0,0,1,0],
    fec:[0,0,1,164,'c'], usd:[0,0,1,165], usd_b:[4,5,1,165], 
    bs:[0,0,1,166], cop:[0,0,1,167], ok:[5,3,1,0,'c'], ap:[6,4,1,0,'c'], tl:[4,5,1,0] 
  };
  const KEYS = Object.keys(ST);
  const FECHAS = ['fec', 'ven', 'fpl'];

  const styles = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4"><numFmt numFmtId="164" formatCode="dd\\-mm\\-yyyy"/><numFmt numFmtId="165" formatCode="&quot;$&quot;#,##0.00"/><numFmt numFmtId="166" formatCode="&quot;Bs &quot;#,##0.00"/><numFmt numFmtId="167" formatCode="#,##0&quot; COP&quot;"/></numFmts>
<fonts count="10"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF666666"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF1E8E5E"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFC96A0A"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFBC002D"/><name val="Calibri"/></font><font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="10"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${['FF0B0B0C','FFDFF5EA','FFFCE9D2','FFF2F2F2','FFFBE0E5','FFBC002D','FF666666','FF980000'].map(c => `<fill><patternFill patternType="solid"><fgColor rgb="${c}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills>
<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border>${['left','right','top','bottom'].map(l => `<${l} style="thin"><color rgb="FFD0D0D0"/></${l}>`).join('')}<diagonal/></border><border>${['left','right','top','bottom'].map(l => `<${l} style="thick"><color rgb="FF000000"/></${l}>`).join('')}<diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${KEYS.length}">${KEYS.map(k => { const [f, fl, b, n, al] = ST[k];
  return `<xf numFmtId="${n}" fontId="${f}" fillId="${fl}" borderId="${b}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"${al ? ` applyAlignment="1"><alignment horizontal="${al === 'c' ? 'center' : 'left'}" vertical="center"${k.startsWith('enc') ? ' wrapText="1"' : ''}/></xf>` : '/>'}`; }).join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  const celda = (c, r, i) => {
    if(!c) return '';
    let [v, s = 'txt', f] = Array.isArray(c) ? c : [c];
    const ref = col(i) + (r + 1), si = KEYS.indexOf(s);
    if(FECHAS.includes(s) && typeof v === 'string' && v) v = ser(v);
    if(v === '' || v == null) return `<c r="${ref}" s="${si}"/>`;
    if(f || typeof v === 'number') return `<c r="${ref}" s="${si}">${f ? `<f>${x(f)}</f>` : ''}<v>${Number(v) || 0}</v></c>`;
    return `<c r="${ref}" s="${si}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
  };

  const hoja = sh => {
    const filas = sh.filas, nc = Math.max(...filas.map(r => r.length)), fin = col(nc - 1) + filas.length;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${fin}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0">${sh.congelar ? `<pane ySplit="${sh.congelar}" topLeftCell="A${sh.congelar + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/>` : ''}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/><cols>${sh.anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${filas.map((r, ri) => `<row r="${ri + 1}"${ri === sh.congelar - 1 ? ' ht="30" customHeight="1"' : ri === 0 ? ' ht="32" customHeight="1"' : ''}>${r.map((c, i) => celda(c, ri, i)).join('')}</row>`).join('')}</sheetData>
${sh.merge ? `<mergeCells count="1"><mergeCell ref="${sh.merge}"/></mergeCells>` : ''}
${sh.filtro ? `<autoFilter ref="${sh.filtro}"/>` : ''}
${sh.validations && sh.validations.length ? `<dataValidations count="${sh.validations.length}">${sh.validations.map(v => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${v.sqref}"><formula1>&quot;${v.lista}&quot;</formula1></dataValidation>`).join('')}</dataValidations>` : ''}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
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

/* ---------- construcción del Dashboard ---------- */
function hojaDashboard() {
  const hoy = new Date();
  const yr = hoy.getFullYear();
  const mo = hoy.getMonth() + 1;

  // Llenar el fondo de gris y centrar el título como en la imagen
  const fillRow = (rowArr) => {
    let newRow = [];
    for(let i=0; i<15; i++){
      if(rowArr[i]) newRow.push(rowArr[i]);
      else newRow.push(['', 'bg']);
    }
    return newRow;
  };

  const filas = [
    fillRow([['', 'tit_dash'], ['DASHBOARD DE INGRESOS', 'tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash']]),
    fillRow([]),
    fillRow([['', 'bg'], ['Año (edítalo):', 'lbl_b'], [yr, 'sel']]),
    fillRow([['', 'bg'], ['Mes (edítalo):', 'lbl_b'], [mo, 'sel']]),
    fillRow([]),
    fillRow([
      ['', 'bg'], ['', 'bg'],
      ['Resumen Mensual', 'enc_blk'], ['Ingresos', 'enc_blk'], ['Por Cobrar', 'enc_blk'],
      ['', 'bg'],
      ['Día', 'enc_red'], ['Fecha', 'enc_red'], ['Ingresos', 'enc_red'], ['Por Cobrar', 'enc_red'],
      ['', 'bg'],
      ['Semana', 'enc_blk'], ['Ingresos', 'enc_blk'], ['Por Cobrar', 'enc_blk']
    ])
  ];

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  for (let i = 1; i <= 31; i++) {
    const row = ['', ''];
    
    // Mensual
    if (i <= 12) {
      row.push([meses[i-1], 'txt']);
      row.push([0, 'usd', `SUMIFS(Registros!G:G, Registros!A:A, ">="&DATE($C$3,${i},1), Registros!A:A, "<="&EOMONTH(DATE($C$3,${i},1),0))`]);
      row.push([0, 'usd', `SUMIFS(Registros!L:L, Registros!A:A, ">="&DATE($C$3,${i},1), Registros!A:A, "<="&EOMONTH(DATE($C$3,${i},1),0))`]);
    } else if (i === 13) {
      row.push(['TOTAL', 'lbl_b']);
      row.push([0, 'usd_b', `SUM(D7:D18)`]);
      row.push([0, 'usd_b', `SUM(E7:E18)`]);
    } else {
      row.push(['', 'bg'], ['', 'bg'], ['', 'bg']);
    }

    row.push(['', 'bg']); // F

    // Diario
    row.push([i, 'txt']);
    row.push([0, 'fec', `IF(MONTH(DATE($C$3,$C$4,${i}))=$C$4, DATE($C$3,$C$4,${i}), "")`]);
    row.push([0, 'usd', `IF(H${i+6}="","",SUMIFS(Registros!G:G, Registros!A:A, H${i+6}))`]);
    row.push([0, 'usd', `IF(H${i+6}="","",SUMIFS(Registros!L:L, Registros!A:A, H${i+6}))`]);

    row.push(['', 'bg']); // K

    // Semanal
    if (i <= 5) {
      const start = (i - 1) * 7 + 1;
      const end = i === 5 ? 31 : i * 7;
      let wG = ''; let wL = '';
      if (i === 1) {
        wG = `SUMIFS(Registros!G:G, Registros!A:A, ">="&DATE($C$3,$C$4,1), Registros!A:A, "<="&DATE($C$3,$C$4,7))`;
        wL = `SUMIFS(Registros!L:L, Registros!A:A, ">="&DATE($C$3,$C$4,1), Registros!A:A, "<="&DATE($C$3,$C$4,7))`;
      }
      if (i === 2) {
        wG = `SUMIFS(Registros!G:G, Registros!A:A, ">="&DATE($C$3,$C$4,8), Registros!A:A, "<="&DATE($C$3,$C$4,14))`;
        wL = `SUMIFS(Registros!L:L, Registros!A:A, ">="&DATE($C$3,$C$4,8), Registros!A:A, "<="&DATE($C$3,$C$4,14))`;
      }
      if (i === 3) {
        wG = `SUMIFS(Registros!G:G, Registros!A:A, ">="&DATE($C$3,$C$4,15), Registros!A:A, "<="&DATE($C$3,$C$4,21))`;
        wL = `SUMIFS(Registros!L:L, Registros!A:A, ">="&DATE($C$3,$C$4,15), Registros!A:A, "<="&DATE($C$3,$C$4,21))`;
      }
      if (i === 4) {
        wG = `SUMIFS(Registros!G:G, Registros!A:A, ">="&DATE($C$3,$C$4,22), Registros!A:A, "<="&DATE($C$3,$C$4,28))`;
        wL = `SUMIFS(Registros!L:L, Registros!A:A, ">="&DATE($C$3,$C$4,22), Registros!A:A, "<="&DATE($C$3,$C$4,28))`;
      }
      if (i === 5) {
        wG = `SUMIFS(Registros!G:G, Registros!A:A, ">="&DATE($C$3,$C$4,29), Registros!A:A, "<="&EOMONTH(DATE($C$3,$C$4,1),0))`;
        wL = `SUMIFS(Registros!L:L, Registros!A:A, ">="&DATE($C$3,$C$4,29), Registros!A:A, "<="&EOMONTH(DATE($C$3,$C$4,1),0))`;
      }
      
      row.push([`Sem. ${i} (${start}-${end})`, 'txt']);
      row.push([0, 'usd', wG]);
      row.push([0, 'usd', wL]);
    } else if (i === 6) {
      row.push(['TOTAL', 'lbl_b']);
      row.push([0, 'usd_b', `SUM(M7:M11)`]);
      row.push([0, 'usd_b', `SUM(N7:N11)`]);
    } else {
      row.push(['', 'bg'], ['', 'bg'], ['', 'bg']);
    }

    row.push(['', 'bg']);
    filas.push(fillRow(row));
  }

  for(let i = 0; i < 5; i++) filas.push(fillRow([])); // Espacio extra abajo

  const listAnios = Array.from({length: 46}, (_,i) => 2020+i).join(','); 

  return {
    nombre: 'Dashboard',
    filas,
    anchos: [5, 14, 15, 15, 15, 8, 6, 14, 15, 15, 8, 20, 15, 15, 10],
    merge: 'A1:O1',
    validations: [
      { sqref: 'C3:C3', lista: listAnios },
      { sqref: 'C4:C4', lista: '1,2,3,4,5,6,7,8,9,10,11,12' }
    ]
  };
}

/* ---------- construcción de la hoja de registros ---------- */
function hojaRegistros(nombre, bloque, rs, conPago){
  const hoy = hoyISO();
  
  // Aplanamos los registros
  const operaciones = [];
  rs.forEach(r => {
    const nOps = operaciones.length;
    let deudaActualApp = (r.estado === 'pagado') ? 0 : Math.max(0, (Number(r.precio) || 0) - (r.abonos || []).reduce((s, a) => s + (Number(a.monto) || 0), 0));
    
    if (r.abonos && r.abonos.length > 0) {
      const abonos = [...r.abonos].sort((a,b) => a.fecha.localeCompare(b.fecha));
      let deuda = Number(r.precio) || 0;
      let hasInitialAbono = abonos[0].fecha === r.fecha || abonos[0].inicial === true;
      
      if (!hasInitialAbono) {
        operaciones.push({
          fecha: r.fecha, cliente: r.nombre, figura: r.figura, operacion: 'Apartado',
          precio: r.precio, metodo: r.metodo, monto: 0, deudaAnt: deuda, restante: deuda,
          estado: 'Pendiente', nota: 'Abono diferido',
          deudaFinal: deudaActualApp
        });
        deudaActualApp = ''; 
      }

      abonos.forEach((ab, idx) => {
        let pagado = Number(ab.monto) || 0;
        let rest = Math.max(0, deuda - pagado);
        let isFirst = idx === 0 && hasInitialAbono;
        operaciones.push({
          fecha: ab.fecha, cliente: r.nombre, figura: r.figura,
          operacion: isFirst ? 'Apartado' : 'Abono',
          precio: r.precio, metodo: ab.metodo || r.metodo, monto: pagado, deudaAnt: deuda, restante: rest,
          estado: rest <= 0 ? 'Pagado' : 'Pendiente', nota: ab.nota || '',
          deudaFinal: isFirst ? deudaActualApp : ''
        });
        deuda = rest;
      });

      if(r.estado === 'pagado' && deuda > 0) {
        operaciones.push({
          fecha: r.fechaPago || r.fecha, cliente: r.nombre, figura: r.figura, operacion: 'Liquidación',
          precio: r.precio, metodo: r.metodo, monto: deuda, deudaAnt: deuda, restante: 0,
          estado: 'Pagado', nota: 'Marcado manual',
          deudaFinal: ''
        });
      }
    } else {
      if (r.estado === 'pagado') {
         operaciones.push({
          fecha: r.fechaPago || r.fecha, cliente: r.nombre, figura: r.figura, operacion: 'Venta',
          precio: r.precio, metodo: r.metodo, monto: r.precio, deudaAnt: r.precio, restante: 0,
          estado: 'Pagado', nota: '',
          deudaFinal: deudaActualApp
        });
      } else {
         operaciones.push({
          fecha: r.fecha, cliente: r.nombre, figura: r.figura, operacion: 'Apartado',
          precio: r.precio, metodo: r.metodo, monto: 0, deudaAnt: r.precio, restante: r.precio,
          estado: 'Pendiente', nota: 'Sin abonos',
          deudaFinal: deudaActualApp
        });
      }
    }
    for(let i = nOps; i < operaciones.length; i++){                 // fecha de corte (límite) y fecha de pago de cada pedido
      operaciones[i].corte = limiteDe(r) || '';
      operaciones[i].pago = r.estado === 'pagado' ? (r.fechaPago || r.fecha) : '';
    }
  });

  const cab = ['Fecha', ...(conPago ? [] : ['Cliente']), 'Figura / Producto', 'Operación', 'Precio Total', 'Método de Pago', 'Monto Pagado', 'Deuda Anterior', 'Restante por Cobrar', 'Estado', 'Notas y Observación', 'Saldo del Pedido', 'Fecha de Corte', 'Fecha de Pago'];
  
  // Convertimos el bloque superior a cabecera roja ancha
  const bloqueEstilizado = [
    [['Registro Torii — Registros', 'tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash'], ['','tit_dash']],
    bloque[1] // La fila de "Del 30-10 al..." se mantiene
  ];
  
  const filas = [...bloqueEstilizado, [], cab.map(t => [t, 'enc_blk'])];
  const hr = filas.length; // índice de la cabecera (1-based)
  
  operaciones.forEach(o => {
    filas.push([
      [o.fecha, 'fec'],
      ...(conPago ? [] : [[o.cliente, 'txt']]),
      [o.figura, 'txt'],
      [o.operacion, 'txt'],
      [o.precio, 'usd'],
      [o.metodo, 'txt'],
      [o.monto, 'usd'],
      [o.deudaAnt, 'usd'],
      [o.restante, 'usd'],
      [o.estado, o.estado === 'Pagado' ? 'ok' : 'ap'],
      [o.nota, 'txt'],
      [o.deudaFinal, 'usd'],
      [o.corte, 'fec'],
      [o.pago, 'fec'],
      ['', 'bg']
    ]);
  });

  // Fila de suma total
  const n = operaciones.length;
  const colMonto = conPago ? 'F' : 'G';
  filas.push([
    ['TOTAL', 'tl'],
    ...Array(conPago ? 4 : 5).fill(['', 'tl']),
    [0, 'usd_b', `SUBTOTAL(109,${colMonto}${hr + 1}:${colMonto}${hr + n})`],
    ...Array(7).fill(['', 'tl']),
    ['', 'bg']
  ]);

  // Validaciones (Listas desplegables)
  const validations = [];
  const vOffset = conPago ? -1 : 0;
  
  const colOp = ExcelLite.col(3 + vOffset);
  validations.push({ sqref: `${colOp}${hr+1}:${colOp}1048576`, lista: `Venta,Apartado,Abono,Liquidación` });
  
  const colMet = ExcelLite.col(5 + vOffset);
  const metodosLimitados = estado.config.metodosPago.join(',').substring(0, 200).replace(/"/g, ''); 
  validations.push({ sqref: `${colMet}${hr+1}:${colMet}1048576`, lista: metodosLimitados });
  
  const colEst = ExcelLite.col(9 + vOffset);
  validations.push({ sqref: `${colEst}${hr+1}:${colEst}1048576`, lista: `Pagado,Pendiente` });

  return {
    nombre: nombre,
    filas,
    anchos: [15, ...(conPago ? [] : [22]), 25, 14, 13, 16, 15, 15, 17, 12, 25, 16, 15, 15, 10],
    congelar: hr,
    filtro: `A${hr}:${ExcelLite.col(cab.length - 1)}${hr + n}`,
    merge: 'A1:N1',
    validations
  };
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
  
  const bloque = [[['Registro Torii — Registros', 'tit_big']],
    [[`Del ${d ? fmtFecha(d) : fmtFecha(rs[0].fecha)} al ${h ? fmtFecha(h) : fmtFecha(hoyISO())} · Plazo de apartados: ${DIAS_LIMITE} días`, 'nota']]];
  
  const shDashboard = hojaDashboard();
  const shRegistros = hojaRegistros('Registros', bloque, rs, false);

  bajarXlsx(`registros-torii_${d || 'inicio'}_a_${h || hoyISO()}.xlsx`, [shDashboard, shRegistros]);
}

/* ---------- Excel 2: historial completo de un cliente ---------- */
function exportarCliente(id){
  const c = estado.clientes.find(k => k.id === (id || $('#xCliente').value));
  if(!c){ aviso('Elige un cliente.', 'error'); return; }
  const rs = regsDe(c).sort((a, b) => a.fecha.localeCompare(b.fecha));
  if(!rs.length){ aviso('Este cliente aún no tiene registros.', 'error'); return; }
  const lbl = (t, v, s = 'def') => [[t, 'lbl'], [v, s]];
  
  const bloque = [[['Registro Torii — Historial de cliente', 'tit_big']],
    lbl('Cliente', `${c.nombre} (${c.idc})`), lbl('Teléfono', c.telefono || '—'), lbl('Cédula', c.cedula || '—'), lbl('Registrado en la app', fechaAlta(c), 'fpl'), lbl('Categorías', c.categorias.join(', ') || '—'), lbl('Primera compra', primeraCompra(c), 'fpl'),
    lbl('Pagadas', rs.filter(r => r.estado === 'pagado').length), lbl('Apartadas', rs.filter(r => r.estado === 'apartado').length)];
  
  const shRegistros = hojaRegistros('Historial', bloque, rs, true);
  
  bajarXlsx(`cliente-${norm(c.nombre).replace(/[^a-z0-9]+/g, '-')}.xlsx`, [shRegistros]);
}
