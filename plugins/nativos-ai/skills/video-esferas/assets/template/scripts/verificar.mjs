#!/usr/bin/env node
// Revisa un video terminado: formato, cuadros, audio, tramos negros, y arma una hoja de 12 cuadros para mirarla.
// Uso: node scripts/verificar.mjs video.mp4 [hoja.jpg | -]   (con «-» no arma la hoja). Sale con 1 si faltan cuadros.
// Un tramo negro no siempre es un error (una escena puede fundirse a la oscuridad a propósito): revísalo en la hoja.
import { createRequire } from 'module';
import { execFileSync, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const require = createRequire(path.join(process.cwd(), 'package.json'));
let FF = 'ffmpeg'; try { FF = require('ffmpeg-static') || FF; } catch { /* ffmpeg del sistema */ }
const video = process.argv[2];
if (!video) { console.error('Uso: node scripts/verificar.mjs video.mp4 [hoja.jpg]'); process.exit(2); }
if (!existsSync(video)) { console.error(`No existe: ${video}`); process.exit(2); }
const sheet = process.argv[3] || video.replace(/\.mp4$/i, '') + '-hoja.jpg';

// ffmpeg -i sin salida describe el archivo en stderr; -f null decodifica todo y cuenta cuadros y negros
const info = spawnSync(FF, ['-hide_banner', '-i', video], { encoding: 'utf8' }).stderr;
const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(info), dur = m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
const vid = /Video: (\w+).*?, (\d{3,5})x(\d{3,5}).*?, ([\d.]+) fps/.exec(info);
const audio = /Audio:/.test(info);
const scan = spawnSync(FF, ['-hide_banner', '-i', video, '-vf', 'blackdetect=d=0.25:pix_th=0.06:pic_th=0.995', '-an', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const frames = +([...scan.matchAll(/frame=\s*(\d+)/g)].pop()?.[1] ?? 0);
const blacks = [...scan.matchAll(/black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)/g)].map(b => b.slice(1).map(Number));

const expected = vid ? Math.round(dur * +vid[4]) : 0, complete = !!vid && Math.abs(frames - expected) <= 1;
console.log(`Archivo: ${video}`);
console.log(`  ${vid ? `${vid[1]} ${vid[2]}×${vid[3]} a ${vid[4]} fps` : 'sin pista de video (!)'} · ${dur.toFixed(2)} s · ${frames} cuadros`);
console.log(complete ? '  cuadros completos: sí' : `  ✗ cuadros incompletos: ${frames} de ${expected} (¿se cortó el render?)`);
console.log(`  audio: ${audio ? 'sí' : 'no (normal: la música se agrega en la app donde se publica)'}`);
console.log(blacks.length ? `  tramos negros (≥ 0.25 s): ${blacks.map(([a, b]) => `${a.toFixed(2)}–${b.toFixed(2)} s`).join(', ')}` : '  sin tramos negros');

if (sheet === '-') process.exit(complete ? 0 : 1);
// hoja: 12 cuadros repartidos en todo el video (vertical → 6×2 miniaturas; horizontal → 4×3)
const portrait = vid && +vid[3] > +vid[2];
const n = 12, fps = n / Math.max(dur, 0.1);
execFileSync(FF, ['-y', '-loglevel', 'error', '-i', video, '-vf', `fps=${fps.toFixed(5)},scale=${portrait ? 270 : 480}:-1,tile=${portrait ? '6x2' : '4x3'}:padding=4`, '-frames:v', '1', sheet]);
console.log(`  hoja de 12 cuadros → ${sheet}`);
process.exit(complete ? 0 : 1);
