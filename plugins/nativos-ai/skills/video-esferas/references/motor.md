# El motor: cómo se escribe una escena

Todo vive en la plantilla (`core/engine.js`, `core/dots.js`, `scenes/_assets/lettering.js`).
Antes de escribir una escena nueva, abre la de ejemplo más parecida (`planeta.js` para una
escena con cámara y texto, `intro.js`/`titulo.js`/`final.js` para letras de esferas) y
transfórmala.

## Contrato de una escena

`scenes/<id>.js` exporta por defecto:

```js
export default {
  id: 'planeta', dur: 9.5, xin: 0.8,      // xin (opcional): fundido con la anterior; si falta, E.XF = 0.8
  build(E, root) { … },                   // crea escena, cámara, luces, campos de esferas y composer
  timeline(tl, t0, E) { … },              // opcional: tweens de GSAP en SU línea de tiempo (t0 siempre 0)
  update(lt, E) { … },                    // cada cuadro: fija el estado para el tiempo local lt ∈ [0, dur)
  render(E) { … },                        // opcional; por defecto this.composer.render(1/60)
};
```

- **`build`** crea un `THREE.Scene` con `environment = E.makeEnv(paneles)`, una
  `PerspectiveCamera` con aspecto `E.FW / E.FH` (la intro vertical usa `E.IW / E.IH` y
  `E.renderer2`), luces (una `DirectionalLight` con `castShadow` da relieve), los
  `SphereField` (`scene.add(field.mesh)`) y `this.composer = E.makeComposer(scene, camera, opciones)`.
  `root` es la capa de texto de la escena; el motor la muestra solo mientras la escena está
  en pantalla.
- **`timeline`** recibe una línea de tiempo pausada propia. Anima objetos planos que luego
  lees en `update`, o elementos del DOM. Texto: `E.line` y `E.reveal`.
- **`update(lt)`** es una función pura del tiempo: el render salta a cualquier cuadro y cada
  cuadro debe salir igual sin importar el anterior. Si hay varias tomas, **cada rama fija
  todo su estado** (cámara, fov, desenfoque, bloom, luces): el composer se comparte y lo
  que no fijas se hereda del cuadro anterior. Al final, `field.commit()` en cada campo que
  cambió.
- **Nada aleatorio ni de reloj**: `E.dots.rng(semilla)` y `lt`.
- Nueva escena → agrégala a `ORDER` en `main.js`.

## Piezas del motor (`E`)

| Pieza | Uso |
|---|---|
| `new E.SphereField(n, { seg, material, castShadow, receiveShadow, name, ...opcionesDeMaterial })` | `n` esferas instanciadas. Arrays: `pos` (xyz), `rad`, `sq` (aplastamiento en z), `col` (rgb lineal), `glow`. Métodos: `set(i, x, y, z, r)`, `color(i, E.col('#hex'), glow)`, `commit()`. `count` = cuántas se dibujan. `seg`: 8–14 para diminutas, 24 normal, 32–48 héroes |
| `E.paintMaterial({ roughness, metalness, clearcoat, envMapIntensity, iridescence, sheen })` | Acrílico brillante con barniz y brillo propio por instancia (`glow`) |
| `E.makeEnv(paneles)` | Mapa de reflejos a partir de paneles `{ pos, color, i, w, h }`; `i > 1` = HDR que florece con el bloom. `E.STUDIO` es un set cálido/turquesa de base. Si usas `envMapIntensity`, asigna `material.envMap` a mano: `scene.environment` lo pisa |
| `E.makeComposer(scene, cam, { tone, ao, dof, bloom, saturation, contrast, brightness, vignette, ca }, renderer?)` | Post: AO de contacto (N8AO) → desenfoque → bloom → tone mapping → gradación. Devuelve el composer; `c.fx.dof`, `c.fx.bloom`, `c.fx.ao` se animan |
| `E.line(root, texto, { y, size, color, css })` | Línea de texto centrada y oculta (el motor fuerza ≥ 54 px, peso 500, halo) |
| `E.reveal(tl, el, tIn, tOut, { dur, stagger, rise })` | Entrada letra a letra (desenfoque → nítido) y salida que termina justo en `tOut` |
| `E.col('#hex')`, `E.mixCol(a, b, t)` | Colores en espacio lineal |
| `E.FW, E.FH` / `E.IW, E.IH` | 1920×1080 película / 1080×1920 intro |
| `E.SS`, `E.FMT`, `E.RENDER` | Supermuestreo, formato (`reel`/`wide`), si se está renderizando |
| `E.gsap`, `E.THREE`, `E.dots` | Librerías y gramática de puntos |

`E.dots`:

| Función | Devuelve |
|---|---|
| `rng(semilla)` | Generador determinista `() → [0, 1)` |
| `hash(a, b)`, `clamp`, `lerp`, `sstep(a, b, x)` | Utilidades (sstep = rampa suave) |
| `ring(R, r, gap, fase)` | Puntos de un anillo de radio R con esferas de radio r |
| `along(f, rFn, gap)` | Fila de esferas sobre una curva `f(u) → [x, y, z]` con radio `rFn(u)` |
| `pack({ x0, y0, x1, y1, inside, rFn, seed, minGap, max })` | Relleno empaquetado de radio variable → `[{ x, y, r }]` |
| `mask(w, h, draw)`, `textMask(texto, { font })` | Funciones `inside(u, v)` desde un canvas (formas y texto) |
| `remap(K, t)` | Curva de tiempo monótona por claves `[[salida, fuente], …]` |

`scenes/_assets/lettering.js` (letras de esferas):

| Función | Devuelve |
|---|---|
| `text(E, 'TEXTO', { cap, x, y, maxW, justify, weight, ls })` | Puntos `{ x, y, z, r, d, edge }` que forman el texto: fila fina en el contorno + relleno que crece hacia el centro del trazo |
| `spark(E, { R, x, y })` | El logo de Claude hecho de esferas |
| `cloud(E, n, { box, r, seed })` | Nube aleatoria (inicio de «armarse», fin de «dispersarse») |
| `bake(sets, N)`, `blend(A, B, i, e, lift)` | Transición de un conjunto de esferas entre formas (cada esfera viaja por un arco) |
| `grad(colores, k)` | Rampa de color de varias paradas |

`scenes/_assets/kit.js` (lo que comparten los ejemplos; úsalo en escenas nuevas):

| Función | Para qué |
|---|---|
| `curva('power2.inOut')`, `fase(t, a, d)` | Curvas de GSAP como funciones y «cuánto va de este tramo» (0 → 1) |
| `PAL`, `pintar(puntos, paleta, filo, brillo)` | Paletas y color de las letras de esferas: núcleo en degradado + filo de contracolor |
| `letras(E, 'TEXTO', o)`, `mover(puntos, dx, dy)` | Una línea en letras de esferas centrada en (0, 0) y cómo colocarla |
| `tarjeta(E, o)`, `rotulo(E, 'TÍTULO', o)` | La tarjeta «HECHO 100% CON / CLAUDE CODE» y el título (con `/` para partir líneas) |
| `bola(E, n, o)`, `banco(E, scene, formas, o)` | Un solo campo de esferas que viaja de forma en forma y estalla en polvo dorado |
| `cielo(E, scene, cam, o)`, `nitidoLejos(composer, desde)` | Estrellas escasas y nítidas que siguen a la cámara, a salvo del desenfoque |

### Al adaptar los ejemplos

- **Polvo dorado:** `banco()` lo dimensiona para una cámara a ~21 unidades en 16:9; si cambias
  la distancia de una escena de letras, el polvo ya no llena el cuadro.
- **`planeta.js`:** `MACRO` y `SOL` van juntos (mover el sol mueve la sombra del planeta
  sobre el anillo y el ángulo de la luz rasante). La toma macro deja el planeta fuera de
  cuadro a propósito: dentro, se veía como un disco plano borroso.
- **Texto y duración:** la ventana legible depende del largo de la frase (la fórmula está en
  el `CONFIG` de `planeta.js`); una frase más larga pide revelar antes o salir después.
- **Títulos delgados en vertical** activan el detector de negro de `verificar.mjs`: la intro
  parte el título en dos líneas (`partir`). Vuelve a verificar tras cambiar un título.
- **`final.js`:** `ola = formada − junta − 1.1` debe quedar ≥ 0.
- **`nitidoLejos`** parchea un texto del shader de desenfoque de postprocessing; si una
  actualización lo cambia, solo avisa en la consola.

## Patrones que ya funcionaron

- **Tomas por umbral:** `const shot = lt < CUT_B ? 0 : lt < CUT_C ? 1 : 2;` y una rama por
  toma que fija todo su estado.
- **Movimiento de cámara seguro:** interpola posición y objetivo con una curva de GSAP
  (`E.gsap.parseEase('power2.inOut')`) sobre la fracción de la toma; un solo movimiento.
- **Respiración:** `r = r0 * (1 + 0.04 * Math.sin(lt * 2.1 + i * 0.37))`.
- **Armarse desde una nube:** `bake([nube, forma], N)` y en `update`
  `blend(A, B, i, e(k_i), lift)` con un retraso por esfera (`k_i` según su orden).
- **Macro de reloj:** cámara muy cerca, fov 20–30, `dof: { worldFocusDistance, worldFocusRange,
  bokehScale }` animado, luz rasante, esferas de tres tamaños y respiración.
- **Sujeto legible (truco de teleobjetivo):** acerca el objeto a la cámara sobre la misma
  línea de visión y compensa su tamaño; ocupa el mismo punto de la imagen pero se lee.
- **Persecución:** cámara con desfase fijo detrás del sujeto; el entorno pasa rápido cerca
  del lente (esferas grandes desenfocadas) y lento al fondo.
- **Desintegración:** cada esfera del sujeto recibe un retraso y una velocidad hacia el
  sumidero; su rastro son filas de esferas que se encogen (espaguetificación).
- **Fundido pensado:** el último segundo de una escena se parece al primero de la
  siguiente (color, masa, composición); revisa la unión a 0.1 s.

## Rendimiento

≤ ~300 ms por cuadro a `--ss=2` (`node render.cjs bench 2 --scene=<id> --ss=2`). ≤ ~150 mil
esferas por campo; reutiliza campos entre tomas en vez de crear otros; nada de reservar
memoria dentro de `update` si se puede evitar.

## Herramientas (`render.cjs`)

Todas aceptan `--clave=valor` (o variables de entorno):

| Comando | Qué hace |
|---|---|
| `node render.cjs sheet 0:8:0.5 review/<id>/hoja.jpg --scene=<id>` | Hoja de contactos en tiempo local de una escena (tu herramienta principal) |
| `node render.cjs stills 1.5,4 review/<id> --scene=<id> --ss=2` | Fotos a calidad final |
| `node render.cjs bench 2 --scene=<id> --ss=2` | Milisegundos por cuadro |
| `node render.cjs info --fmt=reel` | Duración total y dónde empieza cada escena |
| `node render.cjs sheet 8:10:0.1 review/union.jpg --fmt=wide --only=a,b` | Revisar una unión con su vecina (el tiempo empieza en 0 con la primera) |
| `node render.cjs video salida.mp4 --fmt=reel --ss=2` | Video (también `--start`, `--end`, `--crf`, `--fps`) |
| `node render.cjs serve` | Vista previa en vivo en el navegador (botón ▶), en tiempo real |

`--fmt=reel` (por defecto) = 1080×1920 con intro vertical y película girada;
`--fmt=wide` = 1920×1080 con `titulo.js`. Con `--scene` el formato por defecto es `wide`
(excepto `intro`).
