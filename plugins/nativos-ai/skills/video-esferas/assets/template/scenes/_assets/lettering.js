// Sphere lettering (owner: intro agent · used by intro and final). Generalises the round-2 3·2·1 numerals the client loved:
// Inter mask → distance field → one thin EDGE row of small spheres along the contour (rim, counter-colour) + a packed CORE
// whose spheres grow toward the heart of each stroke. Radii scale with the stroke (fractions of its max distance), calibrated
// on the round-2 '3' (NH 3.9 → r0 .024, rMax .115). Everything deterministic.
//
//   text(E, 'CLAUDE', { cap, x, y, maxW, justify, weight, ls, edge, core, rFloor, seed })  → [{x,y,z,r,d,edge}]  (+ .w, .cap)
//   spark(E, { R, x, y, ... })                  → the Claude spark (11 irregular tapered rays) as the same kind of fill
//   cloud(n, { box, r, seed })                  → a random cloud (start state for "assemble", end state for "scatter")
//   bake(sets, N)                               → per-set typed arrays over N sphere slots (Hilbert-ordered → coherent flow)
//   blend(A, B, i, e, lift)                     → position/radius/colour of slot i between two baked states (arc through z)
//   grad(colors, k)                             → multi-stop colour ramp
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const PX = 240;                                   // canvas cap height (px): distance-field resolution

export const grad = (cs, k) => { k = clamp(k, 0, .9999) * (cs.length - 1); const i = Math.floor(k); return cs[i].clone().lerp(cs[i + 1], k - i); };

// chamfer distance transform of a white-on-black canvas (px units)
function distField(ctx, W, H) {
  const d = ctx.getImageData(0, 0, W, H).data, D = new Float32Array(W * H), s2 = Math.SQRT2;
  for (let i = 0; i < W * H; i++) D[i] = d[i * 4] > 127 ? 1e9 : 0;
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) { const k = j * W + i; if (D[k]) D[k] = Math.min(D[k], D[k - 1] + 1, D[k - W] + 1, D[k - W - 1] + s2, D[k - W + 1] + s2); }
  for (let j = H - 2; j > 0; j--) for (let i = W - 2; i > 0; i--) { const k = j * W + i; if (D[k]) D[k] = Math.min(D[k], D[k + 1] + 1, D[k + W] + 1, D[k + W + 1] + s2, D[k + W - 1] + s2); }
  return D;
}

// pack a distance field: (cx, cy) = canvas px of the local origin, sc = world units per px
function fill(E, D, W, H, cx, cy, sc, o) {
  const pack = E.dots.pack;
  const dist = (X, Y) => { const i = Math.round(cx + X / sc), j = Math.round(cy - Y / sc); return i < 0 || j < 0 || i >= W || j >= H ? 0 : D[j * W + i] * sc; };
  let maxD = 0; for (let i = 0; i < D.length; i++) if (D[i] > maxD && D[i] < 1e8) maxD = D[i];
  maxD *= sc;
  const r0 = Math.max(o.rFloor ?? 0, (o.edge ?? .058) * maxD), rMax = Math.max(r0 * 1.2, (o.core ?? .28) * maxD), rMin = o.rMin ?? r0;
  const box = { x0: -cx * sc, y0: -(H - cy) * sc, x1: (W - cx) * sc, y1: cy * sc }, area = (box.x1 - box.x0) * (box.y1 - box.y0);
  const seed = o.seed ?? 1, cap = n => Math.min(700000, Math.ceil(n));
  const edge = o.rim === false ? [] : pack({ ...box, seed: seed + 50, minGap: 1.3, attempts: cap(area / (Math.PI * r0 * r0) * 22),
    inside: (X, Y) => { const v = dist(X, Y); return v > r0 * .95 && v < r0 * 1.6; }, rFn: () => r0 });
  const k0 = o.rim === false ? 0 : r0 * (o.gap ?? 2.9);   // gap between rim row and core (2.9 = round-2 numerals; smaller = fuller strokes)
  const core = pack({ ...box, seed, minGap: o.minGap ?? 1.1, attempts: cap(area / (Math.PI * rMin * rMin) * 5),
    inside: (X, Y) => dist(X, Y) > k0 + rMin, rFn: (X, Y) => clamp((dist(X, Y) - k0) * .95, rMin, rMax) });
  const rel = o.relief ?? .5;                     // heart of the stroke pushed toward the camera (physical relief)
  const ox = o.x ?? 0, oy = o.y ?? 0;
  const out = [];
  for (const p of core) { const d = dist(p.x, p.y) / maxD; out.push({ x: ox + p.x, y: oy + p.y, z: d * rel * maxD, r: p.r, d, edge: 0 }); }
  for (const p of edge) out.push({ x: ox + p.x, y: oy + p.y, z: 0, r: p.r, d: 0, edge: 1 });
  out.maxD = maxD; out.r0 = r0;
  return out;
}

// capital-height ratio of Inter at a weight (measured once)
const capCache = {};
function capRatio(weight) {
  if (capCache[weight]) return capCache[weight];
  const x = document.createElement('canvas').getContext('2d'); x.font = `${weight} 100px Inter`;
  return (capCache[weight] = x.measureText('H').actualBoundingBoxAscent / 100);
}

// text line as spheres. cap = capital height (world). maxW caps the ink width (shrinks cap). justify = exact ink width (tracking).
export function text(E, str, o = {}) {
  const weight = o.weight ?? 800, fpx = PX / capRatio(weight), n = [...str].length;
  const m0 = document.createElement('canvas').getContext('2d'); m0.font = `${weight} ${fpx}px Inter`;
  const ls0 = (o.ls ?? .03) * fpx;
  m0.letterSpacing = '0px'; const t0 = m0.measureText(str), ink0 = t0.actualBoundingBoxLeft + t0.actualBoundingBoxRight;
  let ls = ls0, inkPx = ink0 + ls0 * (n - 1), sc = (o.cap ?? 1) / PX;
  if (o.justify) { if (o.maxCap) sc = Math.min(sc, o.maxCap / PX); ls = Math.max(ls0, (o.justify / sc - ink0) / Math.max(1, n - 1)); inkPx = ink0 + ls * (n - 1); sc = o.justify / inkPx; }
  else if (o.maxW && inkPx * sc > o.maxW) sc = o.maxW / inkPx;
  const pad = 12, W = Math.ceil(inkPx + pad * 2 + 4), asc = Math.max(PX, t0.actualBoundingBoxAscent), H = Math.ceil(asc + t0.actualBoundingBoxDescent + pad * 2 + 4);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff';
  x.font = `${weight} ${fpx}px Inter`; x.letterSpacing = ls + 'px'; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  const base = pad + asc;
  x.fillText(str, pad + t0.actualBoundingBoxLeft, base);
  const D = distField(x, W, H);
  const pts = fill(E, D, W, H, pad + inkPx / 2, base - PX / 2, sc, o);   // origin: ink centre, mid cap height
  pts.w = inkPx * sc; pts.cap = PX * sc;
  return pts;
}

// the Claude spark: 11 irregular rays, narrow at the centre, widening outward, rounded tips
export function spark(E, o = {}) {
  const R = o.R ?? 1, N = o.rays ?? 11, S = 520, pad = 14, W = S + pad * 2, k = S / 2 / 1.02;
  const c = document.createElement('canvas'); c.width = c.height = W;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#000'; x.fillRect(0, 0, W, W); x.fillStyle = '#fff';
  const H = E.dots.hash, ctr = W / 2;
  for (let i = 0; i < N; i++) {
    const a = (i + .28 * (H(i, 3) - .5)) / N * Math.PI * 2 + (o.rot ?? .12), L = k * (.74 + .26 * H(i, 5)), wc = k * .06, wt = k * (.125 + .02 * H(i, 7));
    const dx = Math.cos(a), dy = -Math.sin(a), nx = -dy, ny = dx, e = L - wt;
    x.beginPath();
    x.moveTo(ctr + nx * wc, ctr + ny * wc);
    x.lineTo(ctr + dx * e + nx * wt, ctr + dy * e + ny * wt);
    x.lineTo(ctr + dx * e - nx * wt, ctr + dy * e - ny * wt);
    x.lineTo(ctr - nx * wc, ctr - ny * wc);
    x.closePath(); x.fill();
    x.beginPath(); x.arc(ctr + dx * e, ctr + dy * e, wt, 0, Math.PI * 2); x.fill();
  }
  x.beginPath(); x.arc(ctr, ctr, k * .1, 0, Math.PI * 2); x.fill();
  const D = distField(x, W, W);
  const pts = fill(E, D, W, W, ctr, ctr, R / k, o);
  pts.w = 2 * R; pts.cap = 2 * R;
  return pts;
}

// random cloud in a box {x0,x1,y0,y1,z0,z1}; radii in [r[0], r[1]] skewed small
export function cloud(E, n, o = {}) {
  const R = E.dots.rng(o.seed ?? 7), b = o.box ?? { x0: -5, x1: 5, y0: -5, y1: 5, z0: -3, z1: 3 }, [ra, rb] = o.r ?? [.01, .05];
  const out = [];
  for (let i = 0; i < n; i++) out.push({ x: b.x0 + (b.x1 - b.x0) * R(), y: b.y0 + (b.y1 - b.y0) * R(), z: b.z0 + (b.z1 - b.z0) * R(), r: ra + (rb - ra) * R() * R(), d: R(), edge: 0 });
  return out;
}

// Hilbert index on a 1024² grid (2D locality → neighbouring spheres of one form go to neighbouring spots of the next)
function hilbert(x, y, n = 1024) {
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (!ry) { if (rx) { x = n - 1 - x; y = n - 1 - y; } const t = x; x = y; y = t; }
  }
  return d;
}

// bake point sets (each point needs x,y,z,r and c: THREE.Color, optional g glow) onto N slots.
// Slot i takes point floor(i·n/N) of the Hilbert-sorted set; duplicates get r = 0 (they merge into their twin and shrink away).
export function bake(sets, N) {
  return sets.map(P => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of P) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
    const sx = 1023 / Math.max(1e-6, x1 - x0), sy = 1023 / Math.max(1e-6, y1 - y0);
    for (const p of P) p.h = hilbert(Math.round((p.x - x0) * sx), Math.round((p.y - y0) * sy));
    P.sort((a, b) => a.h - b.h);
    const n = P.length, S = { x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N), r: new Float32Array(N), c: new Float32Array(N * 3), g: new Float32Array(N), d: new Float32Array(N), n };
    let prev = -1;
    for (let i = 0; i < N; i++) {
      const j = Math.floor(i * n / N), p = P[j], on = j !== prev; prev = j;
      S.x[i] = p.x; S.y[i] = p.y; S.z[i] = p.z; S.r[i] = on ? p.r : 0; S.d[i] = p.d ?? 0; S.g[i] = p.g ?? 0;
      S.c[i * 3] = p.c.r; S.c[i * 3 + 1] = p.c.g; S.c[i * 3 + 2] = p.c.b;
    }
    return S;
  });
}

// slot i between baked states A → B at progress e ∈ [0,1]; lift = [lx, ly, lz] arc offset at mid-flight. Writes into o.
export function blend(A, B, i, e, lift, o) {
  const s = Math.sin(Math.PI * e), k = i * 3;
  o.x = A.x[i] + (B.x[i] - A.x[i]) * e + lift[0] * s;
  o.y = A.y[i] + (B.y[i] - A.y[i]) * e + lift[1] * s;
  o.z = A.z[i] + (B.z[i] - A.z[i]) * e + lift[2] * s;
  o.r = A.r[i] + (B.r[i] - A.r[i]) * e;
  o.cr = A.c[k] + (B.c[k] - A.c[k]) * e; o.cg = A.c[k + 1] + (B.c[k + 1] - A.c[k + 1]) * e; o.cb = A.c[k + 2] + (B.c[k + 2] - A.c[k + 2]) * e;
  o.g = A.g[i] + (B.g[i] - A.g[i]) * e;
  o.d = A.d[i] + (B.d[i] - A.d[i]) * e;
  return o;
}
