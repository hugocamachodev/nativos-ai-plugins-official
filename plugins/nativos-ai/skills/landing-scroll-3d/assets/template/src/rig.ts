import { Vector3 } from 'three'

// Estado mutable compartido entre GSAP (lo tweenea) y R3F (lo lee cada frame).
// ponytail: un objeto plano en vez de store; nadie necesita suscribirse.
export const rig = {
  pos: new Vector3(4.6, 1.15, 5.4),
  look: new Vector3(0, 0.55, 0.3),
  fov: 32,
  rot: -0.3, // yaw del coche controlado por scroll
  intro: 0, // 0..1 revelado inicial
  lights: 0, // 0..1 faros encendidos (scroll)
  blink: 0, // ráfaga: 1 = luz larga, -1 = apagado, 0 = normal (tiempo real)
  rear: 0, // 0..1 pilotos traseros (scroll)
  brake: 0, // 0..1 luz de freno al frenar el scroll
  streaks: 0, // 0..1 estelas de velocidad
  speed: 0, // 0..1 velocidad de scroll suavizada
  velocity: 0, // px por tick de scroll
  progress: 0, // 0..1 progreso de scroll
  wheelSpin: 0,
  paint: '#d8a71e',
  callouts: [] as number[], // opacidad por sección
  section: 0,
}
