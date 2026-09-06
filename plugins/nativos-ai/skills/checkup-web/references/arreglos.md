# Arreglar — qué se puede aplicar y qué no

## La regla

Enseña **la lista de lo que vas a tocar antes de tocar nada**, y espera el sí. El
silencio no es un sí. Quien lee esto acaba de terminar su sitio y no quiere que se
lo cambien mientras parpadea.

Solo se aplica sobre código en la carpeta. Con una URL en vivo y nada más, no hay
nada que aplicar: dilo y pasa a las instrucciones.

## Se puede aplicar

Cosas que se agregan, no que se mueven. Ninguna rompe un enlace existente.

`robots.txt` · `sitemap.xml` · `llms.txt` · `alt` faltantes · títulos y descripciones
únicos · datos estructurados · página 404 · `og:image` · favicon · `lang` en `<html>` ·
`viewport` · quitar un `noindex` olvidado · `noindex` al paginador.

## No se aplica nunca sin decir el costo

| Qué | Por qué |
|---|---|
| **Renombrar URLs** | Rompe todos los enlaces que apuntaban ahí y tira el posicionamiento acumulado. Solo con una redirección 301 de la vieja a la nueva, y eso depende de dónde esté alojado. En un sitio que aún no se publica, adelante. |
| **Renombrar archivos de imagen** | Mismo problema, más chico. |
| **Comprimir imágenes** | Se cambia un archivo del usuario. Propón la herramienta y el objetivo; no lo hagas por tu cuenta. |
| **Tocar la etiqueta de analítica** | Un identificador equivocado pierde datos en silencio. Que lo pegue quien tiene la cuenta. |

---

## Plantillas

Adáptalas al sitio. Ninguna se pega tal cual sin cambiar el dominio.

### `robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://tusitio.com/sitemap.xml
```

Eso es todo lo que necesita la mayoría de los sitios. **No agregues `Disallow`
buscando desindexar algo**: robots.txt bloquea el *rastreo*, no la indexación. Una URL
bloqueada ahí puede seguir apareciendo en Google sin contenido, y peor: al no poder
rastrearla, Google nunca ve el `noindex` que sí la sacaría. Para sacar una página del
buscador, `noindex` en la página; para que no la rastreen, robots.txt. No son lo mismo.

### `sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tusitio.com/</loc>
    <lastmod>2026-01-15</lastmod>
  </url>
  <url>
    <loc>https://tusitio.com/servicios</loc>
    <lastmod>2026-01-15</lastmod>
  </url>
</urlset>
```

Todas las URLs con el mismo esquema y host con el que se sirve el sitio — si el sitio
es `https://` sin `www`, ninguna entrada lleva `http://` ni `www`, o Google acaba
siguiendo redirecciones hacia la versión buena. Solo páginas indexables: nada que
tenga `noindex`, nada que redirija.

### `llms.txt`

Opcional. Google dijo que no lo usa para sus funciones de IA; Anthropic sí lo
recomienda. Nunca lo presentes como un pendiente de lanzamiento.

```
# Nombre del negocio

> Una línea de qué hace y para quién.

## Páginas principales
- [Servicios](https://tusitio.com/servicios): qué se ofrece y a qué precio
- [Contacto](https://tusitio.com/contacto): teléfono, horario y zona de servicio
```

### Datos estructurados — negocio local

En el `<head>`, una sola vez por sitio, normalmente en la home. Todo tiene que
coincidir con lo que dice la página y con Google Business Profile.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Plomería Rápida",
  "url": "https://tusitio.com",
  "telephone": "+52 55 1234 5678",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Av. Ejemplo 123, Col. Centro",
    "addressLocality": "Ciudad de México",
    "postalCode": "06000",
    "addressCountry": "MX"
  },
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    "opens": "08:00",
    "closes": "19:00"
  }],
  "image": "https://tusitio.com/local.jpg"
}
</script>
```

Sin local físico, cambia `LocalBusiness` por `ProfessionalService` u `Organization` y
quita `address`. **Nunca inventes una dirección, un horario o un teléfono** para
llenar el esquema: datos estructurados que no coinciden con la página son peores que
no tenerlos.

Antes de darlo por bueno, pásalo por el validador de Google
(`search.google.com/test/rich-results`) o por `validator.schema.org`.

### `FAQPage`

Opcional y **sin prometer nada**: Google retiró los resultados enriquecidos de FAQ el 7 de
mayo de 2026 — como nota en su documentación de datos estructurados —, así que este
marcado ya no produce la caja de preguntas en el buscador. Sigue siendo válido, no hace
daño y algunos sistemas de IA lo leen. La
sección de preguntas frecuentes visible en la página es la que sí vale, con o sin
marcado.

### Página 404

Que devuelva código `404` de verdad, no `200`. Con tres cosas basta: decir que la
página no existe, un enlace a la home y el menú del sitio. Cómo se instala depende de
la plataforma — en un sitio estático suele ser `404.html` en la raíz.

### `og:image`

```html
<meta property="og:title" content="Título de esta página">
<meta property="og:description" content="Una línea de qué hay aquí.">
<meta property="og:image" content="https://tusitio.com/compartir.jpg">
<meta property="og:url" content="https://tusitio.com/esta-pagina">
```

La imagen necesita URL absoluta, aproximadamente 1200×630, y verse bien recortada
en cuadrado, que es como la muestra WhatsApp.
