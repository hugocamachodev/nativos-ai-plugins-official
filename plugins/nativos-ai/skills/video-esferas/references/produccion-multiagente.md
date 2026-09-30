# Producir con subagentes en paralelo

Para cortos de más de ~6 escenas, o cuando el usuario quiere velocidad, reparte escenas entre
subagentes. Tú eres el director: escribes los encargos, revisas y unes. Cuesta más tokens
que hacerlo en una sola sesión; dilo antes y deja que el usuario decida.

## Antes de lanzar

1. Guion aprobado (`SCRIPT.md`) y biblia al día (`LOOK.md`): reglas, zonas seguras y una
   **tabla de producción** con, por escena: id, duración objetivo, qué pasa, dueño, cómo
   entra (qué hay en el último segundo de la anterior) y cómo sale.
2. Motor y herramientas estables: `core/`, `render.cjs`, `main.js` los tocas solo tú.
3. Dueños sin cruces: cada agente edita solo sus archivos (`scenes/<id>.js` y
   `scenes/<id>/`). Lo compartido (`scenes/_assets/`) es de solo lectura: quien necesite un
   cambio lo copia a su carpeta. Dos agentes nunca escriben el mismo archivo.
4. Agrega los ids nuevos a `ORDER`: `main.js` salta con un aviso las escenas que aún no
   existen, así la película siempre arma con lo que hay.

## El encargo (una parte común + una por escena)

````text
[COMÚN]
Proyecto (ruta entre comillas): …
Lee primero LOOK.md, SCRIPT.md, core/engine.js y core/dots.js; luego solo tus archivos.
El cliente dijo, textual: «…»
Ritmo (no negociable): tomas ≥ 2.5 s, momentos clave ≥ 4 s, texto legible ≥ 2 s y nunca en
el primer/último segundo; primer y último segundo listos para el fundido de 0.8 s.
Proceso: respalda tu archivo como scenes/<id>.rNbase.js antes de editar; itera con hojas de
contactos (≤ 12 cuadros, ≤ ~20 imágenes vistas en total, ≤ 3 rondas); al final fotos a
--ss=2 en review/<id>/ y un bench. Revisa tus uniones con --only=vecina,tuya.
La máquina la comparten varios agentes: nunca lances renders en paralelo tú mismo.
Edita solo tus archivos. Si un comando falla por un error transitorio, reintenta.

[TU ESCENA]
Dueño de: scenes/<id>.js (+ scenes/<id>/).
Estado actual (si es corrección): hoja review/…jpg; qué está mal y por qué.
Qué construir: tomas con duración mínima, momentos clave, texto exacto.
Entra desde: … (último segundo de la anterior; dile si otro agente la está rehaciendo).
Sale hacia: … (primer segundo de la siguiente).

[INFORME]
Archivos; por escena id, dur, xin, hoja, foto final, ms/cuadro a ss=2; lista de tomas con
inicio/fin; cada texto con su ventana legible; cómo son el primer y último segundo;
resumen (≤ 150 palabras) y riesgos.
````

Pide el informe con esquema (lista de tomas con tiempos y ventanas de texto): así revisas el
ritmo con números, porque ni tú ni el agente pueden ver el video.

## Cómo lanzarlos

- Con la herramienta Workflow (si el usuario aceptó orquestar agentes): un `parallel()` de
  llamadas `agent()`, una por grupo de escenas, con `effort: 'max'` para las escenas héroe y
  `'high'` para ajustes de ritmo o escenas sencillas. Máximo ~5 a la vez: todos renderizan
  con la misma tarjeta gráfica.
- Con subagentes sueltos (herramienta Agent), en segundo plano, uno por grupo.
- Agrupa escenas que comparten modelo o se tocan (por ejemplo, un agujero negro y la caída
  hacia él): un solo dueño asegura la continuidad.

## Después: revisión del director

1. Lee los informes: suma duraciones, compara tomas y ventanas de texto con las reglas.
2. Mira las hojas de cada escena y revisa **cada unión** a 0.1 s: el agente validó la suya
   contra una vecina que quizá seguía en obra.
3. Arregla lo pequeño tú mismo (un tamaño, un tempo con `REMAP`, un estado de desenfoque
   que se hereda); relanza un agente solo para lo grande.
4. Video de prueba para el usuario, sus notas, siguiente ronda.

## Cuánto costó «Interstellar en esferas» (referencia para estimar)

Precios de API de Claude Opus 5.5; el usuario lo pagó con su suscripción.

| Ronda | Agentes | Tokens procesados | Equivalente API |
|---|---|---|---|
| 5 escenas de prueba de estilo (2 rondas) | 5 | ~218 M | ~US$92 |
| Producción de 7 escenas | 7 | ~55 M | ~US$23 |
| Correcciones, fondos y ritmo (6 tandas) | 20 | ~224 M | ~US$82 |
| Director (sesión principal, todo el proyecto) | 1 | ~99 M | ~US$47 |
| **Total (2:20, 14 escenas, ~14.5 h)** | **33** | **~595 M** | **~US$244** |

El 97% de los tokens son relecturas del contexto en caché, que cuestan poco; lo nuevo fueron
~18 M de entrada y ~1.6 M escritos. Un corto de 1 minuto hecho en una sola sesión cuesta una
fracción de eso.

## Errores que ya pasaron

- Documentación vieja: los agentes siguen `LOOK.md` al pie de la letra. Actualízalo antes de
  lanzar (reglas de texto, duraciones, zonas seguras).
- Un agente «arregla» un modelo compartido y rompe tres escenas: por eso lo compartido es de
  solo lectura.
- Más de ~5 agentes renderizando a la vez saturan la GPU y la memoria.
- Un render lanzado por una herramienta con límite de tiempo se corta y deja un MP4 roto:
  los renders largos van con `nohup … &`.
