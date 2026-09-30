// PLANETA — la demo de estilo: dos tomas, 10.2 s. Todo es esferas: el planeta es UNA esfera grande con las bandas pintadas en
// su shader; los anillos son filas de cuentas grandes, medianas y diminutas; la nave, unas pocas esferas.
// 0–4.4 s    TOMA A · gran angular (IMAX): negro profundo con estrellas escasas y nítidas, el planeta con sus anillos y una
//            nave diminuta que da la escala. Un solo empuje de cámara, lento y seguro.
//            0–1.0 s recibe el fundido del polvo dorado: chispas de oro que se apagan y estrellas que se enfrían.
// 4.4–10.2   TOMA B · macro rasante sobre las cuentas del anillo: luz rasante del sol, profundidad de campo corta, un brillo
//            en cada esfera. La línea de texto se lee entera ≈6.3–8.35 s.
//            8.9–10.2 cuentas de luz se elevan del anillo en una nube cálida que converge: la entrega a final.js.
import * as K from './_assets/kit.js';

const CONFIG = {
  texto: 'EL VIAJE COMIENZA.',
  entra: 4.8, sale: 9.2,          // la línea aparece / se va (s). Legible entera de entra + 0.9 + 0.035·(letras − 1) a
                                  // sale − 0.55 − 0.0175·(letras − 1): una línea más larga necesita más tiempo
  corte: 4.4,                     // de la toma A (gran angular) a la B (macro)
  dur: 10.2,
  planeta: ['#F6ECD0', '#F2C66D', '#E0A040', '#946238', '#4F86A0'],   // crema, oro, ámbar, banda oscura, casquete polar
  anillos: [                      // de dentro afuera: radios, patrón de tamaños de las filas (se repite), colores
    { r0: 12.8, r1: 15, pat: [.075, .045], tonos: ['#0FA3A3', '#1A2A8C', '#7FE3FF'] },                       // turquesa y ultramar
    { r0: 15.4, r1: 19.2, pat: [.14, .05, .09, .05, .09, .05], tonos: ['#B8862F', '#E8BE6A', '#FFF1D6'] },   // oro: la brillante
    { r0: 19.8, r1: 22.6, pat: [.1, .045, .065, .045], tonos: ['#C8782E', '#E0A040', '#F6ECD0'] },           // ámbar
  ],
};
// el macro (grados): la cámara flota a `alto` sobre el anillo, en el azimut `az` y a `radio` del centro, mirando hacia `mira`
const MACRO = { az: 45, radio: 17.6, alto: .42, mira: 150, cabeceo: -7, foco: 2.7 };   // el sol entra de lado, por la derecha
const SOL = { az: 70, el: 13 };   // sol bajo sobre el plano del anillo: luz rasante en el macro, planeta iluminado de lado
const RP = 10;                    // radio del planeta (el anillo vive en el plano y = 0)
const suave = K.curva('sine.inOut'), sube = K.curva('power2.out');
const rad = g => g * Math.PI / 180, dirAz = (az, el = 0) => [Math.sin(rad(az)) * Math.cos(rad(el)), Math.sin(rad(el)), Math.cos(rad(az)) * Math.cos(rad(el))];

// bandas del planeta (espacio del objeto: +y = eje): latitudes con bordes turbulentos que giran a ritmos distintos, y la
// sombra de los anillos calculada al vuelo (el rayo hacia el sol cruza el plano del anillo dentro de sus radios)
const BANDAS = `
uniform float uT; uniform vec3 uSol, uC0, uC1, uC2, uC3, uC4; varying vec3 vN, vW;
float h3(vec3 p) { p = fract(p * .3183 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float ruido(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1., 0., 0.)), f.x), mix(h3(i + vec3(0., 1., 0.)), h3(i + vec3(1., 1., 0.)), f.x), f.y),
             mix(mix(h3(i + vec3(0., 0., 1.)), h3(i + vec3(1., 0., 1.)), f.x), mix(h3(i + vec3(0., 1., 1.)), h3(i + vec3(1., 1., 1.)), f.x), f.y), f.z); }
vec3 bandas(vec3 n) {
  float a = uT * (.03 + .02 * sin(n.y * 9.)), c = cos(a), s = sin(a);
  vec3 q = vec3(c * n.x - s * n.z, n.y, s * n.x + c * n.z);
  float y = n.y + .03 * (ruido(q * vec3(3., 22., 3.)) - .5) + .008 * (ruido(q * vec3(9., 70., 9.)) - .5);
  float b1 = .5 + .5 * sin(y * 19. + 2. * sin(y * 5.3)), b2 = .5 + .5 * sin(y * 47. + 1.3);
  vec3 col = mix(mix(uC0, uC1, b1), uC2, b2 * .45);
  col = mix(col, uC3, (1. - smoothstep(.06, .3, b1)) * .6);
  return mix(col, uC4, smoothstep(.8, .97, abs(n.y)) * .75);
}
float sombraAnillos(vec3 w) {
  if (w.y * uSol.y >= 0.) return 1.;
  float r = length((w - uSol * (w.y / uSol.y)).xz);
  return 1. - .75 * smoothstep(12.8, 13.2, r) * (1. - smoothstep(22.2, 22.6, r)) * (1. - .85 * smoothstep(19.2, 19.35, r) * (1. - smoothstep(19.65, 19.8, r)));
}`;

export default {
  id: 'planeta', dur: CONFIG.dur,

  build(E, root) {
    const { THREE, dots, col, mixCol } = E, R = dots.rng(1234), V = (...a) => new THREE.Vector3(...a);
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0);
    const sol = this.sol = V(...dirAz(SOL.az, SOL.el)), sx = -sol.x * 9, sz = -sol.z * 9;
    scene.environment = E.makeEnv([                                   // reflejos: lo que hace brillar de colores cada cuenta
      { pos: sol.clone().multiplyScalar(10).toArray(), color: '#fff0d8', i: 6, w: 2.5, h: 2.5 },   // el sol: el brillo cálido
      { pos: [sx, 6, sz], color: '#2EC8FF', i: 4.5, w: 5, h: 1.2 },      // tira cian alta y opuesta: un destello frío en cada cúpula
      { pos: [sx, 0, sz], color: '#12C4C4', i: 1.6, w: 3, h: 7 },       // relleno turquesa (contra-color) en las sombras
      { pos: [0, -9, 0], color: '#1A2A8C', i: 1, w: 12, h: 12 },        // ultramar abajo
      { pos: [0, 9, 0], color: '#DDF0FF', i: .5, w: 8, h: 8 },          // cielo de hielo tenue arriba
    ]);
    const cam = this.camera = new THREE.PerspectiveCamera(32, E.FW / E.FH, .05, 900);
    const luz = this.luz = new THREE.DirectionalLight(0xfff0dc, 3.2);   // el sol: sombras (planeta → anillo, cuenta → cuenta)
    luz.castShadow = true; luz.shadow.mapSize.set(4096, 4096); luz.shadow.bias = -.0004; luz.shadow.normalBias = .02;
    const contra = new THREE.DirectionalLight(0x1e6fd0, .2); contra.position.copy(sol).multiplyScalar(-1);   // sombras azuladas
    scene.add(luz, luz.target, contra, new THREE.AmbientLight(0xffffff, .03));

    // ---------- el planeta: UNA esfera con bandas de shader (nítidas a cualquier resolución) ----------
    const U = this.U = { uT: { value: 0 }, uSol: { value: sol }, ...Object.fromEntries(CONFIG.planeta.map((c, i) => ['uC' + i, { value: col(c) }])) };
    const mat = new THREE.MeshPhysicalMaterial({ roughness: .6, clearcoat: .3, clearcoatRoughness: .35, envMapIntensity: .35, specularIntensity: .5 });
    mat.envMap = scene.environment;
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vN, vW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvN = normalize(position); vW = (modelMatrix * vec4(position, 1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + BANDAS)
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = bandas(normalize(vN)) * sombraAnillos(vW);');
    };
    mat.customProgramCacheKey = () => 'planeta-bandas';
    const planeta = new THREE.Mesh(new THREE.SphereGeometry(RP, 160, 120), mat);
    planeta.castShadow = true; scene.add(planeta);

    // ---------- los anillos: filas concéntricas de cuentas; cada zona repite su patrón de tamaños y gira a su ritmo ----------
    // Las cuentas que ve de cerca el macro van en un campo aparte con más polígonos (seg 24): de lejos bastan 8.
    const m = MACRO, cB = V(...dirAz(m.az)).multiplyScalar(m.radio), mira = V(...dirAz(m.mira));
    const foco = this.foco = cB.clone().addScaledVector(mira, 3.2);    // centro de la zona «de cerca»
    const tMedio = (CONFIG.corte + CONFIG.dur) / 2, Y = V(0, 1, 0), turq = col('#12C4C4');
    this.zonas = CONFIG.anillos.map((z, iz) => {
      const w = .006 * (17 / ((z.r0 + z.r1) / 2)) ** 1.5;            // Kepler: más lejos, más lento
      const fl = foco.clone().applyAxisAngle(Y, -w * tMedio);        // el foco en el marco que gira (a mitad del macro)
      const tonos = z.tonos.map(col), min = Math.min(...z.pat), lejos = [], cerca = [];
      for (let r = z.r0, k = 0; r < z.r1; k++) {
        const rb = z.pat[k % z.pat.length], n = Math.floor(2 * Math.PI * r / (2 * rb * 1.15)), a0 = R() * 6.283;
        const lum = (.8 + .35 * dots.hash(k, iz)) * (.9 + .1 * Math.sin(r * 3.1));   // cada fila con su brillo → bandas finas
        for (let i = 0; i < n; i++) {
          const a = a0 + i / n * 6.2832, b = { x: Math.sin(a) * r, y: (R() - .5) * rb * .4, z: Math.cos(a) * r, r: rb * (.8 + .4 * R()) };
          const u = R();                                              // diminutas claras; el resto, del oscuro al medio, alguna clara y alguna turquesa
          b.c = (rb === min || u > .85 ? tonos[2].clone() : iz === 1 && u < .05 ? turq.clone() : mixCol(tonos[0], tonos[1], R())).multiplyScalar(lum);
          (Math.hypot(b.x - fl.x, b.z - fl.z) < 6 ? cerca : lejos).push(b);
        }
        r += (rb + z.pat[(k + 1) % z.pat.length]) * 1.12;
      }
      if (iz === 1) for (let i = 0; i < 5000; i++) {                  // polvo de micro-cuentas entre las filas: el detalle del macro
        const a = R() * 6.2832, d = 6 * Math.sqrt(R()), x = fl.x + Math.cos(a) * d, zz = fl.z + Math.sin(a) * d, rr = Math.hypot(x, zz);
        if (rr > z.r0 && rr < z.r1) cerca.push({ x, y: (R() - .3) * .05, z: zz, r: .012 + .012 * R(), c: (R() < .15 ? turq : tonos[2]).clone(), micro: 1 });
      }
      const g = new THREE.Group(); scene.add(g);
      const campo = (items, o) => { const f = new E.SphereField(items.length, o); items.forEach((b, i) => { f.set(i, b.x, b.y, b.z, b.r); f.color(i, b.c, 0); }); f.commit(); g.add(f.mesh); return f; };
      campo(lejos, { seg: 8, roughness: .4, clearcoat: 1, clearcoatRoughness: .15, castShadow: false });
      const fc = campo(cerca, { seg: 24, roughness: .28, clearcoat: 1, clearcoatRoughness: .05 });
      return { g, w, fc, sinMicro: cerca.filter(b => !b.micro).length, n: lejos.length + cerca.length };   // las micro van al final
    });

    // ---------- la nave: unas pocas esferas (casco, cabina, góndolas, motor) + una estela que se apaga ----------
    // [adelante, arriba, lado, radio, color, brillo] en su propio marco; entra por la izquierda y vuela hacia el planeta
    this.NAVE = [[.35, 0, 0, .15, '#F4F1EA', 0], [0, 0, 0, .21, '#F4F1EA', 0], [-.34, 0, 0, .17, '#E6E0D4', 0], [.27, .15, 0, .08, '#2EC8FF', .6],
      [-.18, 0, .31, .1, '#F2C66D', 0], [-.18, 0, -.31, .1, '#F2C66D', 0], [-.58, 0, 0, .11, '#FFC247', 3]];
    this.ruta = [V(-24, 8, 21), V(-13, 6.5, 12)];
    this.fN = new E.SphereField(this.NAVE.length + 9, { seg: 16, roughness: .3, castShadow: false, receiveShadow: false });
    this.NAVE.forEach((p, i) => this.fN.color(i, col(p[4]), p[5]));
    for (let k = 0; k < 9; k++) this.fN.color(this.NAVE.length + k, col('#FFB547'), 2.4 * (1 - k / 9));
    scene.add(this.fN.mesh);

    this.cielo = K.cielo(E, scene, cam, { n: 5000, dist: 600, seed: 5 });   // todo el cielo: las dos tomas miran a lados distintos

    // ---------- polvo: al entrar, chispas del polvo dorado anterior; al salir, la nube cálida que sube del anillo ----------
    this.camaraA(0); cam.updateMatrixWorld();
    const oro = K.PAL.polvo.map(col), tanV = Math.tan(rad(16)), tanH = tanV * E.FW / E.FH;
    this.polvo = [...Array(4000)].map((_, i) => {
      const d = 8 + 55 * R() ** 1.5, a = V((R() * 2 - 1) * tanH * d, (R() * 2 - 1) * tanV * d, -d).applyMatrix4(cam.matrixWorld);   // dentro del cuadro de la toma A
      const s = cB.clone().addScaledVector(mira, 1.5 + 5 * R()).add(V(0, .08, 0)).addScaledVector(V(-mira.z, 0, mira.x), (R() - .5) * 5);   // sobre el anillo del macro
      return { a, s, u: 2.3 * R() - 1.15, v: 2.3 * R() - 1.15, d: 2 + 10 * R(), r: .012 + .038 * R() * R(), c: oro[i % 4], g: .9 + 1.1 * R(), w: R(), ph: R() * 6.283 };
    });
    this.fP = new E.SphereField(this.polvo.length, { seg: 10, roughness: .3, castShadow: false, receiveShadow: false });
    this.polvo.forEach((q, i) => this.fP.color(i, q.c, q.g));
    scene.add(this.fP.mesh);

    this.composer = E.makeComposer(scene, cam, {
      ao: { aoRadius: .5, intensity: 1.6, distanceFalloff: .5 },
      dof: { worldFocusDistance: 80, worldFocusRange: 2000, bokehScale: 1 },
      bloom: { intensity: .8, luminanceThreshold: .85, radius: .6 },
      saturation: .18, contrast: .14, vignette: .5,
    });
    K.nitidoLejos(this.composer, 400);                               // las estrellas (a 600) nunca se desenfocan
    this.txt = E.line(root, CONFIG.texto, { y: '17%' });             // arriba, sobre el negro del espacio
    this.v = { a: V(), b: V(), c: V(), d: V() };                     // vectores de trabajo (sin crear objetos en cada fotograma)
  },

  timeline(tl, t0, E) { E.reveal(tl, this.txt, t0 + CONFIG.entra, t0 + CONFIG.sale); },

  // toma A: órbita lejana que se acerca despacio; horizonte algo inclinado para que el anillo cruce en diagonal
  camaraA(t) {
    const e = suave((t + .6) / (CONFIG.corte + 1.2)), D = 64 - 10 * e, c = this.camera;
    c.position.set(...dirAz(-8 + 4 * e, 11 - 1.5 * e)).multiplyScalar(D);
    c.up.set(Math.sin(.08), Math.cos(.08), 0); c.lookAt(-5, 3, 0);
  },
  // toma B: a ras del anillo, avanza y sube un poco
  camaraB(t) {
    const m = MACRO, e = suave(K.fase(t, CONFIG.corte, CONFIG.dur - CONFIG.corte)), c = this.camera, { a } = this.v;
    const mira = a.set(...dirAz(m.mira, m.cabeceo));
    c.position.set(...dirAz(m.az)).multiplyScalar(m.radio).addScaledVector(mira, .9 * e); c.position.y = m.alto + .12 * e;
    c.up.set(0, 1, 0); c.lookAt(c.position.x + mira.x, c.position.y + mira.y, c.position.z + mira.z);
  },

  update(t, E) {
    const { sstep: ss, lerp } = E.dots, B = t >= CONFIG.corte, cam = this.camera, luz = this.luz, fx = this.composer.fx;
    B ? this.camaraB(t) : this.camaraA(t);
    cam.updateMatrixWorld();
    // cada zona gira a su ritmo; las micro-cuentas solo se dibujan en el macro (de lejos serían subpíxel y titilarían)
    for (const z of this.zonas) { z.g.rotation.y = z.w * t; z.fc.mesh.count = B ? z.fc.n : z.sinMicro; }
    this.U.uT.value = t;

    // sol + sombra: en la toma A la sombra cubre planeta y anillos; en la B, solo el trozo del macro (sombras finísimas)
    const S = luz.shadow.camera, sombra = B ? 5 : 26;
    if (B) luz.target.position.copy(this.foco); else luz.target.position.set(0, 0, 0);
    luz.position.copy(luz.target.position).addScaledVector(this.sol, B ? 40 : 100);
    if (S.right !== sombra) { S.left = S.bottom = -sombra; S.right = S.top = sombra; S.near = B ? 10 : 40; S.far = B ? 70 : 160; S.updateProjectionMatrix(); }

    // foco y oclusión por toma: el gran angular es nítido de punta a punta; el macro, un plano de foco de medio cuerpo
    const coc = fx.dof.cocMaterial;
    coc.focusDistance = B ? MACRO.foco : 80; coc.focusRange = B ? .5 : 2000; fx.dof.bokehScale = (B ? 6 : 1) * E.SS;
    Object.assign(fx.ao.configuration, B ? { aoRadius: .12, distanceFalloff: .3, intensity: 2 } : { aoRadius: .5, distanceFalloff: .5, intensity: 1.6 });

    // nave (solo en la toma A): su posición en la ruta, su marco (adelante / arriba / lado) y la estela recta detrás
    const fN = this.fN, [p0, p1] = this.ruta, { a: fw, b: up, c: sd, d: P } = this.v, n = this.NAVE.length;
    fw.subVectors(p1, p0).normalize(); sd.crossVectors(fw, up.set(0, 1, 0)).normalize(); up.crossVectors(sd, fw);
    P.lerpVectors(p0, p1, K.fase(t, 0, CONFIG.corte));
    this.NAVE.forEach(([f, a, s, r], i) => fN.set(i, P.x + fw.x * f + up.x * a + sd.x * s, P.y + fw.y * f + up.y * a + sd.y * s, P.z + fw.z * f + up.z * a + sd.z * s, B ? 0 : r));
    for (let k = 0; k < 9; k++) { const q = -.75 - .17 * k; fN.set(n + k, P.x + fw.x * q, P.y + fw.y * q, P.z + fw.z * q, B ? 0 : .09 * (1 - k / 10)); }
    fN.commit();

    // estrellas: entran como chispas de oro (el polvo de la escena anterior) y se enfrían en 1.6 s
    this.cielo.update(t, 1, 1 - ss(0, 1.6, t));

    // polvo: 0–1.6 s chispas que se apagan · desde 8.9 s una nube cálida sube del anillo, converge y llena el cuadro
    const f = this.fP, Q = this.polvo, m = cam.matrixWorld.elements, tanV = Math.tan(rad(16)), tanH = tanV * E.FW / E.FH;
    const junta = 1 - .25 * ss(CONFIG.dur - .8, CONFIG.dur, t);      // la nube se cierra hacia el centro al final
    f.count = t < 1.8 || t > 8.9 ? Q.length : 0;                     // entre medias no hay polvo: no se dibuja nada
    if (f.count) Q.forEach((q, i) => {
      if (t < 1.8) {
        const k = K.fase(t, 0, 1.1 + .6 * q.w);
        f.set(i, q.a.x, q.a.y + .3 * t, q.a.z, q.r * 1.6 * (1 - k) ** 2); f.glow[i] = q.g * (1 - k);
      } else {
        const e = sube(K.fase(t, 8.9 + .7 * q.w, 1.2)), x = q.u * tanH * q.d * junta, y = q.v * tanV * q.d * junta, d = q.d;
        const ex = m[12] + m[0] * x + m[4] * y - m[8] * d, ey = m[13] + m[1] * x + m[5] * y - m[9] * d, ez = m[14] + m[2] * x + m[6] * y - m[10] * d;
        f.set(i, lerp(q.s.x, ex, e), lerp(q.s.y, Math.max(ey, .25), e) + .6 * Math.sin(Math.PI * e), lerp(q.s.z, ez, e), e > 0 ? q.r * (.3 + .7 * e) : 0);   // siempre por encima del anillo
        f.glow[i] = q.g * (.6 + .4 * Math.sin(t * 3 + q.ph));
      }
    });
    f.commit();
  },
};
