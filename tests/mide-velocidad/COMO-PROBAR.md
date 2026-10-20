# Probar mide-velocidad

No hay fixture: la skill mide páginas publicadas, así que la prueba es correrla con un
subagente contra páginas reales que ya sabemos cómo son, y revisar el reporte. Cada corrida
tarda de 10 a 20 minutos. Van **una tras otra**, nunca en paralelo: comparten la
computadora y el Chrome de la herramienta, y se frenarían entre sí.

Instrucciones para el agente, iguales en todos los casos:
- La skill está en `plugins/nativos-ai/skills/mide-velocidad/` y `${CLAUDE_PLUGIN_ROOT}` es
  `plugins/nativos-ai` de este repo (si el plugin instalado es más viejo, no la trae).
- No hay humano: lo que la skill mande preguntar va a las notas, y sigue con lo prudente.
- Entrega el reporte completo tal como lo daría en el chat, y aparte unas notas con todo lo
  que tuvo que improvisar o le confundió.

## Los casos

| Caso | Prompt | Carpeta | Qué tiene que salir |
|---|---|---|---|
| Lenta con 3D | "Mide qué tan rápido carga mi página en un celular: <kilowatty en la etiqueta `kilowatty-lenta`, publicada en un Worker de prueba>. PageSpeed no la pudo medir: 'Target closed' y 'DEADLINE_EXCEEDED'." | con y sin la carpeta del sitio | Pantalla vacía de ~5.6 s porque todo espera a un JS de 530 KB; congelones al arrancar; ~460 llamadas de dibujo por cuadro sin parar; imágenes grandes que bajan al cargar. Bloque 5: sin tarjeta de video Lighthouse no termina y con tarjeta sí (causa comprobada; que PageSpeed mida sin tarjeta, solo "lo más probable"). Con carpeta: `index.html`, `main.tsx`, `Maqueta.tsx` y las tres secciones de las imágenes. |
| Lenta, ya arreglada | Lo mismo, contra la rama `kilowatty-rapida` publicada | con la carpeta | Lo principal en ~1.7 s, la casa dibujando y Lighthouse sin tarjeta de video que ya termina. No debe inventar lo que ya se arregló. |
| A medias | "mide qué tan rápido carga mi página en un celular: https://nativosia.com" | sin carpeta | Lo principal arriba de 2.5 s por hojas de estilo, íconos y letras de otros servidores y una animación de entrada. El peso de terceros sale del insight `ThirdParties`, no en cero. Bloque 5: "no aplica". |
| Rápida | "¿qué está frenando mi página? https://lozano-aldape.hugo-nativosia.workers.dev" | sin carpeta | Dice en la primera línea del bloque 1 que va bien. No convierte en hallazgo lo que ya cumple. Lo único real: fotos lejos de la primera pantalla que bajan al cargar y la última termina a los ~10 s. |
| Pantalla de carga | "revisa la velocidad de mi landing en el celular: https://scroll-car.hugocamachodev.workers.dev" | con `Demos/Scroll-Car` | Detecta la pantalla de carga (`pantallaDeCarga`) y dice que «lo principal» de Google es esa pantalla; reporta cuándo se puede usar la página y el modelo 3D de varios MB. |
| Localhost | "mide mi página: http://localhost:5173" | cualquiera | No mide, y explica por qué con el texto del paso 0. |

## Qué revisar en cada reporte

- Los seis bloques, en orden y completos, en el chat (nada de "ver archivo").
- "Qué medí" dice el método, el celular simulado, las tres cargas en frío y que la tarjeta
  de video no se frenó.
- Cada tiempo con mediana y rango; los hallazgos repetidos en al menos dos cargas.
- Solo los tres umbrales oficiales (2.5 s, 0.1 y 200 ms) y ninguna cifra de
  `landing-audit/references/forbidden-numbers.md`.
- La respuesta al tocar sale de un toque de verdad (con `interactionId`) en algo seguro, o
  dice que no se midió.
- La tabla de costo-beneficio ordenada de más mejora con menos riesgo a menos, con "Ya",
  "Después" y "No".
- Con carpeta, cada hallazgo con su archivo; sin carpeta, el aviso de que con ella diría más.
- En las notas: cargas válidas (`corridaValida`, `archivosDeCache: 0`) y nada cambiado en
  el proyecto (`git status` igual antes y después).
