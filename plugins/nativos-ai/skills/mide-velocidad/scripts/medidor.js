// mide-velocidad · se inyecta ANTES de que cargue la página (navigate_page con initScript = todo este archivo).
// Solo cuenta y lee, no cambia nada de la página. Hace dos cosas:
//   1. Desde el inicio cuenta lo que después ya no se puede saber: qué fue lo principal (aunque luego lo reemplacen),
//      si la pestaña se ocultó, cuándo se dibujó el primer cuadro 3D, cuántos dibujos y cuadros pide la página.
//   2. Deja lista la lectura: después de navegar, evaluate_script con
//        () => window.__mideVelocidadLeer()
//      espera a que la página lleve 15 s, mira 5 s si descansa y devuelve un JSON corto.
(() => {
  const m = (window.__mideVelocidad = {
    primerDibujo3d: null, dibujos3d: 0, cuadros3d: 0, cuadrosPedidos: 0, tDibujo: -1,
    principal: null, ocultaAlgunaVez: document.visibilityState !== 'visible',
  });
  // Por omisión el navegador guarda solo 250 archivos en su lista; una página grande se pasaría y perderíamos peso.
  try { performance.setResourceTimingBufferSize(5000); } catch {}
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') m.ocultaAlgunaVez = true;
  });
  const describir = (el) => {
    if (!el || !el.tagName) return null;
    const txt = (el.innerText || el.alt || '').trim().replace(/\s+/g, ' ').slice(0, 70);
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList && el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '') + (txt ? ' «' + txt + '»' : '');
  };
  m.describir = describir;
  // Qué es lo principal (LCP) en el momento en que Chrome lo anota: si después lo reemplazan, ya no se encuentra.
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) m.principal = describir(e.element) || e.url || null;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!C) continue;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const original = C.prototype[k];
      if (!original) continue;
      C.prototype[k] = function (...a) {
        m.dibujos3d++;
        if (m.primerDibujo3d === null) m.primerDibujo3d = performance.now();
        // document.timeline.currentTime es la hora del cuadro: igual para todo lo que se dibuja en el mismo cuadro.
        // Así se cuenta cada cuadro una vez sin envolver las funciones de animación de la página.
        const t = document.timeline ? document.timeline.currentTime : null;
        if (t !== m.tDibujo) {
          m.tDibujo = t;
          m.cuadros3d++;
        }
        return original.apply(this, a);
      };
    }
  }
  const raf = (m.rafOriginal = window.requestAnimationFrame);
  window.requestAnimationFrame = function (cb) {
    m.cuadrosPedidos++;
    return raf.call(window, cb);
  };

  window.__mideVelocidadLeer = async () => {
    const LISTA_A_LOS = 15000; // ms desde que empezó a cargar: todas las cargas se leen en el mismo punto
    const VENTANA = 5000; // ms en los que se mira si la página descansa
    const TOPE_TAPADA = 60000; // ms máximos esperando a que se quite una pantalla de carga
    const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
    const r0 = (n) => (n == null ? null : Math.round(n));
    const kb = (b) => Math.round(b / 102.4) / 10;
    // Lo que el navegador guardó desde el inicio: las tareas largas y los cuadros lentos solo se leen así.
    const guardado = (type) =>
      new Promise((res) => {
        const lista = [];
        let o;
        try {
          o = new PerformanceObserver((l) => lista.push(...l.getEntries()));
          o.observe({ type, buffered: true });
        } catch {
          return res(null);
        }
        setTimeout(() => (o.disconnect(), res(lista)), 400);
      });

    while (document.readyState !== 'complete' && performance.now() < 60000) await dormir(250);
    const noTerminoDeCargar = document.readyState !== 'complete';
    if (performance.now() < LISTA_A_LOS) await dormir(LISTA_A_LOS - performance.now());

    // ¿Una pantalla de carga tapa la página? Lo que está en el centro de la pantalla vive dentro de algo fijo que
    // cubre casi toda la pantalla y no es la escena (no contiene el título, un canvas ni un video). Si es así, se espera
    // a que se quite (hasta 60 s) y se anota cuándo. Un aviso de cookies que tapa todo también cuenta.
    const tapa = () => {
      let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      while (el && el !== document.body && el !== document.documentElement) {
        const cs = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        if ((cs.position === 'fixed' || cs.position === 'absolute') && b.width * b.height >= 0.9 * innerWidth * innerHeight && cs.opacity !== '0' && cs.visibility !== 'hidden' && el.tagName !== 'CANVAS' && el.tagName !== 'VIDEO' && el.tagName !== 'MAIN' && !el.querySelector('main, h1, canvas, video')) return el;
        el = el.parentElement;
      }
      return null;
    };
    let tapada = tapa();
    const tapadaPor = tapada ? m.describir(tapada) : null;
    // Muchas pantallas de carga no se quitan solas: esperan un clic en «Entrar» o «Iniciar». Se anota cuándo ese botón
    // se puede tocar (visible, sin disabled) y ahí se deja de esperar.
    const botonListo = (el) =>
      [...el.querySelectorAll('button, [role="button"], a')].find((b) => {
        const cs = getComputedStyle(b);
        const r = b.getBoundingClientRect();
        return !b.disabled && b.getAttribute('aria-disabled') !== 'true' && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.5 && cs.pointerEvents !== 'none' && r.width > 20 && r.height > 10;
      });
    let boton = null;
    let botonListoA = null;
    while (tapada && performance.now() < TOPE_TAPADA) {
      boton = botonListo(tapada);
      if (boton) {
        botonListoA = r0(performance.now());
        break;
      }
      await dormir(500);
      tapada = tapa();
    }
    const seDestapa = tapadaPor
      ? botonListoA !== null
        ? 'espera un clic en «' + (boton.innerText || boton.getAttribute('aria-label') || '?').trim().slice(0, 30) + '», que se puede tocar desde los ' + botonListoA + ' ms'
        : tapada
          ? 'sigue tapada a los ' + Math.round(TOPE_TAPADA / 1000) + ' s (es el tope de espera del medidor, no un tiempo de la página)'
          : r0(performance.now())
      : null;

    // ¿Descansa? En los próximos 5 s: tareas largas, cuadros que salen a la pantalla, cuadros pedidos y dibujos 3D.
    const antes = { cuadrosPedidos: m.cuadrosPedidos, dibujos3d: m.dibujos3d, cuadros3d: m.cuadros3d };
    const enVentana = [];
    let ov;
    try {
      ov = new PerformanceObserver((l) => enVentana.push(...l.getEntries()));
      ov.observe({ type: 'longtask' });
    } catch {}
    const intervalos = [];
    let midiendo = true;
    let previo = null;
    // Con el requestAnimationFrame original, para no contarnos a nosotros mismos en pedidosDeCuadroPorSeg.
    const cuadro = (t) => {
      if (previo !== null) intervalos.push(t - previo);
      previo = t;
      if (midiendo) m.rafOriginal.call(window, cuadro);
    };
    m.rafOriginal.call(window, cuadro);
    await dormir(VENTANA);
    midiendo = false;
    ov && ov.disconnect();
    const ocupadoMs = enVentana.reduce((a, e) => a + e.duration, 0);
    intervalos.sort((a, b) => a - b);
    const p95 = intervalos.length ? intervalos[Math.floor(intervalos.length * 0.95)] : null;

    const [tareas, cuadrosLentos, lcps, saltos] = await Promise.all(
      ['longtask', 'long-animation-frame', 'largest-contentful-paint', 'layout-shift'].map(guardado),
    );
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const fin = nav.loadEventEnd || 0;

    // Tareas largas: el bloqueo es lo que pasa de 50 ms en cada una (lo mismo que suma Lighthouse).
    const lt = (tareas || []).map((e) => ({ t: e.startTime, d: e.duration }));
    const bloqueo = (lista) => r0(lista.reduce((a, e) => a + Math.max(0, e.d - 50), 0));
    let quietaDesde = null;
    {
      let cursor = fcp ? fcp.startTime : 0;
      for (const e of lt.filter((e) => e.t >= cursor).concat([{ t: Infinity, d: 0 }])) {
        if (e.t - cursor >= 5000) {
          quietaDesde = cursor;
          break;
        }
        cursor = Math.max(cursor, e.t + e.d);
      }
      if (quietaDesde !== null && quietaDesde > performance.now() - 5000) quietaDesde = null;
    }

    // Qué archivos se comen el tiempo, según los cuadros lentos (long animation frames).
    const porArchivo = {};
    for (const f of cuadrosLentos || [])
      for (const s of f.scripts || []) {
        const k = (s.sourceURL || '(sin archivo)') + ' · ' + (s.sourceFunctionName || s.invoker || '?');
        const a = (porArchivo[k] = porArchivo[k] || { ms: 0, veces: 0, posicion: s.sourceCharPosition });
        a.ms += s.duration;
        a.veces++;
      }
    const archivosLentos = Object.entries(porArchivo)
      .sort((a, b) => b[1].ms - a[1].ms)
      .slice(0, 8)
      .map(([k, v]) => ({ quien: k, ms: r0(v.ms), veces: v.veces, posicion: v.posicion }));

    // Peso por tipo. transferSize es lo que viajó por la red (comprimido). Un 0 en otro dominio = ese dominio no deja
    // medirlo desde la página; un 0 en el mismo dominio con contenido = vino de la caché (la carga no fue en frío).
    const tipo = (r) => {
      const u = r.name.split(/[?#]/)[0].toLowerCase();
      if (/\.(woff2?|ttf|otf|eot)$/.test(u)) return 'fuentes';
      if (/\.(mp4|webm|mov|m3u8|m4s|ogv)$/.test(u)) return 'video';
      if (/\.(glb|gltf|bin|hdr|exr|ktx2|basis|drc|usdz|obj|fbx|splat|ply)$/.test(u)) return 'modelos3d';
      if (/\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)$/.test(u) || r.initiatorType === 'img') return 'imagenes';
      if (r.initiatorType === 'video') return 'video';
      if (/\.(m?js|wasm)$/.test(u) || r.initiatorType === 'script') return 'codigo';
      if (/\.css$/.test(u)) return 'estilos';
      return 'otros';
    };
    const recursos = performance.getEntriesByType('resource');
    const host = location.host;
    const mismo = (u) => {
      try {
        return new URL(u).host === host;
      } catch {
        return false;
      }
    };
    // Lo que sí bajó completo en esta carga: si la misma dirección se pide otra vez (un logo que también es ícono), la
    // segunda sale de la caché de esta misma visita y eso no quiere decir que el contexto estuviera usado.
    const bajoCompleto = new Set(recursos.filter((r) => r.transferSize >= r.encodedBodySize && r.transferSize > 0).map((r) => r.name));
    const peso = { html: { n: 1, kb: kb(nav.transferSize || 0) } };
    let sinDato = 0;
    let deCache = 0;
    for (const r of recursos) {
      const k = tipo(r);
      const p = (peso[k] = peso[k] || { n: 0, kb: 0, kbSinComprimir: 0, sinDato: 0 });
      p.n++;
      p.kb += kb(r.transferSize);
      p.kbSinComprimir += kb(r.decodedBodySize);
      // Caché: 0 bytes por la red, o solo las cabeceras de una revalidación (304) con un cuerpo grande guardado.
      if (mismo(r.name) && r.decodedBodySize && !bajoCompleto.has(r.name) && (!r.transferSize || (r.transferSize < 1000 && r.encodedBodySize > 4000))) deCache++;
      else if (!mismo(r.name) && !r.transferSize) (sinDato++, p.sinDato++);
    }
    for (const p of Object.values(peso)) (p.kb = Math.round(p.kb)), p.kbSinComprimir != null && (p.kbSinComprimir = Math.round(p.kbSinComprimir));
    const totalKb = Math.round(Object.values(peso).reduce((a, p) => a + p.kb, 0));
    const ultimoArchivoTermina = r0(recursos.reduce((a, r) => Math.max(a, r.responseEnd), 0));
    const masPesados = recursos
      .slice()
      .sort((a, b) => b.transferSize - a.transferSize)
      .slice(0, 8)
      .map((r) => ({ url: r.name.slice(0, 140), tipo: tipo(r), kb: kb(r.transferSize), empezo: r0(r.startTime), termino: r0(r.responseEnd) }));
    const terceros = {};
    for (const r of recursos) {
      if (mismo(r.name)) continue;
      let h;
      try {
        h = new URL(r.name).host;
      } catch {
        continue;
      }
      const t = (terceros[h] = terceros[h] || { n: 0, kb: 0, tipos: {} });
      t.n++;
      t.kb += kb(r.transferSize);
      t.tipos[tipo(r)] = (t.tipos[tipo(r)] || 0) + 1;
    }
    // Hojas de estilo de otro dominio cargadas sin CORS: Chrome no deja ver lo que piden (fuentes, imágenes), así que su
    // peso no está en `peso` ni en `terceros`. Hay que sacarlo del insight ThirdParties de la traza.
    const hojasCiegas = [...document.querySelectorAll('link[rel~="stylesheet"][href]')]
      .filter((l) => !mismo(l.href) && !l.crossOrigin)
      .map((l) => new URL(l.href).host);
    // Las fuentes que de verdad se usaron (las de otros dominios a veces no tienen extensión y caen en "otros").
    let fuentesUsadas = [];
    try {
      fuentesUsadas = [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, '') + ' ' + f.weight))];
    } catch {}

    // Imágenes: el ancho real del archivo se lee abriendo currentSrc aparte (ya está en caché), porque naturalWidth
    // viene dividido entre la densidad cuando hay srcset. Las perezosas que no han bajado salen con cargada: false.
    const dpr = devicePixelRatio;
    const pesoDe = (u) => {
      const r = recursos.find((x) => x.name === u);
      return r ? kb(r.transferSize || r.decodedBodySize) : null;
    };
    const anchoReal = async (u) => {
      try {
        const im = new Image();
        im.src = u;
        await im.decode();
        return [im.naturalWidth, im.naturalHeight];
      } catch {
        return [null, null];
      }
    };
    const imgs = [...document.images].filter((i) => !(i.currentSrc || i.src || '').startsWith('data:'));
    const todas = await Promise.all(
      imgs.map(async (i) => {
        const b = i.getBoundingClientRect();
        const u = i.currentSrc;
        const [w, h] = u ? await anchoReal(u) : [null, null];
        return {
          url: (u || i.getAttribute('src') || '').slice(0, 140),
          cargada: !!u,
          kb: u ? pesoDe(u) : null,
          real: w ? w + 'x' + h : null,
          seVe: Math.round(b.width) + 'x' + Math.round(b.height),
          sobra: w && b.width ? Math.round((w / (b.width * dpr)) * 10) / 10 : null,
          aPx: Math.round(b.top + scrollY),
          lazy: i.loading === 'lazy',
          conSrcset: i.hasAttribute('srcset'),
          conMedidas: i.hasAttribute('width') && i.hasAttribute('height'),
        };
      }),
    );
    const resumenImagenes = {
      total: todas.length,
      cargadas: todas.filter((x) => x.cargada).length,
      perezosas: todas.filter((x) => x.lazy).length,
      lejosSinPerezosa: todas.filter((x) => !x.lazy && x.aPx > innerHeight * 1.5).length,
      conSobraDe2oMas: todas.filter((x) => x.sobra >= 2).length,
      sinMedidas: todas.filter((x) => !x.conMedidas).length,
    };
    const imagenes = todas.sort((a, b) => (b.kb || 0) - (a.kb || 0)).slice(0, 12);
    const imagenesConSobra = todas.filter((x) => x.sobra >= 2).map((x) => x.url.split('/').pop().slice(0, 60) + ' (' + x.sobra + 'x)').slice(0, 10);
    // Imágenes que bajaron y no son <img>: fondos de CSS, portadas de video, imágenes que pone el código.
    const enImg = new Set(imgs.map((i) => i.currentSrc));
    const imagenesSinEtiqueta = recursos
      .filter((r) => tipo(r) === 'imagenes' && !enImg.has(r.name))
      .sort((a, b) => b.transferSize - a.transferSize)
      .slice(0, 6)
      .map((r) => ({ url: r.name.slice(0, 140), kb: kb(r.transferSize || r.decodedBodySize), termino: r0(r.responseEnd) }));
    const videos = [...document.querySelectorAll('video')].map((v) => ({ url: (v.currentSrc || v.src || '').slice(0, 140), kb: pesoDe(v.currentSrc), preload: v.preload, autoplay: v.autoplay, poster: !!v.poster, aPx: Math.round(v.getBoundingClientRect().top + scrollY) }));
    const canvas = [...document.querySelectorAll('canvas')].map((c) => ({ px: c.width + 'x' + c.height, aPx: Math.round(c.getBoundingClientRect().top + scrollY) }));
    // Con qué dibuja este navegador el 3D: dice si la medición tuvo tarjeta de video de verdad.
    let dibujaCon = null;
    try {
      const g = document.createElement('canvas').getContext('webgl');
      const ext = g && g.getExtension('WEBGL_debug_renderer_info');
      dibujaCon = g ? (ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'webgl sin nombre') : 'sin webgl';
      const lose = g && g.getExtension('WEBGL_lose_context');
      lose && lose.loseContext();
    } catch {}

    // ¿El HTML que manda el servidor ya trae el contenido, o llega vacío y todo lo pinta el código? Se pide otra vez,
    // ya después de medir, y se cuenta el texto visible que trae el <body> (sin scripts ni estilos).
    let htmlInicial = null;
    try {
      const crudo = await (await fetch(location.href, { cache: 'no-store', credentials: 'omit' })).text();
      const doc = new DOMParser().parseFromString(crudo, 'text/html');
      doc.querySelectorAll('script, style, noscript, template').forEach((n) => n.remove());
      const texto = (doc.body ? doc.body.textContent : '').replace(/\s+/g, ' ').trim();
      htmlInicial = { kb: kb(crudo.length), caracteresDeTexto: texto.length, empieza: texto.slice(0, 80) || null };
    } catch {}
    const ultimoLcp = (lcps || []).at(-1);
    // ¿Lo principal entra con una animación? Si tiene retraso o duración (en él o en sus tres papás), puede ser lo que
    // separa el primer texto de lo principal.
    let principalAnimacion = null;
    for (let el = ultimoLcp && ultimoLcp.element, i = 0; el && el.nodeType === 1 && i < 4; el = el.parentElement, i++) {
      const cs = getComputedStyle(el);
      const seg = (v) => Math.max(...v.split(',').map((x) => (x.trim().endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000) || 0));
      const anim = cs.animationName !== 'none' ? seg(cs.animationDelay) + seg(cs.animationDuration) : 0;
      const trans = seg(cs.transitionDelay) + seg(cs.transitionDuration);
      if (anim || trans) {
        principalAnimacion = { en: describir(el), animacion: cs.animationName !== 'none' ? cs.animationName : null, ms: Math.round(Math.max(anim, trans)) };
        break;
      }
    }
    const visible = !m.ocultaAlgunaVez && document.visibilityState === 'visible';
    return {
      url: location.href,
      corridaValida: visible && deCache === 0,
      motivoInvalida: [!visible && 'la pestaña no estuvo al frente', deCache > 0 && deCache + ' archivos del mismo dominio vinieron de la caché: el contexto no era nuevo'].filter(Boolean).join('; ') || null,
      pantalla: innerWidth + 'x' + innerHeight + ' dpr ' + dpr,
      dibujaCon,
      leidaA: r0(performance.now()),
      tiempos: {
        respuestaServidor: r0(nav.responseStart),
        primerTexto: r0(fcp && fcp.startTime),
        principal: r0(ultimoLcp && ultimoLcp.startTime),
        principalEs: describir(ultimoLcp && ultimoLcp.element) || m.principal || (ultimoLcp && ultimoLcp.url) || null,
        principalAnimacion,
        primerDibujo3d: r0(m.primerDibujo3d),
        eventoDeCarga: r0(fin),
        ultimoArchivoTermina,
        quietaDesde: r0(quietaDesde),
      },
      pantallaDeCarga: tapadaPor ? { tapadaPor, seDestapa } : null,
      noTerminoDeCargar,
      htmlInicial,
      saltos: Math.round((saltos || []).filter((s) => !s.hadRecentInput).reduce((a, s) => a + s.value, 0) * 1000) / 1000,
      tareasLargas: {
        total: lt.length,
        bloqueoMs: bloqueo(lt),
        peorMs: r0(Math.max(0, ...lt.map((e) => e.d))),
        ultimaTermina: r0(lt.length ? Math.max(...lt.map((e) => e.t + e.d)) : null),
      },
      enReposo: {
        ventanaMs: VENTANA,
        ocupadoPct: Math.round((ocupadoMs / VENTANA) * 100),
        tareasLargas: enVentana.length,
        // Cuadros que llegaron a la pantalla: 60 o 120 según la pantalla, aunque la página no anime nada. Lo que dice si
        // va pesada es cadaCuadroP95Ms (16.7 ms es el ritmo de 60 Hz y 8.3 ms el de 120 Hz).
        cuadrosPorSeg: Math.round((intervalos.length / VENTANA) * 1000),
        cadaCuadroP95Ms: r0(p95),
        pedidosDeCuadroPorSeg: Math.round(((m.cuadrosPedidos - antes.cuadrosPedidos) / VENTANA) * 1000),
        dibujos3dPorSeg: Math.round(((m.dibujos3d - antes.dibujos3d) / VENTANA) * 1000),
        cuadros3dPorSeg: Math.round(((m.cuadros3d - antes.cuadros3d) / VENTANA) * 1000),
        // Cuántas llamadas de dibujo hace cada cuadro del 3D: cientos quiere decir muchas piezas dibujadas una por una.
        dibujosPorCuadro: m.cuadros3d > antes.cuadros3d ? Math.round((m.dibujos3d - antes.dibujos3d) / (m.cuadros3d - antes.cuadros3d)) : null,
      },
      archivosLentos,
      peso,
      totalKb,
      archivosSinDato: sinDato,
      archivosDeCache: deCache,
      masPesados,
      terceros,
      hojasCiegas,
      fuentesUsadas,
      resumenImagenes,
      imagenes,
      imagenesConSobra,
      imagenesSinEtiqueta,
      videos,
      canvas,
      elementos: document.getElementsByTagName('*').length,
    };
  };
})();
