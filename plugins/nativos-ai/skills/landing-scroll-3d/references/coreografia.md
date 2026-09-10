# Coreografía de cámara y texto

## El modelo mental

Hay **una sola timeline de GSAP** ligada al scroll de toda la página con `scrub: 0.9`. Cada sección ocupa un tramo de duración `vh / 100`. La toma (`shot`) de una sección es el estado de cámara **cuando esa sección toca el borde superior de la ventana**, es decir, cuando su texto está centrado en pantalla. Entre una sección y la siguiente la cámara viaja con `power2.inOut`: quieta cuando el texto se lee, rápida en el traspaso, quieta otra vez al llegar. Ese es el patrón de Apple y es lo que hace que se lea aunque todo se mueva.

Sobre eso, `Scene.tsx` añade movimiento perpetuo: respiración de cámara, balanceo del objeto y paralaje con el ratón. Nada está nunca quieto del todo, que es lo que el usuario percibe como "dinámico".

Cada `shot` tiene cuatro valores:

- `pos` posición de la cámara.
- `look` punto al que mira. **Es el mando más útil**: subir `look.y` baja el objeto en pantalla; desplazar `look` hacia un lado mueve el objeto al lado contrario.
- `rot` giro del objeto sobre su eje vertical, en radianes y acumulativo. Para dar vueltas completas usa múltiplos de `TAU` y sigue sumando: `TAU + 0.35`, `TAU * 2`.
- `fov` 26–32 para tomas normales; 60–75 solo en el `mid` del giro para el efecto vértigo (la cámara se acerca a la vez que abre el ángulo).

## Repertorio de tomas (objeto de ~4,4 de largo en Z, frente en +Z)

| Intención | pos | look | fov |
|---|---|---|---|
| Hero 3/4 frontal, objeto abajo y grande | `[3.9, 1.05, 4.7]` | `[0, 0.95, 0.3]` | 32 |
| Perfil lateral con el objeto a la derecha | `[-8, 0.9, 1]` | `[0, 0.6, -0.9]` | 30 |
| Trasera 3/4 | `[2.4, 1.05, -5.4]` | `[0, 0.7, -1.3]` | 30 |
| Cenital trasera | `[-1.6, 2.5, -3.8]` | `[0, 0.85, -1.6]` | 28 |
| Primer plano frontal (objeto a la izquierda) | `[2.6, 0.8, 3.7]` | `[1.15, 0.7, 1.3]` | 26 |
| Primer plano lateral bajo | `[-3.1, 0.5, 2.4]` | `[-0.9, 0.36, 1.25]` | 26 |
| Giro 360 (sección de 200vh) | `[5.2, 0.55, 0.4]` → mid `[2.7, 0.5, 0.3]` con `rot: Math.PI`, fov 72 | `[0, 0.6, 0]` | 26 → 72 |
| Alta 3/4 para cifras (objeto a la derecha) | `[3.9, 3.1, 4.4]` | `[-0.8, 0.45, 0.7]` | 30 |
| Frontal de cierre, objeto arriba | `[0, 0.9, 8.4]` | `[0, -0.25, 0]` | 30 |

Para otros objetos, escala estas distancias con `MODEL.length / 4.4`. Mantén la cámara fuera del volumen del objeto: distancia mayor que medio ancho más 0,8.

## Que el texto no tape el objeto

Alterna `align` izquierda/derecha entre secciones y desplaza el objeto al lado libre con `look`. Regla práctica: si el texto va a la izquierda, mueve `look` unas 0,8 unidades hacia el lado de la pantalla donde está el texto; el objeto se va al otro lado. Verifica siempre con una captura: la geometría de la cámara engaña.

Otras defensas ya incluidas: el hero pone el título arriba y el objeto abajo; cada bloque de texto lleva un degradado oscuro detrás (`.copy::before`); los párrafos tienen un ancho máximo de 38 caracteres.

## Extras por sección

- `callout`: etiqueta anclada a un punto del objeto (coordenadas locales). Aparece al llegar y se va al 60 % de la sección. Una por sección como máximo.
- `lights`: al entrar, ráfaga y lámparas delanteras encendidas para siempre. `rear`: pilotos traseros. `flash`: solo ráfaga. Son disparos por tiempo con `once`, no dependen del scroll, así que hay que recargar la página para verlos otra vez.
- `streaks` + `mid`: estelas de velocidad y giro con vértigo. Reserva para una sola sección larga (200vh).
- `specs`, `swatches`, `credits`, `note`, `quote`: bloques de contenido que se activan por bandera.
- La ráfaga de todas las luces también se dispara sola al llegar al final de la página (`App.tsx`, detección por `lenis.limit`).

## Textos

- Eyebrow numerado (`01 · Origen`), título de 2 a 5 palabras en mayúsculas visuales, párrafo de 2 o 3 frases con un dato concreto. Los títulos se parten en letras y suben; el ancho de la fuente variable se estira con el scroll. Usa tildes con normalidad (la máscara de la animación lleva aire arriba para que no se recorten) y comprueba una en las capturas.
- Sin adjetivos huecos. Cada sección debe enseñar algo que el lector no sabía.
- Palabra fantasma (`ghost`) corta: 2 a 6 caracteres quedan grandes; palabras largas se reducen solas.

## Duraciones

- 10 secciones y unas 1200vh en total dan un scroll de unos 20 a 30 segundos en trackpad, ideal para un reel.
- `scrub: 0.9` y Lenis `lerp: 0.085` están ajustados entre sí. Si el usuario quiere más "látigo", baja ambos; si quiere más "mantequilla", súbelos.
- Intro: 2,6 s. Ráfaga: 0,56 s.

## Verificar

Las posiciones de captura son la suma de `vh / 100` de las secciones anteriores. Con la demo: hero 0, luego 1.0, 2.2, 3.4, 4.6, 5.7, 6.8 (mitad del giro 7.8), 8.8, 10.0 y 11.2. Captura todas, mira cada una y corrige `look` o `pos` donde el texto pise el objeto. Dos o tres rondas son normales.
