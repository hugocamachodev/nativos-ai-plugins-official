# Regresión de la pasada de interacción

`index.html` tiene dos trampas a propósito:

- un submenú oculto por CSS (`display:none` hasta el `:hover`) que enlaza a `oculta.html`
- un `<div class="whatsapp-launcher">` que **solo al pulsarlo** inyecta `<a href="https://wa.me/...">`

Ninguna de las dos se captura sin la pasada de hover + click.

```bash
cd ${CLAUDE_PLUGIN_ROOT}/skills/web-scrape/test-fixture && python3 -m http.server 8899 &
node ../scripts/crawl.mjs http://localhost:8899/index.html --max-pages 5 --out /tmp/fixture-out
python3 -c "import json;d=json.load(open('/tmp/fixture-out/data/site.json'));p=d['pages'][0];assert p['contacto']['whatsapp']==['https://wa.me/5215512345678'],'no se capturó el WhatsApp del widget';assert len(d['pages'])==2,'no se siguió el submenú oculto';print('OK')"
pkill -f 'http.server 8899'
```

Nota: el fixture corre en `http://` a propósito — comprueba de paso que el crawler
respeta el esquema de la semilla y no fuerza `https` (había negocios que se caían por eso).
