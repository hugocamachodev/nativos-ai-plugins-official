#!/usr/bin/env bash
# Pruebas de video-esferas.
#   bash tests/video-esferas/probar.sh plantilla           → copia la plantilla a una carpeta temporal, instala y renderiza
#   bash tests/video-esferas/probar.sh <carpeta-proyecto>  → verifica un proyecto generado con la skill
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TPL="$ROOT/plugins/nativos-ai/skills/video-esferas/assets/template"
ok=0; fail=0
check() { if eval "$2"; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1"; fail=$((fail+1)); fi; }
frames() { node scripts/verificar.mjs "$1" - 2>/dev/null | sed -nE 's/.* ([0-9]+) cuadros$/\1/p'; }

if [ "${1:-}" = "plantilla" ]; then
  BASE="$(mktemp -d)"; P="$BASE/video-prueba"; mkdir -p "$P"; cp -R "$TPL/." "$P/"; cd "$P" || exit 1
  echo "Plantilla en $P"
  check "npm install" "npm install --no-audit --no-fund >/dev/null 2>&1"
  check "doctor.mjs sin faltantes" "node scripts/doctor.mjs >/dev/null 2>&1"
  check "arranca el reel (info)" "node render.cjs info --fmt=reel >/dev/null 2>&1"
  check "arranca la versión horizontal (info)" "node render.cjs info --fmt=wide >/dev/null 2>&1"
  check "hoja de contactos de planeta" "node render.cjs sheet 0:8:2 review/planeta.jpg --scene=planeta >/dev/null 2>&1 && [ -s review/planeta.jpg ]"
  check "hoja de la intro vertical" "node render.cjs sheet 0:10:2.5 review/intro.jpg --scene=intro >/dev/null 2>&1 && [ -s review/intro.jpg ]"
  check "video reel de 3 s (180 cuadros, 1080×1920)" "node render.cjs video review/r.mp4 --fmt=reel --end=3 >/dev/null 2>&1 && [ \"\$(frames review/r.mp4)\" = 180 ]"
  check "video horizontal de 3 s (180 cuadros)" "node render.cjs video review/h.mp4 --fmt=wide --end=3 >/dev/null 2>&1 && [ \"\$(frames review/h.mp4)\" = 180 ]"
  check "sin Math.random en escenas" "! grep -rnE 'Math\.random[[:space:]]*\(' scenes core >/dev/null"
  echo "OK: $ok  FALLOS: $fail"
  cd / && [ "${KEEP:-0}" = 1 ] && echo "(se queda en $P)" || rm -rf "$BASE"   # KEEP=1 conserva la carpeta
  [ "$fail" -eq 0 ]; exit $?
fi

P="${1:?uso: probar.sh plantilla | <carpeta-proyecto>}"; cd "$P" || exit 1
echo "Proyecto: $P"
[ -d node_modules ] || npm install --no-audit --no-fund >/dev/null 2>&1
check "guion escrito (sin marcadores de la plantilla)" "[ -f SCRIPT.md ] && ! grep -q '\[TÍTULO\]' SCRIPT.md"
check "biblia de estilo rellenada" "[ -f LOOK.md ] && ! grep -q '\[TÍTULO\]' LOOK.md"
check "cada escena de ORDER existe" "node -e \"const s=require('fs').readFileSync('main.js','utf8');const o=eval(s.match(/ORDER = (\[[^\]]*\])/)[1]);process.exit(o.every(i=>require('fs').existsSync('scenes/'+i+'.js'))?0:1)\""
check "la película arranca completa (info)" "node render.cjs info --fmt=reel >/dev/null 2>&1"
check "sin Math.random en escenas" "! grep -rnE 'Math\.random[[:space:]]*\(' scenes >/dev/null"
check "hojas de contactos de revisión (≥ 4)" "[ \$(ls review/*.jpg review/*/*.jpg 2>/dev/null | wc -l) -ge 4 ]"
V="$(ls -t *.mp4 2>/dev/null | head -1)"
check "hay un video final" "[ -n \"$V\" ]"
if [ -n "$V" ]; then
  R="$(node scripts/verificar.mjs "$V" - 2>/dev/null)"; code=$?
  check "video completo (cuadros = duración × fps)" "[ $code -eq 0 ]"
  check "60 fps y sin audio" "echo \"\$R\" | grep -q 'a 60 fps' && echo \"\$R\" | grep -q 'audio: no'"
fi
echo "OK: $ok  FALLOS: $fail"; [ "$fail" -eq 0 ]
