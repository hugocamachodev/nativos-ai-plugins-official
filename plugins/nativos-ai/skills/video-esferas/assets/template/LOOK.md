# [TÍTULO] · biblia de estilo

Todo agente o sesión que escriba una escena lee esto primero, junto con `SCRIPT.md`,
`core/engine.js` y `core/dots.js`.

## El medio

- Todo lo visible son esferas (`SphereField`); el texto del DOM es la única excepción.
  Líneas = filas de esferas; superficies = esferas empaquetadas con gradiente de tamaño.
- Esferas grandes, medianas y diminutas juntas en cada cuadro.
- Material acrílico brillante (`paintMaterial`): brillo en cada esfera, reflejos de color
  (`makeEnv`), oclusión de contacto, sombras suaves y profundidad de campo.
- Brillo propio solo para luz con motivo (estrellas, fuego, pantallas); si el objeto es la
  fuente de luz, que arda.

## Color

- Paleta del proyecto: [colores principales con hex]
- Contracolor turquesa/cian (`#0FA3A3`, `#12C4C4`, `#2EC8FF`) contra los cálidos.
- Negros de verdad. El espacio es negro profundo con pocas estrellas nítidas.

## Cámara

- Un primer plano tipo reloj en macro por escena: esferas individuales visibles.
- Momentos grandes: plano abierto con referencia de escala → primer plano.
- Un movimiento seguro por toma; 2–3 tomas por escena. Nunca estático.
- Los momentos clave siguen al protagonista, que mide ≥ ~120 px en pantalla.

## Ritmo y texto

- 7–9 s por escena; tomas ≥ 2.5 s; momentos clave ≥ 4 s.
- Texto con `E.line` + `E.reveal` (el motor impone ≥ 54 px, peso 500, halo); legible ≥ 2 s;
  nunca en el primer ni el último segundo; solo las frases exactas de `SCRIPT.md`.

## Fundidos

- 0.8 s entre escenas (`E.XF`; una escena puede pedir otro con `xin`).
- Primer y último segundo llenos de esferas y parecidos a la escena vecina, sin texto.
  Nunca un corte a negro entre escenas.

## Formato y zonas seguras

- Película 1920×1080. Texto y acción clave dentro de x 120–1630, y 170–1000.
- Reel: 1080×1920 con la película girada 90° y la intro vertical (texto dentro de
  x 90–930, y 220–1560). Horizontal: la película tal cual, con `titulo.js` al inicio.

## Contrato de una escena

`scenes/<id>.js` exporta `{ id, dur, xin?, build(E, root), timeline(tl, t0, E)?, update(lt, E), render(E)? }`.
`update(lt)` es función pura del tiempo local: cada rama de toma fija todo su estado (cámara,
desenfoque, bloom, luces). Nada de `Math.random` ni relojes: `E.dots.rng(semilla)`.
≤ ~300 ms por cuadro a `--ss=2`. Nueva escena → agrégala a `ORDER` en `main.js`.

## Tabla de producción

| # | id | Dur. | Qué pasa | Dueño | Entra desde | Sale hacia |
|---|---|---|---|---|---|---|
| 0 | intro | | | | — | polvo dorado |
| … | | | | | | |
