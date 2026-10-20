# Los arreglos: beneficio y riesgo

Esta tabla es el punto de partida, no el veredicto. Cada calificación se ajusta con lo que
mediste: una imagen pesada en la primera pantalla se nota mucho más que la misma imagen
hasta abajo; un arreglo "fácil" deja de serlo si el proyecto no tiene a quién se lo haga.

## La escala

**Cuánto lo nota el visitante**
- **Alto:** se ve en la primera pantalla (pantalla en blanco, lo principal tarda), o la
  página se congela y no responde al tocar.
- **Medio:** se nota al bajar por la página, en celulares lentos o con mala señal, o
  gasta datos de más.
- **Bajo:** solo lo ven las herramientas, o se gana menos de medio segundo.

**Dificultad y riesgo**
- **Bajo:** un cambio chico y la página se ve igual.
- **Medio:** cambia cómo arranca la página o cómo se reparte el código; se ve igual si se
  hace bien, pero hay que revisarla en celular y en computadora después.
- **Alto:** cambia lo que se ve (calidad, animación, diseño) o puede romper algo que hoy
  funciona.

**Recomiendo**
- **Ya:** beneficio alto o medio con riesgo bajo, o beneficio alto con riesgo medio.
- **Después:** vale la pena, pero cuando lo de "ya" esté hecho y medido.
- **No:** el riesgo o el trabajo pesan más que lo que se gana. Dilo con su motivo: también
  es una recomendación.

La tabla del reporte se ordena así: primero los "Ya" de más beneficio y menos riesgo,
después los "Después", al final los "No".

## Catálogo

| Lo que mediste | El arreglo, dicho sin jerga | Lo nota | Riesgo | Cómo se comprueba |
|---|---|---|---|---|
| La pantalla se queda en blanco hasta que carga todo el código (el `#root` vacío, `primerTexto` tarde y casi igual a `cargaTermina` del JS) | Que lo primero que se ve (título, texto, botón) esté en la página desde el inicio, sin esperar al código, o que el código pesado baje después del primer pintado | Alto | Medio: cambia cómo arranca; hay que cuidar que no parpadee | `primerTexto` y `principal` bajan; la página se ve igual |
| Un solo archivo de código enorme con librerías que no se usan al principio (3D, animaciones, lector de PDF, mapas) | Partir el código: que lo pesado se baje cuando hace falta | Alto si frena la primera pantalla; Medio si no | Medio | El archivo inicial pesa menos; `primerTexto` baja |
| Congelones al arrancar (tareas largas de cientos de ms o más) | Repartir el trabajo del arranque en pedazos, preparar lo pesado antes de mostrarlo (en 3D, compilar los materiales antes del primer cuadro) | Alto | Medio | `peorMs` y `bloqueoMs` bajan |
| Un 3D o una animación que dibuja sin parar aunque nadie toque nada | Dibujar solo cuando algo cambia, bajar los cuadros por segundo en celulares lentos, y si el navegador dibuja sin tarjeta de video, mostrar un cuadro fijo | Alto en celulares baratos; casi nada en una computadora | Medio si solo cambia en celulares lentos; Alto si cambia lo que todos ven | `enReposo.dibujos3dPorSeg` baja; la prueba sin tarjeta de video termina |
| Sin WebGL la página entera queda en blanco (corrida sin WebGL de `cuando-truena.md`) | Que el 3D falle solo: atrapar su error (un *error boundary* en React) y dejar el resto de la página | Alto para quien no puede dibujar 3D: hoy no ve nada | Bajo | La captura sin WebGL enseña la página sin el 3D |
| El 3D hace cientos de llamadas de dibujo por cuadro (`dibujosPorCuadro`) | Juntar las piezas que se repiten para dibujarlas de una vez (instancias, geometrías combinadas) y quitar sombras o detalles que no se ven | Alto en celulares baratos y sin tarjeta de video; nada en una computadora | Medio: se ve igual si se hace bien, pero toca cómo está armada la escena | `dibujosPorCuadro` baja |
| Una pantalla de carga tapa todo hasta que baja el último archivo (`pantallaDeCarga`) | Mostrar la página en cuanto está lo necesario para la primera pantalla, y que lo pesado siga bajando detrás; si el contador cuenta archivos, que cuente bytes | Alto: es todo lo que ve quien entra | Medio: cambia la entrada, que suele ser parte del show | Ya |
| Un modelo 3D pesado (`modelos3d` de varios MB, texturas grandes) | Comprimir la geometría (Draco o Meshopt), texturas más chicas o en KTX2, y una versión más ligera para celular | Alto con 4G lenta | Bajo si se ve igual; hay que compararlo de cerca | Ya |
| Íconos o letras desde otros servidores (CDN de íconos, Google Fonts, Fontshare) que frenan el primer pintado | Servirlos desde el propio sitio, solo los íconos y grosores que se usan, y que el texto se vea mientras llegan | Medio: el primer pintado sale antes | Medio: hay que revisar que se vean igual | Ya si frenan el primer pintado; si no, después |
| Lo principal aparece tarde por una animación de entrada (el texto entra con retraso) | Que lo principal ya esté visible al pintar y la animación sea más corta o empiece desde visible | Medio | Medio: cambia la entrada | Después, y solo si la persona quiere |
| Lo principal es una imagen y empieza a bajar tarde | Avisarle al navegador que esa imagen va primero (prioridad alta, precarga) | Alto | Bajo | `principal` baja |
| Imágenes mucho más grandes de lo que se ven (`sobra` de 2 o más) | Versiones de varios tamaños para que el celular baje la chica (`srcset`) | Medio (Alto si es lo principal) | Bajo: se ve igual si las versiones se hacen bien | El peso de imágenes baja |
| Imágenes lejos de la primera pantalla que bajan al cargar | Que bajen cuando la persona se acerca (`loading="lazy"`). **Nunca** en la imagen principal | Medio | Bajo | Esas imágenes ya no bajan al cargar |
| Imágenes sin medidas | Ponerles ancho y alto, para que la página no salte cuando llegan | Bajo si `saltos` ya está bien; Medio si no | Bajo | `saltos` se queda abajo de 0.1 |
| Formato pesado (PNG o JPG grandes en fotos) | Pasarlas a WebP o AVIF | Medio | Bajo | El peso baja |
| Un video que baja completo al entrar | Portada (`poster`), que no se precargue entero, y una versión más ligera para celular | Alto si está arriba; Medio si no | Bajo | El peso de video al cargar baja |
| Saltos de la página mientras carga | Reservar el espacio de lo que llega tarde (imágenes, anuncios, fuentes) | Medio | Bajo | `saltos` baja |
| Fuentes: muchas familias o pesos, o el texto invisible mientras llegan | Solo los pesos que se usan, solo el alfabeto latino, que el texto se vea con una fuente del sistema mientras tanto | Bajo o Medio | Bajo | Menos KB de fuentes; el texto aparece antes |
| El CSS frena el primer pintado | Normalmente nada: con un CSS chico se gana poco. Si es enorme, quitar lo que no se usa | Bajo | Medio | Casi siempre: "No" |
| Terceros pesados (chat, píxeles, mapas) al cargar | Cargarlos después de lo principal, o cuando alguien los va a usar | Medio | Medio: puede perder datos de medición o de anuncios | Menos tareas largas y menos peso al cargar |
| El servidor tarda en responder | Caché del hosting o de la CDN, revisar redirecciones | Alto si pasa del segundo | Medio | `respuestaServidor` baja |
| Archivos con huella sin caché larga | Cabecera de caché larga para esos archivos | Bajo: solo en visitas repetidas | Bajo | Solo se nota en la segunda visita |
| Código para navegadores viejos (polyfills) en un archivo de un tercero | Nada: no es código de la persona | Bajo | No aplica | "No" |
| Muchos elementos en la página | Solo si pasa de varios miles y la página se traba al bajar | Bajo | Medio | Casi siempre: "No" |

## Lo que nunca se recomienda

- Quitar contenido o efectos que la persona puso a propósito, como "arreglo de velocidad".
  Se puede proponer cargarlos después o dibujarlos menos, pero quitarlos lo decide ella, y
  se dice qué se pierde.
- Cambiar de framework, de hosting o rehacer la página.
- Cualquier arreglo para ganar menos de una décima de segundo con riesgo medio o alto.
