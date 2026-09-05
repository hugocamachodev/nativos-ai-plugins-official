#!/usr/bin/env node
// site-scan.mjs — checkup-web skill.
//
// OBSERVACIONES, NUNCA VEREDICTOS. Mismo contrato que extract.mjs en landing-audit:
// este script reporta lo que encuentra y el modelo decide qué significa, para que la
// evidencia y el juicio no se suelden en silencio. Por eso no hay campos "pass",
// "score" ni "severity" en la salida — si los hubiera, el reporte se escribiría solo
// y sin contexto de negocio, que es justo lo que este skill existe para evitar.
//
// Cero dependencias: fetch y URL nativos de Node 18+.

import { writeFile, mkdir } from 'node:fs/promises';

const HELP = `site-scan.mjs — recorre un sitio y reporta observaciones para el checkup

  --url <url>          punto de partida (requerido)
  --max-pages <n>      tope de páginas a visitar (default 15)
  --timeout <ms>       por petición (default 10000)
  --max-images <n>     imágenes a las que se les mide el peso (default 40)
  --site-url <url>     dominio real de producción, cuando --url es un servidor local.
                       Sin esto, https/www/sitemap no se pueden juzgar y se reportan
                       como no medidos en vez de acusar al sitio por correr en local.
  --dump-dir <dir>     guarda el HTML de cada página aquí (para seo_checker.py)
  -h, --help           este texto

Salida: JSON en stdout. Progreso en stderr.
`;

// ---------- args ----------
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(name);
  return i === -1 ? def : argv[i + 1];
};
if (argv.includes('-h') || argv.includes('--help')) { console.log(HELP); process.exit(0); }

const START = arg('--url');
if (!START) { console.error(HELP); process.exit(1); }
const MAX_PAGES = Number(arg('--max-pages', 15));
const TIMEOUT = Number(arg('--timeout', 10000));
const MAX_IMAGES = Number(arg('--max-images', 40));
const SITE_URL = arg('--site-url', null);
const DUMP_DIR = arg('--dump-dir', null);

// Servir la carpeta en localhost es la ruta principal del skill, y en esa ruta el
// dominio real no existe. Juzgar https, www o el sitemap contra 127.0.0.1 produce
// acusaciones falsas contra sitios impecables, así que aquí se declaran no medidos
// salvo que --site-url diga cuál es el dominio de verdad.
const isLocalHost = (h) => /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?|.+\.local(host)?)$/i.test(h);
const LOCAL = isLocalHost(new URL(START).hostname);

const UA = 'Mozilla/5.0 (compatible; nativos-checkup/1.0)';
const log = (...a) => console.error('·', ...a);

// ---------- fetch con timeout ----------
async function get(url, method = 'GET') {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const r = await fetch(url, { method, redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': UA } });
    const body = method === 'GET' ? await r.text() : '';
    return { ok: true, status: r.status, url: r.url, body, headers: r.headers };
  } catch (e) {
    return { ok: false, status: 0, url, body: '', error: String(e.message || e) };
  } finally { clearTimeout(t); }
}

// ---------- parseo ----------
// Regex y no un parser DOM porque el skill corre en la máquina del estudiante sin
// instalar nada. Es suficiente: todo lo que se busca aquí vive en atributos y
// etiquetas de nivel superior, no en estructura anidada.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ntilde: 'ñ', Ntilde: 'Ñ' };
// Sin esto, un alt "T&amp;M" se reporta como «T&amp;amp;M» y un href con &amp;amp; se
// convierte en un falso enlace roto.
const decode = (t) => (t || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENTITIES[e] ?? ENTITIES[e.toLowerCase()] ?? m;
});
const strip = (s) => decode((s || '').replace(/\s+/g, ' ').trim());
const attr = (tag, name) => {
  const m = tag.match(new RegExp(name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  const raw = m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
  return raw === null ? null : decode(raw);
};
const tagsOf = (html, name) => html.match(new RegExp('<' + name + '\\b[^>]*>', 'gi')) || [];

function metaContent(html, key) {
  for (const tag of tagsOf(html, 'meta')) {
    const n = (attr(tag, 'name') || attr(tag, 'property') || '').toLowerCase();
    if (n === key) return attr(tag, 'content');
  }
  return null;
}

// Marcadores de plantilla que sobreviven a un sitio hecho con IA y llegan a producción.
const PLACEHOLDERS = [
  [/lorem ipsum/i, 'Lorem ipsum'],
  [/\btu nombre aqu[ií]\b/i, 'Tu nombre aquí'],
  [/\b(tu|your)@(correo|email|dominio|example)\.(com|mx)\b/i, 'Correo de plantilla'],
  [/\b(nombre|name) de (tu|la) (empresa|negocio|company)\b/i, 'Nombre de empresa sin llenar'],
  [/123[-\s]?456[-\s]?7890/, 'Teléfono de plantilla'],
  [/\b(insert|inserta|agrega|escribe) (tu|your|aqu[ií])\b/i, 'Instrucción de plantilla'],
  [/example\.com/i, 'example.com'],
  [/\[(tu|your|nombre|name|texto)[^\]]*\]/i, 'Marcador entre corchetes'],
];

function parsePage(url, html) {
  const head = (html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i) || [, html])[1];
  const titleM = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);

  const headings = [];
  for (const m of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    headings.push({ level: Number(m[1]), text: strip(m[2].replace(/<[^>]+>/g, '')).slice(0, 90) });
  }

  // next/image y los CDN de imagen sirven /_next/image?url=%2Ffotos%2FIMG_1234.jpg,
  // así que el nombre real del archivo va escondido y URL-codificado en un parámetro.
  // Sin esto, el check de nombres de archivo queda ciego en todo proyecto Next.
  const realSrc = (raw) => {
    const m = raw.match(/[?&](url|src|image)=([^&]+)/i);
    if (!m) return raw;
    try { return decodeURIComponent(m[2]) } catch { return raw }
  };
  const images = tagsOf(html, 'img').map((tag) => ({
    src: attr(tag, 'src') || attr(tag, 'data-src') || '',
    nombreReal: realSrc(attr(tag, 'src') || attr(tag, 'data-src') || ''),
    alt: attr(tag, 'alt'),           // null = atributo ausente; "" = presente y vacío (decorativa)
    loading: attr(tag, 'loading'),
  })).filter((i) => i.src);

  // La variante que se sirve en móvil suele vivir en srcset o en un preload, y es
  // justo donde el peso importa. Sin esto se pesa la de escritorio y se declara que
  // no faltó ninguna, que es peor que no medirlas.
  const responsive = [];
  for (const tag of [...tagsOf(html, 'source'), ...tagsOf(html, 'img')]) {
    for (const cand of (attr(tag, 'srcset') || '').split(',')) {
      const u = cand.trim().split(/\s+/)[0];
      if (u) responsive.push(u);
    }
  }
  for (const tag of tagsOf(html, 'link')) {
    if (/preload/i.test(attr(tag, 'rel') || '') && /image/i.test(attr(tag, 'as') || '')) {
      const h = attr(tag, 'href'); if (h) responsive.push(h);
    }
  }

  const links = [];
  for (const tag of tagsOf(html, 'a')) {
    const href = attr(tag, 'href');
    if (href) links.push(href);
  }

  // En una página única, un #ancla rota es EL enlace roto más probable, y es
  // invisible para cualquier verificación por código HTTP.
  const anchorIds = new Set([
    ...[...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/<a\b[^>]*\bname\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]),
  ]);
  const brokenAnchors = links
    .filter((h) => h.startsWith('#') && h.length > 1)
    .map((h) => decodeURIComponent(h.slice(1)))
    .filter((id) => id !== 'top' && !anchorIds.has(id));

  // Un <form> sin destino se ve perfecto y no manda nada a ningún lado. Pero en React,
  // Vue o Next el destino vive en el bundle de JavaScript, jamás en el tag — buscarlo
  // solo en el tag convierte "formulario muerto" en el default de todo sitio moderno.
  // Por eso la señal se busca en la página entera y el veredicto se deja abierto.
  const VENDOR = /formspree|netlify|getform|web3forms|basin|formsubmit|hsforms|tally\.so|typeform|airtable|sheetdb|emailjs|sendgrid|mailchimp|convertkit|brevo|hubspot/i;
  const vendorInPage = VENDOR.test(html);
  const handlerInPage = /(onsubmit|addEventListener\s*\(\s*["']submit|handleSubmit|preventDefault)/i.test(html);
  const forms = [];
  for (const m of html.matchAll(/<form\b[^>]*>/gi)) {
    const tag = m[0];
    const action = attr(tag, 'action');
    forms.push({
      action,
      method: (attr(tag, 'method') || 'get').toLowerCase(),
      onsubmit: !!attr(tag, 'onsubmit'),
      vendorInTag: VENDOR.test(tag) || /data-(netlify|form)/i.test(tag),
      vendorInPage,
      handlerInPage,
      // Qué se pudo ver, no qué se concluye. "no-visible" NO significa muerto: en un
      // sitio con framework hay que abrir el código antes de acusar (ver checks.md).
      destino: action ? 'action' : (VENDOR.test(tag) || /data-(netlify|form)/i.test(tag)) ? 'vendor-en-tag'
        : attr(tag, 'onsubmit') ? 'onsubmit' : vendorInPage ? 'vendor-en-pagina'
        : handlerInPage ? 'handler-en-javascript' : 'no-visible',
    });
  }

  const jsonLd = [];
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1].trim());
      for (const node of [].concat(parsed['@graph'] || parsed)) {
        if (node && node['@type']) jsonLd.push(...[].concat(node['@type']));
      }
    } catch { jsonLd.push('__json-invalido__'); }
  }

  const text = strip(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
  const placeholders = PLACEHOLDERS.filter(([re]) => re.test(text) || re.test(html)).map(([, label]) => label);

  const robotsMeta = metaContent(html, 'robots');
  const canonicalTag = (html.match(/<link\b[^>]*rel\s*=\s*["']?canonical["']?[^>]*>/i) || [])[0];
  const faviconTag = (html.match(/<link\b[^>]*rel\s*=\s*["'][^"']*icon[^"']*["'][^>]*>/i) || [])[0];

  return {
    url,
    title: titleM ? strip(titleM[1]) : null,
    metaDescription: metaContent(html, 'description'),
    canonical: canonicalTag ? attr(canonicalTag, 'href') : null,
    robotsMeta,
    // El error más caro del lanzamiento: publicar con el noindex del desarrollo puesto.
    noindex: !!robotsMeta && /noindex/i.test(robotsMeta),
    lang: (html.match(/<html\b[^>]*\blang\s*=\s*["']?([\w-]+)/i) || [])[1] || null,
    viewportMeta: !!metaContent(html, 'viewport'),
    favicon: !!faviconTag,
    ogImage: metaContent(html, 'og:image'),
    ogTitle: metaContent(html, 'og:title'),
    headings,
    h1: headings.filter((h) => h.level === 1).map((h) => h.text),
    images,
    responsiveImages: [...new Set(responsive)],
    links,
    forms,
    jsonLdTypes: [...new Set(jsonLd)],
    placeholders,
    brokenAnchors: [...new Set(brokenAnchors)],
    wordCount: text.split(/\s+/).filter(Boolean).length,
    // Señales que el modelo juzga; nunca son un veredicto por sí solas.
    signals: {
      telLinks: links.filter((h) => h.startsWith('tel:')).length,
      whatsapp: links.some((h) => /wa\.me|api\.whatsapp/i.test(h)),
      mapEmbed: /google\.com\/maps|maps\.googleapis|openstreetmap|mapbox/i.test(html),
      shareButton: /sharer\.php|twitter\.com\/intent|linkedin\.com\/shareArticle|navigator\.share|addtoany|share-button/i.test(html),
      // position:fixed junto a un tel: es la firma de un CTA fijo en móvil. Señal
      // débil a propósito: la certeza requiere render, y el skill lo dice.
      fixedBarHint: /(position\s*:\s*fixed|class\s*=\s*["'][^"']*(sticky|fixed|floating)[^"']*["'])/i.test(html),
      analytics: [
        /gtag\(|googletagmanager\.com\/gtag/i.test(html) && 'GA4',
        /googletagmanager\.com\/gtm|GTM-[A-Z0-9]{4,}/i.test(html) && 'GTM',
        /fbq\(|connect\.facebook\.net/i.test(html) && 'Meta Pixel',
        /clarity\.ms/i.test(html) && 'Clarity',
      ].filter(Boolean),
      // La huella de un cascarón de SPA: casi nada de texto y mucho script.
      looksLikeEmptyShell: text.length < 200 && /<script/i.test(html),
    },
  };
}

// ---------- URLs ----------
const origin = new URL(START).origin;
const bare = (h) => h.replace(/^www\./i, '');
// "/" y "/index.html" son la misma página. Sin esto, entrar por una y enlazar la otra
// produce un falso "títulos duplicados" que es la misma página contada dos veces.
const canonicalize = (u) => {
  u.hash = '';
  u.pathname = u.pathname.replace(/\/(index|default)\.(html?|php)$/i, '/');
  return u.href;
};
const HOST = bare(new URL(START).hostname);

// Un sitemap que lista http:// en un sitio https, o www donde el canónico no lo lleva,
// es frecuentísimo. Descartar esas URLs en silencio esconde el problema en vez de
// reportarlo, así que se reescriben al origen de trabajo y la discrepancia se anota.
const norm = (href, base) => {
  try {
    const u = new URL(href, base);
    if (u.origin !== origin) {
      if (bare(u.hostname) !== HOST) return null;
      return canonicalize(new URL(u.pathname + u.search, origin));
    }
    return canonicalize(u);
  } catch { return null; }
};

// Conectores que engordan una URL sin aportar nada. Preferencia para URLs nuevas:
// en un sitio publicado, renombrar sin 301 rompe enlaces — el skill lo advierte.
const STOPWORDS = /\/[^/]*\b(para|hacia|desde|con|sin|por|los|las|una|unos|unas|del|que|the|for|and|with|from)\b[^/]*\/?$/i;
function urlIssues(u) {
  const p = new URL(u).pathname;
  const out = [];
  if (STOPWORDS.test(p)) out.push('conectores');
  if (/[A-Z]/.test(p)) out.push('mayúsculas');
  if (/_/.test(p)) out.push('guion bajo');
  if (/%[0-9a-f]{2}/i.test(p)) out.push('caracteres codificados');
  if (p.split('/').filter(Boolean).length > 4) out.push('muy profunda');
  return out;
}

// ---------- nivel sitio ----------
async function siteLevel() {
  const site = { url: START, origin };
  const u = new URL(START);

  site.servedLocally = LOCAL;
  site.productionUrl = SITE_URL;

  // Sobre un servidor local, "no usa https" y "no existe la variante www" son hechos
  // del entorno de prueba, no del sitio. Declararlos no medidos es la única lectura
  // honesta: acusar aquí es acusar a todo sitio que se revise desde su carpeta.
  const publicUrl = SITE_URL || (LOCAL ? null : START);
  if (!publicUrl) {
    site.https = null;
    site.wwwVariant = null;
    site.notMeasured = ['https', 'variante www', 'sitemap contra el dominio real'];
    site.notMeasuredWhy = 'El sitio se revisó servido en local. Para juzgar esto hace falta --site-url con el dominio real, o revisar el sitio publicado.';
  } else {
    const pu = new URL(publicUrl);
    site.https = pu.protocol === 'https:';
    const alt = new URL(publicUrl);
    alt.hostname = pu.hostname.startsWith('www.') ? pu.hostname.slice(4) : 'www.' + pu.hostname;
    const r = await get(alt.href, 'HEAD');
    // Que las dos variantes carguen sin redirigir una a la otra reparte la autoridad
    // entre dos sitios que Google ve como distintos.
    site.wwwVariant = { url: alt.href, reachable: r.ok && r.status < 400, status: r.status, redirectsTo: r.ok ? r.url : null };
    site.notMeasured = [];
  }

  const robots = await get(origin + '/robots.txt');
  const robotsBody = robots.status === 200 ? robots.body : '';
  site.robotsTxt = {
    present: robots.status === 200 && !/<html/i.test(robotsBody),
    // Disallow: / bajo User-agent: * deja al sitio entero fuera del rastreo.
    disallowAll: /^\s*disallow:\s*\/\s*$/im.test(robotsBody),
    sitemapDeclared: /^\s*sitemap:/im.test(robotsBody),
    body: robotsBody.slice(0, 800),
  };

  const sm = await get(origin + '/sitemap.xml');
  const locs = sm.status === 200 ? [...sm.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]) : [];
  site.sitemap = {
    present: sm.status === 200 && /<(urlset|sitemapindex)/i.test(sm.body),
    isIndex: /<sitemapindex/i.test(sm.body || ''),
    urlCount: locs.length,
    // URLs listadas bajo otro esquema o host: el sitemap manda a Google a la versión
    // equivocada del sitio, y todas terminan en redirección. Solo tiene sentido
    // comparar contra el dominio real: contra 127.0.0.1 acusaría a cualquier sitemap.
    otherOrigin: (LOCAL && !SITE_URL) ? null
      : locs.filter((l) => { try { return new URL(l).origin !== new URL(SITE_URL || START).origin } catch { return true } }).slice(0, 10),
  };

  const llms = await get(origin + '/llms.txt');
  site.llmsTxt = { present: llms.status === 200 && !/<html/i.test(llms.body) };

  // 404: una ruta que no puede existir. Un 404 "personalizado" trae la navegación del
  // sitio; el genérico del servidor no.
  //
  // Trampa importante: un servidor de desarrollo (el de detect-build.mjs incluido)
  // devuelve index.html con 200 para cualquier ruta, porque así funcionan las SPA.
  // Leído sin cuidado, eso fabrica un soft-404 inexistente Y afirma que el sitio tiene
  // una 404 propia cuando no tiene ninguna: el mismo bug produce un falso positivo del
  // hallazgo más grave y un falso negativo del que sí existe. Por eso el probe se
  // compara con la home antes de concluir nada.
  const homeRes = await get(START);
  const probe = await get(origin + '/nativos-checkup-404-' + Date.now());
  const sameAsHome = !!homeRes.body && probe.body.trim() === homeRes.body.trim();
  site.notFound = {
    status: probe.status,
    bytes: probe.body.length,
    // Idéntica a la home = el servidor devolvió el fallback, no una página de error.
    isHomeFallback: sameAsHome,
    looksCustom: !sameAsHome && probe.body.length > 700 && /<nav|<header|<footer|<a\s/i.test(probe.body),
    soft404: probe.status === 200 && !(LOCAL && sameAsHome) ? (probe.status === 200) : false,
    // En local con fallback no hay nada que concluir: en producción lo decide el
    // hosting (_redirects, vercel.json, netlify.toml), no estos archivos.
    measurable: !(LOCAL && sameAsHome),
    fallbackBody: sameAsHome ? homeRes.body.trim() : null,
    why: (LOCAL && sameAsHome)
      ? 'El servidor local devuelve la home para cualquier ruta. Cómo responde el sitio publicado depende de la configuración del hosting: revísala en el repositorio.'
      : null,
  };

  const fav = await get(origin + '/favicon.ico');
  site.faviconAtRoot = fav.ok && fav.status === 200 && !(sameAsHome && fav.body.trim() === homeRes.body.trim());

  return { site, sitemapUrls: locs.map((l) => norm(l, origin)).filter(Boolean) };
}

// ---------- recorrido ----------
let FALLBACK = null;
async function crawl(seeds) {
  const queue = [...new Set([norm(START, origin), ...seeds].filter(Boolean))];
  const pages = [];
  const seen = new Set();

  while (queue.length && pages.length < MAX_PAGES) {
    const url = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const r = await get(url);
    if (!r.ok || r.status >= 400) { log('no cargó', url, r.status); continue; }
    // Con fallback SPA, una ruta inexistente devuelve la home con 200. Rastrearla
    // infla el conteo de páginas y duplica títulos que en realidad no existen.
    if (FALLBACK && url !== norm(START, origin) && r.body.trim() === FALLBACK) { log('fallback, no es página', url); continue; }
    if (!/text\/html/i.test(r.headers?.get?.('content-type') || 'text/html')) continue;

    const page = parsePage(url, r.body);
    page.status = r.status;
    if (DUMP_DIR) {
      const name = (new URL(url).pathname.replace(/[^\w.-]+/g, '_') || 'index') + '.html';
      const file = `${DUMP_DIR.replace(/\/$/, '')}/${name.replace(/^_+/, '') || 'index.html'}`;
      await writeFile(file, r.body);
      page.dumpedTo = file;
    }
    page.urlIssues = urlIssues(url);
    pages.push(page);
    log(`${pages.length}/${MAX_PAGES}`, url);

    for (const href of page.links) {
      const abs = norm(href, url);
      if (abs && !seen.has(abs) && !queue.includes(abs) && !/\.(pdf|jpg|jpeg|png|webp|svg|zip|mp4|avif|gif)$/i.test(abs)) queue.push(abs);
    }
  }
  return { pages, quedaronSinVer: queue.length };
}

// ---------- cruces entre páginas ----------
function crossPage(pages, sitemapUrls) {
  const dupes = (key) => {
    const by = new Map();
    for (const p of pages) {
      const v = p[key];
      if (!v) continue;
      by.set(v, [...(by.get(v) || []), p.url]);
    }
    return [...by.entries()].filter(([, urls]) => urls.length > 1).map(([value, urls]) => ({ value, urls }));
  };

  // Enlazadas desde alguien más. Las del sitemap que nadie enlaza son huérfanas: el
  // visitante no puede llegar navegando y Google reparte menos autoridad hacia ellas.
  const inbound = new Set();
  for (const p of pages) {
    for (const href of p.links) {
      const abs = norm(href, p.url);
      if (abs && abs !== p.url) inbound.add(abs);
    }
  }
  const known = new Set([...pages.map((p) => p.url), ...sitemapUrls]);
  const home = norm(START, origin);
  const orphans = [...known].filter((u) => u !== home && !inbound.has(u));

  return {
    duplicateTitles: dupes('title'),
    duplicateDescriptions: dupes('metaDescription'),
    duplicateH1: (() => {
      const by = new Map();
      for (const p of pages) for (const h of p.h1) by.set(h, [...(by.get(h) || []), p.url]);
      return [...by.entries()].filter(([, u]) => u.length > 1).map(([value, urls]) => ({ value, urls }));
    })(),
    titleEqualsH1: pages.filter((p) => p.title && p.h1[0] && p.title.toLowerCase() === p.h1[0].toLowerCase()).map((p) => p.url),
    orphans,
    inSitemapNotReached: sitemapUrls.filter((u) => !pages.some((p) => p.url === u)),
    reachedNotInSitemap: sitemapUrls.length ? pages.map((p) => p.url).filter((u) => !sitemapUrls.includes(u)) : [],
  };
}

// ---------- enlaces y pesos ----------
async function checkLinks(pages, fallbackBody) {
  const targets = new Map(); // url -> páginas que lo enlazan
  for (const p of pages) {
    for (const href of p.links) {
      if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
      const abs = norm(href, p.url);
      if (!abs) continue;
      targets.set(abs, [...(targets.get(abs) || []), p.url]);
    }
  }
  const visited = new Map(pages.map((p) => [p.url, p.status]));
  const broken = [];
  for (const [url, from] of targets) {
    let status = visited.get(url);
    if (status === undefined) {
      // Con fallback hay que pedir el cuerpo: un HEAD devuelve 200 sin contenido y
      // no hay con qué distinguir una página real de la home servida en su lugar.
      let r = await get(url, fallbackBody ? 'GET' : 'HEAD');
      // Muchos servidores no contestan HEAD; se confirma con GET antes de acusar.
      if (!r.ok || r.status === 405 || r.status >= 400) r = await get(url, 'GET');
      // Un servidor de desarrollo con fallback SPA responde 200 y la home para
      // cualquier ruta. Sin esto, "enlaces rotos" nunca encuentra nada: el enlace
      // muerto se lee como página válida y hasta se rastrea como una página más.
      if (fallbackBody && r.status === 200 && r.body && r.body.trim() === fallbackBody) {
        broken.push({ url, status: 200, servedFallback: true, linkedFrom: [...new Set(from)] });
        visited.set(url, 200);
        continue;
      }
      status = r.status;
      visited.set(url, status);
    }
    if (status === 0 || status >= 400) broken.push({ url, status, linkedFrom: [...new Set(from)] });
  }

  const emptyHrefs = [];
  for (const p of pages) {
    const n = p.links.filter((h) => h === '#' || h.trim() === '').length;
    if (n) emptyHrefs.push({ url: p.url, count: n });
  }
  return { broken, emptyHrefs };
}

async function weighImages(pages) {
  const srcs = new Map();
  const remote = new Set();
  for (const p of pages) for (const src of [...p.images.map((i) => i.src), ...p.responsiveImages]) {
    const abs = norm(src, p.url);
    // Las de otro dominio (Unsplash, un CDN) no se pesan aquí, pero desaparecerlas en
    // silencio es peor que no medirlas: el reporte diría que no faltó ninguna.
    if (!abs) { if (/^https?:/i.test(src)) remote.add(src); continue; }
    if (!srcs.has(abs)) srcs.set(abs, p.url);
  }
  const out = [];
  for (const [url, onPage] of [...srcs].slice(0, MAX_IMAGES)) {
    const r = await get(url, 'HEAD');
    const bytes = Number(r.headers?.get?.('content-length') || 0);
    out.push({ url, onPage, bytes: bytes || null, type: r.headers?.get?.('content-type') || null, status: r.status });
  }
  return {
    measured: out,
    notMeasured: Math.max(0, srcs.size - MAX_IMAGES),
    broken: out.filter((i) => i.status === 0 || i.status >= 400),
    remote: [...remote].slice(0, 30),
    // Sin Content-Length no se puede opinar del peso; se dice, no se adivina.
    unweighable: out.filter((i) => i.status < 400 && !i.bytes).map((i) => i.url),
  };
}

// ---------- main ----------
if (DUMP_DIR) await mkdir(DUMP_DIR, { recursive: true });
const { site, sitemapUrls } = await siteLevel();
FALLBACK = site.notFound.fallbackBody;
log('nivel sitio listo');
const { pages, quedaronSinVer } = await crawl(sitemapUrls);
if (!pages.length) {
  console.log(JSON.stringify({ site, pages: [], error: 'No se pudo cargar ninguna página desde ' + START }, null, 2));
  process.exit(0);
}
const links = await checkLinks(pages, FALLBACK);
const images = await weighImages(pages);

console.log(JSON.stringify({
  scannedAt: new Date().toISOString(),
  site,
  shape: pages.length === 1 ? 'una-pagina' : 'varias-paginas',
  pageCount: pages.length,
  hitPageCap: quedaronSinVer > 0,
  quedaronSinVer,
  pages,
  cross: crossPage(pages, sitemapUrls),
  links,
  images,
}, null, 2));
