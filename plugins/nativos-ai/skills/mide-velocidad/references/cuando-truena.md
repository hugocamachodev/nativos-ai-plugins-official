# Cuando truena, no termina o se queda trabajando

## Qué quieren decir los errores de PageSpeed y de Lighthouse

PageSpeed Insights es Lighthouse corriendo en máquinas de Google. Cuando no puede medir,
casi siempre dice uno de estos:

| Dice | Qué quiere decir | Lo más común detrás |
|---|---|---|
| `Target closed` (o `TargetCloseError`) | La pestaña donde medía se cerró o se cayó a media medición. PageSpeed no dice por qué. | La página se come el procesador o la memoria sin parar (3D, animaciones, un ciclo que no termina), o el navegador de la medición se ahogó. |
| `DEADLINE_EXCEEDED` / "Lighthouse did not finish in time" | La medición no terminó dentro de su tiempo. | Lighthouse espera a que la página se quede quieta para cerrar la medición. Si nunca se queda quieta, o tarda muchísimo en cargar, se le acaba el tiempo. |
| "The page loaded too slowly to finish within the time limit" (aviso) | Terminó, pero cortó la medición antes de que la página acabara: los números están incompletos. | Lo mismo: la página sigue trabajando. |
| `NO_FCP` | En toda la medición nunca apareció nada en la pantalla. | Todo depende de un código que falla o tarda mucho, o el contenido está oculto hasta que alguien toca algo. |
| `NO_LCP` | Nunca apareció un elemento principal medible. | La primera pantalla es solo un canvas o un video sin imagen de portada. |
| `FAILED_DOCUMENT_REQUEST` / `ERRORED_DOCUMENT_REQUEST` (con un código) | El servidor no entregó la página. | Protección contra bots (en Cloudflare: Bot Fight Mode o reglas del firewall), bloqueo por país, o el sitio caído. |
| `DNS_FAILURE` | El dominio no existe para internet. | Un dominio mal escrito o recién comprado. |
| `PAGE_HUNG` | La página se colgó: el navegador dejó de responder durante la medición. | Lo mismo que `Target closed`: trabajo que no termina (3D, un modelo enorme, un ciclo). |

## Cómo averiguar la causa

Ve en orden y para cuando tengas la causa con evidencia.

**1 · ¿Termina de cargar?** En tu medición, `noTerminoDeCargar: true` o una navegación
que se vence a los 100 s ya es la respuesta. Revisa la consola (`list_console_messages`
con errores): un error rojo al arrancar suele ser lo que deja la pantalla en blanco.

**2 · ¿Se queda trabajando después de cargar?** Mira `enReposo`:
- `ocupadoPct` alto o tareas largas en la ventana: la página nunca descansa. Para
  Lighthouse eso es no terminar nunca.
- `dibujos3dPorSeg` mayor que 0 con nadie tocando: un 3D que se redibuja sin parar.
- `cadaCuadroP95Ms` muy arriba de 16.7 ms (8.3 ms en una pantalla de 120 Hz): cada cuadro cuesta más de lo que el teléfono
  alcanza a dar.

**3 · ¿Es por la tarjeta de video?** La medición con chrome-devtools frena el procesador,
pero en esta computadora la tarjeta de video sigue entera. Si la página tiene 3D (o el
punto 2 salió con dibujos sin parar), mídela sin tarjeta de video. Primero revisa si
Lighthouse ya está descargado:

```bash
npx --no-install lighthouse --version
```

Si no lo está, **pregunta antes**: es la herramienta de Google para medir páginas, la
primera vez ocupa unos 170 MB en disco y tarda un par de minutos en bajar (`npx` la guarda
para la próxima). Con el sí:

Son dos corridas iguales, una tras otra: **sin** tarjeta de video y **con** ella. La de
con tarjeta es el control: si solo truena la de sin tarjeta, la causa es el dibujo y no
otra cosa. `--throttling-method=devtools` hace que Lighthouse frene de verdad el navegador
y cronometre, en vez de calcular los tiempos; así se pueden citar.

```bash
d=/tmp/mide-velocidad/$(date +%Y%m%d-%H%M%S); mkdir -p "$d"
for equipo in celular; do   # si PageSpeed también falla en escritorio: for equipo in celular escritorio
  if [ $equipo = celular ]; then forma="--form-factor=mobile"; else forma="--preset=desktop"; fi
  for modo in sin-gpu con-gpu; do
    if [ $modo = sin-gpu ]; then f="--headless=new --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader"; else f="--headless=new"; fi
    inicio=$(date +%s)
    npx lighthouse "<url>" $forma --throttling-method=devtools --only-categories=performance \
      --output=json --output-path="$d/$equipo-$modo.json" --quiet --chrome-flags="$f"
    echo "$equipo $modo tardó $(( $(date +%s) - inicio )) s"
    node "${CLAUDE_PLUGIN_ROOT}/skills/mide-velocidad/scripts/resumen-lighthouse.mjs" "$d/$equipo-$modo.json"
  done
done
```

**Si la página tiene 3D, una corrida más: sin WebGL.** Hay navegadores que no pueden
dibujar 3D (la tarjeta de video bloqueada, una máquina virtual, algunos equipos de
empresa). En muchos sitios hechos con three.js o React Three Fiber, si el 3D falla se cae
la página entera y queda en blanco. Esta corrida lo dice:

```bash
d=${d:-/tmp/mide-velocidad/$(date +%Y%m%d-%H%M%S)}; mkdir -p "$d"
npx lighthouse "<url>" --form-factor=mobile --only-categories=performance,best-practices \
  --output=json --output-path="$d/sin-webgl.json" --quiet --chrome-flags="--headless=new --disable-gpu"
node "${CLAUDE_PLUGIN_ROOT}/skills/mide-velocidad/scripts/resumen-lighthouse.mjs" "$d/sin-webgl.json"
```

Abre con Read la captura final que guarda el resumen. De esta corrida solo cuentan la
captura y los errores de la consola: sus tiempos son calculados. Si se ve el contenido sin
el 3D, la página sobrevive. Si lo que se ve es una pantalla de carga, esta prueba no alcanza a
contestar: dilo así. Si está en blanco (y el resumen trae errores de WebGL en la consola), es
un hallazgo del bloque 3 (el primero de la lista, porque para esas personas es una pantalla en blanco) aunque no sea de velocidad: para esas personas la página no
existe. El arreglo es que el 3D falle solo, sin llevarse lo demás (en React, un *error
boundary* alrededor del lienzo).

Si la página tarda en cargar 40 s o más (una pantalla de carga larga), Lighthouse se corta a
los 45 s y el resultado engaña: agrega `--max-wait-for-load=90000` a las corridas. Si una
corrida no deja reporte, el resumen lo dice: Lighthouse se cayó antes de terminar, y eso ya
es un dato.

**Sin WebGL con la misma herramienta**, cuando hay pantalla de carga o quieres tocar la
página: una carga más con chrome-devtools en un contexto nuevo, con este `initScript`
(en lugar del medidor), y `take_screenshot` al final (tocando el botón de la pantalla de
carga si lo hay):

```js
for (const C of [HTMLCanvasElement, window.OffscreenCanvas]) if (C) { const o = C.prototype.getContext; C.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : o.call(this, t, ...a); }; }
```

Así el navegador se porta como uno que no puede dibujar 3D.

Cada medición va en su propia carpeta con fecha y hora, para no pisar una anterior. Los
flags de `sin-gpu` hacen que Chrome dibuje con el procesador (SwiftShader), como una
máquina sin tarjeta de video. Lighthouse se corta solo cuando la página no termina
(espera 45 s a que cargue) y lo avisa; cada corrida tarda uno o dos minutos. Si una pasa de
cinco, detenla: eso ya es la respuesta.

Lee el resumen con cuidado: si dice que Lighthouse cortó la medición, el bloqueo total y
"lista para usar" son extrapolaciones (pueden pasar de lo que duró la corrida). Cita el
aviso, cuánto tardó la corrida según tu reloj y la lista de tareas largas, no esos totales.

- **Sin tarjeta sale "too slowly" o no termina, y con tarjeta termina normal:** la causa
  está **comprobada**: sin tarjeta de video la página no deja que la medición termine.
  Los mensajes literales de PageSpeed (`Target closed`, `DEADLINE_EXCEEDED`) no se pueden
  reproducir aquí, y no hace falta: dilo así, "reproduje la causa, no el mensaje exacto".
  Que las máquinas de PageSpeed dibujen sin tarjeta de video es **lo más probable**, no un
  hecho: Google no publica cómo son.
- **Las dos truenan:** antes de descartar la tarjeta de video, comprueba que la corrida
  "con tarjeta" de verdad la tuvo: `dibujaCon` de tus cargas con chrome-devtools dice qué
  usa Chrome normal en esta computadora; Lighthouse sin ventana a veces cae a SwiftShader
  aunque no se lo pidas. Si de verdad tuvo tarjeta, no es eso: mira la consola, el punto 4
  y el 5.
- **Las dos terminan, pero sin tarjeta todo tarda mucho más** (el doble o más en «lista
  para usar» o en el congelón más largo): no se reproduce el error, pero sí el riesgo. Dilo
  así, con la tabla de las dos corridas, y que en un celular barato se parecerá más a la de
  sin tarjeta.
- **Las dos terminan normal y parecido:** el 3D no es el problema. Sigue con el punto 4.

Si no se reproduce nada, puede ser que la persona midió con PageSpeed una versión vieja de
la página. Pregúntale cuándo lo corrió y sugiérele volver a correrlo ella misma: es su
decisión mandarle la página a Google.

En una Mac, `--headless=new` usa la tarjeta de video y los flags de SwiftShader la quitan.
En otras computadoras no está garantizado: si las dos corridas salen casi idénticas en una
página con 3D, sospecha que las dos dibujaron igual.

Lo mismo sirve para explicar qué pasa en un celular barato: su procesador es lento y su
tarjeta de video también. Que una computadora potente la mueva bien no dice nada de esos.

**4 · ¿Bloquea a los bots?** Si PageSpeed dio `FAILED_DOCUMENT_REQUEST` o algo con código
403 o 503:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -A "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse" "<url>"
```

Un 403 o 503 aquí, con la página abriendo bien en el navegador, es la protección contra
bots. Se ajusta en el panel del hosting, y eso lo decide la persona.

**5 · ¿Se come la memoria?** Si nada de lo anterior explica un `Target closed`, mira la
memoria de la página después de cargar (`evaluate_script` con
`() => performance.memory && Math.round(performance.memory.usedJSHeapSize / 1048576)`, en
MB). Varios cientos de MB en una landing es sospechoso. Si no hay forma de confirmarlo,
dilo: "no pude confirmar la causa; lo más probable es…".

## Cómo se cuenta en el reporte

En su propio bloque, en este orden:
1. Qué dijo PageSpeed (o qué te pasó a ti) y qué quiere decir, en una línea.
2. Qué hiciste para reproducirlo y qué salió, con los números de esa prueba.
3. La causa, con la palabra justa: "comprobado" si lo reprodujiste, "lo más probable" si no.
4. Qué tiene que ver con los visitantes de verdad: un celular con tarjeta de video decente
   no lo va a notar igual; uno barato, sí.

No llames a la API de PageSpeed para comprobarlo sin preguntar: manda la página a Google,
y el plugin lo evita a propósito.
