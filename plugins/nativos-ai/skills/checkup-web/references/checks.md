# Los checks — qué significa cada uno y cómo se juzga

El escaneo entrega observaciones. Aquí se convierten en hallazgos. Cada fila dice de
dónde sale el dato, para que el reporte pueda citar su fuente sin inventarla.

Las columnas: **Dónde mirar** es el campo del JSON de `site-scan.mjs`. **Bloque** es
dónde cae en el reporte (`references/reporte.md`): 1 = está roto, 2 = te falta,
3 = no aplica, 4 = lo tienes que hacer tú.

---

## Bloque 1 — lo que de verdad está roto

Solo lo de esta tabla justifica el tono firme. Todo lo demás se recomienda.

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| **`noindex` olvidado** | `pages[].noindex`, `site.robotsTxt.disallowAll`, y en un proyecto con framework también `middleware.ts` y `next.config.ts` | En un sitio publicado, un `noindex` de la etapa de desarrollo lo borra de Google. Igual `Disallow: /` en robots.txt. Es el hallazgo más caro de todos: el sitio existe y nadie lo encuentra, y puede pasar meses así porque desde el navegador se ve perfecto. Si el sitio todavía no se publica, es correcto tenerlo — pregunta antes de acusar. |
| **Enlaces internos rotos** | `links.broken` | Cada uno manda al visitante a un callejón sin salida. Nombra la URL rota **y desde qué páginas se enlaza** (`linkedFrom`), que es donde se arregla. **`servedFallback: true` no es una condena**: el servidor local devolvió la home, y esa ruta puede estar redirigida con 301 en producción. Contrástala con `_redirects`, `netlify.toml`, `vercel.json` o `.htaccess` antes de reportarla. |
| **Formulario que no manda a ningún lado** | `pages[].forms[].destino` | Se ve perfecto, el visitante lo llena, y no llega nada. `destino` dice qué se pudo ver, no qué concluir: `action`, `vendor-en-tag`, `onsubmit`, `vendor-en-pagina`, `handler-en-javascript`, `no-visible`. **`no-visible` NO significa muerto** — en React, Vue o Next el destino vive en el bundle. Antes de acusar, abre el código del formulario y comprueba dos cosas: adónde manda, y si eso depende de una variable de entorno que podría no existir al construir (fase 4.5 de SKILL.md). Si no puedes comprobarlo, escríbelo como "revisa que este formulario llegue a algún lado", no como acusación. |
| **Texto de plantilla en producción** | `pages[].placeholders` **y la fase 4.5** | "Lorem ipsum", `tu@correo.com`, `123-456-7890`, corchetes sin llenar. Cita la página y el marcador. **La lista de palabras es el piso, no el techo**: el texto de plantilla que sale más caro no se parece a "Lorem ipsum" — son los servicios, la ciudad o los precios de otro negocio que se quedaron del andamio, y están perfectamente escritos. Contrasta lo que dice el contenido con el negocio que identificó el perfil: si el sitio es de Arteaga y la página ofrece paseos en Valle de Bravo, ese es el hallazgo, y ningún regex lo encuentra. |
| **Botones que no llevan a nada** | `links.emptyHrefs` | Un `href="#"` en un botón real es un clic que no hace nada. Algunos son legítimos (abren un menú); mira el contexto antes de contarlo. |
| **Soft 404** | `site.notFound.soft404`, `measurable` | Una ruta inexistente que responde `200`: Google la trata como página real y la indexa vacía. **Si `measurable` es `false`, no hay hallazgo**: el sitio se sirvió con un servidor de desarrollo que devuelve la home para cualquier ruta, y eso no dice nada del sitio publicado. Búscalo en la configuración del hosting (`_redirects`, `netlify.toml`, `vercel.json`, `.htaccess`). |
| **Anclas rotas** | `pages[].brokenAnchors` | Un `#seccion` que no corresponde a ningún `id` de la página. En un sitio de una sola página es el enlace roto más probable, y ninguna verificación por código HTTP lo ve. |
| **Clave secreta a la vista** | `seguridad.clavesConForma`, y en el código la fase 4.6 de SKILL.md | Cualquiera que abra la página puede copiarla y usarla a nombre del dueño. Son secretos los tipos `openai`, `anthropic`, `stripe-secreta`, `aws`, `github`, `slack`, `sendgrid` y `llave-privada`, y cualquier `VITE_*` que guarde una llave de un servicio que cobra. **Quitarla del código no basta**: ya se publicó, así que primero se rota (una nueva en el panel del servicio y se borra la vieja) y después se saca del código. Nunca la cites completa: usa `muestra`. Los tipos que van a la vista a propósito están en la sección de seguridad. |
| **`.env` publicado o en git** | `seguridad.archivosExpuestos`, y en el código `git ls-files` | Un `/.env` o `/.git/config` que el sitio sirve se descarga como cualquier archivo. Un `.env` que git ya sube vive en el historial aunque lo borres hoy. En los dos casos, mismo remedio que arriba: rotar lo que tenga y después sacarlo. |

---

## Bloque 2 — lo que falta

### Indexación y rastreo

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| `robots.txt` | `site.robotsTxt.present` | Sin él, todo se rastrea; no es una catástrofe, pero es donde se declara el sitemap. Plantilla en `arreglos.md`. |
| `sitemap.xml` | `site.sitemap` | Debe existir, estar declarado en robots.txt (`sitemapDeclared`) y listar URLs del mismo origen. Si `otherOrigin` trae URLs, el sitemap manda a Google a la versión equivocada del sitio (http en vez de https, www en vez de sin www) y todas acaban en redirección. |
| Páginas huérfanas | `cross.orphans` | Están en el sitemap pero nadie las enlaza: el visitante no llega navegando. Un aviso de privacidad enlazado solo desde el pie **no** es huérfano; si sale en la lista, revisa que el pie exista en todas las páginas. |
| Páginas fuera del sitemap | `cross.reachedNotInSitemap` | Se llega navegando pero no están listadas. |
| **Paginador** | URLs con `/page/`, `?page=`, `/p/2` | Se desindexa con **`noindex` en esas páginas**, nunca bloqueándolas en robots.txt: robots.txt bloquea el *rastreo*, así que Google nunca llegaría a ver el `noindex` y la URL puede quedar indexada sin contenido. `rel=next/prev` está descontinuado desde 2019. Si el sitio no tiene paginador, esto va al bloque 3. |
| `llms.txt` | `site.llmsTxt.present` | Convención propuesta para que los modelos de lenguaje encuentren lo importante. Google declaró que no lo usa para sus funciones de IA; Anthropic sí lo recomienda. **Opcional, nunca un bloqueante de lanzamiento**, y se dice ese estado en la misma línea en que se sugiere. |

### Cada página se presenta bien

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| Título único y con sentido | `cross.duplicateTitles`, `pages[].title` | Dos páginas con el mismo título compiten entre ellas en Google. La longitud es una **observación**: Google recorta por ancho en pixeles y a veces reescribe el título. Lo que importa es si dice algo distinto y cierto de esa página. Nunca reportes "fuera de 50–60 caracteres" como una falla. |
| Descripción única | `cross.duplicateDescriptions` | Igual. No es un factor de posicionamiento, es lo que decide el clic. |
| Un solo H1, distinto del título | `pages[].h1`, `cross.titleEqualsH1` | Cero H1 es un hallazgo real: el visitante y el buscador no saben de qué va la página. Varios H1 son válidos en HTML5 pero suelen delatar que los encabezados se eligieron por tamaño de letra. Que el H1 repita el título palabra por palabra es una oportunidad perdida, no un error. |
| Jerarquía sin saltos | `pages[].headings` | Un `h2 → h4` significa que se eligió el encabezado por cómo se ve, no por lo que es. Molesta a quien navega con lector de pantalla. |
| `og:image` | `pages[].ogImage` | Sin ella, compartir el enlace en WhatsApp o LinkedIn muestra una caja gris. Es de los arreglos con mejor relación esfuerzo/resultado. |
| Favicon | `pages[].favicon`, `site.faviconAtRoot` | Un segundo de trabajo y se nota en cada pestaña. **Son dos campos distintos y hay que leer los dos**: `favicon: true` con `faviconAtRoot: false` significa que sí hay favicon —enlazado desde el `<head>`, normalmente un SVG— y solo falta el `.ico` en la raíz que buscan algunos rastreadores viejos. Reportar "no tienes favicon" en ese caso es falso. |
| `lang` en `<html>` | `pages[].lang` | Sin él, los lectores de pantalla leen español con pronunciación inglesa y los traductores se confunden. |
| `viewport` | `pages[].viewportMeta` | Sin él el sitio se ve diminuto en celular. Rarísimo que falte, y catastrófico cuando falta. |
| URL limpia | `pages[].urlIssues` | Conectores, mayúsculas, guiones bajos. **Para URLs nuevas.** En un sitio publicado, renombrar sin redirección 301 rompe todos los enlaces existentes y tira el posicionamiento — dilo en la misma frase o no lo sugieras. |

### Imágenes

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| `alt` | `pages[].images[].alt` | `null` = falta el atributo. `""` = presente y vacío, que es lo correcto para una imagen decorativa. No los confundas. El texto describe lo que la imagen aporta, no repite el nombre del archivo. |
| Nombre del archivo | `pages[].images[].nombreReal` | `IMG_1234.jpg`, `DSC_0042`, `captura-de-pantalla`, `imagen-final-final-2`. Google usa el nombre como pista. Usa `nombreReal` y no `src`: `next/image` y los CDN sirven `/_next/image?url=%2Ffotos%2FIMG_1234.jpg` y esconden el nombre dentro de un parámetro. Cambiarlo en un sitio publicado también rompe enlaces: mismo cuidado que con las URLs. |
| Peso | `images.measured[].bytes` | Una foto de más de un megabyte tarda en un celular con datos. `images.unweighable` lista las que no declararon tamaño e `images.remote` las que viven en otro dominio (un CDN, Unsplash): de ninguna de las dos se puede opinar, y **se nombran** en vez de desaparecer del conteo. Sin `Content-Length` no hay número, y sin número no hay hallazgo. |
| Rotas | `images.broken` | Referenciadas y no existen. Bloque 1 si son visibles en la página principal. Incluye las que traen `servedFallback: true`: el servidor devolvió el `index.html` en lugar de la imagen, y su `type` lo delata (`text/html`). Cuando eso pasa, `bytes` no significa nada y por eso viene en `null`. |

### Confianza y conversión

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| Página 404 propia | `site.notFound.looksCustom`, `measurable` | La del servidor es una pared blanca; una propia devuelve al visitante al sitio. **Con `measurable: false` no se puede afirmar ni que la hay ni que no**: el servidor local devolvió la home. Revisa si existe el archivo (`404.html`, `not-found.tsx`, `404.astro`) y la configuración del hosting. |
| Página o estado de gracias | URL con `gracias`/`thank`, o el estado tras enviar | Sirve para dos cosas: confirmarle al visitante que sí llegó, y poder medir cuántos completaron. En un one-pager basta el mensaje de confirmación. |
| Datos estructurados | `pages[].jsonLdTypes` | El tipo que corresponde al perfil (ver `perfil.md`). `__json-invalido__` significa que el JSON-LD está mal formado y no lo lee nadie — eso sí es bloque 1. |
| Migajas de pan | `signals`, HTML | Solo con jerarquía real de secciones. En un sitio plano no aportan. |
| Reseñas | Leer el HTML | Presencia, no veracidad. Si las hay, di que se ven; que sean reales va al bloque 4, porque inventarlas es un problema legal, no de diseño. |
| Foto real del equipo | Leer el HTML | Distinguir foto real de banco de imágenes requiere mirarla. Si no puedes, va al bloque 4. |
| Tiempo de respuesta prometido | Leer el HTML | "Te contestamos el mismo día" quita una duda concreta antes de que se convierta en un no. |
| CTA en la primera pantalla | Leer el HTML | Presencia. La **calidad** de la conversión no es de este skill: si eso es lo que preocupa, manda a `landing-audit`. |
| CTA fijo de llamada en móvil | `signals.fixedBarHint` + `signals.telLinks` | **Señal débil a propósito.** Confirmarlo requiere renderizar; si no lo hiciste, repórtalo como "parece que sí / no lo pude confirmar sin abrir el sitio en un navegador". |
| Botón de compartir | `signals.shareButton` | Tiene sentido en contenido; en una página de servicios, casi ninguno. |
| Mapa | `signals.mapEmbed` | Solo negocio local. |
| Etiqueta de analítica | `signals.analytics` | Presencia de GA4, GTM, Meta Pixel o Clarity. Que la propiedad esté bien configurada y recibiendo datos **no se puede ver desde fuera**: bloque 4. |
| HTTPS y variante www | `site.https`, `site.wwwVariant` | Si las dos variantes cargan y ninguna redirige a la otra, Google ve dos sitios y reparte la autoridad entre ambos. No es código: se arregla en Cloudflare, y lo guía el skill `ponla-en-google`. |

### Seguridad — sitio estático (Vite, React o HTML en Cloudflare)

Para una página sin login, sin base de datos y sin pagos. Lo grave (una clave secreta
a la vista, un `.env` publicado) está en la tabla del bloque 1; aquí va el resto.

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| **Claves que van a la vista a propósito** | `seguridad.marcas` (`web3forms`, `hcaptcha`, `turnstile`), `clavesConForma` con tipo `stripe-publicable` | **No es hallazgo.** Dilo en una línea dentro del bloque 1 (ver `reporte.md`), porque quien ve una llave en su código se asusta. La access key de Web3Forms es pública por diseño: su FAQ dice "Access key is public" y que con ella "they can only send you emails". La sitekey de hCaptcha también: "Use the sitekey in your frontend; keep the secret on your server" (docs.hcaptcha.com). Lo que nunca va en la página es la llave *secreta* de cualquier servicio. |
| Llave de Google (`google-api`) | `clavesConForma` | Maps y Firebase la usan en el navegador a propósito, así que no es bloque 1. Google pide restringirla: "You are financially responsible for charges caused by abuse of unrestricted API keys" (developers.google.com/maps/api-security-best-practices). Bloque 4: que el dueño la restrinja a su dominio en la consola de Google Cloud. |
| Variables `VITE_*` con un secreto | En el código, fase 4.6 de SKILL.md | Según la doc de Vite, "Variables prefixed with `VITE_` will be exposed in client-side source code after Vite bundling". Si guarda la llave de un servicio que cobra o un SECRET, PRIVATE, PASSWORD o TOKEN, es bloque 1 aunque la página no se haya publicado, porque la próxima build la publica. **`KEY` en el nombre no basta para acusar**: `VITE_WEB3FORMS_KEY` es la access key pública. Decide por el servicio, no por la palabra. |
| `.env` cubierto por `.gitignore` | `git check-ignore -q .env` (sale 0 si está cubierto) | Se revisa **aunque hoy no exista el `.env`**: el día que alguien cree uno con una llave, el siguiente commit la sube. Bloque 2, dicho con firmeza. `*.local` cubre `.env.local` pero no `.env`. Si `.env.example` documenta una credencial (`*_SECRET`, `*_API_KEY`, `*_SERVICE_ACCOUNT_JSON`), el que copie el ejemplo va a subir una llave privada: mismo hallazgo. |
| Formulario con protección contra spam | `seguridad.marcas` (`hcaptcha`, `turnstile`, `recaptcha`, `honeypot`); en React, el código del formulario | Sin captcha ni honeypot, un bot puede llenar el formulario una y otra vez y los mensajes reales se pierden entre la basura. Bloque 2. Las marcas se buscan en todo lo que se descargó: dicen que la protección está en el sitio, no en qué formulario. Si hay varios, confírmalo en el código. |
| hCaptcha activado en el panel de Web3Forms | `marcas` trae `web3forms` y `hcaptcha` | El captcha en la página no basta. Web3Forms: "you need to activate hCaptcha on your form to make it mandatory on each form submissions". Eso solo se ve desde el panel: **bloque 4**, pasos en `manual.md`. |
| Headers básicos | `seguridad.headers.faltan`; con `headersNoMedidos`, el archivo `_headers` en el código | Bloque 2, como recomendación. Solo tres: `X-Content-Type-Options`, `Referrer-Policy` y `X-Frame-Options`. Van en un archivo `_headers` en `public/` (plantilla en `arreglos.md`), que Workers static assets aplica a lo que sirve. **No pidas `Content-Security-Policy`**: una mal hecha rompe hCaptcha, Web3Forms, Maps o las fuentes, y nadie se da cuenta hasta que deja de llegar un mensaje. `Strict-Transport-Security` y `Permissions-Policy` se mencionan si faltan, sin exigirlas. Si el proyecto corre código propio en el Worker (`run_worker_first`, SSR), `_headers` no aplica a esas respuestas. |
| Aviso de privacidad | `pages[].links`, el pie y el formulario | Si un formulario pide nombre, correo o teléfono, recoge datos personales. **En México** la LFPDPPP (texto vigente, última reforma DOF 14-11-2025) dice en su artículo 16, fracción II, que cuando los datos se obtienen por un medio electrónico el aviso se da en modalidad simplificada. Esa versión trae al menos lo de las fracciones I a IV del artículo 15 (quién es el responsable y su domicilio, qué datos, para qué y cómo limitar su uso) y dice dónde se consulta el aviso integral. Fuente: diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf. Para un sitio mexicano con formulario es bloque 2 dicho con firmeza. **Fuera de México no afirmes nada legal**: di que revise la ley de su país. No redactes el aviso como si fuera asesoría legal. Si el sitio no recoge nada, va al bloque 3. Ojo con el peor caso, un enlace "Aviso de privacidad" con `href="#"`. |

---

## Bloque 4 — lo que solo el dueño puede hacer

Nada de esto se ve desde fuera. Pasos en `manual.md`.

Search Console conectado, con el sitemap enviado (lo guía el skill `ponla-en-google`) ·
propiedad de Analytics recibiendo datos · que las reseñas sean de clientes reales · que
la foto sea del equipo de verdad · que el negocio esté en Google Business Profile ·
hCaptcha activado en el panel de Web3Forms, si el formulario es de Web3Forms · la
llave de Google restringida a su dominio, si el sitio trae una · la intención de
búsqueda de cada página de contenido, si no la dio.

---

## Los checks de contenido — solo con la intención declarada

Se activan según `perfil.md` paso 3, y solo si el estudiante dijo qué se busca en
Google para llegar a esa página. Sin eso, van al bloque 4 con el criterio explicado.

| Qué | Cómo se juzga con la intención en la mano |
|---|---|
| La respuesta llega pronto | La pregunta se contesta en el primer bloque de texto, antes de la historia, del contexto y de la presentación de la empresa. |
| Resumen de puntos clave | Un TL;DR o 3–5 puntos, **justo después** de esa respuesta, para quien no va a leer todo. |
| CTA después del primer párrafo | Quien ya se convenció arriba no debería tener que buscar el botón hasta el final. |
| Jerarquía real | Los H2 son subtemas del H1 y los H3 subtemas de su H2. Se comprueba leyendo solo los encabezados: si de corrido no cuentan la historia de la página, la jerarquía es decorativa. |
| Preguntas frecuentes | Preguntas que la gente hace de verdad, no rellenos. El marcado `FAQPage` es opcional: **Google retiró los resultados enriquecidos de FAQ el 7 de mayo de 2026** — como nota en su documentación de datos estructurados, sin anuncio de blog — (ya estaban limitados a sitios de gobierno y salud desde 2023), así que el marcado ya no produce la caja en el buscador. No lo prometas. La sección sigue valiendo por el contenido. |
| Enlaces al mismo tema | Que la página enlace a las otras del sitio que tratan lo mismo, y que ellas la enlacen de vuelta. |
| Tablas y listas | Ayudan cuando ordenan algo comparable. **El "máximo 3 por contenido" es un número sin fuente**: se observa cuántas hay y se comenta si estorban la lectura, no se reprueba por contarlas. |
