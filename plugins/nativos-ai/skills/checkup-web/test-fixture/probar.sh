#!/usr/bin/env bash
# Prueba de site-scan.mjs contra un sitio con defectos puestos a propósito.
#
# Corre las MISMAS aserciones por los DOS caminos con los que se puede servir un sitio:
#   simple   — un servidor estático normal: una ruta que no existe devuelve 404.
#   fallback — el servidor de detect-build.mjs, que devuelve index.html con 200 para
#              cualquier ruta porque así funcionan las SPA. Es el camino que documenta
#              SKILL.md, y el que fabrica falsos positivos si el escaneo no lo detecta:
#              un soft-404 que no existe, una 404 propia que no existe, y ningún enlace
#              roto jamás. Probar solo el camino simple deja ese agujero sin cubrir.
#
#   bash test-fixture/probar.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SCAN="$HERE/../scripts/site-scan.mjs"
DETECT="$HERE/../../landing-audit/scripts/detect-build.mjs"
PORT="${PORT:-8899}"

# --stop sin argumento mata TODOS los servidores de detect-build de la máquina,
# incluidos los de otra auditoría que esté corriendo en paralelo. Aquí solo el nuestro.
limpiar() { kill "${SIMPLE:-}" "${SERVE:-}" "${SPA:-}" 2>/dev/null || true; [ -n "${URL:-}" ] && node "$DETECT" --stop "$URL" >/dev/null 2>&1; rm -f "$HERE"/.scan-*.json "$HERE/.serve.log" "$HERE/.spa-rendered.html"; return 0; }
trap limpiar EXIT

# El sitemap se genera con la url de cada camino: el fixture se sirve en dos puertos
# distintos y un sitemap con el host fijo dejaría sin datos el check de huérfanas.
sitemap_para() {
  { echo '<?xml version="1.0" encoding="UTF-8"?>'
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    for pag in "" servicios.html contacto.html huerfana.html; do echo "  <url><loc>${1%/}/$pag</loc></url>"; done
    echo '</urlset>'; } > "$HERE/sitemap.xml"
}

# --- camino simple ---
python3 -m http.server "$PORT" --directory "$HERE" >/dev/null 2>&1 &
SIMPLE=$!
for _ in $(seq 1 20); do curl -sf "http://localhost:$PORT/index.html" >/dev/null 2>&1 && break; done
sitemap_para "http://localhost:$PORT"
node "$SCAN" --url "http://localhost:$PORT/" 2>/dev/null > "$HERE/.scan-simple.json"
kill "$SIMPLE" 2>/dev/null || true; SIMPLE=""

# --- camino fallback: el mismo servidor que usa el skill ---
# --serve se queda en primer plano: hay que mandarlo al fondo y leer la url de su salida.
node "$DETECT" --serve "$HERE" > "$HERE/.serve.log" 2>&1 &
SERVE=$!
URL=""
for _ in $(seq 1 30); do
  URL="$(python3 -c 'import json,sys;
try: print(json.load(open(sys.argv[1]))["url"])
except Exception: pass' "$HERE/.serve.log" 2>/dev/null || true)"
  [ -n "$URL" ] && break
done
[ -n "$URL" ] || { echo "no se pudo servir el fixture"; cat "$HERE/.serve.log"; exit 1; }
sitemap_para "$URL"
node "$SCAN" --url "$URL" 2>/dev/null > "$HERE/.scan-fallback.json"
node "$DETECT" --stop "$URL" >/dev/null 2>&1 || true; kill $SERVE 2>/dev/null || true

# --- camino SPA: el HTML servido no trae contenido, hay que renderizar ---
python3 -m http.server "$((PORT + 2))" --directory "$HERE/spa" >/dev/null 2>&1 &
SPA=$!
for _ in $(seq 1 20); do curl -sf "http://localhost:$((PORT + 2))/" >/dev/null 2>&1 && break; done
node "$SCAN" --url "http://localhost:$((PORT + 2))/" 2>/dev/null > "$HERE/.scan-spa.json"
node "$HERE/../../landing-audit/scripts/audit-cdp.mjs" --url "http://localhost:$((PORT + 2))/" \
  --dump-html "$HERE/.spa-rendered.html" >/dev/null 2>&1 || true
kill "$SPA" 2>/dev/null || true; SPA=""

python3 - "$HERE/.scan-simple.json" "$HERE/.scan-fallback.json" "$HERE/.scan-spa.json" "$HERE/.spa-rendered.html" <<'ENDPY'
import json, sys, os

def revisar(ruta, camino):
    d = json.load(open(ruta)); s, c = d['site'], d['cross']
    name = lambda u: u.split('/')[-1] or 'index'
    hs = lambda p: [h['level'] for h in p['headings']]
    fallback = bool(s['notFound']['isHomeFallback'])

    r = {
        'sin robots.txt':           not s['robotsTxt']['present'],
        'sin llms.txt':             not s['llmsTxt']['present'],
        'sin favicon':              not s['faviconAtRoot'],
        'titulos duplicados':       [sorted(name(u) for u in x['urls']) for x in c['duplicateTitles']] == [['index', 'servicios.html']],
        'descripciones duplicadas': len(c['duplicateDescriptions']) == 1,
        'pagina huerfana':          [name(u) for u in c['orphans']] == ['huerfana.html'],
        'noindex olvidado':         [name(p['url']) for p in d['pages'] if p['noindex']] == ['servicios.html'],
        'pagina sin H1':            [name(p['url']) for p in d['pages'] if not p['h1']] == ['servicios.html'],
        'salto de jerarquia':       any(hs(p) == [2, 4] for p in d['pages']),
        'texto de relleno':         any(p['placeholders'] for p in d['pages']),
        'imagen sin alt':           [i['src'] for p in d['pages'] for i in p['images'] if i['alt'] is None] == ['IMG_1234.jpg'],
        'enlace roto':              [name(x['url']) for x in d['links']['broken']] == ['precios.html'],
        'formulario sin destino':   any(f['destino'] == 'no-visible' for p in d['pages'] for f in p['forms']),
        'imagen pesada':            any(i['bytes'] and i['bytes'] > 500_000 for i in d['images']['measured']),
        'ancla rota':               any('no-existe' in p['brokenAnchors'] for p in d['pages']),
        'entidades decodificadas':  any('&amp;' not in (i['alt'] or '') for p in d['pages'] for i in p['images']),
        # 4 páginas, ni una más: con fallback, una ruta inexistente devuelve la home y
        # rastrearla inflaría el conteo y duplicaría títulos que no existen.
        'sin paginas fantasma':     d['pageCount'] == 4,
        'sin imagenes rotas':       not d['images']['broken'],
    }
    # Lo que solo es medible según el camino. Un servidor con fallback no puede decir
    # nada sobre el 404 del sitio: lo honesto es declararlo, no inventar un veredicto.
    if fallback:
        r['404 declarado no medible'] = (s['notFound']['measurable'] is False
                                         and s['notFound']['looksCustom'] is False
                                         and s['notFound']['soft404'] is False)
    else:
        r['404 sin personalizar'] = not s['notFound']['looksCustom']

    fallos = [k for k, v in r.items() if not v]
    print(f'--- camino {camino} (fallback del servidor: {"si" if fallback else "no"})')
    for k, v in r.items():
        print(('  ok    ' if v else '  FALLA ') + k)
    return fallos, len(r)

total_fallos, total = [], 0
for ruta, camino in [(sys.argv[1], 'simple'), (sys.argv[2], 'fallback')]:
    f, n = revisar(ruta, camino)
    total_fallos += [f'{camino}: {x}' for x in f]; total += n
    print()

# --- cascarón de SPA ---
# Sin renderizar no hay nada que juzgar, y el riesgo no es solo quedarse corto: un
# framework guarda plantillas HTML dentro de strings de JavaScript, así que leer la
# estructura del crudo inventa encabezados e imágenes que no están en la página.
d = json.load(open(sys.argv[3])); pg = d['pages'][0]
rendered = open(sys.argv[4]).read() if os.path.exists(sys.argv[4]) else ''
spa = {
    'cascaron detectado':        pg['signals']['looksLikeEmptyShell'] is True,
    'sin encabezados fantasma':  pg['h1'] == [] and pg['headings'] == [],
    'sin imagenes fantasma':     pg['images'] == [],
    'sin enlaces fantasma':      pg['links'] == [],
    'title y descripcion si':    bool(pg['title']) and bool(pg['metaDescription']),
    'audit-cdp trae el contenido': '<h1' in rendered and 'IMG_9087' in rendered,
}
print('--- camino spa (cascaron que hay que renderizar)')
for k, v in spa.items():
    print(('  ok    ' if v else '  FALLA ') + k)
total += len(spa)
total_fallos += [f'spa: {k}' for k, v in spa.items() if not v]
print()

if total_fallos:
    for f in total_fallos: print('FALLA -', f)
    print(f'\n{len(total_fallos)} de {total} fallaron'); sys.exit(1)
print(f'{total}/{total} — el escaneo ve los defectos por los tres caminos')
ENDPY
