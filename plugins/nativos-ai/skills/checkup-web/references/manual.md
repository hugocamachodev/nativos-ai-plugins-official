# Lo que solo el dueño puede hacer

Nada de esto se ve desde fuera del sitio. Los pasos están escritos para alguien que
nunca ha entrado a estas herramientas. Cópialos al reporte tal cual hagan falta; no
los reescribas de memoria, que es donde se cuelan los menús que ya no existen.

Antes de dictar pasos de una interfaz, avisa que los nombres de los botones cambian
cada tanto y que lo que importa es el flujo, no el nombre exacto.

## Google Search Console

Lo guía el skill **`ponla-en-google`**, paso a paso y con capturas: los ajustes de
Cloudflare que van antes, la propiedad, la verificación, el sitemap y la indexación.
En el reporte basta una línea: "Cuando tengas tu dominio, pídele a Claude *ponla en
Google*". No copies aquí los pasos: viven en ese skill para que no haya dos versiones.

Con un link de `workers.dev` todavía no aplica. La propiedad de tipo Dominio necesita
un dominio propio, verificado con un registro DNS.

## Google Analytics 4

Cuenta cuánta gente entra y qué hace. La etiqueta en el sitio y la propiedad
configurada son dos cosas distintas: el checkup ve la primera, nunca la segunda.

1. Entra a `analytics.google.com`, crea una propiedad y dentro un flujo de datos web
   con la dirección de tu sitio.
2. Copia el identificador de medición (empieza con `G-`).
3. Pega la etiqueta en el `<head>` de **todas** las páginas, o instálala desde tu
   plataforma si es WordPress, Shopify, Wix o Squarespace.
4. Comprueba en **Tiempo real** que te ves a ti mismo entrando. Si no apareces, la
   etiqueta no está donde crees.

## hCaptcha activado en Web3Forms

El captcha en la página no basta. Web3Forms pide activarlo también en el formulario
de su panel para que lo exija en cada envío; sin eso, un bot que se salte la página
manda igual.

1. Entra al panel de Web3Forms con el correo con el que sacaste la access key.
2. Abre tu formulario y busca la opción contra spam (en su documentación se llama
   *Block Spam*).
3. Elige **hCaptcha** y guarda.
4. Manda una prueba desde tu página resolviendo el captcha. Tiene que llegarte.

## La llave de Google, restringida

Solo si el sitio trae una llave que empieza con `AIza` (Maps, Firebase). Va en el
navegador a propósito, pero sin restricción la puede usar cualquiera y Google dice
que el cobro por abuso es del dueño de la llave. En la consola de Google Cloud,
en **Credenciales**, edítala y en las restricciones de aplicación elige **sitios web**
con tu dominio.

## Que las reseñas sean reales

Si el sitio muestra reseñas, tienen que ser de clientes de verdad. Inventarlas es
publicidad engañosa, no una decisión de diseño, y en varios países acarrea multa.
Lo más limpio es traerlas de donde ya existen — Google, Facebook — con el nombre de
quien las escribió.

## Que la foto sea de tu equipo

Una foto de banco de imágenes se reconoce y resta exactamente lo que la foto real
suma. Una tomada con celular, con luz de día y sin pose, funciona mejor que un
retrato de estudio de gente que no trabaja ahí.

## Google Business Profile — solo negocio local

Es la ficha que sale a la derecha cuando alguien te busca por tu nombre, y en el mapa.
Para un negocio con local físico suele traer más clientes que el sitio mismo.

1. Entra a `business.google.com` y busca tu negocio: puede que la ficha ya exista.
2. Reclámala o créala, y verifícala (Google manda un código, a veces por postal).
3. Llena horario, teléfono, dirección y categoría. **Que coincidan exactamente con lo
   que dice tu sitio** — si no, ninguna de las dos versiones se ve confiable.
4. Sube fotos reales y pide reseñas a los clientes que ya tienes.
