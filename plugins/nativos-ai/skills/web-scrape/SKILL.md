---
name: web-scrape
description: >
  This skill should be used when the user wants to extract the complete content of an existing
  website in order to redesign it — "scrapea este sitio", "clona el contenido de esta página",
  "saca las fotos y los textos de este dominio", "mapea toda la web de este negocio",
  "quiero rediseñar esta página, tráeme todo". Crawls every page inside a single domain with
  Playwright and produces a human-readable dossier: real downloaded images (not screenshots),
  text organized by section, forms with their fields, navigation with submenus, contact channels,
  current visual identity and SEO. The output is designed to be handed to a later session as the
  input for "ahora hazme esto bonito".
---

> **Rutas:** `${CLAUDE_PLUGIN_ROOT}` apunta a la carpeta del plugin instalado. Si sale
> vacía, los scripts están en `scripts/`, junto a este SKILL.md — usa esa ruta y sigue.


# Web scrape para rediseño

Saca **todo** el contenido de un sitio para poder reconstruirlo: las fotos reales del cliente, sus textos, sus formularios y sus canales de contacto.

## Cómo se ejecuta

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/web-scrape/scripts/crawl.mjs <url> [--max-pages N] [--out DIR]
```

- `--max-pages` — tope de páginas **únicas** (default 60). Los duplicados por contenido no gastan cupo. Si el crawl se corta por el tope, sale un aviso y se puede subir: el costo es tiempo de script, no de modelo.
- `--out` — directorio de salida (default `./scrape-<dominio>`).

Corre headless: no abre ninguna ventana. Tarda ~9s por página, así que entre 3 y 15 minutos según el sitio; es normal, no lo mates.

**Cómo correrlo — un comando de Bash y ya:**

- **Primer uso: instala las dependencias tú, sin preguntarle nada al usuario.** Si no existe
  `${CLAUDE_PLUGIN_ROOT}/skills/web-scrape/scripts/node_modules`, corre esto una sola vez y
  sigue adelante — tarda un par de minutos y no vuelve a pasar:
  ```bash
  cd ${CLAUDE_PLUGIN_ROOT}/skills/web-scrape/scripts && npm install && npx playwright install chromium
  ```
  Los navegadores de Playwright viven en `~/Library/Caches/ms-playwright`, fuera del plugin, por
  eso hacen falta los dos comandos. No le pidas al usuario que abra una terminal ni le expliques qué es npm.
- **Lánzalo con `timeout: 600000`** (el máximo de Bash). Un sitio grande puede pasarse de ahí: entonces relánzalo con `run_in_background: true` y lee su salida **una sola vez**, cuando el harness te avise que terminó.
- **No hagas polling.** Nada de `> output.txt` + leerlo cada rato, ni `sleep` + `tail`. Eso es lo que dispara el gasto de herramientas, no el backgrounding.
- **No crees el directorio de salida.** El script hace `mkdir -p` de `--out` él solo.
- **No verifiques la salida con `ls` / `find`.** El script imprime el conteo de páginas e imágenes y la ruta del entregable: ese conteo *es* el reporte.

Dos llamadas a Bash como mucho. Si llevas más, estás haciendo trabajo que el script ya hizo.

## Cómo descubre las rutas

Por orden de prioridad. El tope de `--max-pages` se gasta de arriba hacia abajo:

1. **`sitemap.xml`** (y los que liste `robots.txt`) — si existe, es la fuente autoritativa y actual.
2. **Links internos** — siempre: BFS siguiendo cada `<a href>` del mismo dominio. Es el sitio vivo, así que va antes que el histórico.
3. **Wayback Machine** — solo si *no* hay sitemap, y solo con el cupo que sobre después de agotar 1 y 2. Pide al archivo web todas las URLs históricas del dominio, descarta infraestructura (`/_api/`, `/wp-json/`) y comprueba cuáles siguen vivas con un GET antes de crawlearlas. Las muertas se descartan y se reportan.

El orden importa: el Wayback puede aportar decenas de rutas archivadas y, si compitieran de tú a tú con los links del sitio, se comerían el cupo y el dossier saldría lleno de páginas viejas en vez del contenido actual. Por eso son relleno de cola, no semilla.

Las rutas que vienen del histórico salen marcadas como `wayback` en `sitemap.md`, porque son las que más conviene verificar.

### La misma página servida por varias URLs

Es lo normal en PHP y en casi cualquier CMS: la misma tienda vive en `microsites2.php?id=35` y en `microsites2/35/cornercenter`, el home en `/` y en `/index.php`. A nivel HTTP son URLs distintas, y muchos sitios no declaran `<link rel="canonical">`, así que no hay forma de saberlo por la URL.

El crawler lo resuelve **por contenido**: hashea el mapa de secciones de cada página y, si ya vio ese contenido exacto, no la vuelve a escribir — la anota como alias en `sitemap.md` y **no la cuenta contra el tope**.

Lo que importa: el criterio es contenido idéntico, no plantilla parecida. Dos tiendas distintas bajo la misma plantilla (`?id=35` y `?id=36`) tienen secciones distintas, así que **se conservan las dos**. Solo se descarta lo que de verdad es la misma página por otra puerta.

## Regla de costo (importante)

El script hace todo el trabajo de forma determinista y **genera los markdown él solo**. Tu trabajo es correrlo y reportar.

- **No leas `data/site.json` al contexto.** Es el dump crudo, pesa, y no aporta nada que no esté en los `.md`. Solo ábrelo si el usuario pide un dato puntual que no aparece en el markdown.
- **No re-redactes los entregables.** `REDISENO.md`, `sitemap.md` y `paginas/*.md` ya salen escritos.
- Lo único que necesitas leer es el resumen que el script imprime en stdout.

## Qué reportar al terminar

El resumen de stdout (páginas, imágenes, secciones por página) y la lista de avisos. Nada más. Si hubo errores en alguna página, dilos.

## Limitaciones que se declaran siempre

1. **Se interactúa un poco, pero no se navega el sitio como un humano.** Antes de extraer, el crawler dispara `mouseover` sobre los `<li>` del menú (revela submenús construidos en JS) y pulsa hasta 4 lanzadores de chat/WhatsApp que no sean enlaces (revela el `wa.me` que el widget inyecta al abrirse). Lo que sigue sin verse: cualquier cosa dentro de un **iframe de terceros** (muchos chats viven ahí), popups con retardo largo, y contenido que exija scroll a un punto concreto o rellenar algo. Cuando el reporte diga "no se encontró WhatsApp", ahora distingue si es que no había ningún lanzador que pulsar o si se pulsaron y aun así no apareció — pero sigue sin ser prueba de que el cliente no lo tenga. Verificar a mano antes de decírselo.

2. **Textos e imágenes de una sección no están pareados.** Van en orden de documento, pero en una rejilla de personas o productos el texto N no necesariamente corresponde a la imagen N. Para asignar una bio a una foto, verificar contra el screenshot.

3. **Los subdominios se tratan como externos.** `sameDomain` solo quita el `www.`, así que si el contenido vive en `blog.dominio.com` o `tienda.dominio.com` se salta en silencio. Si el sitio tiene subdominios con contenido, hay que crawlearlos por separado pasando ese subdominio como URL semilla.

## Qué genera

```
scrape-<dominio>/
├── REDISENO.md      ← punto de entrada: resumen, contacto, identidad visual, SEO, avisos
├── sitemap.md        ← tabla de rutas + menú con submenús
├── paginas/NN-slug.md  ← plano por página: secciones en orden, con su texto y sus imágenes
├── imagenes/          ← fotos reales, nombradas <pagina>-<NN>-<descripción>.jpg
├── screenshots/        ← una captura full-page por ruta, de referencia
└── data/site.json       ← crudo, para máquina
```

El mapa de secciones es la fuente canónica del contenido. El campo `textoCrudoFallback` del JSON incluye nav y footer y diverge a propósito: no se usa para reconstruir.
