import { Suspense, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, ContactShadows, Sparkles, Html, Preload, Text } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Color, Group, InstancedMesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Vector3 } from 'three'
import gsap from 'gsap'
import { Model } from './Model'
import { SECTIONS } from './choreo'
import { SITE } from './config'
import { rig } from './rig'

const _p = new Vector3(), _l = new Vector3()
const ACCENT = new Color(SITE.accent)

export function Scene() {
  const car = useRef<Group>(null!)
  const ca = useRef<{ offset: { set: (x: number, y: number) => void } }>(null)
  const par = useRef({ x: 0, y: 0 })

  useFrame((st, dt) => {
    if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = st
    const t = st.clock.elapsedTime
    const cam = st.camera as PerspectiveCamera
    const k = 1 - Math.pow(0.004, dt)
    par.current.x += (st.pointer.x - par.current.x) * k
    par.current.y += (st.pointer.y - par.current.y) * k
    const px = par.current.x, py = par.current.y

    _p.copy(rig.pos)
    _p.x += px * 0.35 + Math.sin(t * 0.37) * 0.06
    _p.y += py * 0.18 + Math.sin(t * 0.53) * 0.03
    _p.z += Math.cos(t * 0.29) * 0.05
    cam.position.copy(_p)
    _l.copy(rig.look)
    _l.x += px * 0.1
    _l.y += py * 0.05
    cam.lookAt(_l)
    if (Math.abs(cam.fov - rig.fov) > 0.01) { cam.fov = rig.fov; cam.updateProjectionMatrix() }

    const g = car.current
    g.rotation.y = rig.rot + Math.sin(t * 0.31) * 0.025 + px * 0.04 + (1 - rig.intro) * 1.2
    g.position.y = (1 - rig.intro) * -0.4

    st.scene.environmentIntensity = rig.intro
    if (ca.current) { const a = 0.0003 + rig.speed * 0.005 + rig.streaks * 0.004; ca.current.offset.set(a, a) }
  })

  return (
    <>
      <color attach="background" args={['#070707']} />
      <fog attach="fog" args={['#070707', 14, 34]} />

      <group ref={car}>
        <Suspense fallback={null}><Model /></Suspense>
        <Callouts />
      </group>

      <Floor />
      <Ghost3D />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.8} scale={16} blur={2.4} far={2.2} resolution={1024} color="#000" />
      <Sparkles count={140} scale={[18, 5, 18]} position={[0, 2.4, 0]} size={1.8} speed={0.22} opacity={0.35} color={SITE.accent} />
      <Streaks />

      <spotLight position={[6, 9, 5]} angle={0.45} penumbra={1} intensity={220} color="#fff1d0" />
      <Environment resolution={512} frames={1}>
        {[-9, -6, -3, 0, 3, 6, 9].map((z) => (
          <Lightformer key={z} intensity={2.2} rotation-x={Math.PI / 2} position={[0, 4.2, z]} scale={[10, 1.2, 1]} />
        ))}
        <Lightformer intensity={1.6} rotation-y={Math.PI / 2} position={[-40, 2, 0]} scale={[80, 2.4, 1]} />
        <Lightformer intensity={1.6} rotation-y={-Math.PI / 2} position={[40, 2, 0]} scale={[80, 2.4, 1]} />
        <Lightformer form="ring" color={SITE.accent} intensity={6} scale={8} position={[-14, 4, -16]} target={[0, 0, 0]} />
        <Lightformer form="rect" color="#ffffff" intensity={1} position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} />
      </Environment>

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={1} luminanceSmoothing={0.25} />
        <ChromaticAberration ref={ca as never} offset={[0.0003, 0.0003] as never} radialModulation modulationOffset={0.35} />
        <Vignette eskil={false} offset={0.22} darkness={0.9} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
      <Preload all />
    </>
  )
}

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
      <planeGeometry args={[80, 80]} />
      <MeshReflectorMaterial
        blur={[500, 160]} resolution={1024} mixBlur={1} mixStrength={40} roughness={0.9}
        depthScale={1.1} minDepthThreshold={0.35} maxDepthThreshold={1.3} color="#151515" metalness={0.5} mirror={0.55}
      />
    </mesh>
  )
}

function Callouts() {
  return (
    <>
      {SECTIONS.map((s, i) => s.callout && <Callout key={s.id} i={i} pos={s.callout.pos} text={s.callout.text} />)}
    </>
  )
}
function Callout({ i, pos, text }: { i: number; pos: [number, number, number]; text: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useFrame(() => {
    const el = ref.current
    if (!el) return // drei monta el nodo del Html un frame después
    const v = rig.callouts[i] ?? 0
    el.style.opacity = String(v)
    el.style.transform = `translateX(${(1 - v) * -12}px)`
  })
  return (
    <Html position={pos} zIndexRange={[2, 1]} style={{ pointerEvents: 'none' }}>
      <div className="callout" ref={ref}><i /><span>{text}</span></div>
    </Html>
  )
}

const N = 160
const _o = new Object3D()
function Streaks() {
  const ref = useRef<InstancedMesh>(null!)
  const data = useMemo(() => Array.from({ length: N }, () => ({
    a: Math.random() * Math.PI * 2, y: 0.15 + Math.random() * 2.6, r: 2 + Math.random() * 20, len: 0.6 + Math.random() * 2.4, v: 10 + Math.random() * 14,
  })), [])
  useFrame((_, dt) => {
    const m = ref.current
    const on = rig.streaks > 0.01
    m.visible = on
    if (!on) return
    const boost = 0.6 + rig.speed * 2.5 + rig.streaks
    data.forEach((d, i) => {
      d.r += d.v * boost * dt
      if (d.r > 24) d.r = 2
      _o.position.set(Math.cos(d.a) * d.r, d.y, Math.sin(d.a) * d.r)
      _o.lookAt(0, d.y, 0)
      _o.scale.set(0.012, 0.012, d.len * (0.6 + rig.speed * 2.5))
      _o.updateMatrix()
      m.setMatrixAt(i, _o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
    ;(m.material as MeshBasicMaterial).opacity = rig.streaks * 0.9
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={ACCENT.clone().multiplyScalar(3.2)} transparent toneMapped={false} />
    </instancedMesh>
  )
}

// Palabra fantasma en 3D: siempre detrás del coche respecto a la cámara, reflejada en el suelo
const _d = new Vector3()
const GLOW = ACCENT.clone().multiplyScalar(1.8) // > 1 para que el bloom lo recoja
function Ghost3D() {
  const g = useRef<Group>(null!)
  const txt = useRef<{ fillOpacity: number; strokeOpacity: number }>(null!)
  const [word, setWord] = useState(SECTIONS[0].ghost.toUpperCase())
  const cur = useRef(0)
  const fade = useRef({ v: 0 })
  useFrame((st, dt) => {
    _d.copy(st.camera.position).sub(rig.look).setY(0).normalize()
    const k = 1 - Math.pow(0.02, dt)
    g.current.position.lerp(_d.set(-_d.x * 7.5, 1.7, -_d.z * 7.5), k)
    g.current.lookAt(st.camera.position.x, 1.7, st.camera.position.z)
    if (rig.section !== cur.current) {
      cur.current = rig.section
      const next = SECTIONS[rig.section].ghost.toUpperCase()
      gsap.killTweensOf(fade.current)
      gsap.to(fade.current, { v: 0, duration: 0.25, onComplete: () => { setWord(next); gsap.to(fade.current, { v: 1, duration: 0.9, ease: 'power2.out' }) } })
    } else if (rig.intro > 0.5 && fade.current.v === 0 && !gsap.isTweening(fade.current)) {
      gsap.to(fade.current, { v: 1, duration: 1.4, ease: 'power2.out' })
    }
    if (txt.current) { txt.current.fillOpacity = 0.035 * fade.current.v; txt.current.strokeOpacity = 0.55 * fade.current.v }
  })
  const size = Math.min(2.6, 7.6 / Math.max(3, word.length))
  return (
    <group ref={g} position={[0, 1.7, -7.5]}>
      <Text ref={txt as never} font="/fonts/anybody-900.woff" fontSize={size} letterSpacing={-0.04} anchorX="center" anchorY="middle"
        color={GLOW} fillOpacity={0} strokeWidth="1.2%" strokeColor={GLOW} strokeOpacity={0}>
        {word}
      </Text>
    </group>
  )
}
