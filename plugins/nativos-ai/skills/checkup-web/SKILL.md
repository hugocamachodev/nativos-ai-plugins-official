---
name: checkup-web
description: Un checkup completo del sitio antes (o después) de publicarlo. Recorre todas las páginas, entiende de qué tipo de negocio es para no exigir lo que no aplica, y reporta lo que está roto, lo que falta y lo que solo el dueño puede hacer. Revisa lo que rompe sitios de verdad — un noindex olvidado del desarrollo, enlaces internos muertos, formularios que no mandan a ningún lado, "Lorem ipsum" en producción, imágenes sin comprimir — además de robots.txt, sitemap, página 404, títulos y descripciones únicas por página, alt en imágenes, datos estructurados, política de privacidad y la etiqueta de Analytics. Si el código está en la carpeta, ofrece arreglar lo seguro. Úsalo siempre que alguien vaya a lanzar un sitio o quiera saber qué le falta — "revisa mi sitio antes de publicarlo", "¿qué me falta antes de lanzar?", "hazle un checkup a mi página", "chécame el SEO técnico", "¿está bien configurado mi sitio?", "me falta algo antes de subirlo", "revisa que no haya links rotos", "check my site before launch" — aunque solo peguen una URL o apunten a una carpeta. NO es para saber por qué una landing no convierte (eso es landing-audit), NO es para extraer el contenido de un sitio (eso es web-scrape).
---

> **Rutas:** `${CLAUDE_PLUGIN_ROOT}` apunta a la carpeta del plugin instalado. Nunca uses
> rutas relativas: Bash corre desde el proyecto del usuario, no desde el skill. Si la
> variable llega vacía, el plugin está en
> `~/.claude/plugins/cache/nativos-ai-marketplace/nativos-ai/<version>/` — encuéntralo con
> un `ls` de esa carpeta y usa la ruta absoluta que salga.

## Cómo se escribe esto (no negociable)

- Directo. Sin preámbulos, sin "¡Buena pregunta!", sin resumen de cierre.
- Hallazgos en tabla o lista apretada, no envueltos en prosa.
- **Recomendar, no dictar.** El registro por defecto es "yo cambiaría X porque Y". El
  tono firme se reserva para el bloque 1 del reporte — lo que de verdad está roto.
- Nunca una calificación con cara de examen. Nadie aprende de un 62/100.

## Quién lo va a leer

Alguien que acaba de construir su primer sitio, probablemente con ayuda de IA, y no
sabe qué es un canonical ni tiene por qué saberlo. Cada hallazgo se escribe para que
esa persona entienda **qué pasa, por qué le importa y qué hacer**. Si un hallazgo no
se puede explicar en una línea sin jerga, la jerga sobra o el hallazgo no vale.

## Flujo

**0 · De qué sitio hablamos.** Una URL en vivo, o una carpeta con el código, o las dos.
Si hay carpeta, resuelve qué servir:
```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/landing-audit/scripts/detect-build.mjs" --project <dir>
```
Devuelve el plan en JSON. Hónralo: `ask-install` significa **preguntar**
(`landing-audit/references/deps.md`), `require-url` significa que es un export de
constructor de páginas y necesitas la URL en vivo. Después `--build <dir>` si hace falta.

Para servir, dos cosas que el `--help` dice y son fáciles de pasar por alto:

```bash
# --serve SE QUEDA EN PRIMER PLANO. Al fondo, y la url se lee de su salida.
node ".../detect-build.mjs" --serve <dir> > /tmp/checkup/serve.log 2>&1 &
```

Y al terminar, **`--stop` con la url del servidor que tú levantaste**:

```bash
node ".../detect-build.mjs" --stop <url>
```

`--stop` a secas mata **todos** los servidores de `detect-build` de la máquina,
incluido el de otra auditoría corriendo en paralelo. Pasa la url siempre que la tengas.

**Si el proyecto necesita instalar dependencias y la respuesta es no** —el caso más
común, porque un proyecto recién clonado no trae `node_modules`— no hay sitio que
servir. **No te quedes sin nada que decir: pasa al modo solo-código**, más abajo. Es
una revisión completa y honesta, solo que declara qué no pudo medir.

**1 · Escanear.** Un solo comando; el resto del checkup se construye sobre su salida:
```bash
mkdir -p /tmp/checkup
node "${CLAUDE_PLUGIN_ROOT}/skills/checkup-web/scripts/site-scan.mjs" \
  --url <url> --dump-dir /tmp/checkup/html \
  --site-url <dominio-real-si-lo-hay> > /tmp/checkup/scan.json
```

`--dump-dir` guarda el HTML de cada página; la fase 3 lo necesita. `--site-url` es el
dominio de producción, y solo hace falta cuando revisas la carpeta servida en local:
sin él, HTTPS, la variante `www` y el sitemap **no se pueden juzgar**, y el escaneo los
devuelve como no medidos (`site.notMeasured`) en vez de acusar al sitio por estar
corriendo en `127.0.0.1`. Si el estudiante no tiene dominio todavía, no lo pases: no
medido es la respuesta correcta.
El script emite **observaciones, nunca veredictos** — el juicio es tuyo, contra
`references/checks.md`, para que evidencia y opinión no se suelden en silencio.

Si `pages[].signals.looksLikeEmptyShell` sale `true`, el sitio es una SPA y el escaneo
vio un cascarón vacío. Renderiza cada página con
`landing-audit/scripts/audit-cdp.mjs --url <url> --dump-html <archivo>` y juzga sobre
eso; dilo en el reporte.

**Y mira `site.notFound.isHomeFallback` antes de tocar el bloque 1.** Un servidor de
desarrollo —el de `detect-build.mjs` incluido— devuelve la home con código `200` para
cualquier ruta, porque así funcionan las SPA. El escaneo lo detecta y pone
`measurable: false`: cuando eso pasa, **no hay nada que concluir sobre la página 404
desde el servidor**, y lo que responda el sitio publicado lo decide la configuración
del hosting. Búscala en el repositorio (`_redirects`, `netlify.toml`, `vercel.json`,
`.htaccess`, `next.config`) y juzga con eso. Afirmar "tienes soft 404" o "sí tienes
404 propia" a partir de un servidor local es inventar.

**2 · Perfilar.** `references/perfil.md`. Primero **forma** (una página o varias),
después **tipo de negocio**. En un one-pager, títulos únicos por página, enlazado
interno, migajas de pan y paginador son estructuralmente *no aplica* — casi la mitad
de la lista. Determinar esto antes de juzgar es lo que separa un checkup útil de una
lista de reproches genéricos.

Al perfilar puedes preguntar **hasta dos cosas**, y solo si la respuesta no está en el
escaneo. La regla es la misma que en todo el plugin:
**nunca preguntes algo que ya está en la página**, y nunca algo que un principiante no
pueda contestar. "¿Tienes datos estructurados?" es una pregunta defectuosa; "¿La gente
te visita en un local físico?" es una buena.

**3 · Medir por página.** Las mediciones de texto salen de aquí, sobre el HTML que ya
tienes:
```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/landing-audit/scripts/seo_checker.py" --file <html> --json
```
**Toma sus mediciones y tira sus campos `pass` y `score`.** El script marca como falla
un title fuera de 50–60 caracteres y una descripción fuera de 150–160: son
convenciones de agencia presentadas como estándar. Google recorta por ancho en píxeles
y a veces reescribe el título él solo, así que **la longitud es una observación** y el
veredicto lo pones tú, mirando si el título dice algo distinto y cierto de esa página.
Reportar "fuera de 50–60 caracteres" como un defecto es un defecto del reporte.

Y una medición suya está mal, no solo su veredicto: **`image_alt_text` cuenta como
"falta alt" las imágenes que llevan `alt=""` a propósito.** Un `alt` vacío es la forma
correcta de marcar una imagen decorativa; el script las suma a las que no tienen el
atributo. Para `alt`, usa `pages[].images[].alt` del escaneo, que sí distingue `null`
de `""`. De `seo_checker.py` son fiables: title, meta description, conteo de H1,
jerarquía de encabezados, conteo de palabras y viewport.

**4 · Juzgar.** `references/checks.md`, punto por punto. Cada hallazgo dice de dónde
salió: del escaneo, de leer el HTML renderizado, o de que no se pudo medir.

**4.5 · Mirar el código, no solo lo servido.** Cuando hay carpeta, el escaneo ve el
sitio *compilado* y hay cosas que solo existen en el origen. Estas tres han sido, en
pruebas reales, los hallazgos más caros del checkup — y ninguna sale del escaneo:

| Dónde | Qué buscas |
|---|---|
| Archivos de contenido y datos (`lib/data/`, `content/`, `data/`, los `.json` y `.ts` que alimentan la página) | Texto de plantilla que ninguna lista de palabras encuentra: servicios, ciudades o precios de otro negocio que se quedaron del andamio. Un sitio de Coahuila anunciando experiencias de Valle de Bravo pasa limpio por el detector de "Lorem ipsum". Contrasta lo que dice el contenido con el negocio que identificó el perfil. |
| Comentarios `TODO`, `FIXME`, `placeholder`, `pendiente` | Suelen marcar datos inventados que llegaron a producción: una calificación, un teléfono, un número de reseñas. |
| Variables de entorno (`.env.example` sin su `.env`, `NEXT_PUBLIC_*`, `VITE_*`) | Si el formulario, el chat o el botón de pago dependen de una variable que no está, en la build se desactivan **en silencio**. El botón se ve perfecto y no manda nada. Confírmalo aquí antes de decir que un formulario funciona o que no. |

**Modo solo-código.** Si no se pudo servir el sitio —dijeron que no a instalar, la
build falla, es un export que necesita url— haz el checkup leyendo el código. Se puede
juzgar casi todo: títulos y descripciones, encabezados, `alt`, datos estructurados,
`lang`, `og:image`, política de privacidad, etiqueta de analítica, `robots.ts` y
`sitemap.ts`, y todo lo de la tabla de arriba. Lo que **no**: enlaces rotos en vivo,
qué código devuelve una ruta inexistente, peso real de las imágenes servidas, HTTPS y
`www`. Eso va a la tabla de no medidos con su motivo. Abre el reporte diciendo que fue
una revisión del código y no del sitio funcionando — el lector tiene que saber hasta
dónde llega lo que le estás diciendo.

**5 · Reportar.** `references/reporte.md`. Cuatro bloques, en ese orden. Lo que no se
pudo medir se declara; no se rellena con opinión.

**6 · Ofrecer arreglar.** Solo si el código fuente está en la carpeta.
`references/arreglos.md`. Enseña la lista de lo que tocarías **antes** de tocar nada y
espera el sí. El silencio no es un sí.

## Lo que este checkup no hace

- **No dice por qué una landing no convierte.** Eso es `landing-audit`, que mide
  contraste, jerarquía visual y fricción del formulario en una sola página. Si la
  pregunta es de conversión, mándalo para allá.
- **No mide velocidad en un servidor de desarrollo.** El peso de las imágenes sí es
  real ahí; los tiempos no.
- **No renombra URLs de un sitio publicado.** Cambiar una URL sin redirección 301 rompe
  todos los enlaces que apuntaban ahí y tira el posicionamiento acumulado. Se
  recomienda para URLs nuevas y se dice el costo para las viejas.
- **No revisa accesibilidad** más allá de `alt` y `lang`. Contraste, foco de teclado,
  etiquetas de formulario y lectores de pantalla son de `landing-audit`.
- **No promete resultados.** Ni conversión, ni posiciones, ni tráfico.

## Guardrails

- **Nunca instales nada sin preguntar**, y el silencio no es un sí.
- Este skill usa scripts y referencias que viven en `landing-audit`, dentro del mismo
  plugin. Si esas rutas no resuelven, el plugin está incompleto: dilo en vez de
  improvisar un sustituto.
- **`NO MEDIDO` no es `ROTO`.** Una herramienta que faltó deja algo sin medir; se dice
  cuál y por qué.
- Toda cifra pasa por `landing-audit/references/forbidden-numbers.md` antes de salir.
- **Nunca documentes un comando sin haber corrido su `--help` primero.**
- Si el sitio tiene más páginas que el tope del escaneo (`hitPageCap: true`), dilo: el
  checkup vio una parte, no el todo.

## Verificación antes de entregar

- [ ] El perfil se determinó antes de juzgar, y el reporte dice qué se apagó y por qué.
- [ ] Cada hallazgo dice de dónde salió y cada cosa no medida dice por qué.
- [ ] Fuera del bloque 1, nada está escrito en tono de regaño.
- [ ] Ningún número del reporte aparece en `forbidden-numbers.md`.
- [ ] Ninguna pregunta del perfil tenía su respuesta en el escaneo.
- [ ] Ningún hallazgo del bloque 1 salió de un servidor con `isHomeFallback: true`.
- [ ] Si se usó `detect-build.mjs`, se llamó `--stop <url>` —con la url, no a secas— y
      no quedó ningún servidor vivo. El propio `--stop` responde qué detuvo.

## Qué leer y cuándo

| Lee esto… | …cuando |
|---|---|
| `references/perfil.md` | Antes de juzgar nada: qué tipo de sitio es y qué checks se apagan. |
| `references/checks.md` | Al juzgar cada punto: qué significa, cómo se verifica, cuándo no aplica. |
| `references/arreglos.md` | Al ofrecer arreglar: plantillas de robots.txt, sitemap, llms.txt, datos estructurados, 404. |
| `references/manual.md` | Al escribir el bloque 4: Analytics, Search Console, enviar el sitemap. |
| `references/reporte.md` | Al escribir el reporte: orden, registro, cómo se dice lo que no se midió. |
| `landing-audit/references/forbidden-numbers.md` | Antes de que salga cualquier cifra. Siempre. |
