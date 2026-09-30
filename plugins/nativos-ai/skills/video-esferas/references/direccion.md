# Dirección visual

La biblia de estilo de cada proyecto (`LOOK.md`) parte de aquí. Son las reglas con las que
«Interstellar en esferas» se aprobó; cámbialas solo si el usuario pide otra cosa.

## El medio: solo esferas

Todo lo visible es un campo de esferas (`SphereField`), o esferas aplastadas (`sq` < 1:
«gotas de pintura») sobre un tablero oscuro. Nada de cajas, tubos, planos, líneas ni sprites.
El texto del DOM es la única excepción.

**Gramática:**
- filas que siguen un contorno (`dots.along`): líneas, bordes, perfiles;
- anillos concéntricos (`dots.ring`): planetas, discos, relojes, ondas;
- ráfagas radiales: explosiones, polvo, chispas;
- rellenos empaquetados con gradiente de tamaño (`dots.pack`): grandes en el corazón de la
  forma, pequeñas en los bordes; así una silueta se lee sola;
- contornos claros (crema o blanco) entre formas;
- una lluvia fina de micro-esferas como textura.

**En cada cuadro conviven esferas grandes, medianas y diminutas.** Un objeto héroe puede
ser una sola esfera grande (un planeta con bandas pintadas por shader sigue siendo una
esfera) rodeada de estructuras de esferas pequeñas.

## Material y luz

- `paintMaterial`: acrílico brillante con barniz. El 3D tiene que ser obvio: brillo
  especular en cada esfera, reflejos de color (paneles de `makeEnv` elegidos por escena),
  oclusión de contacto (AO), sombras suaves y profundidad de campo.
- Brillo propio (`aGlow`) solo para luz con motivo: estrellas, fuego, el disco caliente de un
  agujero negro, pantallas, pulsos. Cuando el objeto **es** la fuente de luz, déjalo arder
  con bloom fuerte; cuando no, el brillo abarata.
- Tone mapping NEUTRAL (el motor lo trae por defecto): conserva la saturación.

## Color

- Vibrante y saturado. Negros de verdad: sin neblina lechosa ni negros levantados.
- **Contracolor turquesa/cian en todas partes** (`#0FA3A3`, `#12C4C4`, `#2EC8FF`,
  ultramar `#1A2A8C`) contra dorados, naranjas y carmesíes, en sombras y reflejos, para que
  el color vibre.
- **El espacio es negro profundo** con pocas estrellas nítidas (esferas diminutas blanco
  hielo, brillo variado). La densidad va en los objetos, nunca en polvo de fondo.
- Paletas que funcionaron:
  - fuego: `#FFF4D6` → `#FFC247` → `#FF7A1A` → `#E0341A` → `#8C0F1F`;
  - reloj/latón: `#D9A441` → `#F2C66D`, lumen crema `#F6ECD0`, segundero `#FF4B2B`;
  - océano: teal, turquesa, cian y espuma blanca; sombras `#0E3B43`;
  - habitación cálida: miel `#FFB547`, ámbar, naranja quemado; sombras teal.

## Cámara

- **Macro de reloj en cada escena:** al menos un primer plano donde se vean las esferas
  individuales, sus reflejos y su relieve, con poca profundidad de campo.
- **Momentos grandes:** abre con un plano IMAX (escala: un objeto diminuto de referencia,
  paralaje, un empuje lento) y luego ve al primer plano.
- **Un movimiento seguro por toma**, 2–3 tomas por escena como máximo. Entre tomas: un
  empuje continuo al macro o un corte sobre movimiento.
- **Nunca estático:** las esferas respiran (±3–6 % de radio, desfasadas), fluyen por sus
  filas, los anillos giran a distintas velocidades, los reflejos se deslizan.
- **Los momentos clave siguen al sujeto**: súper zoom, persecución, tiempo suficiente.
- Coreografía con GSAP (curvas `expo` y `power`): las esferas aparecen desde radio 0 con un
  `back.out` leve, las formas se arman desde esferas dispersas, las esferas fluyen de una
  forma a la siguiente.

## Texto

- Frases exactas del guion aprobado, en el idioma elegido.
- `E.line` + `E.reveal`. El motor impone la legibilidad (≥ 54 px, peso 500, tracking ≤ .2em,
  halo oscuro); no lo pelees.
- ≥ 2 s legible completo (≥ 2.5 s las frases clave); nunca en el primer ni el último
  segundo de la escena; sobre zonas oscuras y tranquilas.
- Carteles grandes (gancho, título, final): letras hechas de esferas (`lettering.js`).

## Fundidos entre escenas

- Las escenas consecutivas se enciman 0.8 s (`E.XF`); el motor funde la saliente sobre la
  entrante, texto incluido. Una escena puede pedir otro fundido con `xin` (0.5–1.5).
- El primer y el último segundo de cada escena: cuadro lleno de esferas, sin texto, con
  color, masa y composición parecidos a la vecina. Que las esferas de una escena **se
  conviertan** en la siguiente.
- Nunca un corte a negro entre escenas. Dentro de una escena, la oscuridad puede ser un
  momento buscado (algo tragado por un agujero negro).

## Formatos y zonas seguras

- **Reel** 1080×1920: la película es horizontal (1920×1080) y va girada 90° en el sentido
  del reloj; quien gira el teléfono a la izquierda la ve derecha y a pantalla completa. Abre
  con la intro vertical (`scenes/intro.js`) que pide girar el teléfono.
- **Horizontal** 1920×1080 (YouTube, Facebook): la misma película sin girar, abierta por
  `scenes/titulo.js`.
- **Zona segura de la película** (coordenadas 1920×1080): texto y acción clave dentro de
  x 120–1630, y 170–1000. En el reel, Instagram tapa x > 1630 (descripción) y la franja
  y < 150 entre x 1000 y 1650 (botones). En YouTube los controles tapan los ~120 px de abajo
  al pasar el ratón.
- **Zona segura de la intro vertical** (1080×1920): texto dentro de x 90–930, y 220–1560.
