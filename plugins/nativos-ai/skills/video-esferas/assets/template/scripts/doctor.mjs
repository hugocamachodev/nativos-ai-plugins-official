#!/usr/bin/env node
// Revisa que esta computadora pueda renderizar el video y dice, en lenguaje simple, qué falta y cómo arreglarlo.
// Uso, desde la carpeta del proyecto: node scripts/doctor.mjs   (sale con código 1 si falta algo imprescindible)
import { createRequire } from 'module';
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';

const require = createRequire(path.join(process.cwd(), 'package.json'));
const OS = process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'windows' : 'linux';
const FIX = {
  node: { mac: 'brew install node   (o el instalador LTS de https://nodejs.org)', windows: 'winget install OpenJS.NodeJS.LTS   (y abre una terminal nueva)', linux: 'instala Node 20 con nvm: https://github.com/nvm-sh/nvm' },
  chrome: { mac: 'instala Google Chrome, o corre: npx playwright-core install chromium', windows: 'instala Google Chrome, o corre: npx playwright-core install chromium', linux: 'npx playwright-core install --with-deps chromium' },
};
let bad = 0, warn = 0;
const ok = m => console.log(`  ✓ ${m}`);
const no = (m, fix) => { bad++; console.log(`  ✗ ${m}\n      → ${fix}`); };
const meh = (m, fix) => { warn++; console.log(`  ! ${m}\n      → ${fix}`); };

console.log(`Revisando esta computadora (${OS})…`);

// 1. Node
const [maj] = process.versions.node.split('.').map(Number);
maj >= 18 ? ok(`Node ${process.versions.node}`) : no(`Node ${process.versions.node} es muy viejo (hace falta 18 o más)`, FIX.node[OS]);

// 2. Librerías del proyecto
const libs = ['three', 'gsap', 'postprocessing', 'n8ao', 'playwright-core', 'ffmpeg-static'];
const missing = libs.filter(l => { try { require.resolve(l); return false; } catch { return true; } });
if (missing.length) { no(`Faltan librerías: ${missing.join(', ')}`, 'npm install   (desde la carpeta del proyecto)'); }
else ok('Librerías instaladas (Three.js, GSAP, postprocessing, N8AO, Playwright, FFmpeg)');

// 3. FFmpeg (viene dentro de ffmpeg-static; si no, el del sistema)
let ffmpeg = null;
try { const p = require('ffmpeg-static'); if (p && existsSync(p)) ffmpeg = p; } catch { /* sin ffmpeg-static */ }
if (!ffmpeg) try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); ffmpeg = 'ffmpeg'; } catch { /* sin ffmpeg */ }
if (ffmpeg) {
  const enc = execFileSync(ffmpeg, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
  /libx264/.test(enc) ? ok('FFmpeg con H.264 (para armar el MP4)') : no('FFmpeg no trae H.264', 'npm install ffmpeg-static');
} else no('No hay FFmpeg', 'npm install   (trae ffmpeg-static)');

// 4. Navegador + GPU: se abre Chrome sin ventana y se le pregunta qué tarjeta gráfica usa para WebGL
if (!missing.includes('playwright-core')) {
  const { chromium } = require('playwright-core');
  const GPU = { mac: ['--use-angle=metal'], windows: ['--use-angle=d3d11'], linux: ['--use-angle=vulkan', '--enable-features=Vulkan'] }[OS];
  const args = [...GPU, '--enable-gpu', '--ignore-gpu-blocklist'];
  let browser = null, which = '';
  try { browser = await chromium.launch({ channel: 'chrome', headless: true, args }); which = 'Google Chrome'; }
  catch { try { browser = await chromium.launch({ headless: true, args }); which = 'Chromium de Playwright'; } catch { /* ninguno */ } }
  if (!browser) no('No encuentro un navegador para renderizar', FIX.chrome[OS]);
  else {
    ok(`Navegador: ${which}`);
    const page = await browser.newPage();
    const gl = await page.evaluate(() => {
      const c = document.createElement('canvas').getContext('webgl2');
      if (!c) return null;
      const i = c.getExtension('WEBGL_debug_renderer_info');
      return i ? c.getParameter(i.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER);
    });
    await browser.close();
    if (!gl) no('El navegador no tiene WebGL2', 'actualiza Chrome; en Linux sin pantalla instala las dependencias con: npx playwright-core install --with-deps chromium');
    else if (/swiftshader|llvmpipe|software|basic render/i.test(gl)) meh(`WebGL por software (${gl}): funciona, pero el render será 5–20× más lento`, 'actualiza los drivers de la tarjeta gráfica; o baja la calidad: --ss=1 y menos esferas');
    else ok(`Tarjeta gráfica: ${gl}`);
  }
}

console.log(bad ? `\nFalta ${bad} cosa(s) imprescindible(s). Arréglalas y vuelve a correr: node scripts/doctor.mjs`
  : warn ? '\nListo para renderizar (con avisos).' : '\nTodo listo para renderizar.');
process.exit(bad ? 1 : 0);
