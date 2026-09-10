# Dirección visual

La plantilla trae un "estudio oscuro" con acento amarillo porque nació para un Porsche amarillo. **Adáptala al objeto del usuario**: un reloj de lujo pide otra paleta que una zapatilla de running. Cambia estas cuatro cosas y la página deja de parecer la del coche.

## 1. Paleta

Los colores viven en `:root` de `src/styles.css`:

- `--bg` fondo de página y color de niebla. Mantén el `color` de `<color attach="background">` y de `<fog>` en `Scene.tsx` iguales a este valor.
- `--fg` texto principal (hueso, no blanco puro).
- El acento se define una sola vez en `SITE.accent` (`src/config.ts`): alimenta la variable CSS `--accent` (HUD, eyebrows, callouts) y, en `Scene.tsx`, el anillo de luz del entorno, las partículas, el texto fantasma y las estelas. Cámbialo ahí y ya.
- El suelo: `color` de `MeshReflectorMaterial` (#151515 por defecto). Más claro = más reflejo y más luz de foco visible.

Pistas por objeto: metálico o lujo → acento dorado o champán sobre negro azulado; deportivo → acento saturado (rojo, lima, cian) sobre negro; producto tecnológico → gris frío, acento blanco, suelo más claro; vintage → sepia, acento naranja quemado. Si dudas, saca el acento del propio color del objeto y subes o bajas su saturación.

## 2. Tipografía

Se usan dos fuentes variables locales vía Fontsource (sin red):

- Display: **Anybody** (`@fontsource-variable/anybody/wdth.css`), con eje de ancho 50–150 %. El estiramiento del título con el scroll depende de ese eje. Alternativas con eje `wdth` en Fontsource: Tourney (motorsport), Bricolage Grotesque (editorial), Sofia Sans, Roboto Flex, Big Shoulders (condensada, deportiva), Anybody Italic para algo más racing.
- Datos: **Martian Mono** (`@fontsource-variable/martian-mono/wdth.css`). Alternativas: Azeret Mono, JetBrains Mono, IBM Plex Mono.

Para cambiar: `npm i @fontsource-variable/<fuente>`, cambia el import en `src/main.tsx` y `--display` / `--mono` en `styles.css`. Si la nueva display no tiene eje `wdth`, quita las líneas `font-stretch` y el tween `fontStretch` de `choreo.ts`.

El texto fantasma en 3D usa troika, que no lee woff2: necesita un `.woff` o `.ttf` estático. El de Anybody 900 está en `public/fonts`. Para otra fuente, saca el `.woff` del paquete estático `@fontsource/<fuente>` (`npm pack`) y cambia `font=` en `Ghost3D` de `Scene.tsx`.

Fuentes que gritan "plantilla de IA" y conviene evitar salvo que el usuario las pida: Inter, Space Grotesk, Instrument Serif, Playfair Display.

## 3. Luz de estudio

`Environment` con `Lightformer` en `Scene.tsx`: siete tiras de techo, dos laterales, un anillo de color acento y un panel cenital. Es la luz de un plató de coches. Para otros objetos:

- Objeto pequeño y brillante (reloj, joya): menos tiras, más cerca (`position` y `scale` a la mitad), anillo más intenso.
- Objeto mate (zapatilla, textil): sube `intensity` de las tiras a 3 y añade un `Lightformer` frontal suave.
- Ambiente cálido: color `#ffe3b0` en las tiras; frío: `#cfe4ff`.

`ContactShadows` y el suelo reflectante se quedan siempre: son lo que "pega" el objeto al suelo.

## 4. HUD y textos fijos

Todo lo que no es una sección está en `SITE` (`src/config.ts`): marca, palabra del preloader, unidad del velocímetro (`km/h` para un coche, `rpm` para una moto, `bpm` para un reloj, `m/s` para una zapatilla…), etiqueta de carga, créditos. No dejes ningún texto del Porsche.

## Coherencia

Antes de dar por buena la dirección visual, captura el hero y una sección de texto y compáralas con la referencia que dio el usuario. Un solo acento, dos fuentes, un tono de luz. Si algo compite con el objeto, quítalo.
