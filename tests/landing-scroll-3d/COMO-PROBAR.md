# Probar landing-scroll-3d

No hay fixture: la prueba es construir una landing entera con la skill y revisar el
resultado. Se hace con un subagente en modo autónomo (sin usuario que responda la
entrevista) para que sea repetible.

## Caso 1 · casco orbital (modelo de muestra, ficción)

Prompt para el agente (con la skill cargada y una carpeta vacía de destino):

> Quiero una página como la del Porsche 930 pero para un casco de astronauta de ficción
> llamado "Casco Orbital MK-II". Tono: estación espacial oscura, acento cian, fuente
> futurista pero no cliché. Textos en español. No tengo modelo 3D: usa alguno de muestra
> gratuito que se parezca y ponle sus créditos. Es un experimento para grabar un reel, solo
> escritorio. Inventa la historia del casco (es ficción, no hace falta investigar), con
> cifras y una cita de un personaje ficticio, y deja luces que se enciendan si el modelo lo
> permite.

Instrucciones extra para el agente: no hay humano, así que declara los supuestos de la
entrevista en un `INFORME.md` y sigue; usa DamagedHelmet de Khronos (CC BY 4.0); dependencias
solo en el proyecto; levanta Vite en un puerto libre y captura con `scripts/capture.cjs`;
mata servidor y navegadores al terminar.

## Verificar el proyecto generado

```bash
bash tests/landing-scroll-3d/probar.sh <carpeta-del-proyecto-generado>
```

Comprueba que compila, que el modelo pesa menos de 10 MB, que no queda texto de la demo ni
del Porsche, que hay créditos con licencia, que el acento ya no es el amarillo de la plantilla
y que existen al menos ocho capturas. Lo que no comprueba un script y hay que mirar con los
ojos: que el título no tape el objeto en ninguna captura y que el callout toque la pieza.
