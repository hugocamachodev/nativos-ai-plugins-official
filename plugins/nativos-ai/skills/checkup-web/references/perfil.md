# Perfil — qué tipo de sitio es esto

Se determina **antes** de juzgar nada. El mismo hallazgo es grave, irrelevante o
imposible según la forma del sitio y el negocio que hay detrás. Un checkup que le
reclama migajas de pan a una página única no es estricto: está mal hecho, y el
estudiante aprende a ignorar el reporte completo.

## Paso 1 — forma

Sale del escaneo (`shape`, `pageCount`), sin preguntar nada.

| Forma | Qué se apaga, y se dice en el bloque 3 |
|---|---|
| **Una sola página** | Títulos y descripciones únicas por página · enlazado interno y clusters · migajas de pan · paginador · páginas huérfanas · página de gracias como URL propia (basta un estado de "gracias" después de enviar) |
| **Varias páginas** | Nada se apaga por forma. |

Si el escaneo tocó el tope (`hitPageCap: true`), el checkup vio una parte del sitio.
Dilo antes del primer hallazgo: los duplicados y las huérfanas son conclusiones sobre
lo que se vio, no sobre lo que existe.

## Paso 2 — negocio

Primero léelo del escaneo. Solo si sigue sin quedar claro, pregunta —
**máximo dos preguntas, y ninguna cuya respuesta esté en la página.**

| Tipo | Cómo se reconoce en el escaneo | Qué activa | Qué apaga |
|---|---|---|---|
| **Local con dirección física** | `signals.mapEmbed`, dirección o horarios en el pie, varios `tel:` | Mapa de cómo llegar · datos estructurados `LocalBusiness` con dirección y horario · reseñas · CTA fijo de llamada en móvil · promesa de tiempo de respuesta | — |
| **Servicios sin local** (agencia, consultor, freelance) | Formulario o agenda, `wa.me`, sin dirección | Reseñas o casos · foto real del equipo · tiempo de respuesta · datos estructurados `Organization` o `ProfessionalService` | Mapa · dirección en los datos estructurados |
| **Tienda** | Carrito, precios repetidos, `Product` en JSON-LD | Datos estructurados `Product` · política de envíos y devoluciones · paginador con `noindex` | Mapa (salvo que haya tienda física) |
| **Contenido / blog** | Varias páginas de texto largo, fechas, categorías | Los checks de contenido *(ver abajo)* · enlazado interno real · `Article` en JSON-LD | Mapa · reseñas · tiempo de respuesta |
| **SaaS o producto digital** | Precios por plan, "prueba gratis", login | `SoftwareApplication` u `Organization` · página de estado o soporte | Mapa · dirección · CTA de llamada |
| **Portafolio personal** | Proyectos, "sobre mí", pocas páginas | Foto real · formas de contacto | Reseñas · datos estructurados de negocio · política de privacidad si no se recogen datos |

**Dos preguntas buenas**, si de verdad hacen falta:
> "¿La gente te visita en un local físico, o todo es a distancia?"
> "¿Qué quieres que haga la persona que llega: llamarte, escribirte, comprar, o leer?"

**Preguntas defectuosas** — la respuesta está a la vista, o el estudiante no puede
contestarlas: si tiene datos estructurados, si tiene canonical, cuántos H1 hay,
si tiene analítica instalada, cuánto pesan sus imágenes, si el sitemap está enviado.

## Paso 3 — los checks de contenido

*Responder la intención de búsqueda arriba · resumen de puntos clave · CTA después del
primer párrafo · jerarquía real de encabezados · sección de preguntas frecuentes ·
enlazado hacia el mismo tema.*

Estos **no se pueden juzgar sin saber qué persigue la página.** Un texto que "no
responde la intención de búsqueda" es indecidible si nadie dijo cuál era la búsqueda.
Así que:

1. Se activan solo si el perfil es **contenido/blog**, o si alguna página pasa de
   **700 palabras** (`wordCount`) *y* su texto es corrido, no ocho secciones cortas de
   una página de servicios. El número es un umbral de trabajo, no una regla del oficio:
   existe para que dos corridas del mismo checkup sobre el mismo sitio no den reportes
   distintos. Si dudas, mira si la página se lee como un artículo con una pregunta
   detrás; si no, no se activan.
   Para desempatar sin corazonadas, mira `parrafos` y `secciones` de esa página: un
   artículo son pocos párrafos largos seguidos (más de 40 palabras de media); una
   página de servicios son muchas secciones cortas, aunque sume mil palabras.

2. Cuando se activan, haz **una** pregunta, sobre la página más larga:
   > "¿Qué escribe en Google la persona que debería llegar a esta página?"
3. Si no hay respuesta, no adivines la intención. Van al bloque 4 con el criterio
   explicado en una línea para que el estudiante lo aplique él mismo. Una nota honesta
   vale más que un veredicto inventado, porque sobre la primera se puede actuar.
