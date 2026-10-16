# El reporte

## Antes de escribir una sola línea

Di en una frase **qué se revisó**: cuántas páginas, si fue el sitio en vivo o la
carpeta local, y si el escaneo tocó su tope. Un lector que no sabe qué se miró no
puede confiar en lo que se concluyó.

> Revisé 7 páginas de tusitio.com, en vivo. Es un sitio de servicios sin local físico.

## Los cuatro bloques, en este orden

### 1 · Esto está roto

Solo lo de la lista corta de `checks.md`. Si no hay nada, **dilo como buena noticia y
sigue** — que no haya nada roto es información valiosa, no un bloque vacío que se
omite. Es el único lugar donde el tono es firme.

Cada hallazgo: qué pasa · por qué importa en una línea · dónde exactamente.

### 2 · Esto te falta

Ordenado por lo que más cambia con menos trabajo, no por categoría técnica. El
registro es "yo agregaría X porque Y". Agrupa lo repetido: si a once imágenes les
falta `alt`, es un hallazgo con once ejemplos, no once hallazgos.

### 3 · Esto no aplica a tu sitio

Con el motivo, en media línea cada uno. Este bloque existe para que el estudiante no
sienta que reprobó por algo que nunca le tocó, y para que entienda por qué la lista
que vio en un video no aplica completa a su caso.

> Migajas de pan — tu sitio es de una sola página, no hay una jerarquía por la que
> subir.

### 4 · Esto lo tienes que hacer tú

Lo que no se ve desde fuera. Cada uno con sus pasos, escritos para alguien que nunca
abrió Search Console. Los pasos están en `manual.md`; no los reescribas de memoria.

## La seguridad, dentro de los mismos bloques

No es un quinto bloque: cada hallazgo cae donde le toca. Una clave secreta a la vista o
un `.env` publicado va al 1; el `.env` sin cubrir en `.gitignore`, el formulario sin
captcha, los headers y el aviso de privacidad van al 2, y el hCaptcha en el panel de
Web3Forms, al 4.

Dos cosas solo de este tema:

- **Las claves públicas a propósito se dicen en una línea, en el bloque 1**, como parte
  de la buena noticia o junto a la clave secreta si la hay. Quien ve
  una llave en su código se asusta, y con razón. Que lea que la access key de Web3Forms
  y la sitekey del captcha están hechas para ir en la página.
  > La llave de Web3Forms y la del captcha están a la vista a propósito: así funcionan.
  > Lo que nunca va en la página es una llave secreta, y no encontré ninguna.
- **Una clave secreta publicada se reporta con su remedio en orden**: rotarla en el
  panel del servicio, y solo después quitarla del código. Al revés, la llave vieja sigue
  sirviendo a quien ya la copió. Nunca la escribas completa.

## Después de los cuatro bloques

Si el código está en la carpeta, ofrece arreglar: **la lista de lo que tocarías,
antes de tocarlo.** Ver `arreglos.md`. Si solo hay una URL, dilo — sin acceso al
código no hay nada que aplicar.

## Cómo se dice lo que no se pudo medir

Se dice. No se rellena.

> El CTA fijo en móvil no lo pude confirmar: para eso hay que abrir el sitio en un
> navegador y yo leí el HTML. En el código hay un `tel:` y una barra fija, así que
> probablemente sí está.

`NO MEDIDO` y `ROTO` son cosas distintas y el reporte no las mezcla nunca.

## Prohibiciones

- **Ninguna calificación numérica.** Ni 62/100, ni 8 de 10, ni semáforos con
  porcentaje. Nadie arregla nada con un número; se arregla con una lista.
- **Ninguna promesa de resultado.** Ni conversión, ni posiciones, ni tráfico.
- **Ninguna cifra sin pasar por `landing-audit/references/forbidden-numbers.md`.**
- **Ningún hallazgo sin fuente.** De dónde salió: del escaneo, de leer el HTML, o de
  no haberse podido medir.
- **Ninguna adulación de relleno.** Si algo está bien hecho se dice en una línea y se
  sigue; el elogio genérico gasta la credibilidad del resto del reporte.
