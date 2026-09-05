#!/usr/bin/env node
// Crawl completo de un sitio para rediseñarlo: saca fotos reales, textos por sección,
// formularios, contacto, identidad visual y SEO. Genera markdown legible + JSON crudo.
//
// uso: node crawl.mjs <url> [--max-pages N] [--out DIR]

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ---------- args ----------
const args = process.argv.slice(2);
const seed = args.find(a => !a.startsWith('--'));
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

if (!seed) {
  console.error('uso: node crawl.mjs <url> [--max-pages N] [--out DIR]');
  process.exit(1);
}

const seedUrl = seed.startsWith('http') ? seed : `https://${seed}`;
const domain = new URL(seedUrl).hostname.replace(/^www\./, '');
// 60 por defecto: los duplicados por contenido no gastan cupo, así que el tope compra páginas
// únicas. A ~9s por página son unos 9 minutos; un sitio de negocio local cabe entero.
const ESQUEMA = new URL(seedUrl).protocol;
const MAX_PAGES = parseInt(flag('max-pages', '60'), 10);
const outDir = path.resolve(flag('out', `./scrape-${domain}`));

// ---------- helpers ----------
const avisos = [];

function normalize(u, base = seedUrl) {
  try {
    const p = new URL(u, base);
    if (!/^https?:$/.test(p.protocol)) return null;
    p.hash = '';
    p.protocol = ESQUEMA; // se respeta el esquema de la semilla: hay negocios locales todavía en http
    p.hostname = p.hostname.replace(/^www\./, '');
    if (p.port === '80' || p.port === '443') p.port = ''; // el histórico trae URLs tipo host:80, y con https el puerto queda roto
    let s = p.toString();
    if (s.endsWith('/') && p.pathname !== '/') s = s.slice(0, -1);
    return s;
  } catch { return null; }
}

function sameDomain(u) {
  try { return new URL(u).hostname.replace(/^www\./, '') === domain; }
  catch { return false; }
}

function slugify(s, max = 40) {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, max);
}

function pageSlug(url) {
  const p = new URL(url).pathname;
  return p === '/' ? 'home' : (slugify(p.replace(/\//g, '-')) || 'pagina');
}

// ---------- semillas desde sitemap.xml ----------
async function seedsFromSitemap(request) {
  const found = new Map(); // url -> origen
  const tryFetch = async (u) => {
    try {
      const r = await request.get(u, { timeout: 10000 });
      return r.ok() ? await r.text() : null;
    } catch { return null; }
  };

  const robots = await tryFetch(`https://${domain}/robots.txt`);
  const sitemapUrls = new Set([`https://${domain}/sitemap.xml`]);
  if (robots) {
    for (const m of robots.matchAll(/sitemap:\s*(\S+)/gi)) sitemapUrls.add(m[1].trim());
  }

  for (const smUrl of sitemapUrls) {
    const xml = await tryFetch(smUrl);
    if (!xml) continue;

    // sitemapindex: se sigue un solo nivel
    if (/<sitemapindex/i.test(xml)) {
      const hijos = [...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)].map(m => m[1]);
      avisos.push(`sitemap index con ${hijos.length} sitemaps hijos: se sigue 1 nivel`);
      for (const hijo of hijos.slice(0, 10)) {
        const sub = await tryFetch(hijo);
        if (!sub) continue;
        for (const m of sub.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)) {
          const n = normalize(m[1]);
          if (n && sameDomain(n)) found.set(n, 'sitemap.xml');
        }
      }
      continue;
    }

    for (const m of xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)) {
      const n = normalize(m[1]);
      if (n && sameDomain(n)) found.set(n, 'sitemap.xml');
    }
  }
  return found;
}

// ---------- fallback: rutas históricas del Wayback Machine ----------
// Solo se usa cuando NO hay sitemap. Devuelve URLs que el archivo web vio alguna vez,
// así que algunas ya estarán muertas: el crawl las descarta al recibir un 4xx/5xx.
async function seedsFromWayback(request) {
  const found = new Map();
  const api = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}*`
    + `&output=json&fl=original&collapse=urlkey&filter=statuscode:200&limit=300`;
  // El CDX del archivo falla de forma intermitente: a veces tarda, a veces devuelve 200 con el
  // cuerpo vacío cuando está throttleando. Un reintento lo resuelve casi siempre; si aun así
  // falla, el aviso dice el motivo real en vez de "tardó demasiado".
  let filas = null, ultimoFallo = '';
  for (const timeout of [20000, 45000]) {
    try {
      const r = await request.get(api, { timeout });
      if (!r.ok()) { ultimoFallo = `HTTP ${r.status()}`; continue; }
      const cuerpo = await r.text();
      if (!cuerpo.trim()) { ultimoFallo = 'respuesta vacía (throttling del archivo)'; continue; }
      filas = JSON.parse(cuerpo);
      break;
    } catch (e) { ultimoFallo = String(e.message || e).split('\n')[0]; }
  }
  if (!filas) {
    avisos.push(`Wayback Machine no dio rutas históricas (${ultimoFallo}): se siguen solo los links del sitio`);
    return found;
  }
  for (const fila of filas.slice(1)) { // la primera fila es el encabezado
    const n = normalize(fila[0]);
    // el histórico incluye endpoints de infra (Wix `/_api/`, WordPress `/wp-json/`), no páginas
    const esInfra = /\/(_api|_files|_partials|wp-json|wp-admin|wp-content|feed|rss|xmlrpc)\b/i.test(n);
    if (n && sameDomain(n) && !esInfra && !/\.(pdf|jpe?g|png|gif|svg|webp|ico|zip|docx?|xlsx?|mp4|css|js|json|xml|txt)$/i.test(n)) {
      found.set(n, 'wayback');
    }
  }

  // El histórico es en su mayoría rutas muertas (versiones viejas del sitio). Comprobarlas con
  // un GET plano cuesta décimas de segundo; abrir cada una en el navegador costaría minutos.
  const candidatas = [...found.keys()];
  const vivas = new Map();
  for (let i = 0; i < candidatas.length; i += 10) {
    const lote = candidatas.slice(i, i + 10);
    const res = await Promise.all(lote.map(async u => {
      try { return (await request.get(u, { timeout: 10000 })).status() < 400 ? u : null; }
      catch { return null; }
    }));
    res.filter(Boolean).forEach(u => vivas.set(u, 'wayback'));
  }
  const descartadas = found.size - vivas.size;
  if (descartadas) console.log(`Wayback: ${descartadas} de ${found.size} rutas históricas ya no existen`);
  return vivas;
}

// ---------- extracción dentro del navegador ----------
function extractInPage() {
  const visible = el => {
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetParent !== null;
  };

  // --- mapa de secciones: orden real del documento ---
  // sección 0 recoge todo lo que va antes del primer heading (heros de Wix sin heading)
  const secciones = [{ heading: null, nivel: null, textos: [], imagenes: [] }];
  const vistos = new Set();
  const nodos = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,blockquote,img,figcaption');

  for (const el of nodos) {
    if (el.closest('nav, header, [role="navigation"]')) continue; // el nav se captura aparte
    const enFooter = !!el.closest('footer');

    if (/^H[1-6]$/.test(el.tagName)) {
      const t = el.textContent.trim();
      if (!t) continue;
      secciones.push({ heading: t, nivel: el.tagName, textos: [], imagenes: [], footer: enFooter });
      continue;
    }

    const actual = secciones[secciones.length - 1];
    if (el.tagName === 'IMG') {
      const src = el.currentSrc || el.src;
      if (src) actual.imagenes.push({ src, alt: el.alt || '', w: el.naturalWidth, h: el.naturalHeight, rw: el.width, rh: el.height });
    } else {
      const t = el.textContent.trim();
      // dedupe por contención: un <p> dentro de un <li> duplicaría el texto
      if (t && t.length > 1 && !vistos.has(t)) {
        vistos.add(t);
        actual.textos.push(t);
      }
    }
  }

  // --- todas las imágenes del documento, con su zona ---
  const zona = el => el.closest('nav, header') ? 'nav'
    : el.closest('footer') ? 'footer' : 'contenido';
  const imagenes = [];
  document.querySelectorAll('img').forEach(img => {
    const src = img.currentSrc || img.src;
    if (src) imagenes.push({ src, alt: img.alt || '', zona: zona(img), w: img.naturalWidth, h: img.naturalHeight, rw: img.width, rh: img.height });
  });
  document.querySelectorAll('*').forEach(el => {
    const m = getComputedStyle(el).backgroundImage?.match(/url\(["']?(.*?)["']?\)/);
    if (m && m[1] && !m[1].startsWith('data:')) {
      imagenes.push({ src: m[1], alt: '(background-image)', zona: zona(el), w: 0, h: 0, rw: 0, rh: 0 });
    }
  });

  // --- formularios ---
  const forms = [...document.querySelectorAll('form')].map(f => ({
    action: f.action, method: f.method,
    campos: [...f.querySelectorAll('input,textarea,select')].map(el => ({
      name: el.name || '',
      tipo: el.tagName === 'TEXTAREA' ? 'textarea' : el.tagName === 'SELECT' ? 'select' : (el.type || 'text'),
      label: el.closest('label')?.textContent?.trim()
        || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent?.trim())
        || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '',
      requerido: !!el.required,
      opciones: el.tagName === 'SELECT' ? [...el.options].map(o => o.textContent.trim()) : undefined,
    })),
  }));

  // --- navegación (con jerarquía de submenús) ---
  const navegacion = [...document.querySelectorAll('nav a, header a, [role="navigation"] a')]
    .map(a => ({
      texto: a.textContent.trim(),
      href: a.href,
      // profundidad = cuántos <ul>/<li> anidados lo contienen: detecta submenús
      nivel: (() => { let n = 0, p = a.parentElement; while (p && p.closest('nav, header')) { if (/^(UL|OL|LI)$/.test(p.tagName)) n++; p = p.parentElement; } return Math.max(0, Math.ceil(n / 2) - 1); })(),
    }))
    .filter(l => l.href);

  // --- contacto y conversión ---
  const hrefs = [...document.querySelectorAll('a[href]')].map(a => a.href);
  const uniq = a => [...new Set(a)];
  const contacto = {
    emails: uniq(hrefs.filter(h => h.startsWith('mailto:')).map(h => h.replace('mailto:', '').split('?')[0])),
    telefonos: uniq(hrefs.filter(h => h.startsWith('tel:')).map(h => h.replace('tel:', ''))),
    whatsapp: uniq(hrefs.filter(h => /wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(h))),
    redes: uniq(hrefs.filter(h => /facebook\.com|instagram\.com|twitter\.com|x\.com|linkedin\.com|tiktok\.com|youtube\.com/i.test(h))),
    mapas: uniq([...document.querySelectorAll('iframe')].map(f => f.src).filter(s => /google\.[a-z.]+\/maps|maps\.google|openstreetmap/i.test(s || ''))),
  };

  // --- video ---
  const videos = [];
  document.querySelectorAll('video').forEach(v => videos.push({ tipo: 'html5', src: v.currentSrc || v.src || '' }));
  document.querySelectorAll('iframe').forEach(f => {
    if (/youtube|vimeo|wistia|youtu\.be/i.test(f.src || '')) videos.push({ tipo: 'embed', src: f.src });
  });

  // --- identidad visual: frecuencia de colores y fuentes sobre elementos visibles ---
  const cuenta = (mapa, k) => { if (k) mapa[k] = (mapa[k] || 0) + 1; };
  const colores = {}, fondos = {}, fuentes = {};
  const headingSizes = {};
  let n = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (n++ > 3000) break; // ponytail: tope duro, sitios Wix traen miles de nodos
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    cuenta(colores, s.color);
    if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)') cuenta(fondos, s.backgroundColor);
    cuenta(fuentes, s.fontFamily);
    if (/^H[1-6]$/.test(el.tagName) && !headingSizes[el.tagName]) headingSizes[el.tagName] = s.fontSize;
  }
  const top = (o, k = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k).map(([v, c]) => ({ valor: v, usos: c }));

  // --- SEO ---
  const meta = n => document.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.content || '';
  const imgs = [...document.querySelectorAll('img')];
  const seo = {
    title: document.title,
    description: meta('description'),
    ogTitle: meta('og:title'), ogDescription: meta('og:description'), ogImage: meta('og:image'),
    h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()),
    imagenesSinAlt: imgs.filter(i => !i.alt).length,
    imagenesTotal: imgs.length,
    lang: document.documentElement.lang || '',
  };

  return {
    secciones, imagenes, forms, navegacion, contacto, videos, seo,
    identidad: { colores: top(colores), fondos: top(fondos), fuentes: top(fuentes, 5), headingSizes },
    // fallback crudo: incluye nav y footer, DIVERGE del mapa de secciones. Las secciones mandan.
    textoCrudoFallback: document.body.innerText.replace(/\n{3,}/g, '\n\n').trim().slice(0, 20000),
    enlaces: [...document.querySelectorAll('a[href]')].map(a => a.href),
  };
}

// ---------- main ----------
fs.mkdirSync(path.join(outDir, 'imagenes'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'screenshots'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'paginas'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'data'), { recursive: true });

console.log(`destino: ${outDir}`); // se imprime ANTES de crawlear: un --out mal apuntado se ve a tiempo
const browser = await chromium.launch(); // headless por defecto: no abre ventana
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

const origenes = new Map([[normalize(seedUrl), 'semilla']]);
// ponytail: las rutas del Wayback van a una cola de baja prioridad. Son históricas y muchas están
// muertas; si compiten de tú a tú con los links del sitio vivo se comen el cupo de --max-pages y
// el dossier acaba lleno de rutas archivadas en vez del contenido actual.
const colaWayback = [];
const desdeSitemap = await seedsFromSitemap(context.request);
for (const [u, o] of desdeSitemap) if (!origenes.has(u)) origenes.set(u, o);
if (desdeSitemap.size) {
  console.log(`sitemap.xml aportó ${desdeSitemap.size} rutas`);
} else {
  avisos.push('no se encontró sitemap.xml: las rutas salen de los links del sitio y, si sobra cupo, del histórico del Wayback Machine');
  const desdeWayback = await seedsFromWayback(context.request);
  for (const [u, o] of desdeWayback) if (!origenes.has(u)) { origenes.set(u, o); colaWayback.push(u); }
  if (desdeWayback.size) {
    console.log(`Wayback Machine aportó ${desdeWayback.size} rutas históricas (van al final: primero se agota el sitio vivo)`);
    avisos.push(`${desdeWayback.size} rutas vinieron del Wayback Machine: se crawlean solo si sobra cupo, y son históricas (verificar que sigan vivas)`);
  }
}

const enWayback = new Set(colaWayback);
const queue = [...origenes.keys()].filter(u => !enWayback.has(u));
const visited = new Set();
const pages = [];
const descargadas = new Map(); // src -> ruta local (dedupe entre páginas)
const muertas = []; // rutas que responden 4xx/5xx: no entran al dossier pero sí al reporte
const porContenido = new Map(); // huella del contenido -> primera URL que lo sirvió
const duplicadas = []; // misma página servida por otra URL: se anota como alias, no se duplica
let fallosImagen = 0;

while ((queue.length || colaWayback.length) && pages.length < MAX_PAGES) {
  const url = queue.shift() ?? colaWayback.shift();
  if (!url || visited.has(url)) continue;
  visited.add(url);

  const page = await context.newPage();
  const slug = pageSlug(url);
  let datos = { url, origen: origenes.get(url) || 'link interno', slug };

  try {
    let resp;
    try { resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 }); }
    catch { resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }); }

    // una ruta muerta (típico en las que vienen del Wayback) no entra al dossier
    const status = resp?.status() ?? 0;
    if (status >= 400) {
      await page.close();
      muertas.push({ url, status, origen: datos.origen });
      console.log(`[--] ${url} → ${status}, descartada`);
      continue;
    }
    await page.waitForTimeout(1200);
    // dispara lazy-loading: baja y vuelve
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

    // --- revelar lo que solo existe tras interactuar ---
    // Submenús construidos en JS: se disparan con mouseover, no hace falta click ni mover el ratón.
    await page.evaluate(() => {
      [...document.querySelectorAll('nav li, header li')].slice(0, 20)
        .forEach(li => li.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    }).catch(() => {});
    // Lanzadores de chat/WhatsApp: inyectan el enlace real solo al abrirse. Se pulsan únicamente
    // los que NO son <a> — un <a href="wa.me/..."> ya se captura sin tocar nada, y así no se navega.
    const abiertos = await page.evaluate(() => {
      const sel = '[class*="whats" i],[id*="whats" i],[class*="chat" i],[id*="chat" i],button[aria-label*="chat" i]';
      let n = 0;
      for (const el of document.querySelectorAll(sel)) {
        if (n >= 4) break;
        if (el.closest('a') || el.tagName === 'A') continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        try { el.click(); n++; } catch {}
      }
      return n;
    }).catch(() => 0);
    if (abiertos) {
      await page.waitForTimeout(1200);
      // si algún click navegó, se vuelve: el dossier tiene que describir ESTA ruta
      if (page.url() !== url) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
    }

    const e = await page.evaluate(extractInPage);
    e.interaccion = { lanzadoresPulsados: abiertos };

    // Muchos CMS sirven la misma página por varias URLs (`?id=35` y `/35/slug`, con y sin
    // `index.php`). Se detecta por CONTENIDO, no por forma de la URL: solo se descarta si el mapa
    // de secciones es idéntico, así que dos fichas distintas de la misma plantilla —dos tiendas,
    // dos servicios— se conservan las dos. El duplicado no gasta cupo del tope.
    // Se hashea solo el TEXTO. Las imágenes no entran porque el navegador las absolutiza contra la
    // URL de la página: la misma ficha bajo `?id=35` y bajo `/35/slug` da srcs distintos y el
    // duplicado se escaparía. Si la página casi no tiene texto (galería pura), el texto no
    // identifica nada, así que ahí sí entran los srcs para no colapsar dos galerías distintas.
    const soloTexto = e.secciones.map(sec => [sec.heading, ...sec.textos].join('\n')).join('\n');
    const base = soloTexto.trim().length >= 200 ? soloTexto : soloTexto + JSON.stringify(e.secciones.map(sec => sec.imagenes));
    const huella = crypto.createHash('sha1').update(base).digest('hex');
    const original = porContenido.get(huella);
    if (original) {
      await page.close();
      duplicadas.push({ url, original });
      console.log(`[==] ${url} → mismo contenido que ${new URL(original).pathname}, no cuenta contra el tope`);
      continue;
    }
    porContenido.set(huella, url);

    const shot = path.join('screenshots', `${slug}.png`);
    await page.screenshot({ path: path.join(outDir, shot), fullPage: true }).catch(() => {});

    // descarga de imágenes con nombre legible: <pagina>-<NN>-<slug del alt o filename>
    const imagenes = [];
    let i = 0;
    for (const img of e.imagenes) {
      i++;
      const abs = normalize(img.src, url) ?? img.src;
      let rel = descargadas.get(abs);
      if (!rel) {
        try {
          const r = await context.request.get(abs, { timeout: 15000 });
          if (!r.ok()) { fallosImagen++; continue; }
          const buf = await r.body();
          if (buf.length < 2048) continue;
          let ext = path.extname(new URL(abs).pathname).toLowerCase().split('?')[0];
          if (!/^\.(jpe?g|png|gif|webp|svg|avif)$/.test(ext)) ext = '.jpg';
          const desc = slugify(img.alt) || slugify(path.basename(new URL(abs).pathname, ext)) || 'img';
          rel = path.join('imagenes', `${slug}-${String(i).padStart(2, '0')}-${desc}${ext}`);
          fs.writeFileSync(path.join(outDir, rel), buf);
          descargadas.set(abs, rel);
        } catch { fallosImagen++; continue; }
      }
      imagenes.push({ archivo: rel, src: abs, alt: img.alt, zona: img.zona, ancho: img.w, alto: img.h });
    }

    // enlazar cada imagen de sección con su archivo local
    for (const sec of e.secciones) {
      sec.imagenes = sec.imagenes.map(si => {
        const abs = normalize(si.src, url) ?? si.src;
        return { ...si, archivo: descargadas.get(abs) || null };
      });
    }

    datos = {
      ...datos,
      seo: e.seo, secciones: e.secciones, imagenes, forms: e.forms,
      navegacion: e.navegacion, contacto: e.contacto, videos: e.videos,
      identidad: e.identidad, screenshot: shot, interaccion: e.interaccion,
      textoCrudoFallback: e.textoCrudoFallback,
    };

    for (const link of e.enlaces) {
      const n = normalize(link, url);
      if (n && sameDomain(n) && !visited.has(n) && !queue.includes(n)
        && !/\.(pdf|jpe?g|png|gif|svg|webp|zip|docx?|xlsx?|mp4)$/i.test(n)) {
        queue.push(n);
        if (!origenes.has(n)) origenes.set(n, 'link interno');
      }
    }
  } catch (err) {
    datos.error = String(err.message || err);
    avisos.push(`${url}: ${datos.error}`);
  }

  await page.close();
  pages.push(datos);
  console.log(`[${pages.length}/${MAX_PAGES}] ${url}${datos.error ? ' ERROR' : ''}`);
}

await browser.close();

const pendientes = queue.length + colaWayback.length;
if (pendientes) avisos.push(`crawl cortado por el tope de ${MAX_PAGES} páginas: quedaron ${pendientes} rutas sin visitar (${queue.length} del sitio vivo, ${colaWayback.length} históricas del Wayback) (subir con --max-pages)`);
avisos.splice(0, avisos.length, ...new Set(avisos)); // robots.txt y /sitemap.xml suelen ser el mismo archivo: no repetir avisos
if (fallosImagen) avisos.push(`${fallosImagen} imágenes no se pudieron descargar`);
const rotasDelSitio = muertas.filter(m => m.origen !== 'wayback');
if (rotasDelSitio.length) {
  const muestra = rotasDelSitio.slice(0, 5).map(m => `${new URL(m.url).pathname} (${m.status})`).join(', ');
  const resto = rotasDelSitio.length - 5;
  avisos.push(`${rotasDelSitio.length} ${rotasDelSitio.length === 1 ? 'link del propio sitio está roto' : 'links del propio sitio están rotos'}: ${muestra}${resto > 0 ? `, y ${resto} más (lista completa en data/site.json)` : ''}`);
}
if (duplicadas.length) avisos.push(`${duplicadas.length} URLs servían contenido ya capturado (el sitio expone las mismas páginas por varias rutas): se anotaron como alias en sitemap.md y no gastaron cupo`);
const historicasMuertas = muertas.filter(m => m.origen === 'wayback').length;
if (historicasMuertas) avisos.push(`${historicasMuertas} rutas históricas del Wayback ya no existen (descartadas, es lo esperado)`);
const sinWhats = !pages.some(p => p.contacto?.whatsapp?.length);
const pulsados = pages.reduce((n, p) => n + (p.interaccion?.lanzadoresPulsados || 0), 0);
if (sinWhats) avisos.push(`no se encontró WhatsApp${pulsados ? ` ni siquiera tras abrir ${pulsados} lanzadores de chat` : ' (no había ningún lanzador de chat que pulsar)'}: si el widget vive dentro de un iframe de terceros, no se puede leer — verificar a mano`);
const sinTel = !pages.some(p => p.contacto?.telefonos?.length);
if (sinTel) avisos.push('no se encontró ningún teléfono (tel:) en el sitio');

// ---------- generación de markdown ----------
const esc = s => (s || '').replace(/\|/g, '\\|');
const consolidar = k => [...new Set(pages.flatMap(p => p.contacto?.[k] || []))];

// paginas/NN-slug.md
pages.forEach((p, idx) => {
  const nn = String(idx + 1).padStart(2, '0');
  p.archivoMd = path.join('paginas', `${nn}-${p.slug}.md`);
  if (p.error) {
    fs.writeFileSync(path.join(outDir, p.archivoMd), `# ${p.url}\n\nERROR: ${p.error}\n`);
    return;
  }
  const L = [];
  L.push(`# ${p.seo.title || p.slug}`);
  L.push(`\n**URL:** ${p.url}  `);
  L.push(`**Descubierta vía:** ${p.origen}  `);
  if (p.seo.description) L.push(`**Meta description:** ${p.seo.description}  `);
  L.push(`**Screenshot:** [../${p.screenshot}](../${p.screenshot})\n`);

  L.push(`## Contenido por sección (orden real de la página)\n`);
  L.push(`> Dentro de cada sección, los textos y las imágenes van en orden de documento pero **no están pareados entre sí**. En una rejilla de personas o productos, no asumas que el texto N corresponde a la imagen N: verifica contra el screenshot antes de asignar una bio a una foto.\n`);
  p.secciones.forEach((s, i) => {
    if (!s.textos.length && !s.imagenes.length) return;
    const titulo = s.heading ? `"${s.heading}" (${s.nivel})` : '(sin encabezado)';
    L.push(`### Sección ${i} — ${titulo}${s.footer ? ' _[footer]_' : ''}\n`);
    s.textos.forEach(t => L.push(`${t}\n`));
    // los iconos chicos no se descargan y solo ensucian el plano: se omiten.
    // naturalWidth es 0 si la imagen no alcanzó a decodificar, así que se cae al tamaño renderizado
    const ancho = im => im.w || im.rw || 0, alto = im => im.h || im.rh || 0;
    const imgs = s.imagenes.filter(im => im.archivo || (ancho(im) >= 40 && alto(im) >= 40));
    if (imgs.length) {
      L.push(`**Imágenes de esta sección:**\n`);
      imgs.forEach(im => {
        const dim = ancho(im) ? ` — ${ancho(im)}×${alto(im)}px` : '';
        L.push(im.archivo
          ? `- ![${esc(im.alt) || 'sin alt'}](../${im.archivo})${dim}`
          : `- (no descargada) ${im.src}${dim}`);
      });
      L.push('');
    }
  });

  // Los fondos CSS se recogen en un escaneo de estilos aparte del recorrido de secciones (que solo
  // ve etiquetas <img>), así que no cuelgan de ningún encabezado. Sin esto quedaban descargados y
  // sin mencionar en ningún markdown: justo los heros, que es lo primero que se rediseña.
  const enSecciones = new Set(p.secciones.flatMap(sec => sec.imagenes.map(im => im.archivo)).filter(Boolean));
  const yaListada = new Set();
  const sueltas = (p.imagenes || []).filter(im => im.archivo && !enSecciones.has(im.archivo)
    && !yaListada.has(im.archivo) && yaListada.add(im.archivo)); // un mismo fondo se repite en varios elementos
  if (sueltas.length) {
    L.push(`## Fondos y decorados (sin sección)\n`);
    L.push(`> Imágenes CSS (\`background-image\`) y otras que no cuelgan de un encabezado. Se sabe la página, no la sección: casi siempre son los fondos de hero y de banda. Ubícalas contra el screenshot.\n`);
    sueltas.forEach(im => L.push(`- ![${esc(im.alt) || 'sin alt'}](../${im.archivo})${im.zona !== 'contenido' ? ` _[${im.zona}]_` : ''}`));
    L.push('');
  }

  if (p.forms.length) {
    L.push(`## Formularios\n`);
    p.forms.forEach((f, i) => {
      L.push(`**Formulario ${i + 1}** → \`${f.action}\` (${f.method})\n`);
      L.push(`| Campo | Tipo | Label | Requerido |`);
      L.push(`|---|---|---|---|`);
      f.campos.forEach(c => L.push(`| ${esc(c.name) || '—'} | ${c.tipo} | ${esc(c.label) || '—'} | ${c.requerido ? 'sí' : 'no'} |`));
      L.push('');
    });
  }

  const c = p.contacto;
  if (c.emails.length || c.telefonos.length || c.whatsapp.length || c.mapas.length) {
    L.push(`## Contacto en esta página\n`);
    if (c.emails.length) L.push(`- **Email:** ${c.emails.join(', ')}`);
    if (c.telefonos.length) L.push(`- **Teléfono:** ${c.telefonos.join(', ')}`);
    if (c.whatsapp.length) L.push(`- **WhatsApp:** ${c.whatsapp.join(', ')}`);
    if (c.mapas.length) L.push(`- **Mapa embebido:** ${c.mapas.join(', ')}`);
    L.push('');
  }

  if (p.videos.length) {
    L.push(`## Video\n`);
    p.videos.forEach(v => L.push(`- ${v.tipo}: ${v.src}`));
    L.push('');
  }

  fs.writeFileSync(path.join(outDir, p.archivoMd), L.join('\n'));
});

// sitemap.md
{
  const L = [`# Mapa del sitio — ${domain}\n`];
  L.push(`${pages.length} páginas rastreadas.\n`);
  L.push(`| # | Ruta | Título | Descubierta vía | Secciones | Imágenes | Forms |`);
  L.push(`|---|---|---|---|---|---|---|`);
  pages.forEach((p, i) => {
    const ruta = new URL(p.url).pathname;
    L.push(`| ${i + 1} | [${ruta}](${p.archivoMd}) | ${esc(p.seo?.title || '—')} | ${p.origen} | ${p.secciones?.length ?? 0} | ${p.imagenes?.length ?? 0} | ${p.forms?.length ?? 0} |`);
  });
  if (duplicadas.length) {
    L.push(`\n## URLs alias (mismo contenido por otra ruta)\n`);
    L.push(`> El sitio sirve estas páginas por más de una URL. Se capturaron una sola vez; al rediseñar basta una ruta por fila.\n`);
    L.push(`| URL alias | Es la misma que |`);
    L.push(`|---|---|`);
    duplicadas.forEach(d => L.push(`| ${new URL(d.url).pathname}${new URL(d.url).search} | ${new URL(d.original).pathname}${new URL(d.original).search} |`));
  }

  L.push(`\n## Menú de navegación (con submenús)\n`);
  const nav = pages[0]?.navegacion || [];
  nav.forEach(n => L.push(`${'  '.repeat(n.nivel)}- ${n.texto || '(sin texto)'} → ${n.href}`));
  fs.writeFileSync(path.join(outDir, 'sitemap.md'), L.join('\n'));
}

// REDISENO.md — punto de entrada
{
  const id = pages.find(p => p.identidad)?.identidad || { colores: [], fondos: [], fuentes: [], headingSizes: {} };
  const totalImgs = descargadas.size;
  const L = [`# ${pages[0]?.seo?.title || domain}\n`];
  L.push(`> Contenido completo de **${domain}**, listo para rediseñar. Todo el texto y todas las imágenes reales del sitio actual están aquí abajo o enlazados.\n`);
  L.push(`- **Páginas:** ${pages.length}`);
  L.push(`- **Imágenes descargadas:** ${totalImgs} (en \`imagenes/\`)`);
  L.push(`- **Screenshots de referencia:** \`screenshots/\``);
  L.push(`- **Fecha:** ${new Date().toISOString().slice(0, 10)}\n`);

  L.push(`## Páginas\n`);
  pages.forEach((p, i) => {
    L.push(`${i + 1}. [${p.seo?.title || p.slug}](${p.archivoMd}) — \`${new URL(p.url).pathname}\``);
  });

  // el logo y los assets de nav/footer no caen en ninguna sección (el nav se excluye del mapa),
  // pero son justo lo que hay que reusar en el rediseño
  const globales = [];
  const vistosG = new Set();
  for (const p of pages) {
    for (const im of (p.imagenes || [])) {
      if (im.zona === 'contenido' || !im.archivo || vistosG.has(im.archivo)) continue;
      vistosG.add(im.archivo);
      globales.push(im);
    }
  }
  if (globales.length) {
    L.push(`\n## Activos globales (logo, nav, footer)\n`);
    globales.forEach(im => L.push(`- ![${esc(im.alt) || 'sin alt'}](${im.archivo}) — \`${im.zona}\`${im.ancho ? ` — ${im.ancho}×${im.alto}px` : ''}`));
  }

  L.push(`\n## Contacto del negocio\n`);
  const emails = consolidar('emails'), tels = consolidar('telefonos'), whats = consolidar('whatsapp'), redes = consolidar('redes'), mapas = consolidar('mapas');
  L.push(`- **Emails:** ${emails.join(', ') || '_ninguno encontrado_'}`);
  L.push(`- **Teléfonos:** ${tels.join(', ') || '_ninguno encontrado_'}`);
  L.push(`- **WhatsApp:** ${whats.join(', ') || '_ninguno encontrado_'}`);
  L.push(`- **Redes:** ${redes.join(', ') || '_ninguna encontrada_'}`);
  if (mapas.length) L.push(`- **Mapas:** ${mapas.join(', ')}`);

  L.push(`\n## Identidad visual actual\n`);
  L.push(`**Colores de texto más usados:** ${id.colores.slice(0, 5).map(c => `${c.valor} (${c.usos})`).join(', ') || '—'}  `);
  L.push(`**Fondos más usados:** ${id.fondos.slice(0, 5).map(c => `${c.valor} (${c.usos})`).join(', ') || '—'}  `);
  L.push(`**Tipografías:** ${id.fuentes.map(f => f.valor).join(' · ') || '—'}  `);
  L.push(`**Tamaños de heading:** ${Object.entries(id.headingSizes).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}\n`);

  L.push(`## SEO actual (no perder al migrar)\n`);
  L.push(`| Página | Title | H1 | Imágenes sin alt |`);
  L.push(`|---|---|---|---|`);
  pages.forEach(p => L.push(`| \`${new URL(p.url).pathname}\` | ${esc(p.seo?.title || '—')} | ${esc((p.seo?.h1 || []).join(' / ') || '—')} | ${p.seo?.imagenesSinAlt ?? '—'}/${p.seo?.imagenesTotal ?? '—'} |`));

  L.push(`\n## Formularios del sitio\n`);
  const forms = pages.flatMap(p => (p.forms || []).map(f => ({ ...f, pagina: new URL(p.url).pathname })));
  if (!forms.length) L.push(`_Ninguno._`);
  forms.forEach(f => L.push(`- \`${f.pagina}\` → ${f.campos.map(c => `${(c.label || c.name || '—').replace(/\s*\*\s*$/, '')}${c.requerido ? ' (obligatorio)' : ''}`).join(', ')}`));

  L.push(`\n## Avisos y limitaciones de este scraping\n`);
  if (!avisos.length) L.push(`_Ninguno._`);
  avisos.forEach(a => L.push(`- ${a}`));
  L.push(`\n> El crawler solo ve lo que está en el DOM cargado. Contenido que aparece únicamente tras una interacción (widget de chat que se abre con click, popups diferidos) no queda capturado — eso se verifica a mano en el sitio en vivo.\n`);

  L.push(`## Cómo usar esto\n`);
  L.push(`Abre este archivo y las páginas de \`paginas/\`. Ahí está el texto real por sección y la imagen local que va en cada una. El JSON crudo en \`data/site.json\` es para máquina: no hace falta leerlo para rediseñar.`);

  fs.writeFileSync(path.join(outDir, 'REDISENO.md'), L.join('\n'));
}

fs.writeFileSync(path.join(outDir, 'data', 'site.json'), JSON.stringify({
  dominio: domain, semilla: seedUrl, paginas: pages.length, avisos,
  rotas: rotasDelSitio, alias: duplicadas,
  nota: 'textoCrudoFallback incluye nav/footer y DIVERGE del mapa de secciones. Las secciones son la fuente canónica.',
  pages,
}, null, 2));

// ---------- stdout compacto: lo único que ve el modelo ----------
console.log(`\n=== ${domain} — ${pages.length} páginas, ${descargadas.size} imágenes ===`);
console.log(`salida: ${outDir}`);
for (const p of pages) {
  const r = new URL(p.url).pathname;
  console.log(`  ${r.padEnd(24)} secciones:${String(p.secciones?.length ?? 0).padStart(3)}  imgs:${String(p.imagenes?.length ?? 0).padStart(3)}  forms:${p.forms?.length ?? 0}${p.error ? '  ERROR' : ''}`);
}
if (avisos.length) {
  console.log(`\nAVISOS:`);
  avisos.forEach(a => console.log(`  - ${a}`));
}
console.log(`\nEntregable: ${path.join(outDir, 'REDISENO.md')}`);
