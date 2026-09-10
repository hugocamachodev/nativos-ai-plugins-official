# Errores conocidos y cómo evitarlos

Todos estos aparecieron construyendo la primera landing con esta plantilla. La plantilla ya los evita; esta lista existe para que no los reintroduzcas al modificarla y para diagnosticar rápido.

## Render y escena

- **Parpadeo del suelo bajo el objeto.** Z-fighting entre `ContactShadows` y el suelo `MeshReflectorMaterial` cuando están a la misma altura. Mantén la sombra en y = 0,02 y el suelo en y = -0,01.
- **Moiré o acné en el suelo.** Sombras de foco (`castShadow`) sobre un plano enorme. La plantilla no usa shadow maps: `ContactShadows` ya ancla el objeto y el entorno da el volumen. No actives `shadows` en el `Canvas`.
- **"El suelo parpadea" aunque no haya z-fighting.** El efecto `Noise` animado sobre negro se percibe como parpadeo. No lo añadas.
- **Tirones.** `dpr` 2 con MSAA y suelo reflectante duplica el trabajo por píxel. Usa `dpr={[1, 1.5]}`; si sigue, baja `resolution` del suelo a 512 o quita `multisampling`.
- **Nada se ve / todo negro al cargar.** Un error dentro de `useFrame` mata el bucle de R3F. Causa típica: leer `ref.current.style` de un `<Html>` de drei antes de que exista. Comprueba `if (!ref.current) return`.
- **Recursos que dependen de internet.** `Environment preset="..."` descarga un HDRI de un CDN y el decodificador Draco también viene de un CDN. La plantilla usa `Lightformer` y compresión meshopt para funcionar sin red.
- **El objeto aparece de lado o de espaldas.** El frente no es +Z. Cambia `MODEL.front` a `'z-'` o rota el modelo en Blender. Si el eje largo no es Z, `length` normaliza mal: rótalo.
- **Cáscara oscura sobre la pintura.** Algunos modelos traen una malla duplicada transparente para el barniz (`coat`). Ocúltala en `MODEL.hide`.
- **Cristales negros.** Materiales de vidrio con metalness 1. Añádelos a `MODEL.glass`.

## Luces del modelo

- Las lámparas comparten un solo material; clónalo por malla para separar delante y detrás por su Z. La plantilla lo hace con `MODEL.lights`. Si el material ya trae mapa emisivo propio (LEDs, pantallas), se respeta; solo se usa el mapa de color como emisivo cuando no hay otro. Un modelo de una sola malla cuenta entero como "delantero".
- Las lentes de faro suelen ser otro material con `transmission`; con postprocesado es caro e inestable. La plantilla pone `transmission: 0`, opacidad y emisión propia (`MODEL.lens`).
- No añadas discos o sprites luminosos "detrás" del faro: es imposible centrarlos a ojo y se ven dobles. Emisión en la lente más un `spotLight` real es suficiente.
- Los conos de luz volumétricos con geometría aditiva se ven como cuñas planas. No los uses; un foco real que ilumine el suelo se lee mejor.
- Las ráfagas deben **apagar** las luces entre destellos (`rig.blink` -1/1 con `gsap.set`), si no, con las luces ya encendidas no se ven.
- Los focos (`spotLight`) necesitan que su `target` se actualice en coordenadas de mundo cada frame; el objeto rota, así que `Lamps` usa `localToWorld`.

## Textos

- **Tildes que desaparecen en los títulos.** `SplitText` con `mask: 'words'` envuelve cada palabra en un `div` clonado con `overflow: clip` cuya caja mide lo que la línea (`line-height` 0,92 em en secciones, 0,82 em en el hero), y la tilde de una mayúscula sobresale hasta 0,13 em por encima de esa caja: se recorta, y «ÓRBITA» se ve «ORBITA» (en el hero desaparece del todo; en secciones queda una esquirla). Solo pasa en `.title` porque es el único texto con máscara. `choreo.ts` lo arregla dando aire a `split.masks` (`paddingTop: '0.24em'` y `marginTop: '-0.24em'`, que compensa el hueco para no mover la línea); nada sube por encima de su sitio final, así que el aire no destapa nada. Se hace sobre `split.masks` y no con una regla CSS porque SplitText solo pone clase a la máscara si las palabras la tienen (`wordsClass`): una regla sobre `.title .word-mask` se queda muerta sin avisar. Si cambias la fuente por otra con acentos más altos o bajas más el interlineado, sube ese valor. Además el texto se normaliza a NFC por si llega con acentos combinantes. En la revisión de capturas mira un título con tilde (Á, É, Í, Ó, Ú, Ñ): el fallo es silencioso. No renombres títulos para esquivarlo.

## Scroll y animación

- Un trigger de ScrollTrigger en `bottom bottom` puede no dispararse con scroll suavizado. Para "al llegar al final" usa `lenis.limit`, como hace `Hud` en `App.tsx`.
- `once: true` en los triggers de luces significa que hay que **recargar antes de grabar**.
- `StrictMode` duplica efectos y rompe timelines: `main.tsx` no lo usa.
- Con `scrub`, el texto se lee cuando la cámara está quieta al inicio del tramo; no pongas la transición a mitad de sección salvo en el giro (`mid`).
- `history.scrollRestoration = 'manual'` evita que una recarga empiece a mitad de página con el preloader tapando.
- `SplitText` con `mask` requiere GSAP 3.13 o superior; `lagSmoothing(0)` es obligatorio con Lenis.

## Verificación en headless

- El panel de navegador integrado deja de renderizar cuando está oculto: capturas negras. Usa el script `capture.cjs` o el navegador del usuario.
- Con render por software (SwiftShader) algunos frames del canvas salen negros de forma aleatoria y la página va a 2 o 3 fps. Por eso el script toma hasta tres capturas y se queda con la más pesada, y los `screenshot` llevan timeout de 150 s.
- El clic sintético de Playwright sobre el botón del preloader es interceptado; usa `element.click()` desde `page.evaluate`.
- No edites archivos mientras corre una captura: el HMR recarga la página y la captura falla.
- Las ráfagas no se pueden verificar en headless (los frames lentos colapsan la secuencia). Verifica la lógica de la timeline con GSAP en Node si hace falta y confía en el navegador real para el resto.
- Los procesos `chrome-headless-shell` huérfanos consumen CPU y calientan el Mac: `pkill -f chrome-headless-shell` al terminar.
