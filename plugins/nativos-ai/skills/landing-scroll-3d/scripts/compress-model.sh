#!/usr/bin/env bash
# Comprime un GLB para web: meshopt + texturas WebP, conservando nombres de materiales y jerarquía.
# Uso: scripts/compress-model.sh entrada.glb public/models/model.glb [tamañoTextura=2048]
set -euo pipefail
IN="$1"; OUT="$2"; TEX="${3:-2048}"
mkdir -p "$(dirname "$OUT")"
npx -y @gltf-transform/cli optimize "$IN" "$OUT" \
  --compress meshopt --texture-compress webp --texture-size "$TEX" \
  --join false --flatten false --palette false --simplify false
ls -la "$IN" "$OUT"
