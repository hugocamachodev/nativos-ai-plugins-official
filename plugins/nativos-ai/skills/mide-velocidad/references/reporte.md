# El reporte

Siempre el mismo, siempre completo y siempre en el chat. Seis bloques en este orden, los
seis siempre. Si un bloque no tiene nada, se dice en una línea y se sigue ("5 · Por qué
truena: no aplica, la página terminó de cargar las tres veces y después descansa"); no se
borra.

## Plantilla

```markdown
**Qué medí:** <url>, publicada. <Método: chrome-devtools | Lighthouse por línea de comandos,
y por qué>. Simulé un celular Android: pantalla de 412 px, 4G lenta y el procesador 4 veces
más lento. La cargué 3 veces en frío; cada número es la mediana y entre paréntesis va el
rango. <Si hay carpeta: "Revisé también el código de esta carpeta." | Si no: nada aquí.>

Cada medición da números un poco distintos (la red y la computadora nunca están igual), así
que lo que importa es lo que se repite. La tarjeta de video de esta computadora no se
frenó <si `dibujaCon` dice SwiftShader, llvmpipe o «sin webgl», en su lugar: «esta medición
no tuvo tarjeta de video»>: en un celular barato, lo que tenga 3D o animación pesa más de lo
que se ve aquí. Las referencias de la tabla son las de Google: él las mide con visitas
reales, y esto es una prueba de laboratorio, así que son una aproximación.

### 1 · Lo que tarda en aparecer

| Qué ve la persona | Cuándo | Referencia de Google |
|---|---|---|
| Algo en la pantalla (antes, vacía: solo el color de fondo) | 6.1 s (5.9 a 6.2) | - |
| Lo principal: «<qué es>» | 6.1 s (5.9 a 6.2) | 2.5 s o menos |
| <La escena 3D, si es lo principal y Google no la cuenta (`primerDibujo3d`)> | 6.7 s | - |
| <Si hay pantalla de carga> Se puede usar (se quita la pantalla de carga) | 45 s | - |
| Termina de bajar todo lo de la carga | 8.0 s | - |
| Deja de congelarse (termina la última tarea larga) | 8.7 s / nunca | - |
| Saltos de la página | 0.001 | 0.1 o menos |
| Respuesta al tocar <qué se tocó> | 90 ms / no medida: <motivo> | 200 ms o menos |
| El servidor empieza a responder | 0.2 s | - |

<Una o dos líneas: qué de esto es lo grave. Ej.: "Durante 6 segundos la pantalla está en
blanco: es lo primero que nota cualquiera."> <Si `dibujos3dPorSeg` es mayor que 0, aclara
que "deja de congelarse" no quiere decir que descanse: el 3D sigue dibujando.>

### 2 · Cuánto pesa

| Tipo | Archivos | Baja por la red | El teléfono lee |
|---|---|---|---|
| Imágenes | 3 | 302 KB | 301 KB |
| Video | 0 | - | - |
| Fuentes | 2 | 54 KB | 53 KB |
| Código (JavaScript) | 2 | 530 KB | 1.8 MB |
| Estilos (CSS) | 1 | 19 KB | 71 KB |
| Página (HTML) | 1 | 2 KB | - |
| <Modelos 3D / Otros, si hay> | | | |
| **Total** | | **907 KB** | |

Lo que baja por la red es el tamaño comprimido, lo que gasta del plan de datos. Lo que el
teléfono lee es el tamaño ya abierto: el código pesa mucho más ahí porque el teléfono tiene
que procesarlo, y eso es lo que más lo frena.

Lo más pesado: <los 3 a 5 archivos más pesados, con su peso y si bajan al cargar o
después>.

### 3 · Qué la frena, de lo que más se nota a lo que menos

**1. <Título en palabras de visitante: "La pantalla se queda en blanco 6 segundos">.**
<Qué pasa, en dos o tres líneas, sin jerga.> <Cuánto se nota.> <De dónde sale el dato:
"en las 3 cargas", "insight de Chrome, carga 1">. <Con carpeta: "Está en `archivo:línea`".>

**2. …**

<Si la consola trae errores rojos que no son de velocidad (por ejemplo, la analítica
bloqueada por la política de seguridad), una línea al final: "No es de velocidad, pero…".>

### 4 · Lo que ya está bien

- <Una línea por cosa, con su número si lo tiene: "El servidor responde en 0.2 s",
  "No hay saltos", "Las fuentes son solo dos y ligeras".>

### 5 · Por qué truena <si no aplica, una línea que lo diga>

<Según `cuando-truena.md`: qué dijo PageSpeed o qué pasó, qué hiciste para reproducirlo,
qué salió, la causa ("comprobado" o "lo más probable") y qué tiene que ver con los
visitantes reales.>

### 6 · Qué arreglar primero

| # | Arreglo | Cuánto lo nota el visitante | Dificultad y riesgo | Recomiendo |
|---|---|---|---|---|
| 1 | <en palabras simples> | Alto: <por qué> | Bajo: <qué cambia / qué no> | Ya |
| … | | | | Después |
| … | | | | No: <motivo> |

No cambié nada. <Con carpeta: "Si me dices cuáles, los hago en una rama aparte, por
vueltas, y después de publicar cada vuelta en una dirección de prueba vuelvo a medir."
Sin carpeta: "Con la carpeta del proyecto abierta te diría qué archivo causa cada cosa y
podría hacer los arreglos.">
```

## Cómo se ordena el bloque 3

Por lo que nota quien visita, de más a menos:
1. Pantalla en blanco o lo principal que tarda.
2. La página congelada: no responde al tocar ni al bajar.
3. La página que salta mientras carga.
4. Lo que se traba o se ve a tirones al bajar o al usarla.
5. Lo que tarda o pesa más abajo de la primera pantalla.
6. Datos de más (peso que nadie ve, pero que se paga en el plan del celular).
7. Lo que solo ven las herramientas.

Agrupa lo repetido: tres imágenes de más es un hallazgo con tres ejemplos, no tres
hallazgos.

Un número que ya cumple la referencia de Google no es hallazgo, aunque esté en lo alto de
la escala. Si cumple por poco, dilo en el bloque 4 ("cumple, pero justo") y sigue con lo
que sí frena.

**En la raya.** Si el rango de las tres cargas cruza la referencia (una cumple y otra no),
no digas ni "cumple" ni "no cumple": di "en la raya", con las tres cifras. Va al bloque 3
como hallazgo, con la prioridad que le toque por lo que se nota, y su arreglo casi
siempre es "Después". Cuando un número quede a menos de una décima del umbral (de 2.4 a
2.6 s, por ejemplo), escríbelo con dos decimales: con uno, 2.46, 2.50 y 2.52 salen todos
"2.5" y parece que cumple.

## Una página rápida

Si todo sale bien, el reporte también va completo, con sus seis bloques, y lo dice como
buena noticia en la primera línea del bloque 1. El bloque 3 dice "No encontré nada que la
frene de forma que se note", y si hay mejoras chicas, van al bloque 6 con "Después" o "No".
**No inventes problemas para llenar.** Un insight de Chrome con un ahorro de 0 ms no es un
hallazgo; tampoco lo es un número que ya cumple la referencia de Google.

## Prohibiciones

- **Ninguna calificación numérica** (ni la de Lighthouse).
- **Ninguna promesa de resultado**: ni ventas, ni posiciones en Google, ni "vas a cargar en
  1 segundo".
- **Ningún umbral que no sea uno de los tres oficiales.**
- **Ninguna cifra sin pasar por `forbidden-numbers.md`.**
- **Ningún hallazgo sin su fuente** (qué cargas, qué insight, qué prueba).
- **Ninguna palabra técnica sin explicar antes qué significa para el visitante.**
- **Ningún guion largo (—) en el reporte.** Usa coma, punto o dos puntos.
