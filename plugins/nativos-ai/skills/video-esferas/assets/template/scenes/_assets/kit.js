// KIT de las escenas de ejemplo: lo que intro, titulo, final y planeta comparten, escrito una sola vez.
//   curva('power2.out') · fase(t, a, d)          tiempo: curvas de GSAP como funciones, y «cuánto va de este tramo» (0 → 1)
//   PAL · pintar(puntos, paleta, filo, brillo)    colores de las letras de esferas (núcleo en degradado + filo de contra-color)
//   letras(E, 'TEXTO', o) · mover(puntos, dx, dy) una línea en letras de esferas (centrada en 0, 0) y cómo colocarla
//   tarjeta(E, o) · rotulo(E, 'TÍTULO', o)        la tarjeta «HECHO 100% CON · CLAUDE CODE» / el título de la película
//   bola(E, n, o) · banco(E, scene, formas, o)    UN campo de esferas que fluye de forma en forma y estalla en polvo dorado
//   cielo(E, scene, cam, o) · nitidoLejos(c, d)   estrellas escasas y nítidas «en el infinito», a salvo del desenfoque
// Todo es determinista: el azar sale de E.dots.rng(semilla), nunca de Math.random ni del reloj.
import * as THREE from 'three';
import { gsap } from 'gsap';
import * as L from './lettering.js';

export const curva = nombre => gsap.parseEase(nombre);                 // 'power2.out', 'expo.out', 'back.out(1.7)'…
export const fase = (t, a, d) => Math.min(1, Math.max(0, (t - a) / d));  // 0 antes de a, 1 después de a + d

// paletas (hex sRGB) · el cálido de la historia contra el turquesa de contra-color (regla de estilo)
export const PAL = {
  oro: ['#D9A441', '#F2C66D', '#FFE7A8', '#FFF8EC'], crema: ['#C8923A', '#F2C66D', '#F6ECD0', '#FFF8EC'],
  arcilla: ['#CF6A44', '#D97757', '#EE9670', '#FFD2B0'], terra: ['#A94B2C', '#D97757', '#E8957A', '#F6C3AC'],   // el color de Claude
  hielo: ['#BFE6FF', '#EAF6FF', '#FFFFFF', '#FFF1D6'], turquesa: ['#0FA3A3', '#12C4C4', '#7FE3FF', '#E6FBFF'],
  caliente: ['#FFF4D6', '#FFE7A8', '#FFC247', '#FFFFFF'], polvo: ['#FFC247', '#FFB547', '#FFD27A', '#FFF4D6'],
};
const colores = hex => hex.map(h => new THREE.Color(h));

// núcleo: degradado según la profundidad del trazo (p.d: 0 en el borde → 1 en el corazón); filo: una fila fina de otro color
export function pintar(pts, paleta, filo, brillo = 0) {
  const cs = colores(paleta), cf = new THREE.Color(filo);
  for (const p of pts) { p.c = p.edge ? cf : L.grad(cs, p.d); p.g = p.edge ? 0 : brillo * p.d; }
  return pts;
}
export const mover = (pts, dx, dy) => { for (const p of pts) { p.x += dx; p.y += dy; } return pts; };

// una línea de texto en esferas (lettering.text con valores gruesos: se lee en un teléfono). cap = altura de mayúscula.
export const letras = (E, texto, o = {}) => L.text(E, texto, { rFloor: .024, core: .5, edge: .09, gap: 2.1, minGap: 1.05, ...o });

// ancho de tinta ÷ altura de mayúscula de una línea (las mismas métricas que lettering.text): sirve para calcular tamaños
function relacion(texto, peso = 800, ls = .03) {
  const x = document.createElement('canvas').getContext('2d'); x.font = `${peso} 200px Inter`;
  const m = x.measureText(texto), cap = x.measureText('H').actualBoundingBoxAscent;
  return (m.actualBoundingBoxLeft + m.actualBoundingBoxRight + ls * 200 * ([...texto].length - 1)) / cap;
}

// LA TARJETA de la marca: [chispa de Claude] + «arriba» (línea fina justificada al ancho) + «marca» (una palabra por renglón,
// maciza, color arcilla). vertical: la chispa encima de todo (intro) · horizontal: la chispa a la izquierda del bloque.
// (x, y) = centro; ancho (y alto, en vertical) = la caja que debe llenar, en unidades de mundo.
export function tarjeta(E, { arriba, marca, vertical = false, x = 0, y = 0, ancho = 9.6, alto = 8.4, seed = 4 }) {
  const palabras = marca.split(' '), n = palabras.length, rho = Math.max(...palabras.map(p => relacion(p, 800, .01)));
  let h;                                                            // altura de mayúscula de la marca
  if (vertical) h = ancho / rho;
  else h = (ancho * .955) / (Math.min(.6, rho / relacion(arriba)) + 1.2 * n + rho);   // el bloque + su chispa llenan el ancho
  const W = rho * h, g = .2 * h;
  const top = pintar(letras(E, arriba, { cap: .6 * h, justify: W, maxCap: .6 * h, seed, rim: false, rFloor: .022, core: .8 }), PAL.crema, '#FFE7A8', .06);
  const MACIZA = { cap: h, maxW: W, ls: .01, rFloor: .015, edge: .05, gap: 1.05, core: .62, minGap: 1.02 };   // filo crema fino + núcleo lleno
  const pals = palabras.map((p, k) => pintar(letras(E, p, { ...MACIZA, seed: seed + 3 + k }), PAL.arcilla, '#FFE3CF', .45));
  const bloque = top.cap + n * (h + g);                             // alto de «arriba» + las palabras, con sus separaciones
  let chispa;
  if (vertical) {                                                  // pila que llena el alto: la chispa toma lo que sobra
    const SD = Math.min(3.6, alto - bloque - g), u = (alto - SD - top.cap - n * h) / (2.5 + n);   // u: unidad de separación
    chispa = L.spark(E, { R: SD / 2, seed: seed + 1, edge: .08 });
    let yy = y + alto / 2;
    mover(chispa, x, yy - SD / 2); yy -= SD + 2 * u;
    mover(top, x, yy - top.cap / 2); yy -= top.cap + 1.5 * u;
    for (const p of pals) { mover(p, x, yy - h / 2); yy -= h + u; }
  } else {                                                         // chispa a la izquierda, tan alta como el bloque
    const x0 = x - ancho / 2, xc = x0 + bloque + .045 * ancho, yTop = y + bloque / 2;
    chispa = L.spark(E, { R: bloque / 2, seed: seed + 1, edge: .08 });
    mover(chispa, x0 + bloque / 2, y);
    mover(top, xc + W / 2, yTop - top.cap / 2);
    pals.forEach((p, k) => mover(p, xc + p.w / 2, yTop - top.cap - g - k * (h + g) - h / 2));
  }
  pintar(chispa, PAL.terra, '#FFE3CF', .12);
  return [...chispa, ...top, ...pals.flat()];
}

// EL TÍTULO de la película: renglones («/») centrados en (x, y), todos con la misma altura de mayúscula (la mayor que cabe en
// `ancho`, hasta `cap`). Trazo semigrueso con tracking amplio: filo de cuentas de hielo + núcleo crema (frío contra la marca).
// partir: si el texto no trae «/», lo parte en el espacio más cercano al centro (en vertical, dos renglones se leen más grandes)
export function rotulo(E, texto, { x = 0, y = 0, ancho = 9, cap = 1.3, partir = false, seed = 12 } = {}) {
  if (partir && !texto.includes('/')) {
    let i = -1, m = texto.length / 2;
    for (let k = texto.indexOf(' '); k >= 0; k = texto.indexOf(' ', k + 1)) if (i < 0 || Math.abs(k - m) < Math.abs(i - m)) i = k;
    if (i > 0) texto = texto.slice(0, i) + '/' + texto.slice(i + 1);
  }
  const lineas = texto.split('/').map(s => s.trim()), c = Math.min(cap, ...lineas.map(s => ancho / relacion(s, 600, .12)));
  const pts = lineas.map((s, k) => pintar(letras(E, s, { weight: 600, ls: .12, cap: c, rFloor: .02, edge: .1, gap: 1.2, core: .6, seed: seed + k }), PAL.crema, '#DDF0FF', .4));
  let yy = y + (lineas.length * c + (lineas.length - 1) * .5 * c) / 2;
  for (const p of pts) { mover(p, x, yy - c / 2); yy -= 1.5 * c; }
  return pts.flat();
}

// la bola caliente del comienzo: n esferas pequeñas y encendidas, apretadas en una esfera de radio rad
export function bola(E, n, { centro = [0, 0], rad = .75, seed = 9 } = {}) {
  const R = E.dots.rng(seed), cs = colores(PAL.caliente), out = [];
  for (let i = 0; i < n; i++) {
    const u = R() * 2 - 1, a = R() * 6.2832, s = Math.sqrt(1 - u * u), rr = rad * Math.cbrt(R());
    out.push({ x: centro[0] + rr * s * Math.cos(a), y: centro[1] + rr * s * Math.sin(a), z: rr * u, r: .03, c: cs[i % 4], g: 2.2 });
  }
  return out;
}

// EL BANCO: un solo SphereField cuyas N esferas («ranuras») tienen un lugar en CADA forma. Cambiar de forma = cada esfera vuela
// de su lugar en una forma a su lugar en la siguiente. lettering.bake ordena cada forma por una curva de Hilbert: esferas
// vecinas en una forma caen en lugares vecinos de la siguiente, así el flujo se ve coherente y no como una lluvia al azar.
//   formas   { nombre: puntos pintados ({x, y, z, r, c, g}) } · si una forma tiene menos puntos, sus ranuras sobrantes se
//            encogen a radio 0 dentro de su gemela (aparecen o desaparecen al volar)
//   pasos    [{ de, a, t, vuelo, ola, curva, alza, alzaZ }]: a los t s cada esfera tarda `vuelo` s, con un retraso de hasta
//            `ola` s (una ola de izquierda a derecha con algo de azar) y un arco hacia fuera (alza) y hacia la cámara (alzaZ)
//   barridos [[t0, t1], …] una banda de luz cruza la forma quieta · polvo { t }: todo estalla en polvo dorado que llena el
//            cuadro apaisado (cámara a ≈21 unidades) · extra: ranuras invisibles de más, que nacen como polvo
export function banco(E, scene, formas, { pasos, centro = [0, 0], ancho = 10, barridos = [], polvo = null, extra = 0, seg = 16, seed = 2026 }) {
  const { lerp, sstep, clamp } = E.dots, nombres = Object.keys(formas);
  const N = Math.max(...nombres.map(k => formas[k].length)) + extra, ST = L.bake(nombres.map(k => formas[k]), N);
  const P = pasos.map(p => ({ ola: .1, vuelo: .4, alza: .5, alzaZ: 1.5, ...p, A: ST[nombres.indexOf(p.de)], B: ST[nombres.indexOf(p.a)], ease: curva(p.curva ?? 'power2.inOut') }));
  const R = E.dots.rng(seed), [cx, cy] = centro, cp = colores(PAL.polvo), sale = curva('power2.out'), Q = [];
  for (let i = 0; i < N; i++) {                                    // constantes por ranura: azar, fase y su lugar en el polvo
    const z = -5 + 16 * R();                                       // el polvo cubre el cuadro 16:9 a toda profundidad
    Q.push({ w: R(), ph: R() * 6.283, v: .2 + .4 * R(), dl: .07 * R(), dx: (R() - .5) * .6 * (21 - z), dy: (R() - .5) * .34 * (21 - z), dz: z,
      dr: .012 + .03 * R() * R(), dc: cp[i % 4], dg: 1.4 + 2.2 * R() });
  }
  const f = new E.SphereField(N, { seg, roughness: .26, castShadow: false, receiveShadow: false });
  scene.add(f.mesh);
  const o = {};
  return { f, N, update(t) {
    let k = 0; while (k + 1 < P.length && t >= P[k + 1].t) k++;    // el paso vigente: el último que ya empezó
    const { A, B, t: t0, ola, vuelo, alza, alzaZ, ease } = P[k];
    const luz = barridos.map(([a, b]) => [sstep(a, a + .3, t) * (1 - sstep(b - .3, b, t)), lerp(-.65 * ancho, .65 * ancho, sstep(a, b, t))]);
    for (let i = 0; i < N; i++) {
      const q = Q[i], e = ease(fase(t, t0 + ola * (.55 * q.w + .45 * clamp(.5 + (B.x[i] - cx) / ancho)), vuelo));
      const mx = (A.x[i] + B.x[i]) / 2 - cx, my = (A.y[i] + B.y[i]) / 2 - cy, n = Math.hypot(mx, my) || 1;
      L.blend(A, B, i, e, [mx / n * alza, my / n * alza, alzaZ], o);
      let { x, y, z, r, cr, cg, cb, g } = o;
      r *= 1 + .045 * Math.sin(t * 2.3 + q.ph + x * .8);           // respiración: una onda lenta recorre la forma (nunca quieta)
      for (const [on, pos] of luz) {                               // barrido: una banda diagonal de luz cruza la forma
        const b = on * Math.exp(-(((x + .4 * y - pos) / .8) ** 2));
        if (b > .002) { const m = 1 + 1.1 * b; cr *= m; cg *= m; cb *= m; g += .25 * b; }
      }
      if (polvo && t > polvo.t) {                                  // estallido: cada esfera vuela a su lugar en el polvo y flota
        const e2 = sale(fase(t, polvo.t + q.dl, .4));
        x = lerp(x, q.dx + .15 * Math.sin(t * q.v + q.ph), e2); y = lerp(y, q.dy + .1 * Math.cos(t * q.v * 1.3 + q.ph), e2); z = lerp(z, q.dz, e2);
        r = lerp(r, q.dr, e2); cr = lerp(cr, q.dc.r, e2); cg = lerp(cg, q.dc.g, e2); cb = lerp(cb, q.dc.b, e2); g = lerp(g, q.dg, e2);
      }
      f.set(i, x, y, z, r); const j = i * 3; f.col[j] = cr; f.col[j + 1] = cg; f.col[j + 2] = cb; f.glow[i] = g;
    }
    f.commit();
  } };
}

// Estrellas escasas y nítidas (regla de estilo: el espacio es negro profundo; la densidad va en los objetos, no en el fondo).
// Viven en una cáscara lejana que acompaña a la cámara → están «en el infinito» (no se desplazan al moverla, sí al girarla).
// Radio en PÍXELES (1.1–2.6 px) para que se vean igual de finas en cualquier escena. Brillo = color × glow, sin reflejos;
// solo las más fuertes (~15 %) florecen con el bloom. dir/abre: casquete del cielo que se llena (por defecto, todo).
export function cielo(E, scene, cam, { n = 1500, seed = 11, dist = 150, alto = E.FH, dir = [0, 0, -1], abre = Math.PI } = {}) {
  const f = new E.SphereField(n, { seg: 8, roughness: .5, clearcoat: 0, specularIntensity: 0, castShadow: false, receiveShadow: false });
  f.material.envMap = scene.environment; f.material.envMapIntensity = 0;   // r186: sin envMap explícito ignora la intensidad
  const g = new THREE.Group(); g.add(f.mesh); scene.add(g);
  const R = E.dots.rng(seed), upx = 2 * dist * Math.tan(cam.fov * Math.PI / 360) / alto;   // unidades de mundo por píxel ahí
  const tint = colores(['#DDF0FF', '#DDF0FF', '#FFFFFF', '#BFE6FF', '#DDF0FF', '#FFE7C2']), oro = new THREE.Color('#FFC247');
  const d0 = new THREE.Vector3(...dir).normalize(), a1 = new THREE.Vector3(0, 1, .01).cross(d0).normalize(), a2 = d0.clone().cross(a1);
  const S = [], v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const ct = 1 - R() * (1 - Math.cos(abre)), st = Math.sqrt(1 - ct * ct), ph = R() * 6.2832, u = R() ** 3, big = u > .85;
    v.copy(d0).multiplyScalar(ct).addScaledVector(a1, st * Math.cos(ph)).addScaledVector(a2, st * Math.sin(ph)).multiplyScalar(dist);
    f.set(i, v.x, v.y, v.z, (1.1 + .9 * u + (big ? .6 : 0)) * upx);
    S.push({ c: tint[i % 6].clone().multiplyScalar(.55 + .45 * u), g: big ? 1.6 + 1.4 * u : .5 + u, ph: R() * 6.2832 });
  }
  f.commit();
  // update(t, brillo, calor): titilan solo en brillo (un punto nítido que cambia de tamaño «salta»); calor > 0 las tiñe de
  // oro y las enciende (así recibe una escena el polvo dorado de la anterior: chispas cálidas que se enfrían en estrellas)
  return { f, update(t, brillo = 1, calor = 0) {
    g.position.copy(cam.position);
    for (let i = 0; i < n; i++) {
      const s = S[i], k = i * 3;
      f.col[k] = s.c.r + (oro.r - s.c.r) * calor; f.col[k + 1] = s.c.g + (oro.g - s.c.g) * calor; f.col[k + 2] = s.c.b + (oro.b - s.c.b) * calor;
      f.glow[i] = s.g * brillo * (1 + 2 * calor) * (.85 + .15 * Math.sin(t * 1.7 + s.ph));
    }
    f.mesh.instanceColor.needsUpdate = true; f.aGlow.needsUpdate = true;
  } };
}

// El desenfoque (DOF) volvería cada estrella un disco borroso. Parche al shader del círculo de confusión de ESTE composer:
// lo que esté más lejos que `desde` (unidades de mundo) queda nítido. Es un arreglo del motor hecho desde fuera de core/;
// si postprocessing cambia su shader, avisa en la consola.
export function nitidoLejos(composer, desde) {
  const m = composer.fx.dof.cocMaterial, s = m.fragmentShader;
  m.fragmentShader = s.replace('float magnitude=', `float magnitude=distance>${desde.toFixed(1)}?0.0:`);
  if (m.fragmentShader === s) console.warn('nitidoLejos: no se pudo parchear el desenfoque'); else m.needsUpdate = true;
}
