// Gramática del arte de puntos: anillos, filas que siguen un contorno, rellenos empaquetados con tamaños variables,
// texto/formas muestreados. Todo determinista (semilla).

export function rng(seed = 1) {
  let a = seed | 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// n puntos repartidos en un anillo de radio R con gotas de radio r (hueco = gap × diámetro)
export function ring(R, r, gap = 1.3, phase = 0) {
  const n = Math.max(3, Math.floor(2 * Math.PI * R / (2 * r * gap)));
  const out = [];
  for (let i = 0; i < n; i++) { const a = phase + i / n * Math.PI * 2; out.push({ x: Math.cos(a) * R, y: Math.sin(a) * R, a, r, i, n }); }
  return out;
}

// fila de gotas a lo largo de una curva paramétrica f(u) → [x, y, z], u ∈ [0,1]; rFn(u) = radio; separación por longitud de arco
export function along(f, rFn, gap = 1.3, samples = 600) {
  const P = [], L = [0];
  for (let i = 0; i <= samples; i++) P.push(f(i / samples));
  for (let i = 1; i <= samples; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], (P[i][2] || 0) - (P[i - 1][2] || 0)));
  const total = L[samples], out = [];
  let s = 0, j = 0;
  while (s <= total) {
    while (j < samples && L[j + 1] < s) j++;
    const k = (s - L[j]) / Math.max(1e-9, L[j + 1] - L[j]), u = (j + k) / samples;
    const p = f(u), r = rFn(u);
    out.push({ x: p[0], y: p[1], z: p[2] || 0, r, u });
    s += 2 * r * gap;
    if (r <= 0) s += total / samples;
  }
  return out;
}

// relleno empaquetado de radio variable (dardos de Poisson): inside(x,y) → bool, rFn(x,y) → radio.
// Devuelve [{x, y, r}]. minGap: holgura entre gotas (× suma de radios).
export function pack({ x0, y0, x1, y1, inside = () => true, rFn = () => .1, seed = 1, tries = 30, minGap = 1.12, max = 200000, attempts = 0 }) {
  const R = rng(seed), out = [];
  let rMax = 0;
  for (let i = 0; i < 400; i++) rMax = Math.max(rMax, rFn(lerp(x0, x1, R()), lerp(y0, y1, R())));
  const cs = rMax * 2 * minGap, gw = Math.ceil((x1 - x0) / cs) + 1, gh = Math.ceil((y1 - y0) / cs) + 1;
  const grid = new Map();
  const key = (i, j) => i * 100003 + j;
  const fits = (x, y, r) => {
    const gi = Math.floor((x - x0) / cs), gj = Math.floor((y - y0) / cs);
    for (let a = gi - 2; a <= gi + 2; a++) for (let b = gj - 2; b <= gj + 2; b++) {
      const cell = grid.get(key(a, b)); if (!cell) continue;
      for (const q of cell) { const d = Math.hypot(q.x - x, q.y - y); if (d < (q.r + r) * minGap) return false; }
    }
    return true;
  };
  const N = attempts || Math.ceil((x1 - x0) * (y1 - y0) / (Math.PI * rMax * rMax * .05)) * 4;
  // primero las grandes: se ordenan los candidatos por radio decreciente para un empaquetado de pintor
  const cand = [];
  for (let i = 0; i < N; i++) { const x = lerp(x0, x1, R()), y = lerp(y0, y1, R()); if (!inside(x, y)) continue; cand.push({ x, y, r: rFn(x, y) }); }
  cand.sort((a, b) => b.r - a.r);
  for (const c of cand) {
    if (out.length >= max) break;
    if (c.r <= 0 || !fits(c.x, c.y, c.r)) continue;
    out.push(c);
    const k = key(Math.floor((c.x - x0) / cs), Math.floor((c.y - y0) / cs));
    if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c);
  }
  return out;
}

// máscara desde un canvas 2D: draw(ctx, w, h) dibuja en blanco; devuelve inside(u, v) con u,v ∈ [0,1] (v hacia arriba)
export function mask(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.strokeStyle = '#fff';
  draw(x, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  const inside = (u, v) => { const i = Math.floor(clamp(u, 0, .9999) * w), j = Math.floor(clamp(1 - v, 0, .9999) * h); return d[(j * w + i) * 4] > 127; };
  inside.value = (u, v) => { const i = Math.floor(clamp(u, 0, .9999) * w), j = Math.floor(clamp(1 - v, 0, .9999) * h); return d[(j * w + i) * 4] / 255; };
  return inside;
}
// máscara de texto (fuente ya cargada)
export function textMask(text, { font = '700 200px Inter', w = 2048, h = 512, ls = 0 } = {}) {
  return mask(w, h, (x) => { x.font = font; x.letterSpacing = ls + 'px'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2); });
}
// curva de tiempo monótona (Fritsch–Carlson) por claves [[salida, fuente], …]: recorta y acelera escenas sin tirones
export function remap(K, t) {
  const n = K.length;
  if (t <= K[0][0]) return K[0][1];
  if (t >= K[n - 1][0]) return K[n - 1][1];
  const d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((K[i + 1][1] - K[i][1]) / (K[i + 1][0] - K[i][0]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (!d[i]) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  let i = 0; while (t > K[i + 1][0]) i++;
  const [x0, y0] = K[i], [x1, y1] = K[i + 1], h = x1 - x0, u = (t - x0) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * m[i] + (3 * u2 - 2 * u3) * y1 + (u3 - u2) * h * m[i + 1];
}
