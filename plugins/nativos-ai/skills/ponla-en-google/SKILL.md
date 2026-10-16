---
name: ponla-en-google
description: Guía paso a paso, con capturas, para meter a Google una página que ya tiene dominio propio en Cloudflare. Primero confirma que el sitio tenga sitemap.xml y un robots.txt que lo mencione. Después deja Cloudflare en orden (siempre HTTPS, www a la raíz, que las políticas de bots de IA no bloqueen a Google, workers.dev apagado) y da de alta el sitio en Google Search Console (propiedad de tipo Dominio verificada por DNS, sitemap enviado, indexación pedida una vez). La persona manda una captura en cada paso y Claude le dice qué picar. Úsalo cuando digan "ponla en Google", "quiero que mi página salga en Google", "no salgo en Google", "da de alta mi sitio en Search Console", "verifica mi dominio en Google", "envía mi sitemap", "submit my site to Google", aunque no nombren Search Console. Sirve igual si el sitio es de un cliente. NO es para revisar qué le falta al sitio (eso es checkup-web) ni para una página que solo vive en workers.dev.
---

> **Rutas:** `${CLAUDE_PLUGIN_ROOT}` apunta a la carpeta del plugin instalado. Nunca uses
> rutas relativas: Bash corre desde el proyecto del usuario, no desde el skill. Si la
> variable llega vacía, el plugin está en
> `~/.claude/plugins/cache/nativos-ai-marketplace/nativos-ai/<version>/`. Encuéntralo con
> un `ls` de esa carpeta y usa la ruta absoluta que salga.

## Quién lo va a usar

Alguien que ya publicó su página, le conectó un dominio en Cloudflare y nunca ha abierto
Search Console. No sabe qué es un registro TXT ni tiene por qué saberlo. Cada paso se
explica en una línea: qué vamos a hacer y por qué le importa.

## Cómo se guía

- **Un paso a la vez.** Dices qué abrir, y al final pides: "Mándame una captura de lo
  que ves". No adelantes el paso siguiente hasta ver la captura.
- **Con la captura en la mano, di exactamente qué picar**, con el nombre tal como sale
  en *su* pantalla y dónde está. Los nombres de los botones cambian seguido y la
  pantalla puede estar en español o en inglés. Lo que importa es el flujo. Si lo que ves
  no se parece a lo esperado, dilo y adapta. Nunca inventes un botón.
- **Lo que se puede comprobar desde fuera, lo compruebas tú** con `curl` o `dig`. No le
  pidas una captura de algo que puedes medir.
- **Nunca pidas contraseñas, códigos de verificación ni tokens.** Él pica, tú lees. Si en
  una captura sale una llave o un token, no lo repitas y dile que no hace falta mandarlo.
- **Código solo con OK.** Si hay que cambiar un archivo del proyecto, enseña el cambio
  antes y espera el sí. El silencio no es un sí.
- **Sin cifras inventadas.** Los únicos plazos son las citas de Google de la sección 4,
  con su fuente.

## 0 · De qué sitio y de quién

Pregunta solo lo que no sepas:

1. **El dominio.** Escríbelo sin `https://` y sin `www`. Si solo hay un link de
   `workers.dev`, para aquí. La propiedad de tipo Dominio de Search Console se verifica
   con un registro DNS, y el DNS de `workers.dev` no es suyo. Además, Cloudflare dice
   que `workers.dev` es para proyectos personales ("intended for personal or hobby
   projects that aren't business-critical"). Este paso se hace cuando tenga su dominio
   o el de su primer cliente.
2. **¿Es suyo o de un cliente?** Si es de un cliente, todo va en las cuentas del
   cliente. Search Console se abre con el Gmail del negocio, y al final el cliente lo
   agrega a él como usuario (paso 3.4). Él entra a Cloudflare como invitado de la cuenta
   del cliente.
3. **La carpeta del proyecto**, si la tiene a la mano. Hace falta para el paso 2.4.

El dominio tiene que estar administrado por Cloudflare. Si en el panel de Cloudflare no
aparece el dominio, esto no sigue: primero se conecta.

## 1 · Antes de empezar (lo revisas tú)

```bash
mkdir -p /tmp/ponla
node "${CLAUDE_PLUGIN_ROOT}/skills/checkup-web/scripts/site-scan.mjs" \
  --url https://<dominio>/ --max-pages 1 > /tmp/ponla/scan.json 2>/dev/null
curl -s https://<dominio>/robots.txt | grep -i '^sitemap:'
```

Del escaneo lee `site.sitemap.present`, `site.robotsTxt.present`,
`site.robotsTxt.sitemapDeclared`, `site.robotsTxt.disallowAll` y `pages[0].noindex`.
Usa el escaneo y no un `curl` al sitemap: si el sitio responde todo con la home (modo
SPA), un `sitemap.xml` que no existe regresa `200` con HTML y parece que sí está. El
escaneo exige que sea un sitemap de verdad.

**Si falta algo, para y mándalo a `checkup-web`.** Tiene que haber un `sitemap.xml` y un
`robots.txt` con la línea `Sitemap:` y la dirección completa (`https://...`). Google lo
pide así: la línea "must be a fully qualified URL". Y el robots.txt que pone Cloudflare
no agrega esa línea. Dile: "Primero pídele a Claude *hazle un checkup a mi página*,
publica lo que arregle y regresamos." Lo mismo con un `noindex` en la página o un
`Disallow: /` en robots.txt, porque Google no puede indexar una página que le dice que
no.

Aprovecha para ver qué pasos de Cloudflare ya están hechos:

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://<dominio>/
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.<dominio>/
```

El primero tiene que dar `301` hacia `https://<dominio>/`. El segundo, `301` hacia
`https://<dominio>/`. El que ya esté bien se dice en una línea y se salta.

## 2 · La casa en orden, en Cloudflare

Todo esto es dentro del dominio, en `dash.cloudflare.com`. Que abra el dominio y te mande
una captura del menú de la izquierda antes de empezar.

### 2.1 · Siempre con candado (Always Use HTTPS)

SSL/TLS → Edge Certificates → **Always Use HTTPS** → encendido. Manda a `https` todo lo
que llegue por `http`, en todos los subdominios, y está en el plan gratis. Si la opción
no aparece, el modo SSL/TLS está en **Off**. Con Off la opción no se muestra, así que
primero se cambia el modo.

Compruébalo con el primer `curl` del paso 1: ahora tiene que dar `301` a `https`.

### 2.2 · `www` a la raíz

Para que `www.<dominio>` y `<dominio>` no sean dos copias de la misma página.

1. **El registro de `www`.** DNS → Records. Pide la captura.
   - Si `www` no tiene registro, se crea: **Add record**, tipo `A`, nombre `www`, IPv4
     `192.0.2.0`, con la nube naranja (*Proxied*). Esa dirección es un comodín que
     reserva Cloudflare, y la visita nunca llega ahí: Cloudflare la intercepta y aplica
     la regla del punto 2.
   - Si `www` ya está conectado al Worker (en el Worker, pestaña *Domains*), se deja
     como está.
2. **La regla.** Rules → Overview → **Create rule** → *Redirect Rule*. Si aparece la
   plantilla *Redirect from WWW to root*, úsala. Si no:
   - Request URL, tipo *Wildcard*: `https://www.*`
   - Target URL: `https://${1}`
   - Status code: `301`
   - Preserve query string: encendido

Compruébalo con el segundo `curl` del paso 1: `301` a `https://<dominio>/`. Si `www` estaba
conectado al Worker y sigue dando `200`, quita `www` de *Domains* en el Worker, crea el
registro `A` del punto 1 y vuelve a probar.

### 2.3 · Que Cloudflare no le cierre la puerta a Google

Security → Settings → **AI bot policies** (en la doc de Cloudflare sale como *Configure
AI bot policies*). Pide la captura. Para una página de negocio:

- **Search** en *Allow*.
- **Training** en *Allow* o en *Disallow AI Training*. **Nunca en *Block* ni en *Block
  on pages with ads*.** Desde el 15 de septiembre de 2026, Cloudflare dice que "Block and
  Block on pages with ads now apply to mixed-use crawlers, including Applebot, Bingbot,
  and Googlebot, so either setting impacts search as well as training". Para frenar el
  entrenamiento sin salir de la búsqueda está *Disallow AI Training*.
- **Agent** como esté. No toca a Google Search.

Si todavía ve el interruptor viejo *Block AI bots*, va apagado: Cloudflare lo está
retirando y también bloquea a los crawlers mixtos.

Si ya estaba bien, dilo como buena noticia. Si estaba en *Block*, explica por qué se
cambia: es la razón más silenciosa por la que una página bien hecha no sale en Google.

### 2.4 · Apagar `workers.dev`

Solo si el dominio ya abre la página. Si no, primero se arregla el dominio: apagar
`workers.dev` antes deja el sitio sin ninguna dirección que funcione.

Pídele la captura de su Worker → Settings → **Domains & Routes**. Ahí sale su dirección
`*.workers.dev`. Compruébala con `curl -s -o /dev/null -w '%{http_code}\n' <url>`. Si
regresa la página, Google puede ver dos copias.

- **Si el proyecto tiene `wrangler.jsonc`, `wrangler.json` o `wrangler.toml`** (el caso
  normal cuando Cloudflare publica desde GitHub, que por omisión corre
  `npx wrangler deploy`), el cambio va en ese archivo: `"workers_dev": false` (en
  `.toml`, `workers_dev = false`). Enséñale el cambio, espera el OK y súbelo con el
  ciclo de siempre. Apagarlo solo en el panel no aguanta: según Cloudflare, "the
  `workers.dev` route will be re-enabled the next time you deploy your Worker with
  Wrangler".
- **Si no hay archivo de wrangler**, se apaga en el panel: en esa misma pantalla, junto a
  `workers.dev`, **Disable** y confirmar. Después del siguiente deploy vuelve a probar
  la dirección, por si se prendió otra vez.

Compruébalo con el mismo `curl`: ya no tiene que regresar la página.

## 3 · Search Console

### 3.1 · La cuenta correcta

Entra a `search.google.com/search-console` con la cuenta de Google **del negocio**. Si
el sitio es de un cliente, es la cuenta del cliente, en su computadora o compartiendo
pantalla. Nunca con la contraseña del cliente en la tuya.

### 3.2 · La propiedad de tipo Dominio

Agregar propiedad → **Dominio** → `<dominio>`, sin `https://` y sin `www`. Una propiedad
de tipo Dominio cubre `www`, sin `www`, `http` y `https` de una vez. Pide la captura de
la pantalla de verificación.

### 3.3 · Verificar con DNS

- **Si en la lista de proveedores aparece Cloudflare** con un botón para empezar la
  verificación, úsalo: inicia sesión en Cloudflare y autoriza. Que aparezca no está
  confirmado en ninguna fuente, así que no lo prometas antes de ver la captura.
- **Si no aparece**, que elija la opción para cualquier proveedor (*Any DNS provider*) y
  copie el registro TXT (empieza con `google-site-verification=`). En Cloudflare: DNS →
  Records → **Add record**, tipo `TXT`, nombre `@`, y en el contenido el valor completo
  → Save. Un TXT nunca lleva nube naranja.

Antes de que pique *Verify*, confirma que el registro ya se ve:

```bash
dig +short TXT <dominio>
# en Windows: nslookup -type=TXT <dominio>
```

Cuando salga el `google-site-verification=...`, que pique **Verify**. Si falla, es normal
que tarde: Google dice que un registro manual "can take up to two or three days". Que
vuelva a intentarlo después.

**El TXT no se borra nunca, aunque ya esté verificado.** Google: "don't remove the DNS
record from your provider, even after verification succeeds". Si se borra, se pierde la
verificación.

### 3.4 · Si el sitio es de un cliente

La propiedad queda en la cuenta del cliente. Ya verificada, el cliente lo agrega a él
(no al revés): Configuración (*Settings*) → **Usuarios y permisos** → **Agregar usuario**
→ su correo → permiso **Completo** (*Full*). Con permiso completo puede enviar el sitemap
y usar la inspección de URL. El control se queda con el cliente.

### 3.5 · Enviar el sitemap

Sitemaps → en *Agregar un sitemap nuevo* pega `https://<dominio>/sitemap.xml` → Enviar.
Pide la captura del estado. Si dice que no se pudo leer, comprueba tú que el sitemap
abre como XML (el escaneo del paso 1) y que vuelva a ver más tarde. Google dice que "the
sitemap should be fetched immediately", pero rastrear lo que lista lleva más tiempo.

### 3.6 · Pedir la indexación, una sola vez

Arriba, en la barra de inspección, pega `https://<dominio>/`. Que pique **Probar URL
publicada** (*Test live URL*) y, si sale bien, **Solicitar indexación** (*Request
indexing*). **Una vez.** Google: "requesting a recrawl multiple times for the same URL
won't get it crawled any faster", y hay un límite diario de solicitudes.

Si la prueba dice que la página no se puede indexar, para. Lee el motivo en la captura
(un `noindex`, robots.txt que la bloquea, una redirección, un 404) y arréglalo antes de
pedirla.

## 4 · La espera

Google no da una fecha. Da varias, y ninguna es promesa. Cítalas así, sin redondear y
sin escoger la más bonita:

- "Indexing can take up to a week or two." · "Indexing typically takes only a day or so,
  but can take much longer in some cases." · "Submitting a request does not guarantee
  that the page will appear in the Google Index."
  (support.google.com/webmasters/answer/9012289)
- "Crawling can take anywhere from a few days to a few weeks."
  (developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)

Para saber si ya está: la inspección de URL dice que la página está en Google. La
búsqueda `site:<dominio>` también sirve, pero no siempre muestra todo.

## 5 · Extras para un negocio local (una línea cada uno)

- **Google Business Profile.** La ficha de Maps es otra cosa, aparte de Search Console,
  y se da de alta en `business.google.com`. Para un negocio con local físico vale la
  pena; los pasos están en `checkup-web/references/manual.md`.
- **Bing.** En Bing Webmaster Tools, *My Sites* → *Import* → entra con Google y elige el
  sitio. Bing dice que "the imported sites will be automatically verified".

## Lo que este skill no hace

- **No arregla el sitio.** Si falta el sitemap, hay un `noindex` o algo está roto, eso es
  `checkup-web`.
- **No entra a Cloudflare ni a Google por él.** Él pica, tú guías y compruebas.
- **No promete posiciones, tráfico ni fechas.**

## Antes de terminar

- [ ] `http://<dominio>/` da `301` a `https`, y `https://www.<dominio>/` da `301` a la raíz.
- [ ] El sitemap abre como XML y robots.txt tiene la línea `Sitemap:` con la dirección completa.
- [ ] Las políticas de bots: Search en *Allow*, Training sin *Block*. Lo viste en la captura.
- [ ] `workers.dev` ya no regresa la página, o él decidió dejarlo con su motivo.
- [ ] Propiedad verificada, sitemap enviado e indexación pedida una vez. Viste las tres capturas.
- [ ] Si es de un cliente, la propiedad está en la cuenta del cliente.

## Fuentes

- Propiedades y verificación: support.google.com/webmasters/answer/34592 y /9008080
- Sitemaps: support.google.com/webmasters/answer/7451001 · robots.txt:
  developers.google.com/search/docs/crawling-indexing/robots/robots_txt
- Indexación: support.google.com/webmasters/answer/9012289 ·
  developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- Usuarios y permisos: support.google.com/webmasters/answer/7687615
- Always Use HTTPS: developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/
- `www` a la raíz: developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/
  y developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Bots de IA: blog.cloudflare.com/accountable-mixed-use-ai-crawlers/ y
  developers.cloudflare.com/bots/additional-configurations/block-ai-bots/
- `workers.dev`: developers.cloudflare.com/workers/configuration/routing/workers-dev/
- Bing: blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools
