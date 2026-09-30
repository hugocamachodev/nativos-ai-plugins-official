---
name: video-esferas
description: Produce un cortometraje cinematográfico donde todo lo que se ve está hecho de esferas 3D brillantes —planetas, naves, personajes, olas, agujeros negros y hasta el texto— programado con Three.js y GSAP y renderizado cuadro a cuadro a un MP4 de 60 fps, como reel vertical con «gira tu teléfono» para Instagram y TikTok y/o en versión horizontal para YouTube y Facebook. Prepara la computadora desde cero (Node, Chrome, FFmpeg), entrevista al usuario como un director y parte de una plantilla probada. Úsala siempre que alguien pida «un video como el de Interstellar hecho de esferas», «recrear una película con esferas o puntos 3D», «un corto animado hecho 100% con Claude Code», «arte de puntos animado», «una animación 3D con código para un reel» o «un video con Three.js», aunque no nombre las librerías. NO es para landings con scroll (eso es landing-scroll-3d) ni para generar video con modelos de IA de video (Sora, Veo, Runway).
---

> **Rutas:** `${CLAUDE_PLUGIN_ROOT}` apunta a la carpeta del plugin instalado. Nunca uses
> rutas relativas: Bash corre desde el proyecto del usuario, no desde el skill. Si la
> variable llega vacía, el plugin está en
> `~/.claude/plugins/cache/nativos-ai-marketplace/nativos-ai/<version>/`: encuéntralo con
> un `ls` de esa carpeta y usa la ruta absoluta que salga.
> Esta skill vive en `${CLAUDE_PLUGIN_ROOT}/skills/video-esferas/`; abajo se abrevia `$SKILL`
> (en Bash, defínela: `SKILL="${CLAUDE_PLUGIN_ROOT}/skills/video-esferas"`).

# Video de esferas

Produce un corto donde cada cosa visible es un campo de esferas brillantes animadas por
código, y lo entrega como MP4 de 60 fps listo para publicar. Nació con «Interstellar en
esferas» (2:20, 14 escenas, cinco rondas de correcciones con el cliente); la plantilla trae
el mismo motor ya probado. Tu trabajo es **dirigir**: convertir la idea del usuario en un
guion con buen ritmo, construir cada escena con el nivel de detalle de un reloj visto en
macro y verificar cada cuadro antes de entregar.

Salida: una carpeta de proyecto con guion (`SCRIPT.md`), biblia de estilo (`LOOK.md`) y una
escena por archivo, más el video final: reel 1080×1920 (la película va girada y abre con una
intro vertical que pide girar el teléfono) y/o horizontal 1920×1080. Sale mudo: la música se
pone en la app donde se publica.

## Quién lo va a leer

Alguien de la comunidad que vio el video y quiere el suyo. Probablemente nunca abrió una
terminal ni instaló Node. Explica cada paso en una línea sin jerga, pide cosas concretas (una
decisión, una frase, una referencia) y decide tú lo técnico. Antes de instalar o descargar
algo, di qué es y cuánto pesa. Cada imagen o video que quieras enseñarle, ábreselo: `open archivo`
en Mac, `start archivo` en Windows. Palabras que vas a usar, dichas así: *hoja de contactos* =
una imagen con 12 cuadros del video; *supermuestreo* = calcular cada píxel cuatro veces para
que se vea nítido; *subagentes* = otras sesiones de Claude trabajando al mismo tiempo;
*tokens* = la unidad en que se mide el trabajo de la IA.

## Cómo se escribe esto (no negociable)

- Directo. Sin preámbulos ni resúmenes más largos que el trabajo.
- Una pregunta por mensaje en la entrevista, con opciones cuando se pueda.
- Todo lo visible son esferas (instancias de `SphereField`); lo único que no es esfera es
  el texto del DOM. Líneas = filas de esferas; superficies = esferas empaquetadas.
- Nada inventado que parezca real: citas y datos de una película, tal como son.
- Fan art: se vale para uso personal y redes; no uses logotipos oficiales ni lo presentes
  como material oficial del estudio.

## Paso 0. Preparar la computadora

Lee `$SKILL/references/instalacion.md` si algo falla. Lo normal:

1. `node -v`. Sin Node (o menor a 18), guía la instalación según el sistema (ese archivo
   trae los comandos) y espera a que el usuario confirme.
2. Pregunta dónde crear el proyecto (por defecto, una carpeta nueva con el nombre del corto
   dentro de la carpeta actual). Copia la plantilla e instala. Avisa antes: descarga unos
   90 MB (Three.js, GSAP, Playwright y un FFmpeg incluido); nada se instala fuera de la
   carpeta.
   ```bash
   SKILL="${CLAUDE_PLUGIN_ROOT}/skills/video-esferas"
   mkdir -p "nombre-del-corto" && cd "nombre-del-corto"     # la carpeta que eligió el usuario
   cp -R "$SKILL/assets/template/." . && npm install
   node scripts/doctor.mjs
   ```
3. `doctor.mjs` revisa Node, librerías, FFmpeg, navegador y tarjeta gráfica, y dice cómo
   arreglar lo que falte. Si no hay Chrome: `npx playwright-core install chromium`
   (~150 MB). Si reporta WebGL por software, funciona pero renderiza varias veces más lento:
   díselo al usuario y baja ambiciones (menos esferas, `--ss=1` hasta el final).
4. Prueba de humo: `node render.cjs sheet 0:9:1 review/prueba.jpg --scene=planeta` y mira la
   imagen. Si ves el planeta, todo funciona. Ábresela al usuario (`open review/prueba.jpg`):
   es el primer «wow».

## Paso 1. Entrevista, como un director

Una pregunta por mensaje; espera la respuesta; para cuando tengas suficiente. Si contesta
«tú decide», decide y dilo. Sin usuario disponible (ejecución autónoma), asume valores por
defecto razonables, decláralos en `SCRIPT.md` y sigue.

1. **Historia.** ¿Qué película, historia, marca o idea? ¿Qué debe sentir quien lo vea?
2. **Formato.** Reel vertical con «gira tu teléfono» (Instagram, TikTok), horizontal
   (YouTube, Facebook) o ambos. Los dos salen del mismo proyecto.
3. **Duración.** Explica la regla de ritmo antes de que elija: cada escena necesita 7–9
   segundos para disfrutarse. Cuenta así: total ≈ apertura (intro vertical 13 s, o título
   horizontal 8 s) + escenas + final (5 s) − 0.8 s por fundido. Reel de 30 s ≈ 2 escenas de
   8 s · 1 min ≈ 5–6 · 2 min ≈ 12–13. `node render.cjs info --fmt=reel` da el total exacto.
   El primer corte de Interstellar duraba 1:01 y el cliente dijo «tan rápido que no te deja
   disfrutarlo»; la versión buena duró 2:20.
4. **Momentos obligatorios.** Las 3–5 imágenes icónicas sin las que no es esa historia, y las
   frases exactas que deben salir en pantalla (idioma y redacción literal). Si la
   película es de otro idioma, pregunta: frase original (la más reconocible) o la de la
   versión en su idioma; si no puedes verificar la redacción doblada, usa la original.
5. **Estilo.** Paleta y atmósfera; si tiene referencias, que las mande. Enséñale
   `$SKILL/assets/referencia-interstellar.jpg` como ejemplo del nivel de detalle.
6. **Cómo producir.** Solo (una sesión: más lento, gasta menos) o con subagentes en paralelo
   (más rápido, más tokens; ver `references/produccion-multiagente.md`). Da un orden de
   magnitud honesto: Interstellar 2:20 usó 33 agentes, ~595 millones de tokens (97% de
   relecturas baratas) y ~14 horas contando las revisiones del cliente. Cada escena nueva
   costó ~8 M de tokens (~US$3–4 a precio de API) más las revisiones: un reel de 30 s en
   una sola sesión anda en decenas de millones de tokens, no en cientos.

Antes de escribir el guion, lee la sección «Ritmo» de `references/lecciones.md`: tomas de
≥ 2.5 s, momentos clave de ≥ 4 s, texto legible ≥ 2 s y nunca en el primer ni el último
segundo. Luego escribe `SCRIPT.md` a partir de `assets/template/SCRIPT.md`: una fila por escena con
duración, qué se ve, texto exacto, cómo entra y cómo sale (cada escena se convierte en la
siguiente). Enséñalo y **pide aprobación explícita antes de programar**. Después rellena
`LOOK.md` (biblia: paleta, reglas, tabla de producción). `references/ejemplo-interstellar.md`
trae un guion completo aprobado como modelo.

## Paso 2. Look-dev: probar el estilo con 2–3 escenas

Antes de producir todo, construye las 2–3 escenas más representativas y enséñale al usuario
hojas de contacto (`node render.cjs sheet 0:8:0.75 review/<id>/hoja.jpg --scene=<id>`). Aquí
se corrige el estilo barato: es la ronda que más ahorra. Detalle por escena, API del motor y
contrato: `references/motor.md`. Reglas visuales: `references/direccion.md`.

## Paso 3. Producción

Escena por escena, siguiendo el guion. Cada escena es un archivo `scenes/<id>.js` con un
bloque `CONFIG` arriba y se agrega a `ORDER` en `main.js`. Los ejemplos de la plantilla
(`intro`, `titulo`, `planeta`, `final`) enseñan el patrón: cópialos y transfórmalos, no
empieces de cero. Para cortos de más de ~6 escenas, reparte con subagentes
(`references/produccion-multiagente.md`): cada uno es dueño de sus archivos y entrega su
lista de tomas con tiempos.

Al adaptar la plantilla, no olvides:

- Título en `scenes/intro.js` **y** `scenes/titulo.js` (`CONFIG.titulo`; con uno corto,
  sube `tamanoTitulo`). El gancho y la tarjeta final están en el `CONFIG` de `intro.js`,
  `titulo.js` y `final.js`.
- `planeta` es solo un ejemplo de estilo: quítalo de `ORDER` cuando existan las escenas de
  la historia (o transfórmalo en una de ellas). No debe quedar «EL VIAJE COMIENZA.».

Por cada escena, antes de darla por buena:

- Hoja de contacto mirada con tus ojos (≤ 12 cuadros).
- Tomas de ≥ 2.5 s y momentos clave de ≥ 4 s; texto legible ≥ 2 s; nada de texto en el
  primer y último segundo.
- Los dos extremos preparados para el fundido: el primer y último segundo llenos de esferas
  que se parecen a la escena vecina.
- `node render.cjs bench 2 --scene=<id> --ss=2` ≤ ~300 ms por cuadro.

## Paso 4. Ritmo y uniones: lo que las fotos no enseñan

Las hojas de contacto no muestran el ritmo; el cliente de Interstellar aprobó las fotos y
rechazó el video por rápido. Por eso:

1. Revisa números: suma de duraciones, lista de tomas, ventanas de texto.
2. Revisa cada unión cuadro a cuadro:
   `node render.cjs sheet <t0>:<t1>:0.1 review/union.jpg --fmt=wide --only=a,b`.
3. Renderiza un **video de prueba rápido** (`node render.cjs video review/prueba.mp4 --fmt=reel`,
   sin `--ss`) y pídele al usuario que lo vea en su teléfono antes del final. Ahí aparece lo
   que ninguna foto enseña: prisa, saltos, texto que no alcanza a leerse.

Aplica sus notas y repite. Tres a cinco rondas es lo normal. Lo que ya se aprendió de las
correcciones de Interstellar, con su porqué, está en `references/lecciones.md`: léelo antes
de la primera ronda.

## Paso 5. Render final y verificación

```bash
node render.cjs video final-reel.mp4 --fmt=reel --ss=2        # vertical, con intro
node render.cjs video final-horizontal.mp4 --fmt=wide --ss=2  # horizontal, con título
node scripts/verificar.mjs final-reel.mp4
```

`--ss=2` es supermuestreo (cuatro muestras por píxel): más nítido y ~4× más lento. Un corto
de 2 min tarda ~10 min en una Mac con chip M. Si el render pasa de 10 minutos, lánzalo en
segundo plano y vigila el progreso. `verificar.mjs` confirma formato, cuadros y audio, lista
los tramos negros (revisa que sean intencionales) y arma una hoja de 12 cuadros: mírala.

## Paso 6. Entregar

Resumen corto: archivos y medidas, qué cambió en cada ronda, cómo pedir otra, y la música,
según `references/entrega.md`: se agrega en la app, no dentro del archivo, porque
Instagram y TikTok silencian o bajan el audio con derechos. TikTok limita la música con
licencia a 60 s e Instagram a 90 s por canción. Si el usuario lo pide, sugiere texto y
hashtags con esa misma guía.

## Qué hay en la plantilla (`$SKILL/assets/template/`)

| Archivo | Qué hace |
|---|---|
| `core/engine.js` | Motor: `SphereField` (esferas instanciadas), material acrílico con brillo propio, reflejos, postproceso (AO, desenfoque, bloom), texto legible, fundidos entre escenas, tiempo determinista |
| `core/dots.js` | Gramática de puntos: anillos, filas sobre curvas, rellenos empaquetados, máscaras de texto, curvas de tiempo |
| `scenes/_assets/lettering.js` | Texto hecho de esferas y el logo de Claude, con transiciones entre formas |
| `scenes/_assets/kit.js` | Lo que comparten los ejemplos: curvas de tiempo, paletas, letras, tarjeta de Claude, títulos, polvo dorado, estrellas |
| `scenes/intro.js` | Intro vertical (13 s): gancho → título → «gira tu teléfono» → 3·2·1 → polvo dorado |
| `scenes/titulo.js` | Apertura de la versión horizontal (8 s): gancho → título → polvo dorado |
| `scenes/planeta.js` | Escena de estilo (10 s): plano IMAX de un planeta con anillos + macro con desenfoque y una línea de texto |
| `scenes/final.js` | Tarjeta final (5 s) en letras de esferas |
| `main.js` | Orden de la película (`ORDER`) y cambios de tempo sin tocar escenas (`REMAP`) |
| `render.cjs` | Fotos, hojas de contacto, medición y video (`stills`, `sheet`, `bench`, `info`, `video`, `serve`) |
| `scripts/doctor.mjs`, `scripts/verificar.mjs` | Revisar la computadora y el video final |
| `SCRIPT.md`, `LOOK.md` | Guion y biblia de estilo para rellenar |

## Referencias

| Cuándo | Archivo (en `$SKILL/references/`) |
|---|---|
| Instalar Node, Chrome, FFmpeg; errores de entorno o GPU | `instalacion.md` |
| Escribir una escena: contrato, API del motor, patrones | `motor.md` |
| Estilo visual: medio, color, cámara, texto, fundidos, zonas seguras | `direccion.md` |
| Antes de cada ronda de revisión: lo que salió mal en Interstellar y por qué | `lecciones.md` |
| Producir con subagentes en paralelo | `produccion-multiagente.md` |
| Render final, música, formatos, texto y hashtags para redes | `entrega.md` |
| Un guion aprobado y cómo evolucionó en cinco rondas | `ejemplo-interstellar.md` |
| El «prompt maestro» para quien no tiene el plugin | `prompt-maestro.md` |
