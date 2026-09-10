import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import { rig } from './rig'
import { SITE } from './config'

gsap.registerPlugin(ScrollTrigger, SplitText)

export type Shot = { pos: [number, number, number]; look: [number, number, number]; rot: number; fov: number }
export type Section = {
  id: string
  vh: number
  align: 'left' | 'right' | 'center'
  ghost: string
  eyebrow: string
  title: string
  body?: string
  note?: { lead: string; text: string } // dato destacado con borde
  quote?: { text: string; cite: string } // cita
  specs?: boolean // muestra la rejilla de cifras (SPECS)
  swatches?: boolean // muestra el selector de color (COLORS)
  credits?: boolean // muestra los créditos (SITE.credits)
  shot: Shot
  mid?: Shot // toma intermedia al 50 % de la sección
  callout?: { pos: [number, number, number]; text: string }
  lights?: boolean // al llegar: ráfagas y faros encendidos para siempre
  rear?: boolean // al llegar: pilotos traseros encendidos para siempre
  flash?: boolean // al llegar: ráfagas
  streaks?: boolean
}

const TAU = Math.PI * 2

// ------------------------------------------------------------------
// DEMO NEUTRA. Reescribe todas las secciones con la historia real del objeto.
// Cada sección: altura en vh, alineación del texto, palabra fantasma 3D,
// textos y la toma de cámara al LLEGAR a esa sección (pos, look, rot, fov).
// Las tomas asumen un objeto de ~4,4 unidades de largo en Z, centrado, apoyado en Y=0.
// ------------------------------------------------------------------
export const SECTIONS: Section[] = [
  {
    id: 'hero', vh: 100, align: 'center', ghost: '01',
    eyebrow: 'Prototipo · Serie 01', title: 'Origen',
    body: 'Un objeto en el centro. Diez tomas. Todo gira, acerca y aleja con tu scroll.',
    shot: { pos: [3.9, 1.05, 4.7], look: [0, 0.95, 0.3], rot: -0.35, fov: 32 },
  },
  {
    id: 'idea', vh: 120, align: 'left', ghost: '2026',
    eyebrow: '01 · Idea', title: 'Nació de un boceto',
    body: 'Sustituye este párrafo por el origen real: dónde, cuándo y por qué existe el objeto. Dos o tres frases con un dato concreto.',
    note: { lead: 'Un dato que sorprenda.', text: 'Aquí va una anécdota verificada, corta y con fecha.' },
    shot: { pos: [-8.0, 0.9, 1.0], look: [0, 0.6, -0.9], rot: 0.2, fov: 30 },
  },
  {
    id: 'motor', vh: 120, align: 'right', ghost: 'Core',
    eyebrow: '02 · Interior', title: 'Lo que hay debajo',
    body: 'Describe el mecanismo, el material o la tecnología clave. Cifras concretas, nada de adjetivos vacíos.',
    shot: { pos: [2.4, 1.05, -5.4], look: [0, 0.7, -1.3], rot: 0, fov: 30 },
    callout: { pos: [0.45, 1.0, -1.7], text: 'Pieza clave · dato' },
    rear: true,
  },
  {
    id: 'forma', vh: 120, align: 'left', ghost: 'Forma',
    eyebrow: '03 · Forma', title: 'Una silueta con función',
    body: 'Por qué tiene la forma que tiene. Aerodinámica, ergonomía, tradición. Un detalle que el lector no sabía.',
    shot: { pos: [-1.6, 2.5, -3.8], look: [0, 0.85, -1.6], rot: 0, fov: 28 },
    callout: { pos: [-0.85, 1.12, -2.2], text: 'Detalle · nombre' },
    rear: true,
  },
  {
    id: 'detalle', vh: 110, align: 'right', ghost: 'Luz',
    eyebrow: '04 · Detalle', title: 'De cerca',
    body: 'Primer plano de la pieza más reconocible. Aquí se encienden las luces si el objeto las tiene.',
    shot: { pos: [2.6, 0.8, 3.7], look: [1.15, 0.7, 1.3], rot: 0, fov: 26 },
    callout: { pos: [0.72, 0.76, 2.0], text: 'Pieza · medida' },
    lights: true,
  },
  {
    id: 'material', vh: 110, align: 'left', ghost: 'Mat',
    eyebrow: '05 · Material', title: 'Hecho para durar',
    body: 'Materiales, proceso de fabricación, peso. Compáralo con algo cotidiano para que se entienda.',
    shot: { pos: [-3.1, 0.5, 2.4], look: [-0.9, 0.36, 1.25], rot: 0, fov: 26 },
    callout: { pos: [-0.95, 0.36, 1.25], text: 'Material · medida' },
  },
  {
    id: 'caracter', vh: 200, align: 'center', ghost: 'Giro',
    eyebrow: '06 · Carácter', title: 'Sin filtros',
    body: 'La sección larga: el objeto gira 360 grados con estelas y zoom. Cuenta aquí lo que lo hace único o polémico.',
    quote: { text: '«Una cita real y verificable sobre el objeto, corta y con fuerza.»', cite: 'Nombre · cargo' },
    shot: { pos: [5.2, 0.55, 0.4], look: [0, 0.6, 0], rot: 0, fov: 26 },
    mid: { pos: [2.7, 0.5, 0.3], look: [0, 0.6, 0], rot: Math.PI, fov: 72 },
    streaks: true,
    flash: true,
  },
  {
    id: 'cifras', vh: 120, align: 'left', ghost: '100',
    eyebrow: '07 · Cifras', title: 'Los números',
    specs: true,
    shot: { pos: [3.9, 3.1, 4.4], look: [-0.8, 0.45, 0.7], rot: TAU + 0.35, fov: 30 },
  },
  {
    id: 'colores', vh: 120, align: 'right', ghost: 'Color',
    eyebrow: '08 · Acabados', title: 'Elige el tuyo',
    body: 'Colores o acabados reales del objeto. Toca uno.',
    swatches: true,
    shot: { pos: [4.9, 1.0, 4.9], look: [0.75, 0.5, -0.75], rot: TAU + 0.9, fov: 30 },
  },
  {
    id: 'cierre', vh: 100, align: 'center', ghost: '01',
    eyebrow: '09 · Cierre', title: 'Ayer → hoy',
    body: 'Cierra con legado o con una llamada a la acción. Al llegar al final, todas las luces parpadean.',
    credits: true,
    shot: { pos: [0, 0.9, 8.4], look: [0, -0.25, 0], rot: TAU * 2, fov: 30 },
  },
]

// Cifras que cuentan al entrar en la sección "specs". dec = decimales.
export const SPECS = [
  { n: 260, unit: 'CV', label: 'Potencia' },
  { n: 343, unit: 'Nm', label: 'Par' },
  { n: 5.5, unit: 's', label: '0 – 100 km/h', dec: 1 },
  { n: 250, unit: 'km/h', label: 'Velocidad máxima' },
  { n: 1195, unit: 'kg', label: 'Peso' },
  { n: 1975, unit: '', label: 'Año' },
]

// Muestras de color del selector. La primera es la "de fábrica"; usa nombres reales si existen.
export const COLORS = [
  { name: 'Original', hex: '#cfbf30' },
  { name: 'Rojo', hex: '#c1121f' },
  { name: 'Blanco', hex: '#e8e6df' },
  { name: 'Negro', hex: '#101010' },
  { name: 'Azul', hex: '#2f5b8e' },
  { name: 'Plata', hex: '#b5b8bc' },
]

export const fmt = (n: number, dec = 0) =>
  n.toLocaleString(SITE.locale, { minimumFractionDigits: dec, maximumFractionDigits: dec })

let lenis: Lenis
export function setupScroll() {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  lenis.stop()
  return lenis
}
export const getLenis = () => lenis
if (import.meta.env.DEV) Object.assign(window, { __dbg: { rig, getLenis: () => lenis, ScrollTrigger, gsap } })

function tweenTo(tl: gsap.core.Timeline, s: Shot, d: number, at: number, ease = 'power2.inOut') {
  tl.to(rig.pos, { x: s.pos[0], y: s.pos[1], z: s.pos[2], duration: d, ease }, at)
  tl.to(rig.look, { x: s.look[0], y: s.look[1], z: s.look[2], duration: d, ease }, at)
  tl.to(rig, { fov: s.fov, rot: s.rot, duration: d, ease }, at)
}

let heroChars: Element[] = []

export function buildChoreo() {
  const main = document.getElementById('main')!
  const els = Array.from(main.querySelectorAll<HTMLElement>('.s'))
  rig.callouts = SECTIONS.map(() => 0)
  const first = SECTIONS[0].shot
  rig.pos.set(...first.pos); rig.look.set(...first.look); rig.fov = first.fov; rig.rot = first.rot

  // --- cámara maestra: una sola timeline scrubeada por todo el scroll ---
  const tl = gsap.timeline({
    scrollTrigger: { trigger: main, start: 'top top', end: 'bottom bottom', scrub: 0.9, onUpdate: (self) => { rig.progress = self.progress } },
  })
  let t = 0
  SECTIONS.forEach((s, i) => {
    const next = SECTIONS[i + 1]
    const d = s.vh / 100
    if (s.callout) tl.fromTo(rig.callouts, { [i]: 0 }, { [i]: 1, duration: 0.25, ease: 'power2.out' }, Math.max(0, t - 0.15))
    if (!next) return
    if (s.mid) {
      tweenTo(tl, s.mid, d / 2, t, 'power2.in')
      tweenTo(tl, next.shot, d / 2, t + d / 2, 'power2.out')
    } else tweenTo(tl, next.shot, d, t)
    if (s.callout) tl.to(rig.callouts, { [i]: 0, duration: 0.25, ease: 'power2.in' }, t + d * 0.6)
    if (s.streaks) tl.to(rig, { streaks: 1, duration: d * 0.45, ease: 'power2.in' }, t).to(rig, { streaks: 0, duration: d * 0.45, ease: 'power2.out' }, t + d * 0.55)
    t += d
  })

  // --- texto por sección ---
  els.forEach((el, i) => {
    const title = el.querySelector<HTMLElement>('.title')
    const rest = el.querySelectorAll<HTMLElement>('.eyebrow, .body, .note, .quote, .specs, .swatches, .credits')
    if (title) {
      title.textContent = (title.textContent ?? '').normalize('NFC') // tildes descompuestas se partirían en dos spans
      const split = SplitText.create(title, { type: 'words,chars', charsClass: 'ch', mask: 'words' })
      // La máscara (overflow: clip) mide lo que el line-height apretado del título y la tilde de una mayúscula sobresale
      // hasta 0,13 em por arriba: sin aire se recorta y «ÓRBITA» se ve «ORBITA». Padding arriba (nada sube más allá de su
      // sitio final, así que no destapa nada) y margen negativo para no mover la línea. Ver references/errores-conocidos.md.
      gsap.set(split.masks, { paddingTop: '0.24em', marginTop: '-0.24em' })
      gsap.fromTo(title, { fontStretch: '70%' }, { fontStretch: '130%', ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
      if (i === 0) {
        heroChars = split.chars
        gsap.set(heroChars, { yPercent: 115 })
        gsap.to(el.querySelector('.copy'), { yPercent: -35, opacity: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } })
      } else {
        gsap.from(split.chars, {
          yPercent: 115, rotateX: -60, stagger: { each: 0.018, from: 'start' }, duration: 1, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 65%', toggleActions: 'play none none reverse' },
        })
      }
    }
    if (i > 0 && rest.length) {
      gsap.from(rest, { y: 34, opacity: 0, stagger: 0.09, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 55%', toggleActions: 'play none none reverse' } })
    }
    // luces: se disparan una vez al llegar y no se apagan (once)
    const sec = SECTIONS[i]
    if (sec.lights) ScrollTrigger.create({ trigger: el, start: 'top 70%', once: true, onEnter: () => { flashLights(); gsap.to(rig, { lights: 1, duration: 0.5, delay: 1.0 }) } })
    if (sec.rear) ScrollTrigger.create({ trigger: el, start: 'top 70%', once: true, onEnter: () => gsap.to(rig, { rear: 1, duration: 0.8 }) })
    if (sec.flash) ScrollTrigger.create({ trigger: el, start: 'top 70%', once: true, onEnter: flashLights })
    // sección activa → HUD
    ScrollTrigger.create({
      trigger: el, start: 'top center', end: 'bottom center',
      onToggle: (self) => { if (self.isActive) setHud(i) },
    })
  })

  // --- contadores de cifras ---
  document.querySelectorAll<HTMLElement>('.spec b[data-n]').forEach((b) => {
    const n = Number(b.dataset.n), dec = Number(b.dataset.dec || 0), unit = b.dataset.unit || ''
    const o = { v: 0 }
    const render = () => { b.innerHTML = `${fmt(o.v, dec)}<small>${unit}</small>` }
    render()
    gsap.to(o, { v: n, duration: 1.8, ease: 'power3.out', onUpdate: render, scrollTrigger: { trigger: b, start: 'top 96%', toggleActions: 'play none none reverse' } })
  })

  return () => { tl.kill(); ScrollTrigger.getAll().forEach((s) => s.kill()) }
}

function setHud(i: number) {
  rig.section = i
  const idx = document.querySelector('.hud .idx')
  const name = document.querySelector('.hud .name')
  if (idx) idx.innerHTML = `${String(i).padStart(2, '0')}<small>/${String(SECTIONS.length - 1).padStart(2, '0')}</small>`
  if (name) name.textContent = SECTIONS[i].eyebrow
  const hint = document.querySelector<HTMLElement>('.hud .scroll-hint')
  if (hint) gsap.to(hint, { opacity: i === 0 ? 1 : 0, duration: 0.4 })
}

// Ráfagas de faros como al adelantar: apagado/luz larga instantáneos, tres veces (tiempo real, no scroll)
export function flashLights() {
  const tl = gsap.timeline()
  for (let i = 0; i < 3; i++) tl.set(rig, { blink: -1 }, i === 0 ? 0 : '+=0.09').set(rig, { blink: 1 }, '+=0.08')
  tl.set(rig, { blink: 0 }, '+=0.14')
}

export function startIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  tl.to('.pre', { yPercent: -100, duration: 1.15, ease: 'expo.inOut' })
  tl.to(rig, { intro: 1, duration: 2.6, ease: 'power2.out' }, '-=0.75')
  tl.to(heroChars, { yPercent: 0, duration: 1.2, stagger: 0.06 }, '-=2.1')
  tl.from('.s--hero .eyebrow, .s--hero .body', { y: 24, opacity: 0, duration: 1, stagger: 0.12 }, '-=0.9')
  tl.from('.hud > *', { opacity: 0, y: 8, duration: 0.8, stagger: 0.05 }, '-=0.8')
  tl.add(flashLights, '-=1.1')
  tl.add(() => { lenis.start(); ScrollTrigger.refresh() }, '-=0.6')
  return tl
}
