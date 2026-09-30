# video-esferas — diseño

Fecha: 2026-09-30
Estado: implementado, plantilla probada de punta a punta
Repo: `nativos-ai-plugins-official`

## Qué es

Un skill que produce un cortometraje cinematográfico donde todo lo visible está hecho de
esferas 3D brillantes, programado con Three.js y GSAP y renderizado cuadro a cuadro a un MP4
de 60 fps: reel vertical que abre pidiendo girar el teléfono, y versión horizontal. Nació de
«Interstellar en esferas» (2:20, 14 escenas, 33 agentes, cinco rondas con el cliente) y se
generalizó en plantilla, reglas y proceso.

**Para quién:** la comunidad de Nativos AI; gente que vio el video en Facebook y quiere el
suyo, sin saber programar ni tener Node instalado. En español.

**Criterio de éxito:** que el corto se disfrute a su ritmo (escenas de 7–9 s, texto
legible), que todo sean esferas con detalle de reloj en macro y que las escenas se
conviertan unas en otras sin cortes a negro.

## Qué NO es

- No genera video con modelos de IA de video: programa cada esfera.
- No es `landing-scroll-3d`: no es una página web; el resultado es un MP4.
- No pone música: se agrega en la app de publicación por derechos de autor.

## Decisiones

| Decisión | Por qué |
|---|---|
| Plantilla completa con el motor de la producción (`assets/template`) | El motor (esferas instanciadas, fundidos, render determinista) costó días; reescribirlo en cada sesión es lento y frágil. |
| `ffmpeg-static` y `playwright-core` como dependencias del proyecto | El usuario solo instala Node; FFmpeg llega con `npm install` y el navegador puede ser su Chrome o el Chromium de Playwright. |
| `scripts/doctor.mjs` | Diagnostica Node, librerías, FFmpeg, navegador y tarjeta gráfica y da el comando de arreglo por sistema. |
| Opciones `--clave=valor` en `render.cjs` | Las variables de entorno en línea no funcionan igual en Windows. |
| Reglas de ritmo con números y video de prueba temprano | El cliente aprobó las fotos y rechazó el primer video por rápido: el ritmo no se ve en fotos. |
| `lecciones.md` con el porqué de cada corrección | Cinco rondas de feedback real; con el porqué se decide bien en casos nuevos. |
| Entrevista destilada, no invocada (una pregunta por mensaje) | `superpowers` es un plugin ajeno; el patrón cabe en diez líneas, igual que en `landing-scroll-3d`. |
| Producción multiagente opcional y documentada | Para cortos largos ahorra horas; cuesta más tokens y el usuario decide. |
| `prompt-maestro.md` | La comunidad pidió «el prompt»: una versión copiable para quien no tiene el plugin. |

## Estructura

```
plugins/nativos-ai/skills/video-esferas/
├── SKILL.md                     entorno → entrevista → guion → look-dev → producción → ritmo → render → entrega
├── references/
│   ├── instalacion.md           Node, Chrome, FFmpeg, GPU por sistema; errores de entorno
│   ├── motor.md                 contrato de escena, API del motor, patrones, herramientas
│   ├── direccion.md             medio, color, cámara, texto, fundidos, zonas seguras
│   ├── lecciones.md             las cinco rondas de Interstellar convertidas en reglas
│   ├── produccion-multiagente.md encargos, dueños, revisión del director, costos reales
│   ├── entrega.md               render final, verificación, música, texto y hashtags
│   ├── ejemplo-interstellar.md  guion aprobado y su evolución
│   └── prompt-maestro.md        versión copiable para quien no tiene el plugin
└── assets/
    ├── referencia-interstellar.jpg  12 cuadros del resultado: el nivel de detalle
    └── template/                proyecto listo: motor, render, 4 escenas de ejemplo, guion, biblia,
                                 scripts/doctor.mjs y scripts/verificar.mjs
```

## Cómo se probó

`tests/video-esferas/COMO-PROBAR.md`: `probar.sh plantilla` copia la plantilla a una carpeta
temporal, instala, corre `doctor.mjs`, arranca los dos formatos, saca hojas de contactos y
renderiza 3 s de cada formato comprobando los 180 cuadros. Un caso autónomo («2001: Odisea
del espacio» en 30 s) para correr con un subagente, y `probar.sh <proyecto>` para verificar
lo que genere.
