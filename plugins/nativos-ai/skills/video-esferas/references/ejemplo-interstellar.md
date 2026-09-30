# Ejemplo completo: «Interstellar en esferas»

Un guion aprobado de verdad, con sus duraciones finales y cómo cambió en cinco rondas. Úsalo
como modelo de nivel de detalle para `SCRIPT.md`. La imagen `assets/referencia-interstellar.jpg`
enseña 12 cuadros del resultado.

**Formato:** reel 1080×1920 de 2:20 (intro vertical + película girada) y versión horizontal
de 2:14. En inglés, con las frases exactas de la película. 60 fps, sin audio (el usuario
pone el tema de piano de Hans Zimmer en la app).

## Guion final (v3)

| # | Escena | Dur. | Qué se ve | Texto | Sale hacia |
|---|---|---|---|---|---|
| 0 | intro (vertical) | 15.2 | Bola de esferas que estalla y forma «100% MADE WITH CLAUDE CODE» con el logo; se reagrupa en «INTERSTELLAR» bajo el emblema de Gargantúa; «ROTATE YOUR PHONE» con un teléfono de esferas; todo gira 90°; 3·2·1 | (letras de esferas) | el 1 estalla en polvo dorado |
| 1 | librero | 6.75 | El polvo dorado en los rayos de luz; un libro cae del librero de esferas; el polvo escribe el mensaje en el piso | — | líneas de polvo sobre el piso |
| 2 | relojes | 8.3 | Macro del reloj: engranes, lumen, segunderos que se sincronizan | I'M COMING BACK. | dos relojes bajo persianas |
| 3 | despegue | 7.5 | El oro del reloj se calienta y se vuelve fuego; el cohete atraviesa nubes de esferas hacia el espacio | — | espacio negro, estela de fuego |
| 4 | endurance | 8.05 | La Tierra de esferas y la Endurance girando; primer plano de TARS con su pantalla | HUMOR 75% | TARS y estrellas |
| 5 | agujero | 9.1 | Plano IMAX de Saturno (una esfera con bandas y anillos de esferas); el agujero de gusano se traga la nave; túnel | — | el túnel |
| 6 | contacto | 13.5 | Dentro de la nave: el túnel por la ventana; una onda atraviesa el casco y de ella sale una mano luminosa; el guante de Brand la toca en macro | FIRST HANDSHAKE. | anillos turquesa llenan el cuadro |
| 7 | miller | 13.8 | Océano turquesa en plano IMAX; la «montaña» es una ola; la cresta se nos viene encima en un solo movimiento; bajo el agua | 23 YEARS | burbujas que se vuelven estrellas |
| 8 | acople | 14.5 | La Endurance gira sin control sobre un planeta de hielo; silencio entre frases; la Ranger iguala el giro; el anclaje | IT'S NOT POSSIBLE. / NO. IT'S NECESSARY. | espacio estable, luz cálida |
| 9 | gargantua | 20.0 | Plano IMAX brillante del agujero negro; macro dentro del disco (polvo de esferas de tres tamaños); TARS se suelta, súper zoom, persecución por el río de fuego, se desintegra | SEE YOU ON THE OTHER SIDE, COOP. | el disco en teleobjetivo |
| 10 | caida | 17.0 | La Ranger pierde piezas; Cooper sale expulsado, viaja por el río de esferas, se desintegra, oscuridad, puntos dorados que se vuelven el teseracto | — | Cooper en el centro de la retícula |
| 11 | teseracto | 7.0 | La biblioteca infinita de esferas; Cooper toca el hilo y late «STAY» | (STAY en esferas) | hilos dorados |
| 12 | eureka | 6.0 | El segundero del reloj late en morse | EUREKA! | nube dorada |
| 13 | final | 4.6 | Todas las esferas forman «GENERATED 100% WITH CLAUDE CODE» | (letras de esferas) | fin |

Fundidos de 0.8 s entre escenas (1.2 s en contacto y 1.0 s en caida).

## Cómo cambió en cinco rondas

| Ronda | Lo que dijo el cliente | Lo que se cambió |
|---|---|---|
| 1 · 5 escenas de prueba | «El librero no se lee»; al teseracto y a Gargantúa les faltan esferas; intro más lenta y con «100% hecho con Claude Code» gigante; más turquesa; negros de verdad | Rellenos con gradiente de tamaño; macro de reloj como referencia; intro con letras de esferas |
| 2 · prueba 2 | «Mejoró mucho». El macro de Gargantúa necesita esferas diminutas mezcladas; escribe el guion antes de renderizar | Tres tamaños en cada cuadro; guion aprobado antes de producir |
| 3 · fotogramas clave | Nubes de despegue que parecían globos; título cortado; olas y agujeros negros con más esferas; textos ilegibles; el espacio debe ser negro puro; Saturno como una sola esfera grande | Política global de legibilidad en el motor; fondos negros con pocas estrellas; objetos más densos |
| 4 · corte de 1:01 | «Muy, muy rápido, no te deja disfrutar»; la mano debe *entrar* a la nave; la ola termina de golpe; al acople le falta drama; Gargantúa sin brillo; TARS invisible al caer; Cooper aparece de la nada | Reglas de ritmo (2:12); escena nueva dentro de la nave; golpe de ola continuo; acople con planeta de referencia; escena nueva de la caída |
| 5 · corte de 2:12 | «Casi perfecto». Tragados de golpe: seguirlos por los anillos de fuego, desintegrarlos, salir de la oscuridad despacio; intro un poco más rápida; «el teseracto no lo cambies» | Persecución y desintegración de TARS y de Cooper; carteles de la intro a ~2.4 s; versión horizontal |

## Números finales

2:20, 14 escenas, ~9,800 líneas de código. 33 agentes Opus 5.5 (1 director + 32 subagentes:
5 de pruebas de estilo, 16 con esfuerzo alto, 11 con máximo). ~595 millones de tokens (97%
relecturas en caché), ~US$244 a precio de API. ~14.5 horas desde la primera idea hasta los
dos videos finales, contando las revisiones del cliente. Render final: ~10 min por versión
en una Mac con chip M4 Pro.
