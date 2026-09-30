// Arranque: fuentes → escenas (orden de la historia) → modo render (Playwright) o reproducción en vivo.
import { boot, renderAt, E, FMT, RENDER, QS } from './core/engine.js';

// La historia, en orden: cada escena vive en scenes/<id>.js y dura lo que diga su `dur`.
// La intro vertical (scenes/intro.js) solo existe en el reel; el título horizontal (scenes/titulo.js) solo en --fmt=wide.
export const ORDER = ['planeta', 'final'];
// Cambiar el tempo o recortar una escena ya aprobada sin tocar su código: { id: [[salida, fuente], …] } en segundos
// (curva monótona suave; ver core/dots.js remap). Vacío hasta que haga falta.
const REMAP = {};

async function main() {
  await Promise.all(['200', '300', '400', '500', '600', '700', '800'].map(w => document.fonts.load(`${w} 100px Inter`, 'AÁÉÍÓÚÑ0123456789·')));
  await document.fonts.ready;
  const only = QS.get('only');
  // horizontal (YouTube, Facebook): abre con el título horizontal en lugar de la intro vertical con «gira tu teléfono»
  const ids = only ? only.split(',') : FMT === 'wide' ? ['titulo', ...ORDER] : ORDER;
  const scenes = [];
  for (const id of ids.filter(i => i !== 'intro')) {
    let mod;
    try { mod = await import(`./scenes/${id}.js`); }
    catch (e) { if (only || !/fetch/i.test(e.message)) throw e; console.warn('escena pendiente:', id); continue; }   // en producción: la película se arma con lo que ya existe
    scenes.push({ ...mod.default, ...(REMAP[id] && { remap: REMAP[id] }) });
  }
  const wantIntro = FMT === 'reel' && (!only || ids.includes('intro'));
  const intro = wantIntro ? { ...(await import('./scenes/intro.js')).default } : null;
  await boot({ scenes, intro });
  renderAt(0);
  window.__ready = true;
  if (!RENDER) {
    // vista previa en vivo: escala el escenario a la ventana
    const st = document.getElementById('stage');
    const fit = () => { const sw = st.offsetWidth, sh = st.offsetHeight, k = Math.min(innerWidth / sw, innerHeight / sh); st.style.transform = `translate(${(innerWidth - sw * k) / 2}px,${(innerHeight - sh * k) / 2}px) scale(${k})`; };
    fit(); addEventListener('resize', fit);
    const start = +(QS.get('t') || 0);
    renderAt(start);
    document.getElementById('play').onclick = () => {
      document.getElementById('play').style.display = 'none';
      const t0 = performance.now() / 1000 - start;
      const loop = () => { const t = performance.now() / 1000 - t0; renderAt(Math.min(t, window.DURATION - 1e-3)); if (t < window.DURATION) requestAnimationFrame(loop); };
      loop();
    };
  }
}
main().catch(e => { console.error(e.stack || e); window.__error = String(e.stack || e); });
