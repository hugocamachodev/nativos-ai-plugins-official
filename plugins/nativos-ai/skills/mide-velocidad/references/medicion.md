# Cómo se mide, carga por carga

Son tres cargas de la misma página, una tras otra. Cada una pasa unos 20 s leyendo la
página, y entre llamadas y respuestas se va a uno o dos minutos. La primera, además, graba
la traza de rendimiento de Chrome y prueba un toque.

Antes de empezar, lee con Read `${CLAUDE_PLUGIN_ROOT}/skills/mide-velocidad/scripts/medidor.js`.
Va completo, tal cual, en el `initScript` de cada navegación: cuenta desde antes de que
cargue la página y deja lista la lectura. Después, la lectura es una sola línea:
`() => window.__mideVelocidadLeer()`. Así la lectura arranca en cuanto termina de cargar, y
todas las cargas se leen en el mismo punto (a los 15 s, más 5 s mirando si descansa).

`sourcePath` y `filePath` no sirven para esto: la herramienta solo abre archivos de la
carpeta del proyecto, y el plugin vive en otra.

## Una carga, paso a paso

Los nombres son de las herramientas de chrome-devtools. N es el número de carga (1, 2 o 3).

1. `new_page` con `url: "about:blank"` e `isolatedContext` con un nombre que **nunca** se
   haya usado: `mide-velocidad-<hora con segundos>-N`, por ejemplo
   `mide-velocidad-172950-1`. Un contexto nuevo es un navegador sin caché ni cookies: la
   carga es en frío, como la de alguien que entra por primera vez. Si repites un nombre
   (de otra medición o de otra sesión), Chrome reusa su caché y los pesos salen en cero.
   **Al frente: nunca `background: true`.** Una pestaña de fondo frena sus cuadros y sus
   timers, y mide otra cosa.
2. `emulate` con el `pageId` de esa pestaña, todo en una sola llamada (cada llamada borra
   la anterior):
   - `viewport: "412x823x1.75,mobile,touch"`: la pantalla de un celular Android común.
   - `networkConditions: "Slow 4G"`
   - `cpuThrottlingRate: 4`
3. Solo en la carga 1: `performance_start_trace` con `reload: false` y `autoStop: false`.
   Así la traza graba la carga que viene.
4. `navigate_page` con `type: "url"`, la `url`, `timeout: 100000` e
   `initScript: <todo medidor.js>`.
   - Si la navegación se vence a los 100 s, eso ya es un hallazgo: la página no terminó de
     cargar. Sigue con el paso 5 de todos modos y luego ve a `cuando-truena.md`.
5. **De inmediato**, `evaluate_script` con `function: "() => window.__mideVelocidadLeer()"`
   y `waitForStableDom: false`. Tarda unos 20 s (más si hay una pantalla de carga) y
   devuelve el JSON. Si estás en la carpeta del proyecto, `filePath` guarda el JSON en un
   archivo sin pasarlo por el chat (fuera de esa carpeta la herramienta no puede escribir).
6. Solo en la carga 1:
   - `performance_stop_trace`. Te da la lista de "insights" de Chrome con sus ahorros
     estimados. Usa el insight set de la navegación (`NAVIGATION_…`), no el de
     `about:blank`. El resumen y la mayoría de los insights ya dan los tiempos desde la
     navegación; algunos (`CLSCulprits`) los dan desde que empezó a grabar. Si un tiempo de
     la traza no cuadra con lo medido, es eso.
   - `performance_analyze_insight` para `LCPBreakdown` siempre, y para `RenderBlocking`,
     `ImageDelivery`, `NetworkDependencyTree`, `ThirdParties`, `FontDisplay` y
     `DocumentLatency` si aparecen, traigan ahorro o no: `NetworkDependencyTree` da la
     cadena de carga y `ThirdParties` el peso de los archivos de otros dominios, que la
     página no deja medir. `CLSCulprits` solo si `saltos` pasa de 0.01. Los demás no.
   - `list_console_messages` con `types: ["error"]`: los errores rojos de la consola.
   - El toque de prueba (abajo).
7. `close_page` de esa pestaña.

Si `corridaValida` sale `false`, `motivoInvalida` dice por qué: la pestaña no estuvo al
frente toda la carga (la ventana se tapó o se minimizó), o archivos del mismo dominio
vinieron de la caché (el nombre del contexto ya se había usado). Esa carga no cuenta:
repítela con un nombre nuevo. Si falla tres veces, mide de todos modos y dilo en el reporte.

Tres herramientas que conviene no usar así:
- `take_snapshot` y `performance_start_trace` no aceptan `filePath` fuera de la carpeta del
  proyecto: sin carpeta, sus resultados llegan al chat. Tómalos una sola vez.
- `get_network_request` sin `responseFilePath` vuelca el archivo entero al contexto. Para
  pesos y tiempos no hace falta: ya vienen en la lectura.
- `list_network_requests` da la lista de archivos con su estado, pero no su peso.

## El toque de prueba (solo en la carga 1)

La respuesta al tocar (INP) solo se puede medir tocando. Hazlo **solo** si la página tiene
algo que abre y cierra en el mismo lugar, o que no sale de la página:
- una pregunta frecuente desplegable (`details`/`summary`, o un botón con `aria-expanded`);
- una pestaña (`role="tab"`);
- un botón de menú;
- el botón "Entrar" o "Iniciar" de una pantalla de carga.

**Nunca** un botón que envíe un formulario, compre, llame, abra WhatsApp, un correo o un
mapa, ni un enlace que lleve a otra página. Si no hay nada seguro, la respuesta al tocar va
como no medida, con ese motivo.

1. `evaluate_script` (prepara el contador; solo guarda eventos que son parte de un toque o
   una tecla, con `interactionId`, no los de pasar el puntero por encima):
   ```js
   () => {
     window.__toques = [];
     new PerformanceObserver((l) => {
       for (const e of l.getEntries()) if (e.interactionId) window.__toques.push({
         toque: e.interactionId, tipo: e.name, ms: Math.round(e.duration),
         espera: Math.round(e.processingStart - e.startTime),
         proceso: Math.round(e.processingEnd - e.processingStart),
         pintar: Math.round(e.startTime + e.duration - e.processingEnd),
       });
     }).observe({ type: 'event', durationThreshold: 16 });
     return 'listo';
   }
   ```
2. `take_snapshot` para encontrar el `uid` del elemento seguro, y `click` con ese `uid`.
   El árbol es largo (en algunas páginas, miles de tokens): búscalo con la vista, no lo
   copies al reporte. Ahí los desplegables (`details`/`summary`) salen como
   `DisclosureTriangleGrouped` con `expandable`, y los botones que abren algo traen
   `expandable` o `expanded`. Si el primero ya está abierto, toca otro cerrado.
3. `evaluate_script`:
   ```js
   async () => {
     await new Promise((r) => setTimeout(r, 1000));
     return (window.__toques || []).sort((a, b) => b.ms - a.ms).slice(0, 4);
   }
   ```
   La respuesta al tocar es el `ms` más alto de ese toque (`pointerdown`, `pointerup` o
   `click`). Si sale vacío, fue menor de 16 ms. `espera` alto quiere decir que el toque
   llegó mientras la página estaba ocupada en otra cosa.

Es un toque, en laboratorio, con el procesador frenado y **con la página ya quieta**:
dilo así en el reporte, junto al umbral de 200 ms. Google mide INP con visitas reales, y
esas también tocan mientras la página carga. Si hubo congelones al cargar, agrega que un
toque en ese momento tendría que esperar a que termine el congelón (hasta `peorMs`).

## Qué sale de la lectura

| Campo | Qué es |
|---|---|
| `url`, `pantalla` | La dirección que se leyó y el tamaño de pantalla con su densidad (`412x823 dpr 1.75`): si no sale así, el `emulate` no quedó puesto. |
| `corridaValida`, `motivoInvalida` | `false`: la carga no vale (pestaña oculta o caché). Repítela. |
| `dibujaCon` | Con qué dibuja el 3D este navegador. Si no nombra una tarjeta de video de verdad (dice SwiftShader, llvmpipe o "sin webgl"), esta medición no tuvo tarjeta: dilo. |
| `leidaA` | A los cuántos ms se leyó. Si pasa mucho de 20 000, una pantalla de carga hizo esperar. |
| `noTerminoDeCargar` | `true`: a los 60 s la página todavía no terminaba de cargar. |
| `htmlInicial` | Lo que manda el servidor antes de que corra el código: cuánto pesa y cuánto texto trae el `<body>`. Con 0 caracteres (o solo unos pocos), la página llega vacía y todo lo pinta el código: esa es la causa de una pantalla vacía larga, y se puede decir aunque no haya carpeta. |
| `tiempos.respuestaServidor` | Cuánto tardó el servidor en empezar a responder (ms). |
| `tiempos.primerTexto` | Cuándo apareció algo en la pantalla (FCP). Antes de eso, pantalla vacía. |
| `tiempos.principal` y `principalEs` | Cuándo apareció lo más grande de la primera pantalla (LCP), y qué es. Si `principalEs` sale `null`, sácalo del insight `LCPBreakdown`. |
| `tiempos.principalAnimacion` | Si lo principal (o algo que lo contiene) entra con una animación o una transición, y cuánto dura con su retraso. Si lo principal es un texto y llega más de unas 3 décimas después del primer texto, compara esa diferencia con estos `ms`: si cuadran, la animación de entrada es la causa. Para comprobarlo, una carga más, en un contexto aislado con nombre nuevo, con el mismo `emulate` de siempre (viewport, `networkConditions`, `cpuThrottlingRate`) y además `prefersReducedMotion: "reduce"` (si la página la respeta, lo principal sale antes). |
| `tiempos.primerDibujo3d` | Cuándo se dibujó el primer cuadro de un canvas 3D. LCP no cuenta los canvas: si la estrella de la página es 3D, este es su "cuándo aparece". `null` si no hay 3D. |
| `tiempos.eventoDeCarga` | El evento de carga del navegador. **No** es "terminó de bajar todo": lo que pide el código después no cuenta. No lo uses en el reporte. |
| `tiempos.ultimoArchivoTermina` | Cuándo terminó de bajar el último archivo, incluido lo que pidió el código. Esta es la fila «Termina de bajar todo». |
| `tiempos.quietaDesde` | El primer momento, después del primer texto, en que la página pasó 5 s seguidos sin tareas largas. Puede salir antes de un congelón tardío (una pantalla de carga que se congela a los 45 s): para la fila «deja de congelarse» usa siempre `tareasLargas.ultimaTermina`. `null` si nunca hubo 5 s quietos: eso sí es un hallazgo. |
| `pantallaDeCarga` | Si a los 15 s algo tapaba toda la pantalla (una pantalla de carga, un aviso), qué era y qué pasó (`seDestapa`): se quitó sola a los tantos ms, espera un clic en un botón que se puede tocar desde los tantos ms, o seguía a los 60 s (el tope del medidor, no un tiempo de la página). Con pantalla de carga, Chrome puede contar como «lo principal» algo que está debajo y nadie ve: dilo, no lo pongas de titular, y agrega la fila «Se puede usar». Si espera un clic, ese botón es buen candidato para el toque de prueba. |
| `saltos` | Cuánto se movió la página sola (CLS, sin contar lo que movió el usuario). |
| `tareasLargas` | Momentos en que la página no puede responder porque está ocupada. `bloqueoMs` es la suma de lo que pasó de 50 ms en cada una; `peorMs` el congelón más largo. `total` es cuántas hubo. Para la fila «Deja de congelarse»: si `enReposo.tareasLargas` es mayor que 0, escribe «nunca (seguía congelándose a los 20 s)»; si `total` es 0, «no se congela»; si no, `ultimaTermina`. |
| `enReposo` | Los 5 s después de leer (`ventanaMs`). `ocupadoPct` y `tareasLargas` dicen si sigue trabajando; `cadaCuadroP95Ms` cada cuánto sale un cuadro (un cuadro cada 16.7 ms es el ritmo de una pantalla de 60 Hz y 8.3 ms el de una de 120; mucho más arriba, la página se traba. Es un dato, no una meta: `cuadrosPorSeg` solo dice cuál es la pantalla); `dibujos3dPorSeg` cuánto dibuja el 3D aunque nadie toque nada, `cuadros3dPorSeg` cuántos cuadros del 3D salen y `dibujosPorCuadro` cuántas llamadas lleva cada uno (cientos quiere decir muchas piezas dibujadas una por una). `pedidosDeCuadroPorSeg` alto sin 3D y con 0 % ocupada es una animación o un scroll suave que pide cuadros: cuesta casi nada, no es hallazgo. |
| `archivosLentos` | Qué archivo y qué función se comieron el tiempo en los cuadros lentos, con su posición para `mapa-del-codigo.mjs`. |
| `peso` | Por tipo: `kb` es lo que bajó por la red (comprimido), `kbSinComprimir` lo que el teléfono tuvo que leer, `sinDato` cuántos de otro dominio no dejaron medir su peso. |
| `archivosSinDato` | Archivos de otro dominio que no dejan medir su peso desde la página. Su peso sale del insight `ThirdParties` de la traza (carga 1); si no lo tienes, di "más lo que no se pudo medir". |
| `archivosDeCache` | Archivos del mismo dominio que vinieron de la caché. Tiene que ser 0. |
| `masPesados` | Los 8 archivos más pesados, con cuándo empezaron y terminaron de bajar. |
| `terceros` | Dominios que no son el de la página, con cuántos archivos y de qué tipo. |
| `hojasCiegas` | Hojas de estilo de otros dominios cargadas sin CORS (Google Fonts, Fontshare, CDN de íconos). Chrome no deja ver lo que piden, así que sus fuentes e imágenes **no** están en `peso`, `terceros` ni `totalKb`. Si hay, el peso de terceros sale del insight `ThirdParties` (carga 1) y se suma al total del reporte, diciendo de dónde salió. |
| `fuentesUsadas` | Las fuentes que la página de verdad usó, con su grosor. La fila «Fuentes» del reporte cuenta de aquí, no de `peso.fuentes`: las de otros dominios a veces no tienen extensión o no se ven (ver `hojasCiegas`). |
| `resumenImagenes` | Todas las `<img>`: cuántas hay, cuántas bajaron, cuántas son perezosas, cuántas están lejos de la primera pantalla sin ser perezosas, cuántas sobran 2 veces o más y cuántas no traen medidas. |
| `imagenesConSobra` | El nombre de cada imagen que sobra 2 veces o más, con cuánto sobra. |
| `imagenes` | Las 12 `<img>` más pesadas: peso, tamaño real del archivo que eligió el navegador, tamaño en pantalla, `sobra` (cuántas veces más grande de lo que hace falta, ya contando la pantalla nítida del celular), a cuántos px de arriba está, si es `lazy`, si trae varias versiones (`conSrcset`) y si trae medidas. `cargada: false` es una perezosa que todavía no bajó: está bien. |
| `imagenesSinEtiqueta` | Imágenes que bajaron y no están como `<img>` a la hora de leer: fondos de CSS, portadas de video, lo que pone el código, o `<img>` que un carrusel ya quitó. Ojo con la del encabezado: suele estar aquí. |
| `videos`, `canvas` | Lo mismo para videos y lienzos. De un video no se sabe cuándo aparece: di solo dónde está y si baja al cargar. |
| `elementos` | Cuántos elementos tiene la página. Solo importa si pasa de varios miles y la página se traba al bajar. |

Lo que la lectura no ve: archivos que pide un *worker* (algunos visores 3D bajan así sus
fuentes y modelos). Si Lighthouse o la traza enseñan archivos que no están en `peso`, dilo.

## Cómo se juntan las tres cargas

- Cada tiempo, peso y conteo: la **mediana** de las tres y el **rango** (el menor y el
  mayor). La carga 1 lleva la traza grabando y suele salir un poco más lenta: por eso se
  usa la mediana. Si una carga se fue muy lejos de las otras dos (el doble o más), dilo: algo
  pasó en esa (la red, la computadora).
- Un hallazgo cuenta si aparece en **al menos dos de las tres**. Uno que sale en una sola
  va, si acaso, como "en una de las tres cargas…".
- Los insights de la traza son de la carga 1. Un hallazgo que sale de un insight cuenta si
  algo de la lectura de las tres cargas lo respalda (los mismos terceros, la misma imagen,
  la misma cadena). Dilo cuando cites uno.
- **Los ahorros que estiman Chrome y Lighthouse son un tope, no una promesa.** Se calculan
  como si se pudiera quitar todo lo que frena, y a veces no se puede (la hoja de estilos de
  la propia página, por ejemplo). Antes de citar uno, compáralo con lo medido: si promete
  ahorrar más que el tiempo que quiere mejorar, descártalo. Si lo que frena es una lista de
  archivos y uno no se puede quitar (la hoja de estilos de la propia página), el ahorro
  real es como mucho lo que pasa entre que ese archivo llega y el primer pintado. Si dos
  herramientas estiman distinto, razona con los tiempos medidos y di de dónde sale tu cifra.
- Los KB salen de dividir entre 1024; para pasar a MB, divide otra vez entre 1024
  (1,781 KB son 1.7 MB).
- El peso casi no cambia entre cargas. Si cambia mucho, la página baja cosas distintas
  cada vez (anuncios, un video que empieza o no): eso también es un hallazgo.
