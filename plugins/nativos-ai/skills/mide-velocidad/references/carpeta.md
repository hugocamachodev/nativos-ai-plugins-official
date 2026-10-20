# Qué archivo causa cada cosa (cuando estás en la carpeta del proyecto)

Nada de esto cambia el proyecto. Solo se lee, y lo que se compile para medir va a una
carpeta temporal, nunca a `dist/`, `build/` ni `.next/`.

## 1 · ¿Es la carpeta de esa página?

No lo des por hecho: alguien puede pedirte medir otro sitio desde la carpeta de su
proyecto. Busca al menos una de estas pruebas:

- **Los mismos archivos.** Los nombres con huella de lo que bajó la página
  (`index-xFrKbF9T.js`, `casita-en-corte-DHw0FPFH.webp`) están en `dist/assets/` o en la
  carpeta que se publica. Si están, la carpeta compilada es exactamente lo que está en
  línea. La prueba más fuerte es la del paso 3: si compilas a una carpeta temporal y salen
  los mismos nombres, el código de hoy es el publicado (`dist/` puede ser viejo).
- **El dominio en el código.** `canonical` u `og:url` en `index.html` o en el layout, el
  `name` y las rutas del `wrangler.jsonc`, un `CNAME`, `vercel.json` o `netlify.toml`.
- **El mismo contenido.** El título y los textos de la primera pantalla.

Si el código coincide pero los nombres con huella no, la carpeta cambió desde la última
publicación. Dilo: lo que mediste es lo publicado, y el código puede ir adelante.

Si no es la carpeta de esa página, haz el reporte como si solo tuvieras el link y di en la
última línea: «La carpeta que tengo abierta no es la de esta página; con la carpeta correcta
te diría qué archivo causa cada cosa y podría hacer los arreglos.»

## 2 · Dónde vive cada problema

| Problema | Cómo lo encuentras |
|---|---|
| Una imagen pesada o más grande de lo que se ve | Quita la huella y la extensión del nombre (`casita-en-corte`) y búscalo: `grep -rn "casita-en-corte" src/ app/ components/ public/ index.html 2>/dev/null`. Sale el componente que la pone y el archivo original de la imagen. |
| Un video | Igual, por su nombre. Mira también si lleva `autoplay`, `preload` y `poster`. |
| La pantalla en blanco hasta que carga el código | `index.html` (o el layout) con un `<div id="root"></div>` vacío y todo dentro de un `<script type="module">`: la página entera la pinta el JavaScript. En Next o Astro, busca `"use client"` en el layout o la página de inicio. |
| El código pesado: qué librería pesa qué | Compila con mapa de fuentes a una carpeta temporal (abajo) y pásale el mapa a `mapa-del-codigo.mjs`. |
| Qué función se come el tiempo | Las `posicion` de `archivosLentos` en la lectura, traducidas con `mapa-del-codigo.mjs --posiciones`. Te dice el archivo y la línea original. Suele caer en la entrada de una librería (el ciclo de React, el reloj de GSAP, el ciclo de three.js); eso ya dice quién manda a trabajar. |
| Un 3D que dibuja sin parar | Busca cómo arranca el ciclo: `grep -rnE "setAnimationLoop|requestAnimationFrame|frameloop|useFrame|gsap.ticker|advance\(" src/`. En React Three Fiber, el `<Canvas>` sin `frameloop="demand"` dibuja siempre; y un `frameloop="never"` también dibuja siempre si un reloj propio llama a `advance()` en cada cuadro. |
| Las fuentes | `@fontsource` importado en el `main`, un `<link>` a Google Fonts en `index.html`, o `@font-face` en el CSS. Cuenta cuántos pesos y familias se cargan. |
| El CSS que frena el primer pintado | Los `<link rel="stylesheet">` de `index.html` y los `import "./algo.css"` del `main`. |
| Terceros (analítica, chats, píxeles) | `grep -rn "<script" index.html` y el layout. **Ojo:** hay terceros que no están en el código porque los mete el hosting. Cloudflare Web Analytics, por ejemplo, lo inyecta Cloudflare si está prendido en su panel. Si el script aparece en la página y no en el código, dilo así. |
| La caché de los archivos | `_headers` (Cloudflare, Netlify), `vercel.json`, `netlify.toml` o la configuración del servidor. |

## 3 · Compilar con mapa de fuentes, sin tocar el proyecto

Solo si el proyecto ya tiene sus dependencias (`node_modules`). Si no las tiene, pregunta
antes de instalar: se descarga y tarda, y el silencio no es un sí.

Vite (y lo que usa Vite por dentro):

```bash
b=/tmp/mide-velocidad/build-$(date +%Y%m%d-%H%M%S)   # carpeta nueva: --emptyOutDir vacía la que le des
npx vite build --sourcemap --outDir "$b" --emptyOutDir
ls "$b"/assets/*.js
node "${CLAUDE_PLUGIN_ROOT}/skills/mide-velocidad/scripts/mapa-del-codigo.mjs" \
  --map "$b"/assets/<archivo>.js.map \
  --js "$b"/assets/<archivo>.js \
  --posiciones <las posiciones de archivosLentos, separadas por comas>
```

- Si el nombre con huella del archivo compilado es igual al que bajó la página, las
  posiciones de `archivosLentos` coinciden. Si no, el código cambió desde que se publicó y
  las posiciones no sirven: usa solo el peso por librería.
- Una posición `-1` o `0` en `archivosLentos` no es un error: es el arranque del archivo
  entero (el navegador leyéndolo y ejecutándolo de una vez). Dilo así: "cargar y arrancar
  el archivo de código".
- El total de `mapa-del-codigo.mjs` sale un poco menor que `kbSinComprimir` de la
  medición: el mapa solo cuenta el código que sabe de dónde viene. Usa sus porcentajes,
  no su total.
- En proyectos de Vite con varias páginas (`rollupOptions.input`), los nombres coinciden
  igual.
- **Next.js:** `next build` escribe en `.next/` y eso cambia el proyecto: no lo corras sin
  el OK de la persona. Quédate con el peso de cada archivo que viste en la medición.
- **Astro:** `astro build` escribe en `dist/`: no compiles. Quédate con el peso de cada
  archivo que viste en la medición.
- Si la compilación falla, no la arregles: di que no pudiste compilar y sigue con lo que sí
  tienes.

## 4 · Cómo se cuenta en el reporte

Cada hallazgo del bloque 3 termina con su archivo, en una línea: "Está en
`src/ui/secciones/ComoFunciona.tsx:224`, que pone `casita-en-corte.webp`". Nada de pegar el
código; el archivo y la línea bastan.
