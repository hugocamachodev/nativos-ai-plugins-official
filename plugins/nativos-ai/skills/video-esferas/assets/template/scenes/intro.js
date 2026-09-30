// INTRO — apertura VERTICAL del reel (1080×1920). Solo existe en el reel; el corte horizontal abre con titulo.js.
// Se dibuja con E.renderer2 (su propio lienzo vertical) y su capa de texto es el `root` que recibe build.
// UN banco de esferas (ver banco() en _assets/kit.js) fluye de forma en forma; todo lo legible son letras de esferas:
// 0–1.3 s      una bola caliente estalla y arma el gancho: [chispa] HECHO 100% CON / CLAUDE / CODE
// 1.3–3.75     el gancho se sostiene (2.45 s): respira, lo cruza una banda de luz
// 3.75–4.35    se reagrupa en el título; 4.35–6.9 el título se sostiene (2.55 s)
// 6.9–7.45     se reagrupa en GIRA TU / TELÉFONO; en el centro se dibuja un teléfono de esferas
// 7.55–8.35    el teléfono gira a la izquierda (flechas turquesa)
// 8.25–9.15    la cámara rueda 90° en sentido horario: desde aquí todo se lee en la orientación de la película
// 8.95–11.9    3 · 2 · 1 (≈1 s por número; cada uno quieto y formado ≈0.5 s)
// 11.9–12.35   el 1 estalla en polvo dorado que llena el cuadro; 12.35–13.1 flota (el motor lo funde con la película en 0.8 s)
// El largo (13.1 s) sale de los mínimos: gancho ≥ 2.4 s + título ≥ 2.5 s + 3·2·1 ≈ 3 s + reagrupes, giro y fundido.
import * as K from './_assets/kit.js';
import * as L from './_assets/lettering.js';

const CONFIG = {
  gancho: { arriba: 'HECHO 100% CON', marca: 'CLAUDE CODE' },   // la marca va en renglones, una palabra por renglón
  titulo: 'MI PELÍCULA',          // «/» elige dónde partirlo: 'LA GRAN/AVENTURA' (si no, se parte en el espacio central)
  tamanoTitulo: 1.1,              // altura de las mayúsculas del título; con un título corto («2001») súbelo a ~1.8 (el ancho lo limita solo)
  gira: ['GIRA TU', 'TELÉFONO'],  // encima y debajo del teléfono
  aTitulo: 3.75, aGira: 6.9, aTres: 8.95, aPolvo: 11.9,   // cuándo empieza cada reagrupe (s)
  dur: 13.1,
};
// zona segura del texto (Instagram tapa abajo el pie de foto y a la derecha los botones): x 90–930, y 220–1560 px.
// Cámara a 23.5 unidades con fov 30 → 152 px por unidad: caja x −2.96…2.57, y 4.87…−3.95, centro (−0.2, 0.46)
const XC = -.2, YC = .46;
const sale = K.curva('power1.out'), suave = K.curva('power2.inOut'), pop = K.curva('back.out(1.7)'), fuera = K.curva('power2.out');

export default {
  id: 'intro', dur: CONFIG.dur,

  build(E, root) {
    const { THREE, dots, col } = E, { aTitulo, aGira, aTres, aPolvo } = CONFIG;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0);
    scene.environment = E.makeEnv([                                   // OJO: la intro usa su propio renderer (renderer2)
      { pos: [0, 9, 4], color: '#fff1e0', i: 4.5, w: 9, h: 3 },
      { pos: [-9, 2, 4], color: '#ff8a2a', i: 3.4, w: 2.5, h: 8 },
      { pos: [9, 1, 4], color: '#2ec8ff', i: 3.6, w: 2.5, h: 8 },
      { pos: [2, -3, -10], color: '#12c4c4', i: 1.6, w: 10, h: 3 },
      { pos: [0, -8, 5], color: '#1a2a8c', i: 1.5, w: 10, h: 3 },
      { pos: [0, 0, 10], color: '#ffffff', i: .3, w: 12, h: 6 },
    ], E.renderer2);
    const cam = this.camera = new THREE.PerspectiveCamera(30, E.IW / E.IH, .1, 250);
    this.key = new THREE.DirectionalLight(0xfff0dd, 2.1);
    scene.add(this.key, new THREE.AmbientLight(0xffffff, .04));

    // ---------- las formas del banco ----------
    const [g1, g2] = CONFIG.gira;
    const gira = [...K.mover(K.pintar(K.letras(E, g1, { cap: .98, maxW: 5.15, seed: 11 }), K.PAL.turquesa, '#F6ECD0', .08), XC, 3.72),
      ...K.mover(K.pintar(K.letras(E, g2, { cap: .8, maxW: 5.15, seed: 12, rim: false, rFloor: .022, core: .8 }), K.PAL.crema, '#FFE7A8', .15), XC, -3.25)];
    // 3 · 2 · 1: los parámetros por defecto de lettering (filo fino + núcleo que engorda), en fuego, cobalto y oro
    const NUM = [['#E0341A', '#FF7A1A', '#FFB02E', '#FFD27A'], ['#1432A0', '#1E5FD0', '#1E9FE0', '#5FD8FF'], ['#FF9A2E', '#FFC247', '#FFE7A8', '#FFF8EC']];
    const num = (ch, k) => K.pintar(L.text(E, ch, { cap: 3.9, weight: 700, seed: 20 + k }), NUM[k], ['#2EC8FF', '#FFD27A', '#12C4C4'][k], k === 2 ? .25 : 0);
    this.banco = K.banco(E, scene, {
      bola: K.bola(E, 3000, { centro: [XC, YC] }),
      gancho: K.tarjeta(E, { ...CONFIG.gancho, vertical: true, x: XC, y: YC, ancho: 5.3, alto: 8.4 }),
      titulo: K.rotulo(E, CONFIG.titulo, { x: XC, y: YC, ancho: 5.2, cap: CONFIG.tamanoTitulo, partir: true }),   // en vertical, en dos renglones
      gira, tres: num('3', 0), dos: num('2', 1), uno: num('1', 2),
    }, {
      centro: [XC, YC], ancho: 5.3, extra: 6000, polvo: { t: aPolvo },
      pasos: [
        { de: 'bola', a: 'gancho', t: 0, vuelo: 1.0, ola: .25, curva: 'power1.out', alza: 2.4, alzaZ: 4 },   // el estallido
        { de: 'gancho', a: 'titulo', t: aTitulo, vuelo: .4, ola: .15, alza: .5, alzaZ: 1.6 },
        { de: 'titulo', a: 'gira', t: aGira, vuelo: .4, ola: .12, alza: .4, alzaZ: 1.4 },
        { de: 'gira', a: 'tres', t: aTres, vuelo: .42, ola: .1, alza: .2, alzaZ: 2.2 },
        { de: 'tres', a: 'dos', t: aTres + 1, vuelo: .32, ola: .08, alza: 1.1, alzaZ: 2.2 },
        { de: 'dos', a: 'uno', t: aTres + 2, vuelo: .32, ola: .08, alza: 1.0, alzaZ: 2.2 },
      ],
      barridos: [[1.3, aTitulo - .1], [aTitulo + .7, aGira - .1]],
    });

    // ---------- el teléfono: contorno de esferas (crema + ámbar), mini chispa de Claude en la pantalla y dos flechas ----------
    // superelipse (el «squircle» de los teléfonos): dots.along reparte las cuentas por longitud de arco
    const tel = (w, h) => u => { const a = u * 6.2832, c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.abs(c) ** .35 * w / 2, Math.sign(s) * Math.abs(s) ** .35 * h / 2, 0]; };
    const T = this.T = [], t0 = aGira + .15;
    for (const [w, h, r, c] of [[1.7, 3.4, .05, '#F6ECD0'], [1.46, 3.16, .026, '#FFB547']])
      for (const p of dots.along(tel(w, h), () => r, 1.3).slice(0, -1)) T.push({ x: p.x, y: p.y, r, c: col(c), gira: 1 });
    const terra = K.PAL.terra.map(col);
    for (const p of L.spark(E, { R: .42, seed: 31, edge: .1, core: .3 })) T.push({ x: p.x, y: p.y, r: p.r, c: p.edge ? col('#FFE3CF') : L.grad(terra, p.d), gira: 1 });
    T.forEach(q => { q.ta = t0 + .42 * Math.abs(Math.atan2(q.x, q.y)) / Math.PI; });   // el contorno se dibuja de arriba abajo
    const RA = 2.2;                                                   // flechas: arcos que crecen con el giro (antihorario) + punta
    for (const [a0, a1] of [[.2 * Math.PI, .8 * Math.PI], [1.2 * Math.PI, 1.8 * Math.PI]]) {
      for (const p of dots.along(u => [RA * Math.cos(a0 + (a1 - a0) * u), RA * Math.sin(a0 + (a1 - a0) * u), 0], u => .018 + .034 * u ** 1.3, 1.25))
        T.push({ x: p.x, y: p.y, r: p.r, c: E.mixCol(col('#0FA3A3'), col('#2EC8FF'), p.u), u: p.u * .92 });
      const tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1), px = RA * nx + tx * .1, py = RA * ny + ty * .1;
      T.push({ x: px, y: py, r: .056, c: col('#BFF4FF'), u: 1 });
      for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) {
        const c = Math.cos(.62), sn = Math.sin(.62) * s;
        T.push({ x: px - k * .11 * (tx * c + nx * sn), y: py - k * .11 * (ty * c + ny * sn), r: .05 - k * .004, c: col('#7FE3FF'), u: 1 });
      }
    }
    T.forEach((q, i) => { q.ph = dots.hash(i, 9) * 6.28; q.dl = .08 * dots.hash(i, 10); });
    this.fT = new E.SphereField(T.length, { seg: 20, roughness: .28, castShadow: false, receiveShadow: false });
    T.forEach((q, i) => this.fT.color(i, q.c, 0));
    scene.add(this.fT.mesh);

    this.cielo = K.cielo(E, scene, cam, { n: 1400, abre: .75, alto: E.IH });
    this.composer = E.makeComposer(scene, cam, {
      ao: { aoRadius: .35, intensity: 1.8, distanceFalloff: 1 },
      dof: { worldFocusDistance: 23.5, worldFocusRange: 5, bokehScale: 2.6 * E.SS },
      bloom: { intensity: .85, luminanceThreshold: .9, radius: .7 },
      vignette: .45, saturation: .14, contrast: .12,
    }, E.renderer2);
    this.composer.fx.dof.target = new THREE.Vector3();               // foco = el plano de las letras
    K.nitidoLejos(this.composer, 100);
  },

  update(t, E) {
    const { aGira, aTres, aPolvo, dur } = CONFIG, ss = E.dots.sstep, cam = this.camera;
    const giro = suave(K.fase(t, aGira + .65, .8));                  // el teléfono gira a la izquierda
    const rueda = suave(K.fase(t, aGira + 1.35, .9));                // la cámara rueda: la película queda derecha
    // cámara: entra mientras se arma el gancho, se acerca despacio, se mete en el polvo; el vaivén se calma antes de rodar
    const D = 25 - 1.5 * sale(K.fase(t, 0, 1.6)) - 1 * ss(aGira - .4, aTres + 2.4, t) - 3.2 * suave(K.fase(t, aPolvo, .55)) - .7 * ss(dur - 1.3, dur, t);
    const vaiven = 1 - ss(aGira + .9, aGira + 1.6, t);
    cam.position.set(.5 * Math.sin(t * .3) * vaiven, .25 * Math.sin(t * .2) * vaiven, D);
    cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
    cam.rotateZ(rueda * Math.PI / 2);                                 // girar la cámara +90° = la imagen gira 90° horaria
    this.key.position.set(-5 + .9 * t, 8 - .4 * t, 10);             // los brillos se deslizan por las letras
    this.banco.update(t);
    this.cielo.update(t, K.fase(t, 0, .9) * (1 - .6 * ss(aPolvo - .1, aPolvo + .4, t)));

    // teléfono: se dibuja, gira con sus flechas y estalla hacia fuera cuando llega el 3
    const f = this.fT, a = giro * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    this.T.forEach((q, i) => {
      let x = q.x, y = q.y, r;
      if (q.gira) { x = q.x * ca - q.y * sa; y = q.x * sa + q.y * ca; r = q.r * pop(K.fase(t, q.ta, .3)); }
      else r = q.r * pop(K.fase(giro - q.u * .9, 0, .12));
      const b = K.fase(t, aTres + .1 + q.dl, .5), e = fuera(b), n = Math.hypot(x, y) || 1, k = e * (1.8 + 12 * q.dl);
      f.set(i, XC + x + x / n * k, y + y / n * k, e * 2.5, r * (1 - b) ** 3 * (1 + .05 * Math.sin(t * 2.4 + q.ph)));
    });
    f.commit();
  },
};
