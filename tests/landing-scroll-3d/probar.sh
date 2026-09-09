#!/usr/bin/env bash
# Verifica un proyecto generado por landing-scroll-3d. Uso: bash tests/landing-scroll-3d/probar.sh <carpeta-proyecto>
set -u
P="${1:?carpeta del proyecto}"; cd "$P" || exit 1
ok=0; fail=0
check() { if eval "$2"; then echo "  ✓ $1"; ok=$((ok+1)); else echo "  ✗ $1"; fail=$((fail+1)); fi; }
echo "Proyecto: $P"
[ -d node_modules ] || npm install --no-audit --no-fund >/dev/null 2>&1
check "compila (tsc)" "npx tsc -b >/dev/null 2>&1"
check "build de producción" "npm run build >/dev/null 2>&1"
check "modelo en public/models/model.glb y < 10 MB" "[ -f public/models/model.glb ] && [ \$(stat -f%z public/models/model.glb) -lt 10485760 ]"
check "sin textos de la demo en config/choreo" "! grep -qE 'Sustituye este párrafo|Prototipo · Serie|Nombre del modelo 3D' src/config.ts src/choreo.ts"
check "sin restos del Porsche" "! grep -qiE 'porsche|930' src/config.ts src/choreo.ts"
check "créditos con licencia y sección credits" "grep -q 'credits: true' src/choreo.ts && grep -qE 'license: .(CC|MIT|CC0)' src/config.ts"
check "acento distinto del amarillo de la plantilla" "! grep -q '#f2c230' src/styles.css"
check "al menos 8 capturas en shots/" "[ \$(ls shots/*.jpg 2>/dev/null | wc -l) -ge 8 ]"
rm -rf dist
echo "OK: $ok  FALLOS: $fail"; [ "$fail" -eq 0 ]
