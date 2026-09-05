import { pathToFileURL } from 'node:url'
// extract.mjs — landing-audit skill.
// A LIBRARY, not a renderer. Each EXTRACTORS value is a JS function BODY meant to
// run in page context (audit-cdp wraps it as `(()=>{ ... })()`; on the MCP path the
// same string goes into browser_evaluate). Every one must `return` a plain value.
//
// Each extractor produces OBSERVATIONS ONLY — never a verdict. Verdicts are the
// model's job, against references/checks-*.md, so that the evidence and the
// judgement never get silently welded together.

const SHARED = `
  const _lum = (c) => {
    const m = String(c).match(/[\\d.]+/g); if (!m) return null;
    const [r,g,b] = m.slice(0,3).map(Number).map(v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4) });
    return 0.2126*r + 0.7152*g + 0.0722*b;
  };
  const _ratio = (a,b) => { const x=_lum(a), y=_lum(b); if (x===null||y===null) return null;
    const [hi,lo]=[x,y].sort((p,q)=>q-p); return (hi+0.05)/(lo+0.05) };
  const _opaque = (c) => c && !/rgba?\\([^)]*,\\s*0\\s*\\)|transparent/.test(c);
  // walk ancestors for the actually-painted background; report image/gradient as unmeasurable
  const _bg = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { kind: /gradient/.test(cs.backgroundImage) ? 'gradient' : 'image', value: cs.backgroundImage.slice(0,90) };
      if (_opaque(cs.backgroundColor)) return { kind: 'color', value: cs.backgroundColor };
      n = n.parentElement;
    }
    return { kind: 'color', value: getComputedStyle(document.body).backgroundColor };
  };
  const _vis = (el) => { const cs = getComputedStyle(el);
    return cs.display!=='none' && cs.visibility!=='hidden' && parseFloat(cs.opacity||'1') > 0.05 };
  const _txt = (el) => (el.textContent||'').replace(/\\s+/g,' ').trim();
  const _weight = (el) => { const cs = getComputedStyle(el);
    return parseFloat(cs.fontSize) * (parseInt(cs.fontWeight,10)||400) / 400 };
  const _inFold = (el) => { const r = el.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0 && r.width > 0 };
  const _ctaish = (el) => {
    const t = _txt(el).toLowerCase(); if (!t || t.length > 60) return false;
    // Verb-shaped, word-boundaried. "Aardvark Book Club" is a brand name, not a CTA.
    return /\\b(llamar|ll[aá]manos|call now|call us|book (a|now|your)|reserva(r)?|agenda(r)?|schedule|cotiza(r)?|pedir presupuesto|get (a|started|my|your)|start (free|your|now)|comenzar|empezar|solicita(r)?|request (a|your)|cont[aá]cta(nos)?|contact us|comprar|buy now|suscr[ií]b|sign up|reg[ií]stra|descarga(r)?|download|enviar|submit|apply now|free trial|prueba gratis)\\b/i.test(t);
  };
  const _MONEY = /(\\$|€|£|MXN|USD|\\bdesde\\b|\\bfrom\\b|\\bprecio\\b|\\bprice\\b|\\bcosto\\b|\\bcuota\\b|\\bgratis\\b|\\bfree\\b|\\bsin costo\\b)/i;
  const _GUARANTEE = /(garant|guarantee|reembolso|refund|devoluci|money.?back|warranty|satisfacci)/i;
`

export const EXTRACTORS = {
  // ---------- gate: is this even a landing page? ----------
  gate: SHARED + `
    const forms = [...document.querySelectorAll('form')];
    const telLinks = [...document.querySelectorAll('a[href^="tel:"]')];
    // A booking WIDGET, not a mention of one. An outbound link to calendly.com in
    // prose is a citation; only an embed, or a CTA-labelled link, is an affordance.
    const _BOOKVENDOR = /calendly|cal\\.com|acuity|savvycal|chilipiper|nexhealth|zocdoc|mindbody|boulevard|vagaro|squareup/i;
    const booking = [
      ...[...document.querySelectorAll('iframe[src]')].filter(e => _BOOKVENDOR.test(e.getAttribute('src')||'')),
      ...[...document.querySelectorAll('a[href]')].filter(e => _BOOKVENDOR.test(e.getAttribute('href')||'') && _ctaish(e)),
    ];
    const headings = [...document.querySelectorAll('h1,h2')].map(_txt).filter(Boolean);
    const bodyText = _txt(document.querySelector('main') || document.body);
    const words = bodyText.split(/\\s+/).filter(Boolean).length;
    const all = [...document.querySelectorAll('*')];
    const hasProof = all.some(e => /(testimoni|rese[nñ]a|review|opini[oó]n|★|⭐|calificaci|rating|trustpilot|clientes satisfechos)/i.test(_txt(e).slice(0,200)));
    const footer = document.querySelector('footer');
    const footerHasNap = !!footer && /(calle|av\\.|avenida|street|st\\.|suite|lun|mon|horario|hours|tel|\\d{2,}:\\d{2})/i.test(_txt(footer));
    const maxWeightEl = all.filter(e => _txt(e) && _vis(e) && e.children.length === 0)
      .sort((a,b) => _weight(b) - _weight(a))[0];
    const authPrimary = !!maxWeightEl && /(log ?in|iniciar sesi|sign in|acceder)/i.test(_txt(maxWeightEl));
    const meta = document.querySelector('meta[name="description"],meta[property="og:description"]');

    // A click-through to a conversion path is a real affordance too — that is how
    // free-trial and signup archetypes convert. Missing this rejected Basecamp.
    // Affordance INVENTORY, not a verdict. Two rounds of regex tuning proved that
    // "is there a way to convert?" cannot be pattern-matched reliably across
    // languages and brands: Basecamp's max-weight buttons are video triggers and it
    // has zero forms, while "Aardvark Book Club" reads as a booking CTA to any
    // /book/ matcher. So report what is on the page and let the model judge it
    // against references/gate.md — consistent with this file's own contract.
    const _pathOf = (href) => { try { return new URL(href, location.href).pathname } catch { return '' } };
    const clickables = [...document.querySelectorAll('a[href],button,[role=button],input[type=submit]')].filter(_vis);
    const submitControls = clickables.filter(e => e.type === 'submit' || (e.tagName === 'BUTTON' && e.closest('form')));
    const offPageLinks = clickables.filter(e => {
      const href = e.getAttribute('href') || '';
      return href && !/^(#|tel:|mailto:|javascript:)/.test(href);
    }).map(e => { const href = e.getAttribute('href') || '';
      return { text: _txt(e).slice(0, 48), path: _pathOf(href),
               external: href.startsWith('http') && !href.includes(location.host) };
    });

    const signals = {
      dominantConversionAffordance: (forms.length === 1) || telLinks.length > 0 || booking.length > 0 || submitControls.length > 0,
      outcomeHeading: headings.some(h => /(consigue|obt[eé]n|logra|ahorra|deja de|sin |get|stop|save|finally|por fin|en \\d+)/i.test(h)),
      proofPresent: hasProof,
      moneyInBody: _MONEY.test(bodyText),
      footerNap: footerHasNap,
      marketingMeta: !!meta && _txt(meta.getAttribute('content')||'').length > 40,
      enoughProse: words >= 300,
    };
    const appScreen = {
      authGate: /(iniciar sesi|log ?in|sign in|contrase|password)/i.test(bodyText.slice(0,1200)),
      dataGrid: !!document.querySelector('[role="grid"],table thead th[scope],[role="treegrid"]'),
      dataTable: [...document.querySelectorAll('table')].some(t => t.querySelectorAll('tr').length > 8),
      persistentAppNav: !!document.querySelector('aside nav,[class*="sidebar"] a,[class*="app-nav"]'),
      perUserContent: /(mi cuenta|my account|bienvenido de nuevo|welcome back|cerrar sesi|log ?out|dashboard)/i.test(bodyText),
      loginIsPrimaryCta: authPrimary,
    };
    // A quoted MENTION of lorem ipsum is not a placeholder. Require the canonical
    // filler phrase, or a placeholder marker repeated (real templates repeat them).
    const _canonical = /lorem ipsum dolor sit amet/i.test(bodyText);
    const _markers = (bodyText.match(/(your headline here|tu titular aqu[ií]|insert (text|your)|theme demo|lorem ipsum)/gi) || []);
    const _quoted = /[«"'"']\s*lorem ipsum/i.test(bodyText);
    const placeholder = _canonical || (_markers.length >= 3 && !_quoted);
    return {
      landingScore: Object.values(signals).filter(Boolean).length,
      landingSignals: signals,
      // The model decides whether this amounts to a conversion affordance.
      // See references/gate.md — there is no boolean here on purpose.
      affordanceInventory: {
        forms: forms.length,
        submitControls: submitControls.length,
        telLinks: telLinks.length,
        bookingEmbeds: booking.length,
        clickables: clickables.length,
        sameSiteLinks: offPageLinks.filter(l => !l.external).length,
        topLinkTexts: offPageLinks.slice(0, 12),
      },
      appScreenScore: Object.values(appScreen).filter(Boolean).length,
      appScreenSignals: appScreen,
      templatePlaceholder: placeholder,
      wordCount: words,
    };
  `,

  // ---------- D-01 heading structure ----------
  d01_headings: SHARED + `
    const h1s = [...document.querySelectorAll('h1')].map(e => ({ text: _txt(e).slice(0,140), visible: _vis(e), px: parseFloat(getComputedStyle(e).fontSize) }));
    const h1px = h1s.filter(h => h.visible).map(h => h.px).sort((a,b)=>b-a)[0] || 0;
    const atH1Scale = [...document.querySelectorAll('*')].filter(e =>
      e.children.length === 0 && _txt(e) && _vis(e) && parseFloat(getComputedStyle(e).fontSize) >= h1px * 0.92)
      .map(e => ({ tag: e.tagName, text: _txt(e).slice(0,70), px: parseFloat(getComputedStyle(e).fontSize) }));
    const order = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(e => +e.tagName[1]);
    const skips = order.filter((lvl,i) => i && lvl > order[i-1] + 1).length;
    return { h1Count: h1s.length, h1s, elementsAtH1Scale: atH1Scale.length, atH1Scale: atH1Scale.slice(0,6), headingOrder: order, skippedLevels: skips };
  `,

  // ---------- D-02 concealed trust content ----------
  d02_concealed: SHARED + `
    const libs = [...document.querySelectorAll('script[src]')].map(s => s.src)
      .filter(s => /swiper|slick|embla|keen-slider|glide|splide|owl/i.test(s));
    const collapsed = [...document.querySelectorAll('details:not([open]),[aria-expanded="false"],[hidden],[class*="carousel"],[class*="slider"],[class*="swiper"],[role="tabpanel"]')];
    const hidingTrust = collapsed.filter(e => _GUARANTEE.test(_txt(e)) || /(testimoni|rese[nñ]a|review|opini[oó]n|★)/i.test(_txt(e)) || _MONEY.test(_txt(e)))
      .map(e => ({ tag: e.tagName, cls: String(e.className).slice(0,50), chars: _txt(e).length, sample: _txt(e).slice(0,90) }));
    return { carouselLibs: libs, collapsedRegions: collapsed.length, concealingTrustContent: hidingTrust.length, detail: hidingTrust.slice(0,5) };
  `,

  // ---------- D-03 disclosure order vs first primary CTA ----------
  d03_disclosure: SHARED + `
    const nodes = [...document.querySelectorAll('body *')].filter(e => _vis(e));
    const firstCta = nodes.find(e => (e.tagName === 'BUTTON' || e.tagName === 'A' || e.getAttribute('role') === 'button') && _ctaish(e));
    const idx = (el) => el ? nodes.indexOf(el) : -1;
    const firstMatch = (re) => nodes.find(e => e.children.length === 0 && re.test(_txt(e)));
    const price = firstMatch(_MONEY), guar = firstMatch(_GUARANTEE);
    return {
      firstCta: firstCta ? { tag: firstCta.tagName, text: _txt(firstCta).slice(0,60), domIndex: idx(firstCta) } : null,
      priceBeforeCta: price ? idx(price) < idx(firstCta) : null,
      guaranteeBeforeCta: guar ? idx(guar) < idx(firstCta) : null,
      priceText: price ? _txt(price).slice(0,80) : null,
      guaranteeText: guar ? _txt(guar).slice(0,80) : null,
    };
  `,

  // ---------- D-07 form fields, by TYPE not just count ----------
  d07_form: SHARED + `
    const forms = [...document.querySelectorAll('form')].map(f => {
      const ctl = [...f.querySelectorAll('input,select,textarea')].filter(e => e.type !== 'hidden');
      return {
        fields: ctl.length,
        required: ctl.filter(e => e.required || e.getAttribute('aria-required') === 'true').length,
        byType: ctl.reduce((a,e) => { const k = e.tagName === 'INPUT' ? (e.type||'text') : e.tagName.toLowerCase(); a[k]=(a[k]||0)+1; return a }, {}),
        hasPassword: ctl.some(e => e.type === 'password'),
        textareas: ctl.filter(e => e.tagName === 'TEXTAREA').length,
        selects: ctl.filter(e => e.tagName === 'SELECT').length,
        hasPhone: ctl.some(e => e.type === 'tel' || /phone|tel|celular|m[oó]vil/i.test(e.name + e.id + (e.placeholder||''))),
      };
    });
    return { formCount: forms.length, forms };
  `,

  // ---------- D-09 labelling ----------
  d09_labels: SHARED + `
    const ctl = [...document.querySelectorAll('input:not([type=hidden]),select,textarea')];
    const unlabelled = ctl.filter(e => {
      if (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.getAttribute('title')) return false;
      if (e.id && document.querySelector('label[for="' + CSS.escape(e.id) + '"]')) return false;
      if (e.closest('label')) return false;
      return true;
    }).map(e => ({ tag: e.tagName, type: e.type||null, name: e.name||null, placeholderOnly: !!e.placeholder }));
    const requiredColourOnly = ctl.filter(e => (e.required || e.getAttribute('aria-required')==='true')).filter(e => {
      const lab = e.id && document.querySelector('label[for="' + CSS.escape(e.id) + '"]');
      const t = (lab ? _txt(lab) : '') + (e.getAttribute('aria-label')||'');
      return !/\\*|requerid|required|obligator/i.test(t);
    }).length;
    return { controls: ctl.length, unlabelled: unlabelled.length, unlabelledDetail: unlabelled.slice(0,6), requiredNotTextMarked: requiredColourOnly };
  `,

  // ---------- D-12 headings-only test ----------
  d12_headingsOnly: SHARED + `
    const hs = [...document.querySelectorAll('h1,h2,h3')].filter(_vis).map(_txt).filter(Boolean);
    const generic = hs.filter(h => /^(c[oó]mo funciona|how it works|nuestros servicios|our services|servicios|testimonios|testimonials|rese[nñ]as|reviews|lo que dicen|what our clients say|real people,? real results|acerca de|about us|preguntas frecuentes|faq|beneficios|benefits|caracter[ií]sticas|features|nuestro proceso|our process|por qu[eé] nosotros|why us)\\.?$/i.test(h.trim()));
    const ctas = [...document.querySelectorAll('a,button,[role=button]')].filter(e => _vis(e) && _ctaish(e)).map(e => _txt(e).slice(0,50));
    return { headingCount: hs.length, headings: hs.slice(0,24), genericHeadings: generic, genericCount: generic.length, ctaLabels: [...new Set(ctas)].slice(0,10) };
  `,

  // ---------- M-01 / M-03 first viewport ----------
  m01_firstViewport: SHARED + `
    const inFold = [...document.querySelectorAll('body *')].filter(e => _vis(e) && _inFold(e));
    const leafText = inFold.filter(e => e.children.length === 0 && _txt(e));
    const visibleText = leafText.map(_txt).join(' ');
    const words = visibleText.split(/\\s+/).filter(Boolean).length;
    const h1 = document.querySelector('h1');
    const media = inFold.filter(e => ['IMG','VIDEO','SVG','CANVAS','PICTURE'].includes(e.tagName));
    const area = (e) => { const r = e.getBoundingClientRect(); return Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0)) * r.width };
    const mediaArea = media.reduce((a,e) => a + area(e), 0);
    const textArea = leafText.reduce((a,e) => a + area(e), 0);
    return {
      visibleWordCount: words,
      visibleText: visibleText.slice(0,600),
      h1InFold: !!h1 && _inFold(h1),
      h1Text: h1 ? _txt(h1).slice(0,160) : null,
      subheadCandidate: (() => { const s = h1 && h1.nextElementSibling; return s ? _txt(s).slice(0,200) : null })(),
      mediaCount: media.length,
      textToMediaAreaRatio: mediaArea ? +(textArea/mediaArea).toFixed(2) : null,
      proofInFold: inFold.some(e => /(★|⭐|\\d[.,]\\d\\s*\\/\\s*5|\\d+\\+? (rese[nñ]as|reviews|clientes|clients)|google|trustpilot)/i.test(_txt(e).slice(0,120))),
      moneyInFold: _MONEY.test(visibleText),
      telInFold: [...document.querySelectorAll('a[href^="tel:"]')].some(_inFold),
    };
  `,

  // ---------- M-02 single max-weight element, fully in fold ----------
  m02_visualWeight: SHARED + `
    const cand = [...document.querySelectorAll('a,button,[role=button],input[type=submit]')].filter(_vis);
    const score = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      const solid = _opaque(cs.backgroundColor) ? 1.6 : 1;
      return r.width * r.height * solid };
    const ranked = cand.map(e => { const r = e.getBoundingClientRect(); return {
      text: _txt(e).slice(0,50), tag: e.tagName, score: Math.round(score(e)),
      fullyInFold: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
      looksLikeButton: _opaque(getComputedStyle(e).backgroundColor) || getComputedStyle(e).borderStyle !== 'none',
      w: Math.round(r.width), h: Math.round(r.height),
    }}).sort((a,b) => b.score - a.score);
    const top = ranked[0], second = ranked[1];
    return {
      candidates: ranked.length, top: top||null, runnerUp: second||null,
      contested: !!(top && second && second.score >= top.score * 0.85),
      distinctCtaTargets: [...new Set(cand.map(e => e.getAttribute('href')||_txt(e)))].length,
      outboundLinkCount: [...document.querySelectorAll('a[href]')].filter(a => _vis(a) && !/^(#|tel:|mailto:|javascript:)/.test(a.getAttribute('href')||'')).length,
    };
  `,

  // ---------- M-06 contrast, honest about unmeasurable cases ----------
  m06_contrast: SHARED + `
    const out = { checked: 0, failures: [], unmeasurable: [] };
    document.querySelectorAll('body *').forEach(el => {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
      if (!own || !_vis(el)) return;
      const cs = getComputedStyle(el);
      const px = parseFloat(cs.fontSize);
      const bold = (parseInt(cs.fontWeight,10)||400) >= 700;
      const need = (px >= 24 || (bold && px >= 18.66)) ? 3 : 4.5;
      const bg = _bg(el);
      const ref = { text: _txt(el).slice(0,54), px:+px.toFixed(1), need, fg: cs.color };
      if (bg.kind !== 'color') { out.unmeasurable.push({ ...ref, background: bg.kind, note: 'text over ' + bg.kind + ' — NO MEDIDO in v1' }); return }
      out.checked++;
      const r = _ratio(cs.color, bg.value);
      if (r !== null && r < need) out.failures.push({ ...ref, bg: bg.value, ratio: +r.toFixed(2) });
    });
    out.failureCount = out.failures.length; out.failures = out.failures.slice(0,12);
    out.unmeasurableCount = out.unmeasurable.length; out.unmeasurable = out.unmeasurable.slice(0,8);
    return out;
  `,

  // ---------- M-07 target size + focus obstruction ----------
  m07_targets: SHARED + `
    const MIN = 24;
    const interactive = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[tabindex]:not([tabindex="-1"])')].filter(_vis);
    // WCAG 2.5.8 exempts a link whose target is inline in a sentence of text.
    const _inlineInSentence = (e) => {
      if (e.tagName !== 'A') return false;
      const p = e.parentElement; if (!p) return false;
      if (getComputedStyle(e).display !== 'inline') return false;
      const around = _txt(p).replace(_txt(e), '');
      return around.split(/\s+/).filter(Boolean).length >= 3;
    };
    const small = interactive.filter(e => !_inlineInSentence(e))
      .map(e => { const r = e.getBoundingClientRect(); return { text: _txt(e).slice(0,40)||e.tagName, w: Math.round(r.width), h: Math.round(r.height) } })
      .filter(t => (t.w < MIN || t.h < MIN) && t.w > 0);
    const sticky = [...document.querySelectorAll('body *')].filter(e => { const cs = getComputedStyle(e);
      return (cs.position === 'fixed' || cs.position === 'sticky') && _vis(e) && e.getBoundingClientRect().height > 8 });
    const overlaps = [];
    for (const s of sticky) {
      const sr = s.getBoundingClientRect();
      for (const i of interactive) {
        const ir = i.getBoundingClientRect();
        if (i === s || s.contains(i)) continue;
        if (ir.width && sr.left < ir.right && sr.right > ir.left && sr.top < ir.bottom && sr.bottom > ir.top)
          overlaps.push({ sticky: String(s.className).slice(0,40)||s.tagName, covers: _txt(i).slice(0,40)||i.tagName });
      }
    }
    return { interactiveCount: interactive.length, belowMinTarget: small.length, smallTargets: small.slice(0,10),
             stickyCount: sticky.length, stickyOverlaps: overlaps.length, overlapDetail: overlaps.slice(0,6) };
  `,

  // ---------- J-05 headline text for the five binary leaves ----------
  j05_headline: SHARED + `
    const h1 = document.querySelector('h1');
    const sub = h1 && h1.nextElementSibling;
    const t = h1 ? _txt(h1) : null;
    return {
      headline: t, subhead: sub ? _txt(sub).slice(0,260) : null,
      wordCount: t ? t.split(/\\s+/).filter(Boolean).length : 0,
      // observations feeding the leaves; the MODEL decides each yes/no
      containsNumberOrTimeframe: t ? /\\d|hoy|mismo d[ií]a|24 ?h|semana|d[ií]as|minutos|same.?day|hours?|days?|weeks?/i.test(t) : null,
      namesAudience: t ? /(para |for |dueñ|owner|negocio|business|familia|famil|empresa|pyme)/i.test(t) : null,
      explainsWhoWeAre: t ? /(somos|we are|bienvenid|welcome|l[ií]der|leading|expertos en|especialistas en|#1)/i.test(t) : null,
      hasJargon: t ? /(soluciones integrales|end.to.end|sinerg|holistic|innovador|de clase mundial|best.in.class|next.gen|revolucionari)/i.test(t) : null,
    };
  `,

  // ---------- helpers used by audit-cdp's capability passes ----------
  hiddenOnReveal: SHARED + `
    const stuck = [...document.querySelectorAll('body *')].filter(e => {
      const cs = getComputedStyle(e);
      return parseFloat(cs.opacity||'1') < 0.05 && _txt(e).length > 12 && cs.display !== 'none';
    }).map(e => ({ tag: e.tagName, cls: String(e.className).slice(0,44), text: _txt(e).slice(0,60) }));
    return { stillTransparentCount: stuck.length, detail: stuck.slice(0,8) };
  `,

  noScriptSubstance: SHARED + `
    const body = _txt(document.body);
    return {
      words: body.split(/\\s+/).filter(Boolean).length,
      hasH1: !!document.querySelector('h1'),
      hasTel: !!document.querySelector('a[href^="tel:"]'),
      hasForm: !!document.querySelector('form'),
      moneyVisible: _MONEY.test(body),
      sample: body.slice(0,300),
    };
  `,
}

// ---------- scorer: reads an audit-cdp JSON on stdin, emits a compact digest ----------
// pathToFileURL, no `file://` a mano: una ruta con espacios o acentos llega
// percent-encoded en import.meta.url y la comparacion cruda falla en silencio.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2)
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(`extract.mjs — extraction library + digest scorer

  (library)            import { EXTRACTORS } from './extract.mjs'
  --digest             read an audit-cdp JSON report on stdin, print a compact digest
  --list               list extractor names
  -h, --help           this text

Extractors return OBSERVATIONS only. Verdicts belong to the model, judged against
references/checks-dom.md and references/checks-render.md.`)
    process.exit(0)
  }
  if (argv.includes('--list')) { console.log(Object.keys(EXTRACTORS).join('\n')); process.exit(0) }
  if (argv.includes('--digest')) {
    let raw = ''
    process.stdin.setEncoding('utf8')
    for await (const c of process.stdin) raw += c
    let rep
    try { rep = JSON.parse(raw) } catch { console.error('stdin is not JSON'); process.exit(2) }
    const wide = Object.keys(rep.viewports || {})[0]
    const narrow = Object.keys(rep.viewports || {}).slice(-1)[0]
    const W = rep.viewports?.[wide] || {}, N = rep.viewports?.[narrow] || {}
    const digest = {
      url: rep.url, chrome: rep.chrome, viewports: [wide, narrow],
      gate: { landingScore: W.gate?.landingScore, appScreenScore: W.gate?.appScreenScore, templatePlaceholder: W.gate?.templatePlaceholder, affordanceInventory: W.gate?.affordanceInventory },
      observations: {
        'D-01 h1Count': W.d01_headings?.h1Count,
        'D-01 atH1Scale': W.d01_headings?.elementsAtH1Scale,
        'D-02 concealingTrust': W.d02_concealed?.concealingTrustContent,
        'D-03 priceBeforeCta': W.d03_disclosure?.priceBeforeCta,
        'D-07 fields': W.d07_form?.forms?.map(f => f.fields),
        'D-09 unlabelled': W.d09_labels?.unlabelled,
        'D-12 genericHeadings': W.d12_headingsOnly?.genericCount,
        'M-01 foldWords (narrow)': N.m01_firstViewport?.visibleWordCount,
        'M-01 h1InFold (narrow)': N.m01_firstViewport?.h1InFold,
        'M-02 contested': W.m02_visualWeight?.contested,
        'M-02 outboundLinks': W.m02_visualWeight?.outboundLinkCount,
        'M-06 contrastFailures': W.m06_contrast?.failureCount,
        'M-06 unmeasurable': W.m06_contrast?.unmeasurableCount,
        'M-07 belowMinTarget (narrow)': N.m07_targets?.belowMinTarget,
        'M-07 stickyOverlaps (narrow)': N.m07_targets?.stickyOverlaps,
        'J-05 headline': W.j05_headline?.headline,
      },
      capabilities: { reducedMotion: rep.reducedMotion?.honoured, jsDisabledWords: rep.jsDisabled?.words },
      warnings: rep.warnings || [],
    }
    console.log(JSON.stringify(digest, null, 2))
    process.exit(0)
  }
  console.error('nothing to do. Try --help'); process.exit(2)
}
