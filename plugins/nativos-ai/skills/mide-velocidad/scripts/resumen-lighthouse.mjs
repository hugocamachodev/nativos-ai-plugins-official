#!/usr/bin/env node
// Resume un reporte JSON de Lighthouse en lo que necesita el reporte de mide-velocidad: si terminó o no y por
// qué, los tiempos, el bloqueo, el peso, qué archivo se come el procesador y las oportunidades con ahorro.
// Solo lee. El JSON completo pesa medio mega: nunca lo abras entero, usa esto.
//
// uso: node resumen-lighthouse.mjs <reporte.json>
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ruta = process.argv[2];
if (!ruta || ruta === '--help') {
  console.log('uso: node resumen-lighthouse.mjs <reporte.json de lighthouse --output=json>');
  process.exit(ruta ? 0 : 1);
}
if (!existsSync(ruta)) {
  console.log(`No hay reporte en ${ruta}: Lighthouse se cayó o lo cortaron antes de terminar. Eso ya es un dato para el reporte.`);
  process.exit(0);
}
const r = JSON.parse(readFileSync(ruta, 'utf8'));
const a = (id) => r.audits?.[id];
const v = (id) => a(id)?.displayValue ?? 'sin dato';

console.log('Página:', r.finalDisplayedUrl || r.requestedUrl);
console.log('Lighthouse', r.lighthouseVersion, '·', r.configSettings?.formFactor, '· modo de frenado:', r.configSettings?.throttlingMethod,
  '· CPU', r.configSettings?.throttling?.cpuSlowdownMultiplier + 'x');
console.log('Navegador:', r.environment?.hostUserAgent);
if (r.runtimeError) console.log('\nNO TERMINÓ:', r.runtimeError.code, '-', r.runtimeError.message);
for (const w of r.runWarnings || []) console.log('AVISO:', w);
const simulado = r.configSettings?.throttlingMethod === 'simulate';
const cortado = (r.runWarnings || []).some((w) => /too slowly|time limit/i.test(w));
if (simulado)
  console.log('\nOJO: modo "simulate". Los tiempos de abajo son CALCULADOS por Lighthouse, no cronometrados: no se comparan\n' +
    'con los de chrome-devtools. Para cronometrar de verdad, corre con --throttling-method=devtools.');
if (cortado)
  console.log('OJO: Lighthouse cortó la medición antes de que la página terminara. El bloqueo total, "lista para usar" y el\n' +
    'trabajo del procesador son extrapolaciones y pueden pasar de lo que duró la corrida: NO los cites como tiempos.\n' +
    'Cita el aviso, cuánto duró la corrida (tu reloj) y las tareas largas.');

console.log(`\nTiempos (${simulado ? 'calculados' : 'cronometrados con el navegador frenado'}):`);
for (const [id, nombre] of [
  ['first-contentful-paint', 'Primer texto'],
  ['largest-contentful-paint', 'Lo principal (LCP)'],
  ['speed-index', 'Qué tan rápido se llena la pantalla'],
  ['total-blocking-time', 'Bloqueo total'],
  ['max-potential-fid', 'Peor congelón después de que aparece algo (no cuenta los de antes)'],
  ['interactive', 'Lista para usar'],
  ['cumulative-layout-shift', 'Saltos (CLS)'],
  ['server-response-time', 'Respuesta del servidor'],
  ['mainthread-work-breakdown', 'Trabajo del procesador'],
  ['total-byte-weight', 'Peso total'],
])
  console.log(`  ${nombre}: ${v(id)}`);

const elemento = a('lcp-breakdown-insight')?.details?.items?.find?.((i) => i.type === 'node')?.nodeLabel;
console.log('  Lo principal es:', elemento ? String(elemento).replace(/\s+/g, ' ').slice(0, 80) : 'Lighthouse no lo dijo (no lo adivines: va como no medido)');

const boot = a('bootup-time')?.details?.items || [];
if (boot.length) {
  console.log('\nArchivos que más usan el procesador:');
  for (const i of boot.slice(0, 4)) console.log(`  ${Math.round(i.total)} ms  ${i.url}`);
}
const tareas = a('long-tasks')?.details?.items || [];
if (!tareas.length) console.log('\nTareas largas: Lighthouse no registró la lista' + (cortado ? ' (cortó la medición antes).' : '.'));
if (tareas.length) {
  const peor = tareas.reduce((x, y) => (y.duration > x.duration ? y : x));
  console.log(`\nTarea más larga de toda la carga: ${Math.round(peor.duration)} ms, a los ${(peor.startTime / 1000).toFixed(1)} s.`);
  // Lighthouse lista como mucho 20: si salen 20, fueron al menos 20.
  const n = tareas.length >= 20 ? 'al menos 20 (Lighthouse lista solo las 20 más largas)' : tareas.length;
  const orden = tareas.slice().sort((x, y) => x.startTime - y.startTime);
  console.log(`Tareas largas: ${n}. En orden: ` + orden.map((t) => `${(t.startTime / 1000).toFixed(1)} s→${Math.round(t.duration)} ms`).join(', '));
}

const pesos = a('total-byte-weight')?.details?.items || [];
if (pesos.length) {
  console.log('\nLo más pesado:');
  for (const i of pesos.slice(0, 6)) console.log(`  ${Math.round(i.totalBytes / 1024)} KB  ${i.url}`);
}

// Errores rojos de la consola (solo vienen si se corrió con --only-categories=performance,best-practices).
const errores = a('errors-in-console')?.details?.items || [];
if (errores.length) {
  console.log('\nErrores en la consola:');
  for (const e of errores.slice(0, 5)) console.log(`  ${String(e.description || e.source || '').replace(/\s+/g, ' ').slice(0, 160)}`);
}
// La última captura de Lighthouse, para ver qué quedó en la pantalla (por ejemplo, si quedó en blanco).
const captura = a('final-screenshot')?.details?.data;
if (captura) {
  const ruta = ruta_json_sin_ext() + '-final.jpg';
  writeFileSync(ruta, Buffer.from(captura.split(',')[1], 'base64'));
  console.log('\nCaptura final de la pantalla:', ruta, '(ábrela con Read para verla)');
}
function ruta_json_sin_ext() {
  return ruta.replace(/\.json$/, '');
}

const conAhorro = Object.values(r.audits || {})
  .filter((x) => x.score !== null && x.score < 0.9 && (x.details?.overallSavingsMs > 0 || x.details?.overallSavingsBytes > 0 || /savings|ahorro/i.test(x.displayValue || '')))
  .map((x) => `  ${x.id}: ${x.displayValue || ''}`);
if (conAhorro.length) console.log('\nOportunidades que Lighthouse calcula con ahorro:\n' + conAhorro.join('\n'));
