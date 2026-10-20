# Cuando chrome-devtools no está o el navegador está ocupado

Primero di qué pasó y cómo se arregla. Solo después mide con Lighthouse, y avísalo en el
reporte: "Esta vez medí con Lighthouse por línea de comandos porque…".

## Qué pasó y cómo se resuelve

| Lo que ves | Qué es | Cómo se resuelve |
|---|---|---|
| No aparece ninguna herramienta `chrome-devtools` | El plugin no está instalado, está apagado o la herramienta no arrancó. | En Claude Code: `/plugin`, revisar que `nativos-ai` esté instalado y activo, y `/reload-plugins`. Si sigue sin salir, `/mcp` muestra si `chrome-devtools` falló al arrancar y por qué. |
| "The browser is already running" o "profile in use" | Otra sesión de Claude Code tiene abierto el mismo Chrome de la herramienta. | Desde la versión 0.8.0 del plugin cada sesión abre su propio Chrome (`--isolated`) y esto ya no pasa: actualiza el plugin. Mientras, cierra la otra sesión o el Chrome que abrió. |
| "Could not find Chrome" | No hay Google Chrome instalado. | Instalar Google Chrome. La herramienta no funciona con otros navegadores. |
| La herramienta se queda colgada al abrir la página | Chrome se trabó. | Cerrar las ventanas de Chrome que abrió la herramienta y volver a intentar una vez. |

## Medir con Lighthouse

Revisa si ya está descargado:

```bash
npx --no-install lighthouse --version
```

Si no, **pregunta antes**: es la herramienta de Google para medir páginas, ocupa unos
170 MB en disco la primera vez y tarda un par de minutos en bajar. Con el sí, tres
corridas, una tras otra:

```bash
d=/tmp/mide-velocidad/$(date +%Y%m%d-%H%M%S); mkdir -p "$d"
for n in 1 2 3; do
  npx lighthouse "<url>" --form-factor=mobile --only-categories=performance \
    --output=json --output-path="$d/lh-$n.json" --quiet \
    --chrome-flags="--headless=new"
done
for n in 1 2 3; do node "${CLAUDE_PLUGIN_ROOT}/skills/mide-velocidad/scripts/resumen-lighthouse.mjs" "$d/lh-$n.json"; done
```

Lo que cambia respecto a chrome-devtools, y se dice en el reporte:

- Qué es lo principal a veces no sale en el resumen (sobre todo en celular): dilo como no
  medido, no lo adivines.
- Lighthouse **simula** el celular (un Moto G Power con 4G lenta y el procesador 4 veces
  más lento) y **calcula** los tiempos en lugar de cronometrarlos. Son comparables entre
  sí, no con una medición de chrome-devtools.
- No hay toque de prueba: la respuesta al tocar va como no medida.
- No sabe cuándo aparece un 3D ni si se queda dibujando: si la página tiene 3D o un canvas que no puedas descartar, corre
  también la prueba sin tarjeta de video de `cuando-truena.md`.
- El peso por tipo sale de "Lo más pesado". Si necesitas más detalle, búscalo en el JSON
  con `node -e` (el audit `network-requests`), nunca abriéndolo entero.

Lo demás del reporte no cambia: los seis bloques, la mediana de las tres corridas y la
tabla de costo-beneficio.
