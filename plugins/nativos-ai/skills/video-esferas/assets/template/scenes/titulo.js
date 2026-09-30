// TITULO — apertura del corte HORIZONTAL (--fmt=wide, 1920×1080: YouTube, Facebook). En el reel no existe: ahí abre intro.js.
// Una sola toma de 8.3 s; UN banco de esferas (ver banco() en _assets/kit.js) fluye de forma en forma:
// 0–1.3 s    una bola caliente estalla y sus esferas arman el gancho: [chispa] HECHO 100% CON / CLAUDE CODE
// 1.3–3.75   el gancho se sostiene (2.45 s): respira y lo cruza una banda de luz
// 3.75–4.35  las MISMAS esferas se reagrupan en el título
// 4.35–7.0   el título se sostiene (2.65 s), segunda banda de luz
// 7.0–7.45   todo estalla en polvo dorado que llena el cuadro; 7.45–8.3 el polvo flota y la cámara entra despacio
//            (el motor lo funde en 0.8 s con la primera escena de la película: nunca hay un corte a negro).
// Escala: el campo de visión hace que 1 unidad de mundo = 152 px en el plano de las letras, igual que en la intro vertical;
// así los mismos tamaños de esfera, de polvo y de estrellas sirven en los dos formatos.
import * as K from './_assets/kit.js';

const CONFIG = {
  gancho: { arriba: 'HECHO 100% CON', marca: 'CLAUDE CODE' },   // la marca va en renglones, una palabra por renglón
  titulo: 'MI PELÍCULA',          // «/» lo parte en renglones: 'LA GRAN/AVENTURA'
  tamanoTitulo: 1.35,             // altura de las mayúsculas; con un título corto súbelo a ~2.2 (el ancho lo limita solo)
  aTitulo: 3.75,                  // el gancho (formado a ≈1.3 s) se reagrupa en el título → ≥ 2.4 s para leerlo
  aPolvo: 7.0,                    // el título (formado a ≈4.35 s) estalla en polvo → ≥ 2.5 s para leerlo
  dur: 8.3,
};
const sale = K.curva('power1.out'), suave = K.curva('power2.inOut');

export default {
  id: 'titulo', dur: CONFIG.dur,

  build(E, root) {
    const { THREE } = E;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0);
    // reflejos de cada esfera: paneles de luz alrededor (cenital cálido, tira naranja, tira cian, contras turquesa y ultramar)
    scene.environment = E.makeEnv([
      { pos: [0, 9, 4], color: '#fff1e0', i: 4.5, w: 9, h: 3 },
      { pos: [-9, 2, 4], color: '#ff8a2a', i: 3.4, w: 2.5, h: 8 },
      { pos: [9, 1, 4], color: '#2ec8ff', i: 3.6, w: 2.5, h: 8 },
      { pos: [2, -3, -10], color: '#12c4c4', i: 1.6, w: 10, h: 3 },
      { pos: [0, -8, 5], color: '#1a2a8c', i: 1.5, w: 10, h: 3 },
      { pos: [0, 0, 10], color: '#ffffff', i: .3, w: 12, h: 6 },
    ]);
    // campo de visión vertical cuya mitad = tan 15° · 9/16: 1080 px cubren lo mismo que el cuadro girado de la intro
    const fov = 2 * Math.atan(Math.tan(15 * Math.PI / 180) * E.FH / E.FW) * 180 / Math.PI;
    const cam = this.camera = new THREE.PerspectiveCamera(fov, E.FW / E.FH, .1, 250);
    this.key = new THREE.DirectionalLight(0xfff0dd, 2.1);           // luz principal: se desliza y arrastra los brillos
    scene.add(this.key, new THREE.AmbientLight(0xffffff, .04));

    const { aTitulo, aPolvo } = CONFIG, centro = [0, .1];
    this.banco = K.banco(E, scene, {
      bola: K.bola(E, 3000, { centro }),
      gancho: K.tarjeta(E, { ...CONFIG.gancho, x: 0, y: .1, ancho: 10.1 }),
      titulo: K.rotulo(E, CONFIG.titulo, { y: .1, ancho: 9.4, cap: CONFIG.tamanoTitulo }),
    }, {
      centro, ancho: 10.1, extra: 4000, polvo: { t: aPolvo },
      pasos: [
        { de: 'bola', a: 'gancho', t: 0, vuelo: 1.0, ola: .25, curva: 'power1.out', alza: 2.4, alzaZ: 4 },   // el estallido
        { de: 'gancho', a: 'titulo', t: aTitulo, vuelo: .4, ola: .15, alza: .5, alzaZ: 1.6 },
      ],
      barridos: [[1.3, aTitulo - .1], [aTitulo + .7, aPolvo - .1]],
    });
    this.cielo = K.cielo(E, scene, cam, { n: 1400, abre: .6 });   // casquete de cielo delante de la cámara

    this.composer = E.makeComposer(scene, cam, {
      ao: { aoRadius: .35, intensity: 1.8, distanceFalloff: 1 },
      dof: { worldFocusDistance: 23.5, worldFocusRange: 5, bokehScale: 2.6 * E.SS },
      bloom: { intensity: .85, luminanceThreshold: .9, radius: .7 },
      vignette: .45, saturation: .14, contrast: .12,
    });
    this.composer.fx.dof.target = new THREE.Vector3();               // foco = el plano de las letras (z = 0)
    K.nitidoLejos(this.composer, 100);                               // las estrellas (a 150) no se desenfocan
  },

  update(t, E) {
    const { aPolvo, dur } = CONFIG, ss = E.dots.sstep, cam = this.camera;
    // cámara: entra mientras se arma el gancho, deriva lenta sobre el título, se mete en el polvo y sigue entrando despacio
    const D = 25 - 1.5 * sale(K.fase(t, 0, 1.6)) - .8 * ss(3.3, 5.3, t) - 3.2 * suave(K.fase(t, aPolvo, .55)) - .7 * ss(dur - 1.3, dur, t);
    cam.position.set(.5 * Math.sin(t * .3), .25 * Math.sin(t * .2), D);
    cam.lookAt(0, 0, 0);
    this.key.position.set(-5 + 1.2 * t, 8 - .5 * t, 10);
    this.banco.update(t);
    this.cielo.update(t, K.fase(t, 0, .9) * (1 - .6 * ss(aPolvo - .1, aPolvo + .4, t)));   // aparecen y se apagan con el polvo
  },
};
