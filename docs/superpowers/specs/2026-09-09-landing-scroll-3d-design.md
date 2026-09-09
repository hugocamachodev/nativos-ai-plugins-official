# landing-scroll-3d — diseño

Fecha: 2026-09-09
Estado: implementado, probado con un caso autónomo
Repo: `nativos-ai-plugins-official`

## Qué es

Un skill que construye una landing experimental scroll-driven: un objeto 3D fijo en el
centro que gira, hace zoom y cambia de toma de cámara con el scroll, con tipografía
gigante animada, HUD, luces, preloader, cifras, selector de color y créditos. Nació de la
landing del Porsche 911 Turbo (930) de 1975 hecha en directo y se generalizó en plantilla.

**Para quién:** la comunidad de Nativos AI. Gente que quiere un "wow" para un reel o un
portfolio, en escritorio, sin saber qué es un GLB. En español.

**Criterio de éxito:** que al hacer scroll todo se mueva alrededor del objeto sin que el
texto lo tape, y que el objeto tenga licencia y créditos correctos.

## Qué NO es

- No es `landing-build`: no hace landings comerciales con secciones y formulario.
- No es un editor 3D: no modela ni separa piezas; si el modelo no trae puertas, no se abren.
- No es para móvil: el suelo reflectante y el postprocesado son de escritorio.

## Decisiones

| Decisión | Por qué |
|---|---|
| Plantilla completa dentro del plugin (`assets/template`) | Lo que no viaja en el plugin no existe en la máquina del usuario. Reconstruir 800 líneas de R3F + GSAP en cada sesión es lento y frágil. |
| Un objeto mutable (`rig.ts`) como puente GSAP → R3F | Evita estado de React en el bucle de render; una sola timeline con `scrub` mueve cámara, giro y fov. |
| Materiales por nombre en `config.ts` | Cada modelo nombra distinto sus piezas; con listas vacías todo sigue funcionando, solo sin extras. |
| Muestras de Khronos con URL directa como placeholder | Sketchfab exige cuenta; con una muestra la página anda en cinco minutos y luego se cambia el modelo. |
| Verificación con capturas headless "mejor de tres" | El render por software da frames negros sueltos; sin verlo no se detecta texto encima del objeto. |
| Patrón de brainstorming destilado, no invocado | `superpowers` es un plugin ajeno; el patrón cabe en diez líneas. |
| Sin shadow maps ni ruido animado | Provocaban parpadeo del suelo en la landing original. |

## Estructura

```
plugins/nativos-ai/skills/landing-scroll-3d/
├── SKILL.md                 entrevista → objeto → historia → proyecto → verificación → entrega
├── references/
│   ├── modelos-3d.md        dónde conseguir, licencias, comprimir, inspeccionar
│   ├── coreografia.md       tomas, textos, extras por sección, duraciones
│   ├── direccion-visual.md  paleta, fuentes, luz, HUD
│   ├── sin-modelo-video.md  variante de fotogramas controlados por scroll
│   └── errores-conocidos.md diagnóstico de render, luces, scroll y captura
├── scripts/
│   ├── compress-model.sh    gltf-transform meshopt + WebP conservando materiales
│   ├── inspect-model.mjs    lista materiales, texturas y nodos
│   └── capture.cjs          capturas por posición de scroll con Playwright
└── assets/template/         proyecto Vite + R3F + GSAP + Lenis listo para copiar
```

## Cómo se probó

`tests/landing-scroll-3d/COMO-PROBAR.md`: un caso autónomo (casco de astronauta ficticio
con el modelo de muestra DamagedHelmet) ejecutado por un subagente con la skill, y un
`probar.sh` que verifica sobre el proyecto generado que compila, que el modelo pesa
menos de 10 MB, que no queda texto de la demo, que hay créditos y que existen capturas.
