---
name: quick-plan
description: Planeación rápida por vueltas para landing pages, sitios web, demos, experimentos visuales y prototipos que se juzgan viéndolos. Usa el brainstorm de superpowers por etapas, decide con el usuario cuánto investigar, escribe un plan corto por bloques y construye en vueltas (construir, ver, ajustar) con subagentes en paralelo, sin TDD, sin pruebas nuevas y sin revisiones por tarea. Úsala cuando pidan una landing, página, sitio, demo o prototipo, o digan "modo rápido", "quick plan", "no te pases con la planeación", "es para un reel", "no es producción", "quick mode", "just build it fast". Si lo que piden lleva cuentas de usuario, login, servidor, base de datos, pagos o datos de clientes (un CRM, una app con usuarios), avisa que no es rápido y recomienda el flujo completo de superpowers.
---

# Quick Plan

Planear lo justo y ver resultados pronto. En una landing o un demo, el valor se ve en pantalla, y el feedback del usuario al verla vale más que cualquier prueba. Esta skill usa lo mejor de superpowers (el brainstorm, los subagentes) y apaga lo que está pensado para producción.

Hay plan, pero es corto y avanza por vueltas: cada vuelta termina en algo que el usuario puede ver y jugar.

## Por qué existe

Con el flujo completo de superpowers, un sitio que un agente hace en 40 minutos puede tardar 5 o 6 horas y gastar muchos más tokens. Lo que lo frena no son los subagentes ni el brainstorm. Lo frenan tres cosas:

- `writing-plans` escribe el código completo dentro del plan, con pasos de TDD de 2 a 5 minutos. Así el sitio se escribe dos veces.
- `subagent-driven-development` pone cada tarea en fila, con una revisión, arreglos y otra revisión antes de pasar a la siguiente.
- El usuario pasa horas sin ver nada, y su feedback, que es lo que más rinde, no entra.

## 0. Primero: ¿de verdad es rápido?

Antes de la primera pregunta, y cada vez que el pedido crezca, revisa si lleva algo de esto:

- cuentas de usuario, login, roles o permisos;
- servidor, base de datos o API propia;
- pagos, suscripciones o facturas;
- datos de clientes o datos personales (un CRM, un panel de administración, una app donde la gente guarda cosas);
- correos automáticos, integraciones con otros sistemas, varios usuarios editando lo mismo.

Si aparece algo de esto, dilo claro antes de seguir, con lo que de verdad implica. Por ejemplo:

> "Un CRM con cuentas no es un proyecto rápido: lleva login y contraseñas seguras, una base de datos, permisos por usuario, respaldo de la información y cuidar los datos personales de tus clientes. Si algo de eso sale mal se pierden datos o se filtran. Te recomiendo el flujo completo de superpowers (spec, plan detallado, pruebas y revisiones). Si solo quieres ver cómo se vería, puedo hacerte con quick-plan un prototipo visual con datos falsos, sin login ni servidor."

El usuario decide. Si elige el prototipo, queda claro que es solo visual.

## 1. Entender: preguntas por etapas

Usa `superpowers:brainstorming` para las preguntas, con este cambio: **en vez de una pregunta por mensaje, una etapa por tema**. Cada etapa es un solo cuadro (AskUserQuestion) con 2 a 4 preguntas de ese tema y una opción recomendada. Las respuestas de una etapa forman la siguiente. Nunca hagas todas las preguntas de golpe. Si superpowers no está instalado, haz tú las etapas de la misma forma; todo lo demás de esta skill aplica igual.

Etapas típicas (salta las que ya estén claras):

1. **La idea:** qué es, para quién, cuál es el "wow" o el momento que lo vende.
2. **El look:** colores, fuentes, referencias e imágenes que ya tenga.
3. **Cómo construirlo:** el nivel de investigación (paso 2), los enfoques y qué va primero.

No escribas un documento de spec salvo que el trabajo vaya a cruzar sesiones. Si se escribe, que sea corto (menos de 100 líneas).

## 2. Decidir cuánto investigar

Con todo lo que ya sabes, ubica el proyecto en un nivel y **propónselo al usuario con pros y contras**. Él elige.

| Nivel | Cuándo | Qué se hace |
|---|---|---|
| **Ninguna** | Landing o sitio con stack conocido, sin efectos raros. | Construir directo. |
| **Rápida** | Uno o dos efectos nuevos (un shader, una animación con scroll, un 3D sencillo). | Un agente unos 15 minutos por los dos caminos (abajo). |
| **Completa** | El corazón es algo que ninguna librería resuelve (física, simulación, un motor propio). | Los dos caminos en paralelo y un prototipo mínimo del efecto antes de comprometerse. |

**Los dos caminos:**
- **Lo conocido:** las librerías que todos usan para eso (three.js, GSAP, React Three Fiber, Lenis, etc.).
- **La locura:** cómo lo resolvería alguien que escribe su propio motor: técnicas y papers, demos de Codrops o Shadertoy, experimentos virales y su código fuente.

Ejemplo de propuesta:

> "Lo que quieres lleva un efecto de tela que no trae ninguna librería. Propongo investigación rápida (unos 15 min). Pro: elegimos bien la técnica antes de construir. Contra: tardas más en ver algo. Alternativa: construir directo con three.js. Pro: ves algo ya. Contra: si no llega al efecto, se rehace."

## 3. El plan corto

Por bloques. **Cada bloque termina en algo que el usuario puede ver o jugar.** Nada de bloques de "fundaciones" invisibles.

```
**Bloque 1 · <lo que ya se va a poder ver>** (en curso)
1. <tarea>: quién la hace (yo / subagente)
2. ...
**Bloque 2 · ...**
**Al final:** pulido y la prueba del usuario.
```

El tamaño depende de quién construye:
- **Un solo agente:** una página como mucho, en el chat o en un archivo si cruza sesiones.
- **Varios subagentes en paralelo:** lo mismo, más las costuras: qué archivos toca cada uno y qué se pasan entre ellos (interfaces, mensajes, nombres compartidos), con código exacto solo ahí. Todo lo demás va como `archivo + función + qué hace`.

Nunca el código completo dentro del plan, ni pasos de TDD. El plan se actualiza conforme avanzas, no se reescribe entero.

## 4. Vueltas

Cada bloque es una vuelta:

1. **Construir** directo en la rama de trabajo, con commits chicos.
2. **Ver:** abrir la página en el navegador y usarla (scroll, clics, el efecto en movimiento). Una captura sirve como prueba para el usuario, no como un loop de verificación.
3. **Enseñar:** avisar en cuanto haya algo jugable, aunque esté feo, con la URL y qué cambió.
4. **Ajustar** con el feedback del usuario, y commit.

Tirar algo que no gustó es normal y barato: cada intento cuesta minutos, no horas.

## 5. Subagentes

- En paralelo, cada uno en su worktree, cuando las tareas no dependan entre sí. Si una depende de otra, primero esa sola; la revisas viéndola y después lanzas las demás.
- El modelo más capaz planea, integra y revisa; los ejecutores pueden ser un modelo más barato para el trabajo mecánico.
- **Antes de lanzar varios, dile al usuario el costo aproximado.**
- Cada prompt de ejecutor lleva: qué archivos toca, las reglas del proyecto, los únicos chequeos permitidos (que compile y las pruebas que ya existían; nada visual, eso lo revisa el integrador) y **"si el código no coincide con lo que te dije, para y reporta; no improvises"**.
- Sin revisión por tarea. Una sola revisión: la del integrador, viendo la página integrada.

## 6. Qué se apaga de superpowers

| Superpowers | En quick-plan |
|---|---|
| `brainstorming` | Se usa, por etapas (paso 1). |
| `writing-plans` | Se reemplaza por el plan corto (paso 3). |
| `test-driven-development` | No. Sin pruebas nuevas. |
| `subagent-driven-development` | Subagentes sí, en paralelo; sin revisión ni re-revisión por tarea, sin revisión previa ni final de rama. |
| `verification-before-completion` | Se reduce a: compila, pasan las pruebas que ya existían y se vio en el navegador. |
| `finishing-a-development-branch` | Un merge y una línea al usuario. Sin documentos de cierre. |
| Medir rendimiento en milisegundos | Solo si algo se ve lento a simple vista. |

Si el usuario pide un paso pesado, se hace. Si crees que hace falta uno, pregúntale antes y di cuánto cuesta.

## 7. Cuándo subir a superpowers completo

- Aparece algo del paso 0 a mitad del proyecto: detente, explica qué implica y recomienda el flujo completo.
- Un bug se repite dos veces: usa `superpowers:systematic-debugging` solo para ese bug y regresa a quick-plan.
- El usuario lo pide.

## Al cerrar cada bloque

- Commit y una línea al usuario: qué puede probar y dónde.
- Propón 1 o 2 ideas para el siguiente bloque, no 10.
