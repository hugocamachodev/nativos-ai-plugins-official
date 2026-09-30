// FINAL — tarjeta de cierre (película, apaisada), 5 s. El video TERMINA en ella: no hay fundido de salida.
// 0–1.0 s   una nube cálida de esferas llena el cuadro (el motor la funde sobre el final de la escena anterior, que termina
//           también en nube cálida) y ya empieza a juntarse
// 0.2–2.2   la nube converge en la tarjeta [chispa] HECHO 100% CON / CLAUDE CODE: la MISMA que abre el corte horizontal
// 2.2–5.0   la tarjeta formada se sostiene 2.8 s: respira, la cruza una banda de luz; el polvo suelto se asienta y quedan
//           unas pocas estrellas nítidas sobre negro profundo.
import * as K from './_assets/kit.js';

const CONFIG = {
  tarjeta: { arriba: 'HECHO 100% CON', marca: 'CLAUDE CODE' },
  junta: .2, formada: 2.2,        // la nube empieza a juntarse / la última esfera se posa (s)
  dur: 5.0,
};
// zona segura del reel (la película va girada dentro del video vertical y la tapan el pie de foto y los botones):
// x 120–1630, y 140–1000 px → centro (−0.56, −0.2) en unidades de mundo (152 px por unidad)
const CX = -.56, CY = -.2, ANCHO = 9.4;

export default {
  id: 'final', dur: CONFIG.dur,

  build(E, root) {
    const { THREE, dots } = E, R = dots.rng(91);
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0);
    scene.environment = E.makeEnv([
      { pos: [0, 9, 4], color: '#fff1e0', i: 4.5, w: 9, h: 3 },
      { pos: [-9, 2, 4], color: '#ff8a2a', i: 3.2, w: 2.5, h: 8 },
      { pos: [9, 1, 4], color: '#2ec8ff', i: 3.6, w: 2.5, h: 8 },
      { pos: [2, -3, -10], color: '#12c4c4', i: 1.6, w: 10, h: 3 },
      { pos: [0, -8, 5], color: '#1a2a8c', i: 1.6, w: 10, h: 3 },
      { pos: [0, 0, 10], color: '#ffffff', i: .3, w: 12, h: 6 },
    ]);
    const fov = 2 * Math.atan(Math.tan(15 * Math.PI / 180) * E.FH / E.FW) * 180 / Math.PI;   // misma escala que titulo.js
    const cam = this.camera = new THREE.PerspectiveCamera(fov, E.FW / E.FH, .1, 250);
    this.key = new THREE.DirectionalLight(0xfff0dd, 2.2);
    scene.add(this.key, new THREE.AmbientLight(0xffffff, .04));

    // la nube inicial: 5000 esferas por todo el cuadro y a toda profundidad (más abiertas cerca de la cámara para cubrir el
    // encuadre), en oro, crema y blanco encendidos. Hay unas 3 por cada esfera de la tarjeta: al converger, las sobrantes se
    // funden con su gemela y se encogen a nada (así funciona el banco) → la nube se CONDENSA en la tarjeta.
    const tarjeta = K.tarjeta(E, { ...CONFIG.tarjeta, x: CX, y: CY, ancho: ANCHO });
    const tonos = [...K.PAL.polvo, ...K.PAL.crema].map(E.col);
    const nube = [...Array(5000)].map((_, i) => {
      const z = -4 + 10 * R(), f = (24 - z) / 24;
      return { x: (R() - .5) * 17 * f, y: (R() - .5) * 9.6 * f, z, r: .025 + .07 * R() * R(), c: tonos[i % tonos.length], g: 1.4 };
    });
    this.banco = K.banco(E, scene, { nube, tarjeta }, {
      centro: [CX, CY], ancho: ANCHO, seg: 18,
      pasos: [{ de: 'nube', a: 'tarjeta', t: CONFIG.junta, vuelo: 1.1, ola: CONFIG.formada - CONFIG.junta - 1.1, curva: 'power2.out', alza: 1.4, alzaZ: 1.2 }],
      barridos: [[CONFIG.formada - .1, CONFIG.dur - .1]],
    });

    // polvo suelto que NO forma la tarjeta: cálido con un 30 % turquesa (contra-color), cerca y lejos → profundidad y bokeh;
    // se asienta (se encoge a nada) entre 1.5 y 2.4 s y deja el negro limpio
    const turq = ['#12C4C4', '#2EC8FF', '#1A2A8C'].map(E.col);
    this.suelto = [...Array(2600)].map((_, i) => {
      const z = -9 + 13 * R(), f = (24 - z) / 24, frio = R() < .3;
      return { x: (R() - .5) * 18 * f, y: (R() - .5) * 10.4 * f, z, r: (frio ? .02 : .012) + .035 * R() * R(), c: frio ? turq[i % 3] : tonos[i % tonos.length],
        g: frio ? 0 : .6 + 1.8 * R() * R(), ph: R() * 6.283, v: .1 + .25 * R(), fin: 1.5 + .5 * R() };
    });
    this.fS = new E.SphereField(this.suelto.length, { seg: 10, roughness: .3, castShadow: false, receiveShadow: false });
    this.suelto.forEach((q, i) => this.fS.color(i, q.c, q.g));
    scene.add(this.fS.mesh);
    this.cielo = K.cielo(E, scene, cam, { n: 1200, abre: .6, seed: 92 });

    this.composer = E.makeComposer(scene, cam, {
      ao: { aoRadius: .25, intensity: 1.6, distanceFalloff: .6 },
      dof: { worldFocusDistance: 24, worldFocusRange: 6, bokehScale: 3 * E.SS },
      bloom: { intensity: .75, luminanceThreshold: .88, radius: .65 },
      vignette: .5, saturation: .14, contrast: .12,
    });
    this.composer.fx.dof.target = new THREE.Vector3(CX, CY, 0);     // foco = el plano de la tarjeta
    K.nitidoLejos(this.composer, 100);
  },

  update(t, E) {
    const { sstep: ss, lerp } = E.dots, { dur, formada } = CONFIG, cam = this.camera;
    cam.position.set(.3 * Math.sin(t * .5) - .15, .12 - .1 * t / dur, 24.3 - .8 * ss(0, dur, t));   // empuje lento, nunca quieta
    cam.lookAt(0, 0, 0);                                             // mira al centro del cuadro: la tarjeta queda en la zona segura
    this.composer.fx.dof.cocMaterial.focusRange = lerp(6, 2.5, ss(.6, formada, t));   // la nube es nítida; luego solo la tarjeta
    this.key.position.set(-6 + 9 * t / dur, 7, 10);                  // la luz se desliza: los brillos recorren la tarjeta
    this.banco.update(t);

    const f = this.fS;
    this.suelto.forEach((q, i) => {                                  // deriva lenta; se junta un poco hacia la tarjeta y se apaga
      const k = ss(q.fin, q.fin + .4, t);
      f.set(i, q.x + .25 * Math.sin(t * q.v + q.ph) + (CX - q.x) * .3 * k, q.y + .2 * Math.cos(t * q.v * 1.3 + q.ph) + .08 * t + (CY - q.y) * .3 * k, q.z,
        q.r * (.8 + .2 * Math.sin(t * 2 + q.ph)) * (1 - k));
      f.glow[i] = q.g * (.7 + .3 * Math.sin(t * 3.1 + q.ph));
    });
    f.commit();
    this.cielo.update(t, ss(1.6, 2.6, t));                           // las estrellas aparecen cuando el polvo ya se asentó
  },
};
