# Variante sin modelo 3D: secuencia de imágenes controlada por scroll

Cuando no hay un modelo 3D decente pero sí un vídeo del objeto (un giro de 360 grados, un plano de producto, un render de IA) se puede conseguir un efecto casi idéntico con la técnica de Apple: cientos de fotogramas dibujados en un `<canvas>` según el progreso del scroll. Todo lo demás de la plantilla (secciones, HUD, tipografía, preloader) se mantiene.

## Cuándo elegirla

- No existe modelo y generarlo con IA no da la calidad necesaria.
- El usuario tiene un vídeo limpio del producto sobre fondo neutro o puede generarlo con una herramienta de vídeo por IA (pide un giro lento y continuo, fondo negro, sin cortes).
- Hace falta fotorrealismo total.

Lo que se pierde: cambiar colores, encender luces, mover piezas y el paralaje con el ratón. Lo que se gana: cero problemas de materiales y rendimiento.

## Preparar los fotogramas

Extrae entre 120 y 240 fotogramas WebP de 1440 px de ancho. Con ffmpeg instalado (o el binario `ffmpeg` que trae la caché de Playwright, que no decodifica `.mov` de macOS; en ese caso convierte primero con QuickTime o usa AVFoundation vía un script Swift):

```bash
mkdir -p public/frames
ffmpeg -i producto.mp4 -vf "fps=30,scale=1440:-1" -c:v libwebp -quality 80 public/frames/f-%04d.webp
```

Apunta a menos de 25 MB en total. Si pesa más, baja a 1280 px o a 24 fps.

## Componente

Sustituye el `<Canvas>` de R3F en `App.tsx` por este componente dentro de `.canvas-wrap`. Mantiene el mismo contrato: lee `rig.progress`, que la timeline maestra actualiza.

```tsx
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { rig } from './rig'

const COUNT = 180 // número de fotogramas
const src = (i: number) => `/frames/f-${String(i + 1).padStart(4, '0')}.webp`

export function FrameSequence() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!, ctx = canvas.getContext('2d')!
    const imgs: HTMLImageElement[] = []
    let loaded = 0
    for (let i = 0; i < COUNT; i++) { const im = new Image(); im.src = src(i); im.onload = () => { loaded++ }; imgs.push(im) }
    const fit = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio }
    fit(); addEventListener('resize', fit)
    let shown = -1
    const draw = () => {
      const i = Math.min(COUNT - 1, Math.round(rig.progress * (COUNT - 1)))
      if (i === shown || !imgs[i].complete) return
      shown = i
      const im = imgs[i], s = Math.max(canvas.width / im.width, canvas.height / im.height)
      const w = im.width * s, h = im.height * s
      ctx.drawImage(im, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
    }
    gsap.ticker.add(draw)
    return () => { gsap.ticker.remove(draw); removeEventListener('resize', fit) }
  }, [])
  return <canvas ref={ref} style={{ display: 'block', width: '100vw', height: '100vh' }} />
}
```

Ajustes necesarios en la plantilla:

- Quita `Scene.tsx`, `Model.tsx`, `config.MODEL` y las dependencias de Three si no se usan (o déjalas: no molestan).
- El preloader usa `useProgress` de drei, que no cuenta imágenes. Sustitúyelo por un contador propio de `loaded / COUNT`.
- Las banderas `lights`, `rear`, `flash`, `streaks`, `callout`, `swatches` no hacen nada en esta variante. Deja `note`, `quote`, `specs`, `credits`.
- Las "tomas" ya no existen: el ritmo lo marca el vídeo. Diseña el vídeo pensando en las secciones (qué se ve en el 10 %, 30 %, 60 %…) y coloca los textos en el lado libre de cada tramo.

## Vídeo con `<video>` en vez de fotogramas

Hacer `video.currentTime = progress * duration` funciona, pero el *seeking* da tirones en casi todos los navegadores. Solo es aceptable con vídeos codificados con keyframe en cada fotograma (`-g 1`) y aun así se nota. Prefiere fotogramas.
