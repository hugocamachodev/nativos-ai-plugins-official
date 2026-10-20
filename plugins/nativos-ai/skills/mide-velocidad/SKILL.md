---
name: mide-velocidad
description: Mide qué tan rápido carga una página publicada en un celular y explica, sin jerga, qué tarda en aparecer, cuánto pesa cada cosa (imágenes, video, fuentes, código) y qué la está frenando, ordenado por lo que más nota quien la visita, con una tabla de qué conviene arreglar primero según beneficio y riesgo. Abre la página en Chrome con la herramienta chrome-devtools del plugin simulando un celular (pantalla de celular, 4G lenta, procesador 4 veces más lento), la carga tres veces y reporta lo que se repite. Si PageSpeed Insights no la puede medir ("Target closed", "DEADLINE_EXCEEDED", "NO_FCP") o la página nunca termina de cargar, averigua por qué. Úsala siempre que alguien quiera saber por qué su página es lenta o pesada — "mide qué tan rápido carga mi página", "¿por qué tarda tanto mi sitio en el celular?", "¿qué está frenando mi página?", "PageSpeed no puede medir mi página", "mi landing pesa mucho", "revisa la velocidad", "Core Web Vitals", "LCP", "Lighthouse" — aunque solo peguen un link. NO es para revisar un sitio completo antes de publicarlo (checkup-web), ni para saber por qué una landing no convierte (landing-audit), ni para medir un servidor de desarrollo o localhost.
---

> **Rutas:** `${CLAUDE_PLUGIN_ROOT}` apunta a la carpeta del plugin instalado. Nunca uses
> rutas relativas: Bash corre desde el proyecto del usuario, no desde el skill. Si la
> variable llega vacía, el plugin está en
> `~/.claude/plugins/cache/nativos-ai-marketplace/nativos-ai/<version>/`: encuéntralo con
> un `ls` de esa carpeta y usa la ruta absoluta que salga.

## Cómo se escribe esto (no negociable)

- Directo. Sin preámbulos, sin "¡Buena pregunta!", sin resumen de cierre.
- **El reporte va completo en el chat, siempre.** Nunca solo un resumen, nunca "los
  detalles están en un archivo". Quien pregunta quiere leerlo ahí.
- **Recomendar, no dictar.** "Yo arreglaría X primero porque Y". La persona decide.
- Nunca una calificación con cara de examen. Ni 35/100 ni semáforos con porcentaje:
  nadie arregla nada con un número. Los tiempos y los pesos sí van, con su unidad.

## Quién lo va a leer

Alguien que hizo su página, probablemente con ayuda de IA, y nunca ha programado. No
sabe qué es JavaScript ni un "render", ni tiene por qué saberlo. Cada punto dice **qué
pasa, cuánto lo nota quien visita la página y qué se puede hacer**. Las palabras
técnicas, solo entre paréntesis y después de la explicación: "la pantalla se queda en
blanco 6 segundos (el primer pintado)". Si un hallazgo no se puede explicar en una línea
sin jerga, la jerga sobra o el hallazgo no vale.

## Flujo

**0 · Qué página.** Tiene que ser un link publicado, con `https://` y un dominio de
verdad. Si te pasan `localhost`, `127.0.0.1`, una IP de la casa (`192.168.…`, `10.…`) o un
puerto de desarrollo (`:3000`, `:5173`, `:4321`, `:8080`), **no midas** y explica por qué:

> En tu computadora la página no viaja por internet, el código está sin comprimir y tu
> procesador es mucho más rápido que el de un celular. Cualquier número que saque ahí
> sería falso, casi siempre a tu favor. Publícala (aunque sea en una dirección de prueba)
> y pásame ese link.

Ahí termina la respuesta: sin medición no hay reporte, y una respuesta corta es la
correcta. Si hay carpeta y la persona no sabe cómo publicar, ofrécele ayuda para subirla a
una dirección de prueba (en Cloudflare, Vercel o Netlify, según lo que ya use), y espera su
OK: publicar es decisión suya.

Mira también si estás en la carpeta del proyecto de esa página (paso 4). Con la carpeta
puedes decir qué archivo causa cada problema; sin ella, al final del reporte avisa que
con la carpeta dirías más.

**1 · Revisar la herramienta.** Busca las herramientas de `chrome-devtools` (con
ToolSearch, "chrome-devtools" y `max_results: 40`: son unas 30 y con menos no salen todas). Si no aparecen, o al abrir una página responden que el
navegador ya está abierto o que el perfil está en uso, sigue
`references/sin-chrome-devtools.md`: explica qué pasó y cómo se resuelve, y **solo
entonces** mide con Lighthouse por línea de comandos, avisando en el reporte que cambiaste
de método.

**2 · Medir.** `references/medicion.md`, al pie de la letra. En resumen: tres cargas
en frío, cada una en una pestaña nueva y aislada, al frente, con pantalla de celular, 4G
lenta y el procesador 4 veces más lento. En la primera, además, la traza de rendimiento
de Chrome y un toque de prueba si hay algo seguro que tocar. Una carga en una pestaña que
no estuvo al frente no vale: se repite.

Lee `scripts/medidor.js` con Read y pásalo completo en el `initScript` de cada
navegación; la lectura después es una línea (`() => window.__mideVelocidadLeer()`).
`sourcePath` no sirve: la herramienta solo abre archivos de la carpeta del proyecto. Cada
carga, en un contexto aislado con nombre nuevo: si se repite, Chrome usa su caché y la
carga deja de ser en frío (el medidor lo detecta).

**3 · Si truena, se queda trabajando o tiene 3D.** `references/cuando-truena.md`. Tres
señales lo disparan, y cualquiera basta:
- la página no terminó de cargar, o la persona dice que PageSpeed no la pudo medir;
- después de cargar sigue ocupada (`enReposo.ocupadoPct` alto o tareas largas sin parar);
- tiene un canvas que dibuja 3D sin parar (`enReposo.dibujos3dPorSeg` mayor que 0).

Si una pantalla de carga tapa la página (`pantallaDeCarga`), lo que Google llama «lo
principal» es esa pantalla: el reporte dice además cuándo se puede usar la página de verdad.

Esta computadora tiene tarjeta de video y la medición frena el procesador pero **no la
tarjeta**. Muchos celulares baratos, y las máquinas de los servicios de medición, dibujan
3D mucho más lento. La prueba sin tarjeta de video de ese archivo es lo que lo revela.

**4 · Qué archivo causa cada cosa (si hay carpeta).** `references/carpeta.md`. Primero
confirma que la carpeta es la de esa página. Después ubica cada problema en su archivo:
las imágenes por su nombre, el código pesado con `scripts/mapa-del-codigo.mjs`. No cambies
nada, ni el `dist/`: lo que compiles para medir va a una carpeta temporal.

**5 · Juzgar y ordenar.** Cada hallazgo se queda solo si apareció en al menos dos de las
tres cargas. Ordénalos por lo que más nota quien visita la página (la escala está en
`references/reporte.md`), no por categoría técnica. Para cada uno, el arreglo, su
beneficio y su riesgo salen de `references/arreglos.md`, ajustados a lo que mediste.

**6 · Reportar.** `references/reporte.md`, con su plantilla y sus seis bloques en orden.
Toda cifra pasa por `${CLAUDE_PLUGIN_ROOT}/skills/landing-audit/references/forbidden-numbers.md`.

**7 · Ofrecer arreglar, sin tocar nada.** Si hay carpeta, termina ofreciendo los arreglos
de la tabla que recomiendas hacer ya, y espera el sí. El silencio no es un sí. Si dice
que sí:
- Los cambios van en una rama aparte, nunca directo en la que se publica.
- Por vueltas: primero lo de más beneficio y menos riesgo; cada vuelta se publica en una
  dirección de prueba (no en la de verdad) y se vuelve a medir con esta skill.
- Se sigue mientras haya algo que valga la pena, y la persona decide cuándo se publica de
  verdad.
- Antes de dar una vuelta por buena, la página se tiene que ver igual que antes en el
  celular y en la computadora.

## Los números (no negociable)

- **Cada medición da números distintos.** La red, la computadora y lo que esté haciendo
  en ese momento cambian todo unas décimas de segundo. Por eso se carga tres veces, se
  reporta la mediana con el rango, y solo cuenta lo que se repite. Explícalo en una línea
  en el reporte: quien vuelva a medir y vea otro número tiene que saber que es normal.
- **Solo umbrales oficiales de Google**, y solo estos tres:
  - lo principal de la pantalla (LCP), en 2.5 s o menos;
  - los saltos de la página (CLS), 0.1 o menos;
  - la respuesta al tocar (INP), en 200 ms o menos.
  Google los mide con visitas reales; en laboratorio son una aproximación, y así se dice.
  Al resto de los tiempos no le pongas meta: se reportan como están (aunque
  `forbidden-numbers.md` mencione otros umbrales de Google, este reporte usa solo estos tres).
- **Ningún número de agencia.** Ni "tienes 3 segundos", ni "53% se va", ni "LCP menor a
  1 s". Toda cifra pasa por `landing-audit/references/forbidden-numbers.md`.
- **La respuesta al tocar no se adivina.** Si no hubo un toque de prueba, va como no
  medida, y las tareas largas se muestran como la señal que son, sin compararlas con los
  200 ms.

## Guardrails

- **Nunca midas localhost ni un servidor de desarrollo.**
- **No cambies nada sin el OK de la persona.** Ni el código, ni la configuración, ni la
  publicación.
- **Nunca instales nada sin preguntar.** Si Lighthouse no está descargado, di qué es y
  cuánto baja antes de correr `npx lighthouse`. El silencio no es un sí.
- **Nunca toques un botón que envíe, compre, llame, abra WhatsApp o navegue a otra
  página.** El toque de prueba es solo para cosas que abren y cierran en la misma página.
- **No mandes la página a servicios de fuera** (la API de PageSpeed, por ejemplo) sin
  preguntar: el plugin tiene apagado el envío de datos a Google a propósito.
- **`NO MEDIDO` no es `MAL`.** Lo que no se pudo medir se dice, con su motivo.
- Una medición a la vez: las tres cargas van una tras otra, nunca en paralelo, porque
  comparten la computadora y se frenarían entre sí. Tampoco compiles ni abras otra pestaña
  mientras corre una carga o Lighthouse: Lighthouse con `devtools` también cronometra.
- **Cuida el contexto de quien te usa.** No vuelques trazas, JSON completos ni el HTML al
  chat; los scripts ya resumen.
- Este skill usa `forbidden-numbers.md` de `landing-audit`, en este mismo plugin. Si esa
  ruta no resuelve, el plugin está incompleto: dilo.

## Verificación antes de entregar

- [ ] Se midió un link publicado, no localhost.
- [ ] Hubo tres cargas válidas (pestaña al frente) o el reporte dice por qué no.
- [ ] El reporte dice qué método se usó, qué celular se simuló y que el procesador se
      frenó pero la tarjeta de video no.
- [ ] Están los seis bloques de `reporte.md`, completos y en el chat.
- [ ] Cada tiempo trae mediana y rango; cada hallazgo se repitió en al menos dos cargas.
- [ ] Solo aparecen los tres umbrales oficiales, y ninguna cifra de `forbidden-numbers.md`.
- [ ] Si hubo canvas que dibuja sin parar, o la página truena, se corrió la prueba sin
      tarjeta de video, o se dice por qué no.
- [ ] Lo que ya está bien tiene su bloque; en una página rápida no se inventaron problemas.
- [ ] La tabla de costo-beneficio está ordenada de más mejora con menos riesgo a menos.
- [ ] Con carpeta, cada problema dice su archivo; sin carpeta, se avisó que con ella se
      diría más.
- [ ] No se cambió nada, y las pestañas que abriste quedaron cerradas.

## Qué leer y cuándo

| Lee esto… | …cuando |
|---|---|
| `references/medicion.md` | Siempre, antes de abrir la página: los pasos exactos de cada carga. |
| `references/sin-chrome-devtools.md` | La herramienta no está o el navegador está ocupado. |
| `references/cuando-truena.md` | No termina de cargar, PageSpeed falla, se queda trabajando o tiene 3D. |
| `references/carpeta.md` | Estás en la carpeta del proyecto: qué archivo causa cada cosa. |
| `references/arreglos.md` | Al armar la tabla de costo-beneficio. |
| `references/reporte.md` | Al escribir el reporte: plantilla, escala y ejemplos. |
| `landing-audit/references/forbidden-numbers.md` | Antes de que salga cualquier cifra. Siempre. |
