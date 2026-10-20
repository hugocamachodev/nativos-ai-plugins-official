# Nativos AI — plugins para Claude Code

Las herramientas que usamos en los videos de la comunidad, listas para instalar.
Se instala una vez y a partir de ahí te llega todo lo nuevo.

## Instalación

Abre Claude Code y pega estos dos comandos, uno después del otro:

```
/plugin marketplace add hugocamachodev/nativos-ai-plugins-official
/plugin install nativos-ai@nativos-ai-marketplace
```

Listo. No tienes que descargar nada ni tocar ninguna carpeta.

## Qué trae

### ⏱️ Medir qué tan rápido carga tu página

Mide tu página ya publicada (le pasas el link, no es la de tu computadora) como si la
abriera un celular con 4G lenta. La carga 3 veces y te dice solo lo que se repite, para
que no te asustes por un tropiezo de una vez.

Te entrega:

- Qué tarda en aparecer.
- Cuánto pesa cada cosa: imágenes, video, fuentes y código.
- Qué la está frenando, ordenado por lo que más nota quien la visita.
- Lo que ya está bien, para que no toques lo que no hace falta.
- Una tabla de qué arreglar primero, según cuánto mejora y qué tan riesgoso es.

Si PageSpeed de Google no puede medir tu página, averigua por qué.

Si abres Claude Code en la carpeta de tu proyecto, además te dice qué archivo causa cada
problema. No cambia nada sin tu OK.

Usa la herramienta del equipo de Chrome
([chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)), y aquí
viene con el envío de datos a Google apagado: ni las estadísticas de uso ni la dirección
de tu página salen de tu computadora. Necesitas tener Google Chrome instalado. Si tiene
que usar Lighthouse de respaldo, te pregunta antes de descargarlo.

**Solo díselo con tus palabras:**

> mide qué tan rápido carga mi página en un celular: https://tusitio.com
>
> ¿qué está frenando mi página?
>
> PageSpeed no puede medir mi página, ¿por qué?

### 🩺 Checkup de tu sitio antes de publicarlo

Recorre todas tus páginas y te dice qué está roto, qué te falta y qué solo puedes
hacer tú. Encuentra lo que de verdad tumba un sitio: el `noindex` que se quedó del
desarrollo y te deja invisible en Google, enlaces que no llevan a ningún lado,
formularios que no mandan nada, "Lorem ipsum" en producción, fotos sin comprimir.
Y también robots.txt, sitemap, página 404, títulos únicos, texto en las imágenes y
la etiqueta de Analytics. Revisa la seguridad básica: que no haya llaves secretas a la
vista, que tu `.env` no se suba a GitHub, que el formulario tenga captcha y los headers
básicos. Y te dice qué llaves sí pueden estar a la vista. Si tienes el código a la mano,
te ofrece arreglarlo.

Entiende qué tipo de negocio tienes: no te va a pedir un mapa si no tienes local,
ni migajas de pan si tu sitio es de una sola página.

**Solo díselo con tus palabras:**

> revisa mi sitio antes de publicarlo
>
> ¿qué me falta antes de lanzar?
>
> hazle un checkup a mi página

### 🔎 Ponla en Google

Para cuando tu página ya tiene dominio propio en Cloudflare. Te guía pantalla por
pantalla: le mandas una captura en cada paso y te dice qué picar. Primero revisa que
tu sitio tenga sitemap. Después deja Cloudflare en orden: siempre con candado, `www`
llevando a tu dominio y sin bloquear a Google por accidente. Y al final la da de alta
en Google Search Console, con el sitemap enviado. Funciona igual con el sitio de un
cliente, en la cuenta del cliente.

**Solo díselo con tus palabras:**

> ponla en Google
>
> quiero que mi página salga en Google
>
> da de alta mi sitio en Search Console

### 🔍 Auditar una landing page

Revisa tu página y te dice, con evidencia, qué funciona y qué no: si el mensaje se
entiende, si el botón se ve, si carga bien en celular, si el contraste alcanza.
Si todavía no tienes página, te arma la estructura que necesita.

**Solo díselo con tus palabras:**

> revisa mi landing
>
> ¿por qué no convierte esta página?
>
> qué le falta a mi página

### 🕸️ Sacar todo el contenido de un sitio

Entra a un sitio completo y te baja las fotos reales, los textos, los formularios,
los menús y los datos de contacto, ordenados para que puedas rediseñarlo sin
copiar nada a mano.

**Solo díselo con tus palabras:**

> scrapea este sitio: ejemplo.com
>
> saca las fotos y los textos de este dominio
>
> quiero rediseñar esta página, tráeme todo

La primera vez que lo uses se va a tardar un par de minutos extra preparando
lo que necesita. Es normal y pasa una sola vez.

### 🚗 Una landing 3D que se anima con el scroll

Te hace una página experimento como las de Apple: un objeto en 3D (un coche, un reloj,
una zapatilla, lo que sea) en el centro de la pantalla que gira, se acerca y cambia de
ángulo mientras haces scroll, con títulos gigantes animados, luces que se encienden,
cifras que cuentan y un selector de color. Pensada para grabar un reel o lucir un
portfolio en escritorio.

Primero te hace unas preguntas (qué objeto, qué historia, qué tono y colores), te ayuda
a conseguir un modelo 3D con licencia limpia o usa uno de muestra para empezar ya,
investiga los datos reales, arma el proyecto y lo revisa sección por sección con
capturas antes de entregártelo.

**Solo díselo con tus palabras:**

> quiero una página tipo Apple de mi producto
>
> hazme una landing 3D de este coche que gire con el scroll
>
> quiero una web como la del Porsche para grabar un reel

Crea un proyecto en tu carpeta y descarga unas 300 MB de dependencias la primera vez.
Te lo avisa antes de hacerlo.

### 🪐 Un cortometraje hecho de esferas 3D

Te hace un corto de cine donde todo, los planetas, las naves, los personajes, el agua y
hasta las letras, está hecho de miles de esferas brillantes, como el video de «Interstellar
en esferas». Sale en reel vertical para Instagram y TikTok, que abre pidiendo girar el
teléfono, y en versión horizontal para YouTube y Facebook, a 60 cuadros por segundo.

Prepara tu computadora aunque nunca hayas programado. Después te entrevista como un
director (qué historia, qué momentos, qué frases, cuánto dura) y te enseña el guion antes de
empezar. Prueba el estilo con dos o tres escenas y te manda un video de prueba para que
veas el ritmo antes del final.

**Solo díselo con tus palabras:**

> hazme un video como el de Interstellar pero de mi película favorita
>
> quiero recrear Star Wars con esferas 3D para un reel
>
> un corto animado hecho 100% con Claude Code

Instala Node si no lo tienes y descarga unos 90 MB de librerías en la carpeta del proyecto
(te lo avisa antes). El video sale sin música: se la pones en Instagram, TikTok o YouTube.

### ⚡ Planear rápido y ver resultados pronto (quick-plan)

Para landings, sitios, demos y prototipos. Usa lo mejor de superpowers (el brainstorm y los
subagentes) sin la ceremonia de producción que convierte una página de 40 minutos en una de
5 horas. Te pregunta por etapas, te propone cuánto investigar con sus pros y contras, arma un
plan corto por bloques y construye por vueltas: cada vuelta termina en algo que ya puedes ver
y jugar en el navegador, y con lo que le digas ajusta la siguiente.

Si lo que pides en realidad no es rápido (un CRM, una app con cuentas, login, servidor o
pagos), te avisa qué implica y te recomienda el flujo completo de superpowers.

**Solo díselo con tus palabras:**

> /quick-plan quiero una landing para mi cafetería
>
> modo rápido: hazme un demo de esta idea, no es producción
>
> no te pases con la planeación, quiero ver algo pronto

Funciona mejor con el plugin [superpowers](https://github.com/obra/superpowers) instalado,
pero no lo necesita.

## Recibir lo nuevo

Cada vez que publiquemos algo, dentro de Claude Code escribe `/plugin`, entra a la
pestaña **Marketplaces**, elige `nativos-ai-marketplace` y dale a **Update marketplace**.
Después escribe:

```
/reload-plugins
```

O desde la terminal, y luego vuelves a abrir Claude Code:

```
claude plugin marketplace update nativos-ai-marketplace
claude plugin update nativos-ai@nativos-ai-marketplace
```

Si quieres que te llegue solo, en esa misma pestaña elige **Enable auto-update**.

## ¿Te falta algo?

Abre un [issue](https://github.com/hugocamachodev/nativos-ai-plugins-official/issues)
y cuéntanos qué te gustaría que hiciera Claude por ti.
