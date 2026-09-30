# Lecciones de «Interstellar en esferas»

Cinco rondas de correcciones de un cliente real, destiladas en reglas. Cada una trae su
porqué: si una situación nueva no encaja, decide con el porqué, no con la letra.

## Ritmo

- **Lo que se ve bien en fotos puede sentirse atropellado en video.** El primer corte (1:01,
  ~4.5 s por escena) pasó la revisión de fotogramas y el cliente lo rechazó: «tan rápido que
  no te deja disfrutar ni apreciar el video». La versión aprobada duró 2:20.
  → Planea 7–9 s por escena, tomas de ≥ 2.5 s y momentos clave de ≥ 4 s. Enseña un video de
  prueba temprano: el ritmo solo se juzga en movimiento.
- **Las pausas se escriben, no se simulan.** Alargar una escena con cámara lenta uniforme
  frena también la respiración de las esferas y todo se siente muerto. → Alarga los
  momentos quietos (más espacio entre tweens, cámara más lenta, un silencio después del
  golpe). `REMAP` en `main.js` sirve para cambiar el tempo de escenas ya aprobadas, no para
  inventar pausas.
- **Calibra, no exageres.** Tras pedir más calma, el cliente pidió la intro «un poquito más
  rápida»: el punto justo quedó en ~2.4 s por cartel (gancho, título).
- **Fundidos de 0.8 s.** A 0.5 s los cambios de escena se sentían bruscos.

## Texto

- **Si no se lee en el teléfono, no existe.** Líneas de 40 px con peso 300 sobre campos de
  esferas eran ilegibles. → `E.line` ya impone ≥ 54 px, peso 500 y halo oscuro. Además:
  ≥ 2 s legible completo (≥ 2.5 s si es una frase importante), nunca en el primer ni el
  último segundo de la escena, y sobre zonas oscuras.
- **Frases exactas.** Las del guion aprobado, en el idioma elegido, sin inventar.
- **El título debe caber y respirar.** «INTERSTELLAR» en dos líneas se veía «cortado». → Una
  sola línea, con la tipografía y el emblema que lo hagan inconfundible.

## Qué es «lleno de esferas» (y qué no)

- **Densidad en los objetos, negro en el espacio.** Al principio se llenaron los fondos de
  polvo azul y el cliente dijo: «lo bello es ver el negro puro del espacio». → El fondo del
  espacio es negro con pocas estrellas nítidas; los planetas, naves, discos y olas van
  llenos de esferas.
- **Tamaños mezclados en cada cuadro.** Las esferas del mismo tamaño se ven de plástico.
  Grandes, medianas y diminutas juntas se ven como polvo cósmico. → Rellenos con gradiente
  de tamaño (grandes en el corazón de la forma, pequeñas en los bordes) y una lluvia de
  micro-esferas.
- **El macro de reloj es la vara.** La escena del reloj en primer plano, con cada esfera
  brillando, fue «casi perfecta» y se volvió la referencia de todo el corto. → Cada escena
  necesita al menos un primer plano donde se vean las esferas individuales, sus reflejos y
  su relieve.
- **Un objeto héroe puede ser una sola esfera grande.** Saturno de miles de esferas se veía
  ruidoso; una esfera grande con bandas, rodeada de anillos de esferas, fue la idea
  ganadora del cliente.
- **Los agujeros negros y fuentes de luz deben brillar.** Gargantúa «de lejos le falta brillo
  y detalle». Si el objeto *es* la luz, el bloom está motivado: déjalo arder.
- **Volumen, no dibujo.** Nubes de despegue hechas de pocas esferas grandes parecían globos;
  un disco de líneas finas parecía un dibujo. → Masas y volúmenes de muchas esferas
  pequeñas bien definidas.

## Legibilidad de lo que pasa

- **Si el protagonista mide 40 píxeles, no pasó nada.** TARS cayendo al agujero negro era
  un punto gris; el cliente dijo que faltó verlo tragado. → Mantén al sujeto ≥ 100–150 px
  en pantalla en el momento clave. Truco de teleobjetivo: acércalo a la cámara sobre la
  misma línea de visión (ocupa el mismo punto de la imagen, pero se ve más grande).
- **Sigue la acción; nada de «¡pum!».** «Están en el horizonte y ¡pum! se los lleva». →
  En los momentos clave la cámara acompaña al sujeto (súper zoom, persecución), le da
  tiempo (≥ 4 s) y el desenlace ocurre despacio: desintegración en hilos de esferas,
  oscuridad que se cierra poco a poco, emergencia lenta de lo siguiente.
- **Una referencia hace legible la velocidad.** El acople sin drama tenía la cámara quieta
  y nada contra qué medir el giro. → Un planeta enorme debajo, cámara pegada al sujeto y el
  universo girando alrededor; un silencio entre las dos frases; el golpe del anclaje y la
  calma.
- **Fiel a la historia.** El «primer apretón de manos» es una mano que *entra* a la nave;
  hacerlo al revés, en el espacio abierto, rompió la escena. → Pregunta o investiga el
  momento icónico antes de diseñarlo.
- **Nadie aparece de la nada.** El astronauta «no puede aparecer de la nada en el
  teseracto». → Si un personaje cambia de lugar entre escenas, muestra el trayecto.

## Uniones entre escenas

- **Las formas de una escena se vuelven la siguiente.** Polvo dorado → librero; engranes del
  reloj → fuego del cohete; túnel → la ventana de la cabina; anillos turquesa → el océano;
  burbujas → estrellas. Nunca un corte a negro entre escenas (dentro de una escena, la
  oscuridad puede ser un momento buscado).
- **El sujeto no debe parpadear en el fundido.** Cooper desaparecía medio segundo al entrar
  al teseracto porque la escena siguiente arrancaba en negro. → Mismo punto y tamaño en
  pantalla a ambos lados; si la escena siguiente empieza oscura, arráncala más adelante con
  `REMAP` (`[[0, 1], [7, 8]]` la empieza en su segundo 1).
- Revisa cada unión cuadro a cuadro (paso 0.1 s) con `--only=a,b`.

## Proceso con el cliente

- **Guion primero.** Aprobar el guion (escenas, duraciones, frases) antes de programar
  ahorra rondas enteras.
- **Look-dev con 2–3 escenas** antes de producir todo: el estilo se corrige barato ahí.
- **Lo aprobado no se toca.** «El teseracto me gustó mucho, ese no lo cambies». Cambia el
  tempo de una escena aprobada con `REMAP`, no reescribiéndola.
- **Solo 60 fps**, y una sola versión final por formato (nada de copias a 30 fps).

## Técnicas (fallos que costaron horas)

- **Estado que se hereda entre tomas.** El desenfoque de una toma se quedaba puesto en la
  siguiente porque el composer es compartido. → En cada rama de toma fija explícitamente
  cámara, fov, DOF, bloom y luces; el render salta a cualquier tiempo y cada cuadro debe
  salir igual sin importar el anterior.
- **Solo funciones del tiempo.** Nada de `Math.random` ni relojes: `dots.rng(semilla)` y el
  tiempo local `lt`. Si no, dos renders del mismo cuadro no coinciden.
- **Renders largos.** Más de 10 min: lánzalos en segundo plano con `nohup … > log &` y
  vigila el log (una tubería con `grep` retiene el progreso hasta el final).
- **Presupuesto de rendimiento:** ≤ ~300 ms por cuadro a `--ss=2`. Esferas diminutas con
  `seg` 8–14, héroes con 32–48; ≤ ~150 mil por campo.
