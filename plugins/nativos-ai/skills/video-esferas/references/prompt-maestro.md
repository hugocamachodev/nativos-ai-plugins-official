# Prompt maestro

Para quien no tiene el plugin: se copia completo en Claude Code (mejor con Opus y esfuerzo
alto), en una carpeta vacía, después de cambiar lo que va entre corchetes. Es la versión
corta de este skill; con el plugin, pide simplemente «hazme un video de esferas».

```text
Quiero que seas director y programador de un cortometraje donde TODO lo que se ve está hecho
de esferas 3D brillantes (como el video «Interstellar en esferas», hecho 100% con Claude Code).

Mi idea: [PELÍCULA, HISTORIA O MARCA]
Formato: [reel vertical con «gira tu teléfono» / horizontal para YouTube / los dos]
Duración: [30 s / 1 min / 2 min]
Idioma de los textos: [español / inglés]

CÓMO SE CONSTRUYE (no generes video con IA: programa cada esfera)
- Node.js + Three.js: cada objeto es un InstancedMesh de esferas con MeshPhysicalMaterial
  brillante (clearcoat 1, roughness ~0.38) y reflejos de color a partir de paneles emisivos
  (PMREM). Brillo propio por esfera solo para estrellas, fuego y luces.
- GSAP: una línea de tiempo pausada por escena. Cada cuadro se calcula como función pura del
  tiempo (sin Math.random ni relojes; semillas fijas), así el render es determinista.
- Postprocesado (librerías postprocessing y n8ao): oclusión ambiental, profundidad de campo,
  bloom y tone mapping Neutral.
- Render: Playwright abre Chrome sin ventana con aceleración gráfica (--use-angle=metal en
  Mac), le toma una foto a cada cuadro y FFmpeg (ffmpeg-static) arma un MP4 H.264 de 60 fps,
  CRF 16, sin audio. Supermuestreo 2× en el render final.
- Un archivo por escena con { id, dur, build, update(t) }. El motor funde cada escena con la
  siguiente durante 0.8 s. En el reel, la película horizontal va girada 90° dentro de un
  cuadro de 1080×1920 y abre con una intro vertical: el gancho en letras de esferas, el
  título, «gira tu teléfono» con un teléfono de esferas, 3·2·1 y una explosión de polvo
  dorado que se convierte en la primera escena.
- Herramientas que quiero: hojas de contactos (12 cuadros por imagen) para revisar cada
  escena, medición de milisegundos por cuadro y un verificador del video final.

DIRECCIÓN DE ARTE
- Solo esferas: líneas = filas de esferas; superficies = esferas empaquetadas con
  gradiente de tamaño (grandes al centro, pequeñas en los bordes). Esferas grandes,
  medianas y diminutas juntas en cada cuadro.
- Nivel de detalle de un reloj visto en macro: en cada escena, un primer plano donde se
  vean las esferas individuales, su brillo y su relieve, con fondo desenfocado.
- Colores vibrantes, negros de verdad, contracolor turquesa contra dorados y naranjas.
- El espacio es negro profundo con pocas estrellas; la densidad va en los objetos.
- Momentos grandes: primero un plano abierto con algo diminuto para dar escala, luego el
  primer plano. Un movimiento de cámara seguro por toma. Nada estático: las esferas
  respiran, fluyen y giran.
- En los momentos clave la cámara sigue al protagonista (súper zoom, persecución) y el
  desenlace pasa despacio; el protagonista nunca mide menos de ~120 px en pantalla.
- Las esferas de una escena se convierten en la siguiente; nunca un corte a negro.

RITMO Y TEXTO (lo más importante)
- 7–9 segundos por escena. Tomas de al menos 2.5 s, momentos clave de al menos 4 s.
- Texto de al menos 54 px, peso 500, con halo oscuro; legible al menos 2 s; nunca en el
  primer ni el último segundo de una escena; frases exactas del guion.

PROCESO
1. Revisa mi computadora (Node 18+, dependencias, Chrome, tarjeta gráfica), instala lo que
   falte dentro de la carpeta del proyecto (dime antes qué y cuánto pesa) y haz un render
   de prueba.
2. Entrevístame con una pregunta a la vez: historia, momentos icónicos, frases exactas,
   paleta y referencias.
3. Escribe el guion (escena, duración, qué se ve, texto, cómo pasa a la siguiente) y espera
   mi aprobación antes de programar.
4. Construye primero 2–3 escenas de prueba de estilo y enséñame sus hojas de contactos.
5. Produce escena por escena y revisa cada una con hojas de contactos y cada unión cuadro
   a cuadro.
6. Hazme un video de prueba rápido para ver el ritmo en mi teléfono y corrige con mis
   notas.
7. Render final a 60 fps con supermuestreo 2×, verifica el archivo (cuadros, duración, sin
   tramos negros no buscados) y dime cómo agregar la música en Instagram o TikTok sin que
   la silencien.
```
