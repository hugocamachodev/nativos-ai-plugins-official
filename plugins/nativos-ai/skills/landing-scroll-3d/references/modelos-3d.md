# Conseguir, licenciar y preparar el objeto 3D

El objeto es el 80 % del "wow". Un modelo bonito con materiales PBR bien nombrados hace que todo lo demás funcione; uno malo no se arregla con luces. Dedica tiempo a esta fase.

## Dónde conseguirlo (de mejor a peor)

1. **El usuario ya tiene uno.** Pide el archivo (GLB/glTF ideal; FBX/OBJ se convierten en Blender exportando a GLB). Pregunta de dónde salió para saber la licencia.
2. **Sketchfab** (sketchfab.com, filtro *Downloadable* y filtro de licencia). Hay miles de coches, relojes, zapatillas, cámaras, motos. Requiere cuenta para descargar, así que **pídele al usuario que lo descargue** y que elija el *GLB convertido con texturas 1k o 2k*, no el original de 100 MB. Guarda el texto de créditos que Sketchfab muestra en el diálogo de descarga: es la atribución exacta que hay que poner en la página.
3. **Muestras oficiales de Khronos** (URL directa, sin cuenta). Perfectas como placeholder para tener la página funcionando en cinco minutos o para una demo. Descarga con `curl -L -o public/models/src.glb <url>`:
   - ToyCar (5,4 MB, CC BY 4.0): `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb`
   - DamagedHelmet (3,8 MB, CC BY 4.0): `.../Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb`
   - SheenChair (4,1 MB, CC BY 4.0): `.../Models/SheenChair/glTF-Binary/SheenChair.glb`
   - Lantern (9,6 MB, CC0): `.../Models/Lantern/glTF-Binary/Lantern.glb`
   - BoomBox (10,6 MB, CC0), WaterBottle (9 MB, CC0): mismo patrón de URL.
   Confirma la licencia en el `README.md` de la carpeta del modelo antes de publicar.
4. **Poly Haven** (polyhaven.com/models, CC0), **Kenney** y **Quaternius** (CC0, low-poly): buenos para objetos genéricos.
5. **Generar con IA** (Meshy, Tripo, Hunyuan3D, Rodin): sirve cuando el objeto no existe en ningún sitio. La calidad es irregular; revisa que exporte GLB con texturas PBR y pide al usuario que valide el resultado antes de invertir en la coreografía.

Nunca uses modelos extraídos de videojuegos ni de sitios que no indiquen licencia.

## Licencias: qué significa cada sigla

- **CC0**: libre, sin atribución. Ideal.
- **CC BY**: libre con atribución obligatoria. Pon los créditos en la página.
- **CC BY-NC**: solo uso no comercial. Vale para experimentos, reels y portfolios; no para una landing que venda algo.
- **CC BY-NC-SA**: además, si modificas el modelo, debes compartirlo con la misma licencia. Una página que solo lo muestra no es un "derivado" que redistribuyas, pero avisa al usuario.
- **CC BY-ND**: no se puede modificar el modelo (cambiar colores en tiempo real es discutible; evita el selector de color).

Guarda siempre el texto exacto de créditos en `SITE.credits` de `src/config.ts` y activa `credits: true` en la última sección. Si el usuario da un texto literal de créditos, úsalo tal cual.

## Preparar el archivo

1. **Guarda el original** fuera de `public/` (por ejemplo en `assets-src/`) para no servir 90 MB.
2. **Comprime** con el script de la skill; deja el resultado en `public/models/model.glb`:
   ```bash
   bash "${CLAUDE_PLUGIN_ROOT}/skills/landing-scroll-3d/scripts/compress-model.sh" assets-src/original.glb public/models/model.glb 2048
   ```
   Usa meshopt (el decodificador viene incluido en drei, sin descargas externas) y texturas WebP a 2048 px. Los flags `--join false --flatten false --palette false` conservan nombres de materiales y jerarquía, que hacen falta para el selector de color, las luces y las ruedas. Objetivo: menos de 10 MB. Si sigue pesando, baja a 1024 px de textura.
3. **Inspecciona** materiales, texturas y nodos para rellenar `MODEL` en `src/config.ts` (funciona con el original y con el comprimido):
   ```bash
   npm i -D @gltf-transform/cli   # una vez por proyecto (trae core y extensions)
   cp "${CLAUDE_PLUGIN_ROOT}/skills/landing-scroll-3d/scripts/inspect-model.mjs" scripts/ && node scripts/inspect-model.mjs public/models/model.glb
   ```
   Busca en la lista: el material de la carrocería o cuerpo principal (para `paint`), cristales (`glass`), cromados o llantas (`shiny`), lámparas o LEDs (`lights`), lentes transparentes delante de lámparas (`lens`), llanta y neumático (`wheels`), y algún colgante (`hanging`). Si nada encaja, deja las listas vacías: la página funciona igual, solo sin esos extras.
4. **Orientación y tamaño.** `Model.tsx` escala el objeto a `MODEL.length` unidades a lo largo de Z y lo apoya en Y = 0. Las tomas de la demo asumen un objeto de unas 4,4 unidades de largo, más ancho que alto. Para objetos verticales (una botella, una lámpara) baja `length` a 1,5–2 y acerca las tomas, o gira el modelo en Blender para que su eje largo sea Z. Comprueba con una captura que el frente mira hacia la cámara del hero; si no, cambia `front` a `'z-'`.
5. **Posiciones de callouts, focos y resplandor** van en unidades normalizadas (el objeto centrado en el origen). Estímalas a partir del tamaño (ancho ≈ largo × proporción) y afínalas con capturas: el punto amarillo del callout debe tocar la pieza.

## Sin modelo 3D

Si no hay modelo aceptable y el usuario tiene fotos o vídeo del producto, usa la variante de secuencia de imágenes: lee `sin-modelo-video.md`.
