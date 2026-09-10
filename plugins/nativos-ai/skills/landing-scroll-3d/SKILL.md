---
name: landing-scroll-3d
description: Construye una landing experimental scroll-driven con un objeto 3D protagonista (coche, reloj, zapatilla, moto, gadget) que gira, hace zoom y cambia de toma mientras el usuario hace scroll, con tipografía gigante animada, HUD, luces, preloader y créditos, usando React Three Fiber, GSAP ScrollTrigger y Lenis. Entrevista corta al usuario (objeto, historia, tono, colores, fuente, modelo 3D o vídeo), le ayuda a conseguir y licenciar un modelo, investiga los datos reales, genera el proyecto desde una plantilla probada y lo verifica con capturas. Úsala siempre que alguien pida "una página tipo Apple", "landing 3D con scroll", "scrollytelling de producto", "una web como la del Porsche", "un experimento web para reel", "animación con Three.js o R3F y GSAP" o "modelo 3D que gire con el scroll", aunque no nombre las librerías. NO es para una landing comercial normal (eso es landing-build) ni para auditar una página (landing-audit).
---

> **Rutas:** `${CLAUDE_PLUGIN_ROOT}` apunta a la carpeta del plugin instalado. Nunca uses
> rutas relativas: Bash corre desde el proyecto del usuario, no desde el skill. Si la
> variable llega vacía, el plugin está en
> `~/.claude/plugins/cache/nativos-ai-marketplace/nativos-ai/<version>/` — encuéntralo con
> un `ls` de esa carpeta y usa la ruta absoluta que salga.
> Esta skill vive en `${CLAUDE_PLUGIN_ROOT}/skills/landing-scroll-3d/`.

# Landing scroll 3D

Produce una página de una sola pantalla fija en 3D con diez secciones de scroll encima,
a partir de una plantilla que ya funciona (nació con un Porsche 911 Turbo de 1975). Tu
trabajo no es reinventar la técnica sino **adaptarla al objeto, la historia y el gusto de
esta persona**, conseguir un modelo con licencia limpia y dejar la página verificada.

Salida: una carpeta de proyecto Vite lista con `npm run dev`, modelo comprimido en
`public/models`, textos reales en el idioma del usuario, créditos del modelo, README y una
ronda de capturas de todas las secciones.

## Quién lo va a leer

Alguien de la comunidad que quiere un "wow" para grabar un reel o lucir un portfolio.
Probablemente no programa, no sabe qué es un GLB y no tiene por qué saberlo. Explica cada
paso en una línea sin jerga, pide las cosas concretas (un archivo, una URL, una decisión) y
decide tú lo técnico. Cuando haya que descargar algo o instalar dependencias, dilo antes y
di cuánto ocupa.

## Cómo se escribe esto (no negociable)

- Directo. Sin preámbulos, sin resumen de cierre más largo que la página.
- Una pregunta por mensaje en la entrevista. Opciones cuando se pueda.
- Nada inventado que parezca real: cifras, fechas y citas solo verificadas o marcadas como ficción.
- Créditos del modelo en la página, siempre.
- El código mínimo: la plantilla ya trae de sobra. Quitar lo que no aporta es lo que la hace ver profesional.

## Antes de empezar

Lee `${CLAUDE_PLUGIN_ROOT}/skills/landing-scroll-3d/references/errores-conocidos.md` una
vez: son errores que ya costaron horas y la plantilla los evita. No los reintroduzcas.
Instala dependencias solo dentro del proyecto, nunca globales.

## Paso 1. Entrevista

El patrón, destilado: una pregunta por mensaje, espera la respuesta, para cuando tengas
suficiente, compila todo en un resumen y pide aprobación antes de tocar código. Si el
usuario contesta "tú decide", decide y dilo. Si no hay usuario disponible (ejecución
autónoma), asume valores por defecto razonables, decláralos al principio y sigue.

1. **Objeto y modelo.** ¿Qué objeto es el protagonista? ¿Tiene ya un modelo 3D, hay que
   buscarlo, o solo hay fotos o vídeo? (Decide entre `references/modelos-3d.md` y
   `references/sin-modelo-video.md`.)
2. **Para qué.** ¿Reel o experimento, portfolio, o página comercial? Una licencia no
   comercial vale para lo primero y no para lo último; también decide cuánto rendimiento
   hace falta.
3. **Historia.** ¿Qué debe contar? Origen, cómo está hecho, un detalle icónico, cifras,
   colores, legado. Ofrece las diez secciones de la plantilla y pregunta qué sobra o falta.
   Si el objeto es real, ofrece investigar los datos.
4. **Tono visual.** ¿Estudio oscuro y lujoso, laboratorio blanco, neón, editorial? ¿Color de
   acento, o lo sacamos del objeto? (`references/direccion-visual.md`.)
5. **Tipografía.** ¿Alguna referencia? Si no, propone una display variable con eje de ancho
   y una mono, y explica por qué en una frase.
6. **Interacciones.** ¿Luces que se encienden, piezas que giran, cambio de color, ráfagas al
   final? Explica qué permite el modelo (depende de sus materiales) y qué no (puertas o
   piezas que no vienen separadas).
7. **Dónde se verá.** ¿Solo escritorio y grabación de pantalla, o también móvil? La plantilla
   es de escritorio; móvil implica quitar reflejos y postprocesado.

Cierra con un resumen de una pantalla: objeto, fuente del modelo y licencia, lista de
secciones con una frase cada una, paleta y fuentes, extras, y el aviso de que se creará un
proyecto que descarga unos 300 MB de dependencias en su carpeta. **Pide aprobación explícita
antes de escribir código.** Lo que se decide aquí ahorra rehacer tomas después.

## Paso 2. Conseguir y preparar el objeto

Sigue `references/modelos-3d.md`. Resumen: el usuario descarga el GLB (Sketchfab requiere
cuenta; dale los pasos) o tú bajas una muestra de Khronos con URL directa como placeholder
para tener la página andando ya; guarda el original fuera de `public/`; comprime a menos de
10 MB; inspecciona materiales y rellena `MODEL` en `src/config.ts`. Anota los créditos
exactos: van en la página sí o sí.

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/landing-scroll-3d/scripts/compress-model.sh" assets-src/original.glb public/models/model.glb 2048
mkdir -p scripts && cp "${CLAUDE_PLUGIN_ROOT}/skills/landing-scroll-3d/scripts/inspect-model.mjs" scripts/
node scripts/inspect-model.mjs public/models/model.glb
```

Sin modelo aceptable, usa la variante de secuencia de imágenes de `references/sin-modelo-video.md`.

## Paso 3. Investigar la historia

Si el objeto existe en el mundo real, lanza un subagente de investigación con un brief
preciso (fechas, cifras con unidades, nombres propios, anécdotas verificables, citas
textuales con fuente) y pídele que marque lo que no pudo verificar. Escribe los textos solo
con datos verificados; una cifra inventada arruina la credibilidad de toda la página.
Guarda las fuentes para los créditos. Si el objeto es ficticio o del usuario, pídele los
datos y escribe con ellos.

## Paso 4. Generar el proyecto

1. Copia la plantilla a la carpeta del proyecto (incluye el `.gitignore`), instala y coloca
   el modelo:
   ```bash
   cp -R "${CLAUDE_PLUGIN_ROOT}/skills/landing-scroll-3d/assets/template/." .
   npm install
   ```
2. `src/config.ts`: `SITE` (título, marca del HUD, palabra del preloader, unidad del
   velocímetro, créditos) y `MODEL` (largo, frente, nombres de materiales). No dejes ningún
   texto de la demo.
3. `src/choreo.ts`: reescribe `SECTIONS`, `SPECS` y `COLORS` con la historia real. Ajusta las
   tomas siguiendo `references/coreografia.md`; la demo trae tomas válidas para un objeto de
   unas 4,4 unidades de largo, más ancho que alto.
4. Dirección visual: paleta en `styles.css`, fuentes en `main.tsx`, luz en `Scene.tsx`
   (`references/direccion-visual.md`).
5. README del proyecto: rellena los huecos de `README.md` (título y créditos).
6. `npx tsc -b` y `npm run build` deben pasar antes de mirar nada.

## Paso 5. Verificar con los ojos

Nunca entregues sin haber visto cada sección. Levanta `npm run dev` en segundo plano,
confirma con `curl` que responde, y captura todas las posiciones:

```bash
npm i -D playwright && npx playwright install chromium-headless-shell
cp "${CLAUDE_PLUGIN_ROOT}/skills/landing-scroll-3d/scripts/capture.cjs" scripts/
URL=http://localhost:5173 node scripts/capture.cjs ./shots '[["hero",0],["s1",1.0],["s2",2.2],["s3",3.4],["s4",4.6],["s5",5.7],["s6",6.8],["s6b",7.8],["s7",8.8],["s8",10.0],["s9",11.2]]'
```

Las posiciones son la suma de `vh / 100` de las secciones anteriores; recalcúlalas si
cambiaste alturas. Si tienes un panel de navegador, úsalo además para ver el movimiento.

Por captura:

- El objeto se ve entero o recortado a propósito, nunca tapado por el título; si lo tapa,
  mueve `look` hacia el lado del texto.
- El callout toca la pieza que nombra.
- Las luces están encendidas donde toca (desde la sección con `lights` y `rear` en adelante).
- No queda texto de la demo.
- Las tildes de los títulos en mayúsculas (Á, É, Í, Ó, Ú, Ñ) se ven enteras. Si falta alguna,
  lee «Tildes que desaparecen» en `references/errores-conocidos.md`; no reescribas el
  título para esquivarlo.
- Sin errores en consola y sin frames negros persistentes (uno aislado en headless es
  artefacto; si se repite en la misma posición, investiga).
- El cierre muestra créditos y licencia.

Corrige y vuelve a capturar solo las secciones tocadas. Dos o tres rondas es lo normal. Al
acabar, mata el servidor que levantaste y los `chrome-headless-shell`.

## Paso 6. Entregar

Resumen corto: cómo arrancar, qué hace cada sección, dónde se editan tomas y textos,
licencia del modelo y sus condiciones, qué bajar si va a tirones (`dpr` en `App.tsx`), y
qué quedó sin verificar (por ejemplo el rendimiento real en su equipo).

## Qué hay en la plantilla

- `src/rig.ts`: objeto mutable que GSAP tweenea y R3F lee cada frame. Es el puente; no
  metas estado de React en medio.
- `src/choreo.ts`: `SECTIONS`, timeline maestra con scrub, reveals de texto, contadores,
  ráfagas, Lenis.
- `src/Scene.tsx`: cámara con paralaje, suelo reflectante, entorno con Lightformers,
  postprocesado (bloom, aberración cromática, viñeta), estelas, callouts, texto fantasma 3D.
- `src/Model.tsx`: normaliza el modelo, aplica materiales por nombre según `MODEL`, pinta,
  luces, ruedas, colgante, focos.
- `src/App.tsx`: canvas, HUD con velocímetro, secciones, cursor, preloader e intro.
- `scripts/`: comprimir, inspeccionar y capturar.

## Referencias

| Cuándo | Archivo (en `${CLAUDE_PLUGIN_ROOT}/skills/landing-scroll-3d/references/`) |
|---|---|
| Conseguir, licenciar, comprimir e inspeccionar el modelo | `modelos-3d.md` |
| Diseñar tomas, textos y extras por sección | `coreografia.md` |
| Paleta, fuentes, luz, HUD | `direccion-visual.md` |
| Sin modelo: fotogramas controlados por scroll | `sin-modelo-video.md` |
| Diagnóstico de fallos de render, luces, scroll y captura | `errores-conocidos.md` |
