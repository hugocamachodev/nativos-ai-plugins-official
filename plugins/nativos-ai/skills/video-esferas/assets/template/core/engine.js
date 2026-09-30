// Motor de «video de esferas»: Three.js (esferas instanciadas PBR) + GSAP (una línea de tiempo pausada por escena,
// posicionada fotograma a fotograma → determinista) + postprocessing (AO N8AO, DOF, bloom, tone mapping).
// Todo lo que se ve está hecho de esferas. Guía de estilo del proyecto: LOOK.md.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText.js';
import { CustomEase } from 'gsap/CustomEase.js';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, DepthOfFieldEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode, SMAAEffect, HueSaturationEffect, BrightnessContrastEffect, ChromaticAberrationEffect } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import * as dots from './dots.js';

gsap.registerPlugin(SplitText, CustomEase);
gsap.ticker.lagSmoothing(0);
gsap.defaults({ overwrite: false });

export const QS = new URLSearchParams(location.search);
export const RENDER = QS.has('render');
export const FMT = QS.get('fmt') === 'wide' ? 'wide' : 'reel';   // reel: 1080×1920 con la película girada · wide: solo película 1920×1080
export const SS = +(QS.get('ss') || 1);                            // supermuestreo (2 = 4 muestras/píxel en finales)
export const FW = 1920, FH = 1080;                                 // película (apaisada)
export const IW = 1080, IH = 1920;                                 // intro (vertical)
if (RENDER) document.body.classList.add('render');
document.body.classList.add(FMT);

function makeRenderer(canvas, w, h) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance', stencil: false });
  r.setPixelRatio(SS); r.setSize(w, h, false);
  r.toneMapping = THREE.NoToneMapping;          // el tone mapping lo hace la cadena de post
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
  r.setClearColor(0x000000, 1);
  return r;
}
export const renderer = makeRenderer(document.getElementById('gl'), FW, FH);
export const renderer2 = FMT === 'reel' ? makeRenderer(document.getElementById('gl2'), IW, IH) : null;

// ---------- color: siempre en espacio lineal de trabajo ----------
export const col = hex => new THREE.Color(hex);                 // '#ff8800' → Color lineal
export const mixCol = (a, b, t) => a.clone().lerp(b, t);

// ---------- entorno de reflejos (lo que hace que cada esfera brille de colores) ----------
// Paneles emisivos alrededor del origen → PMREM. i > 1 = HDR (reflejos que florecen con el bloom).
export const STUDIO = [
  { pos: [0, 9, 3], color: '#fff1e0', i: 5, w: 9, h: 3 },        // softbox cenital cálido
  { pos: [-9, 2, 4], color: '#ff8a2a', i: 3.2, w: 2.5, h: 8 },   // tira naranja
  { pos: [9, 1, 3], color: '#2ec8ff', i: 3.2, w: 2.5, h: 8 },    // tira turquesa
  { pos: [2, -3, -10], color: '#6a3cff', i: 1.4, w: 10, h: 3 },  // contra violeta
  { pos: [0, 0, 10], color: '#ffffff', i: .35, w: 12, h: 6 },    // relleno frontal tenue
];
export function makeEnv(panels = STUDIO, r = renderer) {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x000000);
  for (const p of panels) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w ?? 4, p.h ?? 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(p.i ?? 1), side: THREE.DoubleSide }));
    m.position.fromArray(p.pos); m.lookAt(0, 0, 0); s.add(m);
  }
  const pm = new THREE.PMREMGenerator(r);
  const tex = pm.fromScene(s, 0).texture; pm.dispose();
  return tex;
}

// ---------- material de «gota de pintura»: acrílico brillante con barniz + brillo propio por instancia ----------
export function paintMaterial(o = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: o.roughness ?? .38, metalness: o.metalness ?? 0,
    clearcoat: o.clearcoat ?? 1, clearcoatRoughness: o.clearcoatRoughness ?? .05,
    envMapIntensity: o.envMapIntensity ?? 1, iridescence: o.iridescence ?? 0, iridescenceIOR: 1.3,
    sheen: o.sheen ?? 0, sheenColor: new THREE.Color(o.sheenColor ?? '#ffffff'), specularIntensity: o.specularIntensity ?? 1,
  });
  // aGlow (por instancia): emisión = color de la instancia × aGlow (lineal, HDR). Estrellas, núcleos, polvo encendido.
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance += vColor.rgb * vGlow;\n#endif');
  };
  m.customProgramCacheKey = () => 'paint-glow';
  return m;
}

// ---------- campo de esferas instanciadas ----------
// Rellena los arrays (pos xyz, rad, sq = aplastamiento en z para «gotas» sobre un tablero, col rgb lineal, glow)
// y llama commit() en cada fotograma que cambie algo. count = cuántas se dibujan.
export class SphereField {
  constructor(n, o = {}) {
    this.n = n; this.count = n;
    this.pos = new Float32Array(n * 3); this.rad = new Float32Array(n).fill(1); this.sq = new Float32Array(n).fill(1);
    this.col = new Float32Array(n * 3).fill(1); this.glow = new Float32Array(n);
    const seg = o.seg ?? 24;
    const geo = new THREE.SphereGeometry(1, seg, Math.max(4, Math.round(seg * .7)));
    this.aGlow = new THREE.InstancedBufferAttribute(this.glow, 1); this.aGlow.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aGlow', this.aGlow);
    this.material = o.material || paintMaterial(o);
    const m = this.mesh = new THREE.InstancedMesh(geo, this.material, n);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor = new THREE.InstancedBufferAttribute(this.col, 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = o.castShadow ?? true; m.receiveShadow = o.receiveShadow ?? true; m.frustumCulled = false;
    if (o.name) m.name = o.name;
  }
  set(i, x, y, z, r) { const k = i * 3; this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; if (r !== undefined) this.rad[i] = r; }
  color(i, c, glow) { const k = i * 3; this.col[k] = c.r; this.col[k + 1] = c.g; this.col[k + 2] = c.b; if (glow !== undefined) this.glow[i] = glow; }
  commit() {
    const M = this.mesh.instanceMatrix.array, p = this.pos, R = this.rad, S = this.sq;
    for (let i = 0; i < this.count; i++) {
      const r = R[i], o = i * 16, k = i * 3;
      M[o] = r; M[o + 1] = 0; M[o + 2] = 0; M[o + 3] = 0;
      M[o + 4] = 0; M[o + 5] = r; M[o + 6] = 0; M[o + 7] = 0;
      M[o + 8] = 0; M[o + 9] = 0; M[o + 10] = r * S[i]; M[o + 11] = 0;
      M[o + 12] = p[k]; M[o + 13] = p[k + 1]; M[o + 14] = p[k + 2]; M[o + 15] = 1;
    }
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true; this.aGlow.needsUpdate = true;
  }
}

// ---------- cadena de post: AO de contacto → DOF → bloom + tone mapping + grading → (SMAA) ----------
export function makeComposer(scene, camera, o = {}, r = renderer) {
  const size = r.getDrawingBufferSize(new THREE.Vector2());
  const c = new EffectComposer(r, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
  c.addPass(new RenderPass(scene, camera));
  const fx = {};
  if (o.ao !== false) {
    const ao = new N8AOPostPass(scene, camera, size.x, size.y);
    Object.assign(ao.configuration, { aoRadius: 1, distanceFalloff: 1, intensity: 2.2, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 12, halfRes: false, gammaCorrection: false }, o.ao || {});
    c.addPass(ao); fx.ao = ao;
  }
  if (o.dof) { fx.dof = new DepthOfFieldEffect(camera, Object.assign({ worldFocusDistance: 10, worldFocusRange: 3, bokehScale: 3 * SS }, o.dof)); c.addPass(new EffectPass(camera, fx.dof)); }
  fx.bloom = new BloomEffect(Object.assign({ mipmapBlur: true, intensity: .9, luminanceThreshold: .95, luminanceSmoothing: .3, radius: .72 }, o.bloom || {}));
  fx.tone = new ToneMappingEffect({ mode: ToneMappingMode[o.tone || 'NEUTRAL'] });   // NEUTRAL conserva la saturación
  fx.hs = new HueSaturationEffect({ saturation: o.saturation ?? .08 });
  fx.bc = new BrightnessContrastEffect({ brightness: o.brightness ?? 0, contrast: o.contrast ?? .08 });
  fx.vig = new VignetteEffect({ offset: .3, darkness: o.vignette ?? .5 });
  const chain = [fx.bloom, fx.tone, fx.hs, fx.bc, fx.vig];
  if (o.ca) { fx.ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(o.ca, o.ca * .6), radialModulation: true, modulationOffset: .35 }); chain.push(fx.ca); }
  c.addPass(new EffectPass(camera, ...chain));
  if (SS < 2 && o.smaa !== false) c.addPass(new EffectPass(camera, new SMAAEffect()));
  c.fx = fx;
  return c;
}

// ---------- tipografía compartida (un solo estilo en todo el vídeo): Inter ligera, tracking amplio ----------
// line(): crea la línea centrada (oculta); reveal(): entrada letra a letra (desenfoque → nítido) y salida, en la línea de tiempo.
export function line(root, text, o = {}) {
  const el = document.createElement('div');
  el.textContent = text;
  // legibilidad en el móvil (se lee en 1–2 s sobre campos de esferas): mínimo 54 px, peso 500, tracking ≤ .2em y halo oscuro.
  // Es política global: ninguna escena la afina por su cuenta.
  const size = Math.max(o.size ?? 54, 54), ls = Math.min(parseFloat(o.ls ?? .2), .2);
  el.style.cssText = `position:absolute;left:0;right:0;top:${o.y ?? '82%'};transform:translateY(-50%);text-align:center;` +
    `font:500 ${size}px Inter,sans-serif;letter-spacing:${ls}em;color:${o.color ?? '#fff'};white-space:nowrap;visibility:hidden;${o.css ?? ''};` +
    'text-shadow:0 0 2px rgba(0,0,0,.95),0 0 10px rgba(0,0,0,.85),0 0 26px rgba(0,0,0,.75),0 0 60px rgba(0,0,0,.55)';
  root.appendChild(el); return el;
}
export function reveal(tl, el, tIn, tOut = null, o = {}) {
  const sp = new SplitText(el, { type: 'chars' });
  tl.set(el, { visibility: 'visible' }, tIn);
  tl.fromTo(sp.chars, { opacity: 0, y: o.rise ?? 16, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: o.dur ?? .9, ease: 'expo.out', stagger: o.stagger ?? .035 }, tIn);
  if (tOut !== null) {
    // la salida escalonada termina exactamente en tOut (arranca antes cuanto más larga es la línea)
    const st = (o.stagger ?? .035) * .5, total = .55 + st * Math.max(0, sp.chars.length - 1);
    tl.to(sp.chars, { opacity: 0, y: -(o.rise ?? 16) * .6, filter: 'blur(8px)', duration: .55, ease: 'power2.in', stagger: st }, tOut - total);
    tl.set(el, { visibility: 'hidden' }, tOut);
  }
  return sp;
}
// velo negro para fundidos: black(root) → elemento; anima su opacity en la línea de tiempo
export function black(root) {
  const el = document.createElement('div'); el.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0'; root.appendChild(el); return el;
}

// ---------- tiempo: cada escena anima en su propia línea de tiempo LOCAL (pausada, posicionada fotograma a fotograma) ----------
// Escenas consecutivas se solapan XF s (o s.xin): la saliente se funde sobre la entrante → nunca hay corte a negro.
// s.remap = [[salida, fuente], …] recorta/acelera una escena aprobada sin tocar su código (curva monótona suave).
export const XF = .8;   // fundido entre escenas (s): 0.8 da calma; una escena puede pedir otro con `xin`
export const ftext = document.getElementById('ftext'), itext = document.getElementById('itext');
export const E = { THREE, gsap, SplitText, CustomEase, renderer, renderer2, makeComposer, makeEnv, STUDIO, SphereField, paintMaterial, col, mixCol, dots, line, reveal, black, FW, FH, IW, IH, FMT, SS, RENDER, XF, ftext, itext };

let SCENES = [], INTRO = null;
export let DURATION = 0, FILM_T0 = 0;
const introEl = document.getElementById('intro');

export async function boot({ scenes, intro }) {
  INTRO = FMT === 'reel' ? intro : null;
  SCENES = scenes;
  let t = INTRO ? INTRO.dur : 0;                      // fin de la pieza anterior
  for (const [i, s] of scenes.entries()) {
    if (s.remap) s.dur = s.remap.at(-1)[0];            // duración de salida
    s.xin = (i || INTRO) ? (s.xin ?? XF) : 0;          // solape con la pieza anterior
    s.t0 = t - s.xin; t = s.t0 + s.dur;
    s.tl = gsap.timeline({ paused: true });
    s.root = document.createElement('div'); s.root.style.cssText = 'position:absolute;inset:0;visibility:hidden';
    ftext.appendChild(s.root);
    await s.build(E, s.root);
    if (s.timeline) s.timeline(s.tl, 0, E);            // t0 = 0: tiempos locales de la escena
    // fuera de su ventana la capa se retira con display:none (visibility:hidden no oculta hijos con visibility:visible)
    s.root.style.visibility = 'visible'; s.root.style.display = 'none';
  }
  DURATION = t; FILM_T0 = scenes.length ? scenes[0].t0 : t;
  if (INTRO) { INTRO.t0 = 0; INTRO.root = itext; INTRO.tl = gsap.timeline({ paused: true }); await INTRO.build(E, itext); if (INTRO.timeline) INTRO.timeline(INTRO.tl, 0, E); }
  Object.assign(window, { renderAt, renderLocal, DURATION, FILM_T0, sceneInfo: () => scenes.map(s => ({ id: s.id, t0: s.t0, dur: s.dur, xin: s.xin })) });
}

function draw(s, lt) {
  const st = s.remap ? dots.remap(s.remap, lt) : lt;
  s.tl.seek(st, false);
  s.update(st, E);
  s.render ? s.render(E) : s.composer.render(1 / 60);
}

// fundido encadenado: copia del lienzo de la escena saliente, dibujada con alfa sobre la entrante
let FB = null, FADE = null;
const FADE_SCENE = new THREE.Scene(), FADE_CAM = new THREE.Camera();
function grab() {
  if (!FB) {
    const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
    FB = new THREE.FramebufferTexture(sz.x, sz.y);
    FADE = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { map: { value: FB }, a: { value: 1 } }, transparent: true, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: 'uniform sampler2D map; uniform float a; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(map, vUv).rgb, a); }',
    }));
    FADE.frustumCulled = false; FADE_SCENE.add(FADE);
  }
  renderer.setRenderTarget(null);
  renderer.copyFramebufferToTexture(FB);
}
function over(a) {
  FADE.material.uniforms.a.value = a;
  renderer.setRenderTarget(null);
  const ac = renderer.autoClear; renderer.autoClear = false;
  renderer.render(FADE_SCENE, FADE_CAM);
  renderer.autoClear = ac;
}

export function renderAt(t) {
  if (INTRO) {
    const on = t < INTRO.dur, f = SCENES[0];
    introEl.style.display = on ? 'block' : 'none';
    if (on) { introEl.style.opacity = f ? 1 - dots.sstep(0, f.xin, t - f.t0) : 1; draw(INTRO, t); }
  }
  const act = SCENES.filter(s => t >= s.t0 && t < s.t0 + s.dur);
  for (const s of SCENES) s.root.style.display = act.includes(s) ? 'block' : 'none';
  if (!act.length) { renderer.setRenderTarget(null); renderer.clear(); return; }
  const b = act.at(-1);
  if (act.length === 1) { b.root.style.opacity = 1; return draw(b, t - b.t0); }
  const a = act[0], k = dots.sstep(0, b.xin, t - b.t0);   // a sale, b entra
  draw(a, t - a.t0); grab();
  draw(b, t - b.t0); over(1 - k);
  a.root.style.opacity = 1 - k; b.root.style.opacity = k;
}
// tiempo local de una escena (para trabajar una escena aislada)
export function renderLocal(id, lt) {
  if (id === 'intro') return renderAt(lt);
  const s = SCENES.find(x => x.id === id); if (!s) throw new Error('escena desconocida: ' + id);
  renderAt(s.t0 + Math.min(lt, s.dur - 1e-4));
}
