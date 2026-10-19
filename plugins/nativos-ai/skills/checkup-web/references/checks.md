# Los checks — qué significa cada uno y cómo se juzga

El escaneo entrega observaciones. Aquí se convierten en hallazgos. Cada fila dice de
dónde sale el dato, para que el reporte pueda citar su fuente sin inventarla.

Las columnas: **Dónde mirar** es el campo del resumen que entrega `site-scan.mjs`, la
salida sin `--full`. Lo que solo trae `--full` no se cita aquí. **Bloque** es
dónde cae en el reporte (`references/reporte.md`): 1 = está roto, 2 = te falta,
3 = no aplica, 4 = lo tienes que hacer tú.

---

## Bloque 1 — lo que de verdad está roto

Solo lo de esta tabla justifica el tono firme. Todo lo demás se recomienda.

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| **`noindex` olvidado** | `pages[].noindex`, `site.robotsTxt.disallowAll`, y en un proyecto con framework también `middleware.ts` y `next.config.ts` | En un sitio publicado, un `noindex` de la etapa de desarrollo lo borra de Google. Igual `Disallow: /` en robots.txt. Es el hallazgo más caro de todos: el sitio existe y nadie lo encuentra, y puede pasar meses así porque desde el navegador se ve perfecto. Si el sitio todavía no se publica, es correcto tenerlo — pregunta antes de acusar. |
| **Enlaces internos rotos** | `links.broken` | Cada uno manda al visitante a un callejón sin salida. Nombra la URL rota **y desde qué páginas se enlaza** (`linkedFrom`), que es donde se arregla. **`servedFallback: true` no es una condena**: el servidor local devolvió la home, y esa ruta puede estar redirigida con 301 en producción. Contrástala con `_redirects`, `netlify.toml`, `vercel.json`, `.htaccess` o el `wrangler.jsonc` antes de reportarla. |
| **Formulario que no manda a ningún lado** | `pages[].formularios[].destino` | Se ve perfecto, el visitante lo llena, y no llega nada. `destino` dice qué se pudo ver, no qué concluir: `action`, `vendor-en-tag`, `onsubmit`, `vendor-en-pagina`, `handler-en-javascript`, `no-visible`. **`no-visible` NO significa muerto** — en React, Vue o Next el destino vive en el bundle. Antes de acusar, abre el código del formulario y comprueba dos cosas: adónde manda, y si eso depende de una variable de entorno que podría no existir al construir (fase 4.5 de SKILL.md). Si no puedes comprobarlo, escríbelo como "revisa que este formulario llegue a algún lado", no como acusación. |
| **Se mueve de lado en el celular** | `celular` del render a 375 px (fase 1.5 de SKILL.md): `hasHorizontalScroll`, `excessPx`, `offenders` | La página es más ancha que la pantalla: el visitante la arrastra de lado con el dedo, el texto se corta y todo se ve chueco. Nombra cada elemento de `offenders` con su `selector`, su `width` y el `text` que trae, porque así lo encuentra en su código. Si trae `transform: true`, casi siempre es una animación de entrada que arranca fuera de su lugar (en React, un `initial={{ x: 100 }}`): se arregla en la animación, no en el elemento. Ya vienen fuera los menús escondidos (`position: fixed`) y los carruseles que se recortan solos. **Sin scroll pero con `offenders`**, y `overflowX` de `html` o `body` en `hidden` o `clip`: no se mueve, pero lo que se sale queda cortado. Eso es bloque 2, "revisa que no se corte nada", no roto. |
| **Formulario que deja mandar vacío** | `formularios.forms[]` del render (`nativeBlocksEmpty`, `noValidate`, `fields[].required`) **y el código del formulario** | Alguien aprieta enviar sin escribir nada y al dueño le llega un mensaje en blanco, o el visitante cree que mandó algo que no sirve. `nativeBlocksEmpty: false` solo dice que **el navegador** no lo detiene. `noValidate: true` apaga todos los `required`, y React Hook Form o un formulario hecho a mano lo ponen a propósito porque validan en JavaScript. Antes de acusar, abre el código: el `onSubmit`, una función que revisa los campos, `zod`, `yup`, `register(..., { required })`. **Es bloque 1 solo si el código confirma que no revisa nada.** Sin código, va al bloque 2 escrito como "revisa que no se pueda mandar vacío", igual que la fila de arriba. Nunca lo compruebes apretando enviar: le llega un mensaje real al dueño. |
| **Texto de plantilla en producción** | `pages[].placeholders` **y la fase 4.5** | "Lorem ipsum", `tu@correo.com`, `123-456-7890`, corchetes sin llenar. Cita la página y el marcador. **La lista de palabras es el piso, no el techo**: el texto de plantilla que sale más caro no se parece a "Lorem ipsum" — son los servicios, la ciudad o los precios de otro negocio que se quedaron del andamio, y están perfectamente escritos. Contrasta lo que dice el contenido con el negocio que identificó el perfil: si el sitio es de Arteaga y la página ofrece paseos en Valle de Bravo, ese es el hallazgo, y ningún regex lo encuentra. |
| **Botones que no llevan a nada** | `links.emptyHrefs` | Un `href="#"` en un botón real es un clic que no hace nada. Algunos son legítimos (abren un menú); mira el contexto antes de contarlo. |
| **Soft 404** | `site.notFound.soft404`, `measurable` | Una ruta inexistente que responde `200`: Google la trata como página real y la indexa vacía. **Si `measurable` es `false`, no hay hallazgo**: el sitio se sirvió con un servidor de desarrollo que devuelve la home para cualquier ruta, y eso no dice nada del sitio publicado. Búscalo en la configuración del hosting (`_redirects`, `netlify.toml`, `vercel.json`, `.htaccess`, `not_found_handling` en `wrangler.jsonc`). En Workers, `"single-page-application"` devuelve la home con `200` para cualquier ruta: eso es un soft 404 en el sitio publicado. |
| **Se ve sin candado** | `site.httpVersion` (`status`, `redirectsToHttps`, `servesWithoutHttps`) | El escaneo pide `http://` sin seguir redirecciones. Si responde `200` (`servesWithoutHttps: true`), quien llegue por un enlace viejo o escriba `http://` ve la página con "No seguro" junto a la dirección, y lo que mande por el formulario viaja sin cifrar. En un dominio propio en Cloudflare se arregla con un interruptor, *Always Use HTTPS* (lo guía `ponla-en-google`). **En una dirección de prueba como `*.workers.dev`** el dueño no controla ese interruptor: no es bloque 1, es una línea en el bloque 2, "cuando conectes tu dominio, activa *Always Use HTTPS*". Si redirige pero con `302` o `307` (`permanent: false`), funciona, pero Google la trata como temporal: bloque 2, que sea `301`. Sin `httpVersion` (sitio en local o url `http://`), mira `site.https` y `notMeasured`. |
| **Anclas rotas** | `pages[].brokenAnchors` | Un `#seccion` que no corresponde a ningún `id` de la página. En un sitio de una sola página es el enlace roto más probable, y ninguna verificación por código HTTP lo ve. |
| **Clave secreta a la vista** | `seguridad.clavesConForma`, y en el código la fase 4.6 de SKILL.md | Cualquiera que abra la página puede copiarla y usarla a nombre del dueño. Son secretos los tipos `openai`, `anthropic`, `stripe-secreta`, `supabase-secreta`, `aws`, `github`, `slack`, `slack-webhook`, `discord-webhook`, `telegram`, `sendgrid` y `llave-privada`; una `google-api` cuando `marcas` trae `gemini` (ver la fila de la llave de Google), y cualquier `VITE_*` que guarde una llave de un servicio que cobra. **Quitarla del código no basta**: ya se publicó, así que primero se rota (una nueva en el panel del servicio y se borra la vieja) y después se saca del código. Nunca la cites completa: usa `muestra`. Los tipos que van a la vista a propósito están en la sección de seguridad. |
| **`.env` publicado o en git** | `seguridad.archivosExpuestos`, `seguridad.archivosEnCarpeta`, y en el código el comando 2 de la fase 4.6 | Un `/.env` o `/.git/config` que el sitio publicado entrega se descarga como cualquier archivo. Un `.env` que pasó por git vive en el historial aunque hoy ya no esté. En los dos casos, lo que tenga se rota primero. Después, el `.env` se saca de la carpeta que se publica, y el `.git` se excluye con `.assetsignore` (plantilla en `arreglos.md`). **Nunca le digas que borre la carpeta `.git`**: es su repositorio. **`archivosEnCarpeta` no es esto todavía**: dice qué hay en la carpeta que se sirvió en local, no qué se publicó. Solo es bloque 1 si el wrangler publica esa misma carpeta (`assets.directory` en `"./"` o `"."`) y `.assetsignore` no los excluye. Si publica `dist` o `public`, no se suben y no hay hallazgo. |

**Datos de muestra puestos a propósito.** Si quien pide el checkup dice que el sitio es
una demo, una plantilla o material de clase, los datos de relleno (teléfonos `0000`, un
correo `.example`, clientes de muestra, un WhatsApp sin número) siguen en el bloque 1,
porque un visitante real no podría contactar a nadie, pero **sin tono firme**: un solo
hallazgo, "datos de muestra que se cambian antes de publicar de verdad", con dónde está
cada uno y sin explicar uno por uno por qué está mal. Lo decide lo que dijo la persona,
no la forma del dato: en un sitio real, un teléfono `0000` está roto y se dice firme. El
escaneo no los encuentra (`placeholders` busca `example.com`, no el dominio `.example`):
salen de leer la página.

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

El resumen quita los campos vacíos para no gastar lectura. Por eso cada página trae
`faltan`: la lista de lo que **no existe** en ella (`title`, `metaDescription`,
`canonical`, `lang`, `ogImage`, `ogSiteName`, `twitterCard`, `twitterImage`). Un campo
que no sale y no está en `faltan` no se midió; uno que está en `faltan` no está en la
página.

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| Título único y con sentido | `cross.duplicateTitles`, `pages[].title` | Dos páginas con el mismo título compiten entre ellas en Google. La longitud es una **observación**: Google recorta por ancho en pixeles y a veces reescribe el título. Lo que importa es si dice algo distinto y cierto de esa página. Nunca reportes "fuera de 50–60 caracteres" como una falla. |
| Descripción única | `cross.duplicateDescriptions` | Igual. No es un factor de posicionamiento, es lo que decide el clic. |
| Un solo H1, distinto del título | `pages[].h1`, `cross.titleEqualsH1` | Cero H1 es un hallazgo real: el visitante y el buscador no saben de qué va la página. Varios H1 son válidos en HTML5 pero suelen delatar que los encabezados se eligieron por tamaño de letra. Que el H1 repita el título palabra por palabra es una oportunidad perdida, no un error. |
| Jerarquía sin saltos | `pages[].saltosJerarquia`, `pages[].encabezados` | Un `h2 → h4` significa que se eligió el encabezado por cómo se ve, no por lo que es. Molesta a quien navega con lector de pantalla. |
| `canonical` | `pages[].canonical`, `faltan` | Le dice a Google cuál es la dirección oficial de la página cuando se puede abrir de varias formas (con y sin `www`, con `?utm=` al final). Sin él, Google escoge solo y casi siempre acierta: recomendación, sobre todo si la variante `www` no redirige. Si apunta a **otra** página, a otro dominio o a `http://`, le está pidiendo a Google que muestre esa en vez de esta: eso va al bloque 1, junto al `noindex`. |
| `og:image` | `pages[].ogImage`, `pages[].faltan` | Sin ella, compartir el enlace en WhatsApp o LinkedIn muestra una caja gris. Es de los arreglos con mejor relación esfuerzo/resultado. Que no exista se lee en `faltan`, no en que el campo no salga. **Si empieza con `/`** (`/img/og.jpg`) es relativa, y el protocolo Open Graph pide una URL completa: varias redes no la cargan. Yo la cambiaría por `https://tusitio.com/img/og.jpg`. |
| Tarjeta de X y nombre del sitio | `pages[].twitterCard`, `twitterImage`, `ogSiteName`, `faltan` | Recomendación, nunca roto. Lo que vale la pena es `twitter:card` = `summary_large_image`, que en X muestra la foto grande en vez de un cuadrito. **Que falte `twitter:image` no es hallazgo si hay `og:image`**: X la usa de respaldo. Al revés sí: un `summary_large_image` sin `og:image` ni `twitter:image` promete una foto grande que no existe, y el arreglo es la `og:image`. `og:site_name` pone el nombre del negocio arriba de la tarjeta en Facebook y LinkedIn; es un detalle, va al final de la lista. |
| Favicon | `pages[].favicon`, `site.faviconAtRoot` | Un segundo de trabajo y se nota en cada pestaña. **Son dos campos distintos y hay que leer los dos**: `favicon: true` con `faviconAtRoot: false` significa que sí hay favicon —enlazado desde el `<head>`, normalmente un SVG— y solo falta el `.ico` en la raíz que buscan algunos rastreadores viejos. Reportar "no tienes favicon" en ese caso es falso. |
| `lang` en `<html>` | `pages[].lang` | Sin él, los lectores de pantalla leen español con pronunciación inglesa y los traductores se confunden. |
| `viewport` | `pages[].viewportMeta` | Sin él el sitio se ve diminuto en celular. Rarísimo que falte, y catastrófico cuando falta. Que la etiqueta exista no dice que la página quepa: eso es la fila "Se mueve de lado en el celular" del bloque 1. |
| URL limpia | `pages[].urlIssues` | Conectores, mayúsculas, guiones bajos. **Para URLs nuevas.** En un sitio publicado, renombrar sin redirección 301 rompe todos los enlaces existentes y tira el posicionamiento — dilo en la misma frase o no lo sugieras. |

### El formulario

Del render a 375 px (`formularios.forms[].fields[]`). Cada campo trae `kind`: `correo`,
`telefono`, `mensaje` u `otro`, adivinado por su tipo, su nombre y su etiqueta. El
honeypot `botcheck` y los campos escondidos ya vienen fuera. **Todo esto es
recomendación**, salvo que el formulario deje mandar vacío (bloque 1). En React, si un
atributo no está, mira el código antes de escribirlo: puede validar en JavaScript, y
entonces no hay hallazgo. Si el sitio no tiene formulario, la sección va al bloque 3.

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| Correo con `type="email"` | `kind: "correo"` con `type` distinto de `email` | Con `email` el celular saca el teclado con la @ y el navegador avisa si lo escrito no tiene forma de correo. Sin él, un correo mal escrito llega y el dueño no puede contestar. |
| Teléfono con `type="tel"` | `kind: "telefono"`: `type`, `inputmode`, `pattern` | `tel` saca el teclado de números. **Ni `type="tel"` ni `inputmode` impiden escribir letras**: MDN dice que `tel` no impone ningún formato, e `inputmode` solo cambia el teclado. Lo que sí las rechaza es un `pattern` (y solo si el form no trae `noValidate`) o una revisión en el código, como una expresión que pida 10 dígitos. Si no hay ninguna de las dos, yo agregaría una. |
| Obligatorios marcados | `required`, `labelHasAsterisk` | Un campo con `*` en la etiqueta y sin `required` ni revisión en el código promete algo que no cumple. Los que el dueño necesita para contestar (nombre y una forma de contacto) deberían ser obligatorios. Si `noValidate` es `true`, el `required` solo sirve de marca: la validación tiene que estar en el código. |
| Límite de largo en el mensaje | `kind: "mensaje"`, `maxlength` | Sin límite, alguien puede pegar un texto gigante o un bot llenar la caja de basura. Unos 2000 caracteres alcanzan de sobra para un mensaje real; es criterio de la casa, no un estándar. En React también cuenta un límite en el código. |

### Imágenes

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| `alt` | `pages[].imagenes` (`sinAlt`, `altVacio`, `ejemplosSinAlt`) | `sinAlt` = les falta el atributo. `altVacio` = lo traen vacío, que es lo correcto para una imagen decorativa. No los sumes. `ejemplosSinAlt` nombra hasta cinco de las que no lo traen. El texto describe lo que la imagen aporta, no repite el nombre del archivo. |
| Nombre del archivo | `pages[].imagenes.nombresGenericos` | `IMG_1234.jpg`, `DSC_0042`, `captura-de-pantalla`, `imagen-final-final-2`. Google usa el nombre como pista. El escaneo ya saca el nombre real aunque `next/image` o un CDN lo escondan en un parámetro (`/_next/image?url=%2Ffotos%2FIMG_1234.jpg`), y lista hasta cinco. Cambiarlo en un sitio publicado también rompe enlaces: mismo cuidado que con las URLs. |
| Peso | `images.pesadas` (`url`, `kb`) | Las que pasan de 500 KB, de la más pesada a la más ligera. Ese corte es criterio de la casa, no un estándar: una foto así ya tarda en un celular con datos, y el hallazgo es el peso en `kb`, no el haber cruzado la raya. `images.sinPesoDeclarado` cuenta las que no declararon tamaño, `images.remotas` las que viven en otro dominio (un CDN, Unsplash; `ejemplosRemotas` nombra hasta cinco) e `images.noMedidas` las que pasaron del tope. De ninguna se puede opinar, y **se dice cuántas** en vez de desaparecerlas del conteo. Sin `Content-Length` no hay número, y sin número no hay hallazgo. |
| Rotas | `images.rotas` | Referenciadas y no existen. Bloque 1 si son visibles en la página principal. Incluye las que traen `servedFallback: true`: el servidor devolvió el `index.html` (llegó como `text/html`) en lugar de la imagen. |

### Confianza y conversión

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| Página 404 propia | `site.notFound.looksCustom`, `measurable` | La del servidor es una pared blanca; una propia devuelve al visitante al sitio. **Con `measurable: false` no se puede afirmar ni que la hay ni que no**: el servidor local devolvió la home. Revisa si existe el archivo (`404.html`, `not-found.tsx`, `404.astro`) y la configuración del hosting: en Workers, sin `not_found_handling: "404-page"` el `404.html` no se usa (`arreglos.md`). |
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
| HTTPS y variante www | `site.https`, `site.httpVersion`, `site.wwwVariant` | Si las dos variantes cargan y ninguna redirige a la otra, Google ve dos sitios y reparte la autoridad entre ambos. No es código: se arregla en Cloudflare, y lo guía el skill `ponla-en-google`. |

---

## Seguridad — sitio estático (Vite, React o HTML en Cloudflare)

Para una página sin login, sin base de datos y sin pagos. Lo grave (una clave secreta
a la vista, un `.env` publicado) está en la tabla del bloque 1. Aquí va el resto, y
cada fila dice en qué bloque cae.

| Qué | Dónde mirar | Cómo se juzga |
|---|---|---|
| **Claves que van a la vista a propósito** | `seguridad.marcas` (`web3forms`, `hcaptcha`, `turnstile`), `clavesConForma` con tipo `stripe-publicable` o `supabase-publicable` | **No es hallazgo.** Dilo en una línea, pegada a la buena noticia del bloque 1 (ver `reporte.md`), porque quien ve una llave en su código se asusta. La access key de Web3Forms es pública por diseño: su FAQ dice "Access key is public" y que con ella "they can only send you emails". La sitekey de hCaptcha también: "Use the sitekey in your frontend; keep the secret on your server" (docs.hcaptcha.com). Las publicables de Stripe y Supabase se llaman así porque van en el navegador. Lo que nunca va en la página es la llave *secreta* de cualquier servicio. |
| Llave de Google (`google-api`) | `clavesConForma` y `marcas` | **Depende de a qué llama la página**, porque Maps, Firebase y Gemini usan llaves que empiezan igual (`AIza`). **Si `marcas` trae `gemini`, es bloque 1**: la página habla con la IA de Google desde el navegador, y Google dice "Never expose keys client-side in production" y pide "a backend proxy server" (ai.google.dev/gemini-api/docs/api-key). El arreglo es mover esa llamada a un Worker, que no es un arreglo rápido: dilo y no lo hagas sin plan. **Si no, es de Maps o Firebase**, que la usan en el navegador a propósito: bloque 4, restringirla. Google: "You are financially responsible for charges caused by abuse of unrestricted API keys" (developers.google.com/maps/api-security-best-practices). Si no sabes a qué servicio va, búscalo en el código antes de decidir. |
| Variables `VITE_*` con un secreto | En el código, fase 4.6 de SKILL.md | Según la doc de Vite, "Variables prefixed with `VITE_` will be exposed in client-side source code after Vite bundling". Si guarda la llave de un servicio que cobra o un SECRET, PRIVATE, PASSWORD o TOKEN, es bloque 1 aunque la página no se haya publicado, porque la próxima build la publica. **`KEY` en el nombre no basta para acusar**: `VITE_WEB3FORMS_KEY` es la access key pública. Decide por el servicio, no por la palabra. |
| `.env` cubierto por `.gitignore` | El comando 1 de la fase 4.6 | Se revisa **aunque hoy no exista el `.env`**: el día que alguien cree uno con una llave, el siguiente commit la sube. Bloque 2, dicho con firmeza. Si además el comando 2 lo encuentra en el historial, eso es bloque 1 y este renglón sobra: no lo digas dos veces. `*.local` cubre `.env.local` pero no `.env`. Si `.env.example` documenta una credencial (`*_SECRET`, `*_API_KEY`, `*_SERVICE_ACCOUNT_JSON`), el que copie el ejemplo va a subir una llave privada: mismo hallazgo. |
| Formulario con protección contra spam | `seguridad.marcas` (`hcaptcha`, `turnstile`, `recaptcha`, `honeypot`); en React, el código del formulario | Sin captcha ni honeypot, un bot puede llenar el formulario una y otra vez y los mensajes reales se pierden entre la basura. Bloque 2. Las marcas se buscan en todo lo que se descargó: dicen que la protección está en el sitio, no en qué formulario. Si hay varios, confírmalo en el código. |
| hCaptcha activado en el panel de Web3Forms | `marcas` trae `web3forms` y `hcaptcha` | El captcha en la página no basta. Web3Forms: "you need to activate hCaptcha on your form to make it mandatory on each form submissions". Eso solo se ve desde el panel: **bloque 4**, pasos en `manual.md`. |
| Headers básicos | `seguridad.headers.faltan`; con `headersNoMedidos`, el archivo `_headers` en el código | Bloque 2, como recomendación. `headersNoMedidos` sale cuando se sirvió en local o el sitio no respondió: no es "te faltan". Si `faltan` trae los tres pero el código ya tiene `_headers`, lo más probable es que no se haya publicado todavía. Solo tres: `X-Content-Type-Options`, `Referrer-Policy` y `X-Frame-Options`. Van en un archivo `_headers` en `public/` (plantilla en `arreglos.md`), que Workers static assets aplica a lo que sirve. **No pidas `Content-Security-Policy`**: una mal hecha rompe hCaptcha, Web3Forms, Maps o las fuentes, y nadie se da cuenta hasta que deja de llegar un mensaje. `Strict-Transport-Security` y `Permissions-Policy` se mencionan si faltan, sin exigirlas. Si el proyecto corre código propio en el Worker (`run_worker_first`, SSR), `_headers` no aplica a esas respuestas. |
| Aviso de privacidad | `grep -il privacidad` sobre el HTML de `--dump-dir` (o el de `audit-cdp` si es SPA), el pie y el formulario | Si un formulario pide nombre, correo o teléfono, recoge datos personales. **En México** la LFPDPPP (texto vigente, última reforma DOF 14-11-2025) dice en su artículo 16, fracción II, que cuando los datos se obtienen por un medio electrónico el aviso se da en modalidad simplificada. Esa versión trae al menos lo de las fracciones I a IV del artículo 15 (quién es el responsable y su domicilio, qué datos, para qué y cómo limitar su uso) y dice dónde se consulta el aviso integral. Fuente: diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf. Para un sitio mexicano con formulario es bloque 2 dicho con firmeza. **Fuera de México no afirmes nada legal**: di que revise la ley de su país. No redactes el aviso como si fuera asesoría legal. Si el sitio no recoge nada, va al bloque 3. Ojo con el peor caso, un enlace "Aviso de privacidad" con `href="#"`. |

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
