import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import { Scene } from './Scene'
import { SITE } from './config'
import { SECTIONS, SPECS, COLORS, setupScroll, buildChoreo, startIntro, getLenis, flashLights } from './choreo'
import { rig } from './rig'

export default function App() {
  useEffect(() => {
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    document.title = SITE.title
    document.documentElement.style.setProperty('--accent', SITE.accent)
    const lenis = setupScroll()
    let kill = () => {}
    document.fonts.ready.then(() => { kill = buildChoreo() })
    return () => { kill(); lenis.destroy() }
  }, [])

  return (
    <>
      <div className="canvas-wrap">
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          camera={{ fov: SECTIONS[0].shot.fov, near: 0.1, far: 80, position: SECTIONS[0].shot.pos }}
        >
          <Scene />
        </Canvas>
      </div>
      <Hud />
      <main id="main">
        {SECTIONS.map((s, i) => (
          <section key={s.id} className={`s s--${s.align} s--${s.id}`} style={{ minHeight: `${s.vh}vh` }}>
            <div className="copy">
              <div className="eyebrow">{s.eyebrow}</div>
              {i === 0 ? <h1 className="title">{s.title}</h1> : <h2 className="title">{s.title}</h2>}
              {s.body && <p className="body">{s.body}</p>}
              {s.note && <div className="note"><b>{s.note.lead}</b> {s.note.text}</div>}
              {s.quote && <blockquote className="quote">{s.quote.text}<cite>{s.quote.cite}</cite></blockquote>}
              {s.specs && (
                <div className="specs">
                  {SPECS.map((sp) => (
                    <div className="spec" key={sp.label}>
                      <b data-n={sp.n} data-dec={sp.dec ?? 0} data-unit={sp.unit}>0</b>
                      <span>{sp.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {s.swatches && <Swatches />}
              {s.credits && <Credits />}
            </div>
          </section>
        ))}
      </main>
      <Cursor />
      <Preloader />
    </>
  )
}

function Credits() {
  const c = SITE.credits
  return (
    <div className="credits">
      <p>Modelo 3D: <a href={c.modelUrl} target="_blank" rel="noreferrer">{c.modelName}</a> por <a href={c.authorUrl} target="_blank" rel="noreferrer">{c.author}</a>, bajo licencia <a href={c.licenseUrl} target="_blank" rel="noreferrer">{c.license}</a>.</p>
      <p>{c.extra}</p>
    </div>
  )
}

function Swatches() {
  const [on, setOn] = useState(0)
  return (
    <div className="swatches">
      {COLORS.map((c, i) => (
        <button key={c.hex} className={`swatch${on === i ? ' is-on' : ''}`} style={{ background: c.hex }} onClick={() => { setOn(i); rig.paint = c.hex }} aria-label={c.name}>
          <span>{c.name}</span>
        </button>
      ))}
    </div>
  )
}

function Hud() {
  const needle = useRef<SVGLineElement>(null)
  const arc = useRef<SVGPathElement>(null)
  const kmh = useRef<HTMLSpanElement>(null)
  const track = useRef<HTMLElement>(null)
  useEffect(() => {
    let last = 0
    let endFlashed = false
    const len = arc.current?.getTotalLength() ?? 1
    if (arc.current) { arc.current.style.strokeDasharray = `${len}`; arc.current.style.strokeDashoffset = `${len}` }
    const tick = () => {
      const lenis = getLenis()
      const y = lenis ? lenis.animatedScroll : window.scrollY
      rig.velocity = y - last; last = y
      // final de la página: la misma ráfaga de la intro, lo último que se ve
      if (lenis && rig.intro > 0.9) {
        const atEnd = y >= lenis.limit - 2
        if (atEnd && !endFlashed) { endFlashed = true; flashLights() }
        if (y < lenis.limit - 160) endFlashed = false
      }
      const target = Math.min(1, Math.abs(rig.velocity) / 55)
      const prev = rig.speed
      rig.speed += (target - rig.speed) * (target > rig.speed ? 0.18 : 0.06)
      rig.brake += (Math.min(1, Math.max(0, prev - rig.speed) * 28) - rig.brake) * 0.2
      const s = rig.speed
      if (needle.current) needle.current.style.transform = `rotate(${-135 + s * 270}deg)`
      if (arc.current) arc.current.style.strokeDashoffset = `${len * (1 - s)}`
      if (kmh.current) kmh.current.textContent = String(Math.round(s * SITE.speedMax)).padStart(3, '0')
      if (track.current) track.current.style.transform = `scaleY(${rig.progress})`
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])
  return (
    <div className="hud">
      <div className="frame"><i /><i /><i /><i /></div>
      <div className="tl">{SITE.brand}</div>
      <div className="tr"><div className="idx">00<small>/{String(SECTIONS.length - 1).padStart(2, '0')}</small></div><span className="name">{SECTIONS[0].eyebrow}</span></div>
      <div className="track"><i ref={track} /></div>
      <div className="bl">
        <svg className="gauge" viewBox="0 0 100 100">
          <path className="arc" d="M 18.2 81.8 A 45 45 0 1 1 81.8 81.8" />
          <path className="arc on" ref={arc} d="M 18.2 81.8 A 45 45 0 1 1 81.8 81.8" />
          <line className="needle" ref={needle} x1="50" y1="50" x2="50" y2="14" />
          <circle className="pin" cx="50" cy="50" r="3" />
        </svg>
      </div>
      <div className="br"><div className="kmh"><span ref={kmh}>000</span><small>{SITE.speedUnit}</small></div></div>
      <div className="scroll-hint">{SITE.scrollHint}<i /></div>
    </div>
  )
}

function Cursor() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const x = gsap.quickTo(ref.current, 'x', { duration: 0.18, ease: 'power3' })
    const y = gsap.quickTo(ref.current, 'y', { duration: 0.18, ease: 'power3' })
    const mv = (e: MouseEvent) => { x(e.clientX); y(e.clientY) }
    window.addEventListener('mousemove', mv)
    return () => window.removeEventListener('mousemove', mv)
  }, [])
  return <div className="cursor" ref={ref} />
}

function Preloader() {
  const { progress, active, loaded } = useProgress()
  const [gone, setGone] = useState(false)
  const ready = !active && loaded > 0 && progress >= 100
  const p = Math.round(progress)
  if (gone) return null
  return (
    <div className="pre">
      <div className="pre__credit">{SITE.preloaderCredit}</div>
      <div className="pre__logo"><span className="o">{SITE.preloaderWord}</span><span className="f" style={{ clipPath: `inset(${100 - p}% 0 0 0)` }}>{SITE.preloaderWord}</span></div>
      <div className="pre__meta">{SITE.loadingLabel}<b>{String(p).padStart(3, '0')}%</b></div>
      <button className={`pre__btn${ready ? ' is-ready' : ''}`} onClick={() => { startIntro().then(() => setGone(true)) }}>{SITE.startLabel}</button>
    </div>
  )
}
