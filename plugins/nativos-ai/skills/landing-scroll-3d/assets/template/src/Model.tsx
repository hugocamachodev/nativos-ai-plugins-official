import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, Color, Group, Mesh, MeshPhysicalMaterial, PointLight, SpotLight, Vector3 } from 'three'
import { MODEL } from './config'
import { rig } from './rig'

const _c = new Color()

type Prepared = { paint: MeshPhysicalMaterial[]; front: MeshPhysicalMaterial[]; rear: MeshPhysicalMaterial[]; lens: MeshPhysicalMaterial[]; dash: MeshPhysicalMaterial[]; wheels: Group[]; hanging?: Group }

const has = (list: string[], name: string) => list.includes(name)

function prepare(scene: Group): Prepared {
  if (scene.userData.prepared) return scene.userData.prepared
  const out: Prepared = { paint: [], front: [], rear: [], lens: [], dash: [], wheels: [] }

  // Normaliza: MODEL.length de largo en Z, centrado en X/Z, apoyado en Y=0
  scene.updateMatrixWorld(true)
  const box = new Box3().setFromObject(scene)
  const size = box.getSize(new Vector3())
  scene.scale.setScalar(MODEL.length / Math.max(size.z, 1e-6))
  scene.updateMatrixWorld(true)
  box.setFromObject(scene)
  const c = box.getCenter(new Vector3())
  scene.position.set(-c.x, -box.min.y, -c.z)
  if (MODEL.front === 'z-') scene.rotation.y = Math.PI
  scene.updateMatrixWorld(true)

  const rims: Mesh[] = [], tires: Mesh[] = []
  let hanging: Mesh | undefined
  let biggest: { mat: MeshPhysicalMaterial; n: number } | null = null
  scene.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    const mat = m.material as MeshPhysicalMaterial
    const name = mat.name
    const n = m.geometry.getAttribute('position')?.count ?? 0
    if (!biggest || n > biggest.n) biggest = { mat, n }
    if (Array.isArray(MODEL.paint) && has(MODEL.paint, name)) out.paint.push(mat)
    if (has(MODEL.hide, name)) m.visible = false
    if (has(MODEL.glass, name)) {
      mat.transparent = true; mat.opacity = 0.32; mat.metalness = 0; mat.roughness = 0.04
      mat.depthWrite = false; mat.envMapIntensity = 1.2
    }
    if (has(MODEL.shiny, name)) mat.envMapIntensity = 1.6
    if (has(MODEL.lights, name)) {
      // material propio por pieza para controlar delante (z > 0) y detrás (z < 0) por separado
      const lm = mat.clone(); m.material = lm
      lm.emissiveMap = lm.emissiveMap ?? lm.map // si el modelo trae mapa emisivo propio, respétalo
      lm.emissive.set('#ffffff'); lm.emissiveIntensity = 0
      const cz = new Box3().setFromObject(m).getCenter(new Vector3()).z
      ;(cz < -0.01 ? out.rear : out.front).push(lm) // una sola malla centrada cuenta como delantera
    }
    if (has(MODEL.lens, name)) {
      const lm = mat.clone(); m.material = lm
      lm.transmission = 0; lm.transparent = true; lm.opacity = 0.45; lm.roughness = 0.05; lm.metalness = 0
      lm.emissive.set('#fff1cc'); lm.emissiveIntensity = 0
      out.lens.push(lm)
    }
    if (has(MODEL.dash, name)) { mat.emissiveIntensity = 0; out.dash.push(mat) }
    if (MODEL.wheels && name === MODEL.wheels.rim) rims.push(m)
    if (MODEL.wheels && name === MODEL.wheels.tire) tires.push(m)
    if (MODEL.hanging && name === MODEL.hanging) hanging = m
  })
  if (MODEL.paint === 'auto' && biggest) out.paint.push((biggest as { mat: MeshPhysicalMaterial }).mat)
  for (const mat of out.paint) { mat.clearcoat = 1; mat.clearcoatRoughness = 0.05; mat.envMapIntensity = 1.5 }

  // Pivotes de rueda: agrupa llanta + neumático en su centro para poder girarlas
  for (const rim of rims) {
    const center = new Box3().setFromObject(rim).getCenter(new Vector3())
    const pivot = new Group()
    pivot.position.copy(center)
    scene.attach(pivot)
    pivot.attach(rim)
    const tire = tires.find((t) => new Box3().setFromObject(t).getCenter(new Vector3()).distanceTo(center) < 0.3)
    if (tire) pivot.attach(tire)
    out.wheels.push(pivot)
  }
  if (hanging) {
    // pivote en la parte alta del objeto colgante para que se balancee
    const b = new Box3().setFromObject(hanging)
    const pivot = new Group()
    pivot.position.set((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2)
    scene.attach(pivot); pivot.attach(hanging); out.hanging = pivot
  }
  scene.userData.prepared = out
  return out
}

export function Model() {
  const { scene } = useGLTF(MODEL.url)
  const p = useMemo(() => prepare(scene as Group), [scene])
  const spin = useRef(0)
  useFrame((st, dt) => {
    _c.set(rig.paint)
    const k = 1 - Math.pow(0.02, dt)
    for (const m of p.paint) m.color.lerp(_c, k)
    // parpadeo global: 1 = todas a tope, -1 = todas apagadas, 0 = estado normal
    const b = rig.blink
    const front = b > 0 ? 1.5 : b < 0 ? 0 : rig.lights
    const rear = b > 0 ? 1.5 : b < 0 ? 0 : rig.rear + rig.brake * 1.5 + rig.lights * 0.3
    for (const m of p.front) m.emissiveIntensity = front * 9
    for (const m of p.lens) { m.emissiveIntensity = front * 7; m.opacity = 0.45 + Math.min(1, front) * 0.45 }
    for (const m of p.rear) m.emissiveIntensity = rear * 4
    for (const m of p.dash) m.emissiveIntensity = front * 2.5
    spin.current += (rig.velocity * 0.5 + rig.streaks * 28) * dt
    for (const w of p.wheels) w.rotation.x = spin.current
    if (p.hanging) {
      const t = st.clock.elapsedTime, a = 0.25 + rig.speed * 2.5
      p.hanging.rotation.x = Math.sin(t * 2.7) * 0.14 * a
      p.hanging.rotation.z = Math.sin(t * 1.9 + 1) * 0.08 * a
    }
  })
  return (
    <>
      <primitive object={scene} />
      <Lamps />
    </>
  )
}
useGLTF.preload(MODEL.url)

// Focos reales delante (iluminan el suelo) y resplandor trasero. Todo en el espacio del objeto.
const _t = new Vector3()
function Lamps() {
  const groups = useRef<Group[]>([])
  const spots = useRef<SpotLight[]>([])
  const tail = useRef<PointLight>(null)
  useFrame(() => {
    const b = rig.blink
    const f = b > 0 ? 1.5 : b < 0 ? 0 : rig.lights
    const r = b > 0 ? 1.5 : b < 0 ? 0 : rig.rear + rig.brake
    spots.current.forEach((l, i) => {
      const g = groups.current[i]
      if (!l || !g) return
      l.intensity = f * 45
      g.localToWorld(_t.set(0, -0.6, 9))
      l.target.position.copy(_t)
      l.target.updateMatrixWorld()
    })
    if (tail.current) tail.current.intensity = r * 8
  })
  if (!MODEL.lamps.length && !MODEL.tail) return null
  return (
    <group>
      {MODEL.lamps.map((pos, i) => (
        <group key={i} position={pos} ref={(el) => { if (el) groups.current[i] = el }}>
          <spotLight ref={(el) => { if (el) spots.current[i] = el }} angle={0.42} penumbra={0.9} distance={12} decay={1.4} color="#fff0c8" intensity={0} />
        </group>
      ))}
      {MODEL.tail && <pointLight ref={tail} position={MODEL.tail} color="#ff2416" intensity={0} distance={6} decay={1.4} />}
    </group>
  )
}
