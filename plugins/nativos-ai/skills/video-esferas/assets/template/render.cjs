// Render determinista: servidor local (módulos ES) → Chrome headless con GPU → capturas → ffmpeg. Vídeo MUDO.
// Uso (desde la carpeta del proyecto). Cada opción va como --clave=valor o como variable de entorno (FMT=wide …):
//   node render.cjs stills 0.5,3,6 review/planeta --scene=planeta     → PNG en tiempo LOCAL de esa escena
//   node render.cjs sheet 0:8:0.5 review/planeta/hoja.jpg --scene=planeta → hoja de contactos (miniaturas, 4 columnas)
//   node render.cjs bench 2 --scene=planeta                            → milisegundos por fotograma
//   node render.cjs video salida.mp4 --fmt=reel --ss=2                 → película completa
//   node render.cjs serve                                              → vista previa en vivo en el navegador
// Opciones: --scene (una escena, tiempo local; si no, la película entera) · --fmt=reel|wide (reel = 1080×1920 con
// la película girada y la intro vertical; wide = 1920×1080 horizontal) · --ss=1|2 (supermuestreo: 2 para finales) ·
// --fps=60 · --start/--end (segundos, solo vídeo) · --only=a,b (carga solo esas escenas: revisar una unión).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const { spawn, execFileSync } = require('child_process');

const argv = process.argv.slice(2), flags = {};
const pos = argv.filter(a => { const m = /^--([\w-]+)=(.*)$/.exec(a); if (m) flags[m[1]] = m[2]; return !m; });
const opt = (k, d) => flags[k] ?? process.env[k.toUpperCase()] ?? d;
const [mode = 'video', a1, a2] = pos;
const SCENE = opt('scene', '');
const FMT = opt('fmt', SCENE && SCENE !== 'intro' ? 'wide' : 'reel');
const SS = opt('ss', '1'), FPS = +opt('fps', 60), ONLY = opt('only', '');
let FFMPEG = 'ffmpeg'; try { FFMPEG = require('ffmpeg-static') || FFMPEG; } catch { /* ffmpeg del sistema */ }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };

function serve(root, port = 0) {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(root, p);
      if (!f.startsWith(root)) { r.writeHead(403); r.end(); return; }
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(d); });
    });
    srv.listen(port, '127.0.0.1', () => res(srv));
  });
}

// GPU por sistema: Metal en Mac, Direct3D en Windows, Vulkan en Linux. Sin GPU, Chrome cae a SwiftShader (lento pero sale igual).
const GPU = { darwin: ['--use-angle=metal'], win32: ['--use-angle=d3d11'], linux: ['--use-angle=vulkan', '--enable-features=Vulkan'] }[process.platform] || [];
const ARGS = [...GPU, '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-watchdog', '--disable-renderer-backgrounding'];
async function launch() {
  try { return await chromium.launch({ channel: 'chrome', headless: true, args: ARGS }); }          // Google Chrome instalado
  catch { try { return await chromium.launch({ headless: true, args: ARGS }); }                      // Chromium de Playwright
  catch { console.error('No encuentro Chrome. Instala Google Chrome o corre: npx playwright-core install chromium'); process.exit(1); } }
}

(async () => {
  if (mode === 'serve') {   // vista previa: abre la URL, pulsa ▶ (en tiempo real; si una escena pesa, se verá a tirones)
    const srv = await serve(__dirname, +opt('port', 5173)), u = `http://127.0.0.1:${srv.address().port}/index.html`;
    console.log(`Vista previa (Ctrl+C para cerrar):\n  reel       ${u}\n  horizontal ${u}?fmt=wide\n  desde t    ${u}?t=12`);
    return;
  }
  const srv = await serve(__dirname);
  const [vw, vh] = FMT === 'reel' ? [1080, 1920] : [1920, 1080];
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/status of 404/.test(m.text())) console.log(`[page:${m.type()}]`, m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  const q = ['render', 'fmt=' + FMT, 'ss=' + SS];
  if (SCENE) q.push('only=' + SCENE); else if (ONLY) q.push('only=' + ONLY);
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html?${q.join('&')}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 180000 });
  const err = await page.evaluate(() => window.__error);
  if (err) { console.error(err); await browser.close(); srv.close(); process.exit(1); }
  const DUR = await page.evaluate(() => window.DURATION);
  const at = t => SCENE ? page.evaluate(([id, x]) => window.renderLocal(id, x), [SCENE, t]) : page.evaluate(x => window.renderAt(x), t);
  const done = async () => { await browser.close(); srv.close(); };

  if (mode === 'info') {
    console.log(JSON.stringify({ fmt: FMT, duracion: DUR, escenas: await page.evaluate(() => window.sceneInfo()) }, null, 1));
    return done();
  }
  if (mode === 'stills' || mode === 'bench') {
    const times = String(a1).split(',').map(Number);
    const dir = path.resolve(a2 || 'review/stills'); if (mode === 'stills') fs.mkdirSync(dir, { recursive: true });
    for (const t of times) {
      if (mode === 'bench') {
        await at(t);
        const T0 = Date.now(); for (let i = 0; i < 5; i++) { await at(t + i / 60); await page.screenshot({ type: 'jpeg', quality: 90 }); }
        console.log(`t=${t.toFixed(2)}  ${((Date.now() - T0) / 5).toFixed(0)} ms/fotograma (render + captura)`);
      } else {
        await at(t);
        const f = path.join(dir, `${SCENE || FMT}_${t.toFixed(2).padStart(6, '0')}.png`);
        await page.screenshot({ path: f }); console.log('→', f);
      }
    }
    return done();
  }
  if (mode === 'sheet') {
    const [s0, s1, st] = String(a1).split(':').map(Number);
    const times = []; for (let t = s0; t <= s1 + 1e-9; t += st) times.push(+t.toFixed(4));
    const out = path.resolve(a2 || 'review/hoja.jpg'); fs.mkdirSync(path.dirname(out), { recursive: true });
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'hoja-'));
    for (let i = 0; i < times.length; i++) { await at(times[i]); await page.screenshot({ path: path.join(tmp, `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 88 }); }
    const cols = 4, rows = Math.ceil(times.length / cols), tw = FMT === 'reel' ? 270 : 480;
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', path.join(tmp, '%04d.jpg'), '-vf', `scale=${tw}:-1,tile=${cols}x${rows}:padding=4`, '-frames:v', '1', out]);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`hoja (${times.length} fotogramas: ${times.join(', ')}) →`, out);
    return done();
  }
  // ---- vídeo mudo (la música se agrega después, en la app donde se publica) ----
  const out = path.resolve(a1 || 'video.mp4');
  const start = +opt('start', 0), end = Math.min(+opt('end', DUR), DUR);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-an',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opt('crf', 16)), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const f0 = Math.round(start * FPS), f1 = Math.round(end * FPS), T0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await at(f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 120 === 0) { const d = f - f0 + 1, el = (Date.now() - T0) / 1000; console.log(`fotograma ${f}/${f1}  ${(d / el).toFixed(1)} fps  faltan ${((f1 - f) / (d / el) / 60).toFixed(1)} min`); }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await done();
  console.log('listo →', out);
})();
