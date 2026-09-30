# Probar video-esferas

## 1. La plantilla (rápido, objetivo)

```bash
bash tests/video-esferas/probar.sh plantilla
```

Copia la plantilla a una carpeta temporal, instala las dependencias, corre `doctor.mjs`,
arranca el reel y la versión horizontal, saca hojas de contactos de `planeta` y de la intro
vertical, renderiza 3 s de cada formato y comprueba que salgan 180 cuadros. Tarda menos de un minuto
en una Mac con chip M, más la descarga de ~90 MB la primera vez. Borra la carpeta al
terminar (`KEEP=1` la conserva). Si falla en otra máquina, lo primero es `doctor.mjs`.

## 2. Un corto completo con la skill (subagente autónomo)

Prompt para el agente, con la skill cargada y una carpeta vacía de destino:

> Quiero un video corto de «2001: Odisea del espacio» hecho de esferas, estilo el de
> Interstellar: el monolito, la nave Discovery girando y el ojo rojo de HAL. Formato reel
> vertical con «gira tu teléfono», unos 30 segundos, textos en español. Solo una frase:
> «LO SIENTO, DAVE.»

Instrucciones extra para el agente: no hay humano, así que declara los supuestos de la
entrevista en `SCRIPT.md` y sigue; dependencias solo dentro del proyecto; render final con
`--ss=1` para que la prueba sea rápida.

Verificar:

```bash
bash tests/video-esferas/probar.sh <carpeta-del-proyecto-generado>
```

Comprueba que haya guion y biblia sin marcadores, que cada escena de `ORDER` exista, que la
película arranque, que no haya `Math.random`, que existan hojas de revisión y que el video
final sea de 60 fps, sin audio y con los cuadros completos. Lo que un script no mide y hay
que mirar en la hoja de `verificar.mjs`: que todo sean esferas, que la frase se lea y que
las escenas se fundan unas en otras sin cortes a negro.
