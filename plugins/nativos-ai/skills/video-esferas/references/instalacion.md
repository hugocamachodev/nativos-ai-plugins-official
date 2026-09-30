# Preparar la computadora

Lo único que hay que instalar a mano es **Node.js**. Lo demás (Three.js, GSAP, Playwright y
un FFmpeg ya compilado) llega con `npm install` dentro de la carpeta del proyecto, y el
navegador puede ser el Google Chrome que ya tenga el usuario.

Antes de instalar algo, di qué es, para qué sirve y cuánto pesa. No cambies ajustes de
seguridad del sistema (políticas de ejecución, permisos): si hace falta, que lo haga el
usuario con tus instrucciones.

## 1. Node.js (18 o más; recomendado la versión LTS)

Revisa con `node -v`.

| Sistema | Instalar |
|---|---|
| macOS | Con Homebrew (`brew -v` responde): `brew install node`. Sin Homebrew: el instalador LTS de https://nodejs.org (doble clic, siguiente, siguiente). |
| Windows | `winget install OpenJS.NodeJS.LTS`, o el instalador de https://nodejs.org. Después, **cierra y abre la terminal** para que aparezca `node`. |
| Linux | nvm (https://github.com/nvm-sh/nvm): `nvm install --lts`. El paquete de la distribución suele ser viejo. |

## 2. El proyecto y sus librerías

```bash
SKILL="${CLAUDE_PLUGIN_ROOT}/skills/video-esferas"
cp -R "$SKILL/assets/template/." .
npm install          # ~90 MB: three, gsap, postprocessing, n8ao, playwright-core, ffmpeg-static
node scripts/doctor.mjs
```

`doctor.mjs` dice qué falta y cómo arreglarlo. Todo queda dentro de la carpeta del
proyecto: borrarla lo desinstala.

## 3. Navegador

El render abre un navegador invisible con aceleración gráfica y le toma una foto a cada
cuadro. Usa Google Chrome si está instalado; si no:

```bash
npx playwright-core install chromium                # ~150 MB, macOS y Windows
npx playwright-core install --with-deps chromium    # Linux (instala también las librerías del sistema)
```

## 4. Tarjeta gráfica

`doctor.mjs` muestra qué usa WebGL. En Mac con chip M, «ANGLE Metal Renderer: Apple M…» es
lo ideal. Si dice **SwiftShader**, **llvmpipe** o «software», no hay aceleración: funciona,
pero cada cuadro tarda 5–20× más. En ese caso: actualiza los drivers, renderiza las pruebas
con `--ss=1`, baja el número de esferas y reserva `--ss=2` para el final.

Flags por sistema (ya vienen en `render.cjs`): Mac `--use-angle=metal`, Windows
`--use-angle=d3d11`, Linux `--use-angle=vulkan`.

## 5. Espacio en disco

- Proyecto con librerías: ~90 MB (+150 MB si se descarga Chromium).
- Video final a 60 fps y `--crf 16`: ~450 MB por minuto (máxima calidad). Para compartir
  por mensajería, `--crf=22` pesa ~2× menos y casi no se nota.
- Las carpetas `review/` (hojas y fotos) crecen con cada ronda; se pueden borrar al final.

## Windows

- Claude Code en Windows usa Git Bash: los comandos de este skill funcionan tal cual. Pasa
  opciones como `--fmt=wide`, no como variables de entorno.
- Si PowerShell bloquea `npm` («la ejecución de scripts está deshabilitada»), usa Git Bash
  o `cmd`; no cambies la política de ejecución por el usuario.

## Errores comunes

| Síntoma | Causa y arreglo |
|---|---|
| `node: command not found` | Node no está instalado o la terminal se abrió antes de instalarlo: instálalo y abre una terminal nueva |
| `Cannot find module 'three'` (o gsap, playwright-core) | Falta `npm install` en la carpeta del proyecto |
| «No encuentro Chrome» | `npx playwright-core install chromium` |
| La hoja de contactos sale negra | Error de JavaScript en la escena: el render lo imprime como `[pageerror]`; corrige y repite |
| Letras con otra tipografía o mal medidas | La fuente Inter viene de Google Fonts: sin internet cae a otra. Conéctate o copia Inter en `index.html` como archivo local |
| Render muy lento | WebGL por software (ver arriba) o demasiadas esferas: `bench` por escena y recorta |
| El render se corta a los 10 minutos | La herramienta que lo lanzó tiene límite de tiempo: usa `nohup node render.cjs video … > render.log 2>&1 &` y vigila el log |
| Video sin sonido | Es a propósito: la música se agrega en la app (ver `entrega.md`) |
