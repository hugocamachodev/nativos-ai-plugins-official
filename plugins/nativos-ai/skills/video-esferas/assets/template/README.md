# Video de esferas

Un corto donde todo está hecho de esferas 3D, programado con Three.js y GSAP y renderizado
cuadro a cuadro a MP4. Creado con el skill `video-esferas` de Nativos AI para Claude Code.

## Comandos

```bash
npm install                                      # una vez
node scripts/doctor.mjs                          # ¿está lista la computadora?
node render.cjs serve                            # vista previa en el navegador (botón ▶)
node render.cjs sheet 0:9:0.75 review/hoja.jpg --scene=planeta   # hoja de contactos de una escena
node render.cjs video prueba.mp4 --fmt=reel      # video de prueba rápido
node render.cjs video final-reel.mp4 --fmt=reel --ss=2         # final vertical (Instagram, TikTok)
node render.cjs video final-horizontal.mp4 --fmt=wide --ss=2   # final horizontal (YouTube, Facebook)
node scripts/verificar.mjs final-reel.mp4        # revisar el video terminado
```

## Dónde está cada cosa

- `SCRIPT.md`: el guion. `LOOK.md`: la guía de estilo.
- `scenes/`: una escena por archivo, con sus textos y colores en el bloque `CONFIG` de arriba.
- `main.js`: el orden de las escenas (`ORDER`).
- `core/`: el motor (esferas, luces, desenfoque, fundidos). `render.cjs`: fotos y video.

El video sale sin audio: la música se agrega en la app donde se publica, para que no la
silencien por derechos de autor.
