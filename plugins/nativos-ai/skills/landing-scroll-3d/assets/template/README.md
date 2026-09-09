# {{TITULO}} — experimento scroll 3D

Landing scroll-driven: un objeto 3D en el centro que gira, hace zoom y cambia de toma mientras haces scroll. React Three Fiber + GSAP ScrollTrigger + Lenis.

```bash
npm install
npm run dev
```

Abre http://localhost:5173, espera el 100 % y pulsa **Iniciar**. Recarga antes de grabar: las luces se disparan una sola vez por carga. Pensado para escritorio; no está optimizado para móvil.

Qué pasa mientras haces scroll: la cámara cambia de toma por sección, el objeto gira 360 grados con estelas y zoom, las luces hacen ráfagas y se encienden, las cifras cuentan, el velocímetro del HUD marca la velocidad de scroll y al final puedes cambiar el color. Al llegar abajo del todo, todas las luces parpadean.

- `src/config.ts` — textos fijos del sitio, créditos y qué materiales del modelo hacen qué.
- `src/choreo.ts` — secciones, textos, tomas de cámara y timeline de scroll.
- `src/Scene.tsx` — luces, suelo reflectante, postprocesado, estelas, callouts y texto fantasma 3D.
- `src/Model.tsx` — carga del modelo, materiales, pintura, luces y ruedas.
- `public/models/model.glb` — modelo comprimido.

Si va a tirones: en `src/App.tsx` baja `dpr` a `[1, 1]` o en `src/Scene.tsx` reduce `resolution` del suelo a 512.

Modelo 3D: {{CREDITOS}}
