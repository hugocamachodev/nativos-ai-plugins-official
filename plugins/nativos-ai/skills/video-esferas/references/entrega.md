# Entregar y publicar

## Render final

```bash
node render.cjs video final-reel.mp4 --fmt=reel --ss=2         # Instagram Reels, TikTok
node render.cjs video final-horizontal.mp4 --fmt=wide --ss=2   # YouTube, Facebook
node scripts/verificar.mjs final-reel.mp4
```

- 60 fps, H.264, `--crf 16` (máxima calidad, ~450 MB por minuto). Para mandarlo por
  mensajería, `--crf=22`.
- Más de 10 min de render: `nohup node render.cjs video … > render.log 2>&1 &` y vigila
  `render.log`.
- `verificar.mjs`: comprueba formato, número de cuadros (duración × 60), que no haya audio y
  que los tramos negros sean los que buscaste; mira su hoja de 12 cuadros.
- Entrega una sola versión final por formato. Más de 30 MB no se puede mandar al teléfono
  por mensajería: dile que lo pase con AirDrop, la nube o un cable.

## Música (la pone el usuario, en la app)

- **Agrégala desde la biblioteca de la app, no dentro del archivo.** Instagram y TikTok
  reconocen música con derechos incrustada y silencian o bajan el video, a veces meses
  después. Desde la biblioteca, además, el video aparece en la página de esa canción.
- Cuenta de **Creador** en Instagram y **Personal** en TikTok: las cuentas de empresa solo
  tienen la biblioteca comercial, donde casi nunca están las bandas sonoras de películas.
- Duración: TikTok recorta la música con licencia a **60 s**; Instagram permite **90 s por
  canción**, y un reel puede llevar varias pistas seguidas. Para un corto de 2+ minutos:
  dos pistas en Instagram, o un corte de ≤ 60 s para TikTok. Revísalo en la app, porque
  los límites cambian.
- YouTube: una banda sonora con derechos casi siempre recibe un reclamo de Content ID. El
  video suele quedarse arriba, pero la monetización va para el dueño de la música.
- Diseña pensando en la música: movimientos que respiran, golpes en los momentos clave, sin
  cambios nerviosos.

## Qué versión en cada red

- Instagram y TikTok: la **vertical**. Llena la pantalla justo cuando la gente decide si se
  queda, y la intro enseña a girar el teléfono.
- YouTube y Facebook: la **horizontal**.

## Texto y hashtags (si el usuario lo pide)

Reglas verificadas en septiembre de 2026; confírmalas si pasó tiempo.

- **Instagram: máximo 5 hashtags por publicación o reel** (anuncio oficial de diciembre de
  2025). Van al final del texto. La búsqueda lee el texto, así que las palabras clave van
  en la primera línea (≈ 125 caracteres).
- **TikTok: 3–5 hashtags.** La búsqueda lee sobre todo la primera línea y el texto en
  pantalla. `#fyp` o `#viral` no ayudan y ocupan un lugar.
- **Primera línea: el resultado, con un número**, no «hecho con IA». Ejemplo: «9,800 líneas
  de código y yo no escribí ni una: Interstellar, hecho solo de esferas.»
- Cierra con una **pregunta** («¿qué escena reconociste primero?»): las preguntas en el
  texto generan bastantes más comentarios.
- Hashtags: mezcla el tema (película o historia, en su idioma y en inglés), la herramienta
  (`#ClaudeCode`), la técnica (`#CreativeCoding`, `#ThreeJS`) y el público
  (`#InteligenciaArtificial`, `#Programacion`).
- **No lo etiquetes como video generado** (`#AIVideo`, `#AIGenerated`, `#AIArt`, `#Sora`):
  es animación programada, y esos hashtags atraen críticas de «basura de IA». Evita
  hashtags ambiguos (`#Claude` se mezcla con otras cosas).
- La etiqueta de «contenido generado por IA» de TikTok aplica a escenas realistas; una
  animación estilizada hecha con código no parece entrar (interpretación de las guías de
  2026, no una regla confirmada).
