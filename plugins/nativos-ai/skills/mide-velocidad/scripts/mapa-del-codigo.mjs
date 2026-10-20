#!/usr/bin/env node
// Lee el mapa de fuentes (.js.map) de un archivo JavaScript ya compilado y dice:
//   1. cuánto pesa cada librería y tu propio código dentro de ese archivo, y
//   2. a qué archivo y línea original corresponde una posición (las que da medidor.js en archivosLentos).
// Solo lee. Sin dependencias: decodifica el mapa a mano.
//
// uso: node mapa-del-codigo.mjs --map dist/assets/index-abc.js.map [--js dist/assets/index-abc.js] [--posiciones 2655,1511585]
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
if (args.includes('--help') || !opt('--map')) {
  console.log('uso: node mapa-del-codigo.mjs --map <archivo.js.map> [--js <archivo.js>] [--posiciones 123,456]\n' +
    '  Sin --js el peso de cada parte es aproximado; las posiciones necesitan --js.');
  process.exit(opt('--map') ? 0 : 1);
}
const mapa = JSON.parse(readFileSync(opt('--map'), 'utf8'));
const js = opt('--js') ? readFileSync(opt('--js'), 'utf8') : null;
const lineasJs = js ? js.split('\n') : null;

// Base64 VLQ, el formato de "mappings".
const B64 = Object.fromEntries([...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'].map((c, i) => [c, i]));
function vlq(segmento) {
  const out = [];
  let valor = 0, shift = 0;
  for (const c of segmento) {
    const d = B64[c];
    valor += (d & 31) << shift;
    if (d & 32) shift += 5;
    else {
      out.push(valor & 1 ? -(valor >>> 1) : valor >>> 1);
      valor = 0;
      shift = 0;
    }
  }
  return out;
}

// lineas[i] = segmentos [colGenerada, fuente, lineaOriginal, colOriginal, nombre]
const lineas = [];
let fuente = 0, lin = 0, col = 0, nombre = 0;
for (const textoLinea of mapa.mappings.split(';')) {
  const segs = [];
  let colGen = 0;
  for (const s of textoLinea.split(',')) {
    if (!s) continue;
    const v = vlq(s);
    colGen += v[0];
    if (v.length >= 4) {
      fuente += v[1];
      lin += v[2];
      col += v[3];
      if (v.length >= 5) nombre += v[4];
      segs.push([colGen, fuente, lin, col, v.length >= 5 ? nombre : -1]);
    } else segs.push([colGen, -1]);
  }
  lineas.push(segs);
}

// Las rutas de tu código se muestran desde la carpeta del proyecto: se quita lo que todas tienen en común.
const propias = mapa.sources.filter((x) => x && !x.includes('node_modules/'));
let prefijo = propias.length ? propias[0].slice(0, propias[0].lastIndexOf('/') + 1) : '';
for (const x of propias) while (prefijo && !x.startsWith(prefijo)) prefijo = prefijo.slice(0, prefijo.slice(0, -1).lastIndexOf('/') + 1);
const corta = (x) => {
  const nm = x.lastIndexOf('node_modules/');
  return nm >= 0 ? x.slice(nm) : x.startsWith(prefijo) ? x.slice(prefijo.length) : x;
};

const grupo = (src) => {
  if (src == null) return '(sin origen)';
  const nm = src.lastIndexOf('node_modules/');
  if (nm >= 0) {
    const resto = src.slice(nm + 13).split('/');
    return resto[0].startsWith('@') ? resto[0] + '/' + resto[1] : resto[0];
  }
  return 'tu código';
};

// 1 · Peso por parte: cada segmento se queda con los caracteres generados hasta el siguiente.
const porGrupo = {}, porArchivoPropio = {};
let total = 0;
lineas.forEach((segs, i) => {
  const largo = lineasJs ? lineasJs[i]?.length ?? 0 : segs.length ? segs.at(-1)[0] : 0;
  segs.forEach((s, j) => {
    const hasta = j + 1 < segs.length ? segs[j + 1][0] : largo;
    const n = Math.max(0, hasta - s[0]);
    const src = s[1] >= 0 ? mapa.sources[s[1]] : null;
    const g = grupo(src);
    porGrupo[g] = (porGrupo[g] || 0) + n;
    if (g === 'tu código') {
      const f = corta(src);
      porArchivoPropio[f] = (porArchivoPropio[f] || 0) + n;
    }
    total += n;
  });
});
const kb = (n) => (n / 1024).toFixed(0).padStart(6) + ' KB';
const pct = (n) => ((100 * n) / total).toFixed(0).padStart(3) + '%';
console.log(`Peso dentro del archivo (sin comprimir${lineasJs ? '' : ', aproximado'}): ${kb(total).trim()}`);
for (const [g, n] of Object.entries(porGrupo).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`${kb(n)} ${pct(n)}  ${g}`);
console.log('\nTu código, por archivo:');
for (const [f, n] of Object.entries(porArchivoPropio).sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`${kb(n)} ${pct(n)}  ${f}`);

// 2 · Posiciones (sourceCharPosition de los cuadros lentos) → archivo y línea original.
if (opt('--posiciones')) {
  if (!js) {
    console.log('\nPara traducir posiciones hace falta --js con el archivo compilado.');
    process.exit(0);
  }
  console.log('\nPosición → origen:');
  for (const p of opt('--posiciones').split(',').map(Number)) {
    if (!(p > 0)) {
      console.log(`${p}: sin posición (es la carga del archivo completo)`);
      continue;
    }
    let resto = p, li = 0;
    while (li < lineasJs.length && resto > lineasJs[li].length) resto -= lineasJs[li].length + 1, li++;
    const segs = lineas[li] || [];
    let mejor = null;
    for (const s of segs) if (s[0] <= resto && s[1] >= 0) mejor = s;
    console.log(
      mejor
        ? `${p}: ${corta(mapa.sources[mejor[1]])}:${mejor[2] + 1}${mejor[4] >= 0 ? ' (' + mapa.names[mejor[4]] + ')' : ''}`
        : `${p}: no aparece en el mapa`,
    );
  }
}
