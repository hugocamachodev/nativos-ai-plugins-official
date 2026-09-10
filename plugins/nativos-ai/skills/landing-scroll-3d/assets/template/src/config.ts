// ============================================================
// CONFIGURACIÓN DEL SITIO Y DEL MODELO. Edita esto primero.
// Las secciones, tomas de cámara y textos viven en choreo.ts.
// ============================================================

export const SITE = {
  title: 'Prototipo · experimento scroll 3D', // <title> de la pestaña
  brand: 'Prototipo · Serie 01 · 2026', // línea superior izquierda del HUD
  preloaderWord: '01', // palabra gigante del preloader (2-4 caracteres quedan mejor)
  preloaderCredit: 'Experimento scroll 3D · Three.js + GSAP',
  loadingLabel: 'Cargando modelo', // se le añade el porcentaje
  startLabel: 'Iniciar',
  scrollHint: 'Scroll',
  speedUnit: 'km/h', // unidad del velocímetro de scroll (usa la que pegue con el objeto)
  speedMax: 250, // valor que marca el velocímetro a tope de scroll
  locale: 'es-ES', // formato de números de las cifras
  accent: '#f2c230', // color de acento: HUD, eyebrows, callouts, anillo de luz, texto fantasma, estelas
  credits: {
    // Rellena con los datos reales del modelo. Si la licencia exige atribución, este bloque es obligatorio.
    modelName: 'Nombre del modelo 3D',
    modelUrl: 'https://',
    author: 'Autor',
    authorUrl: 'https://',
    license: 'Licencia',
    licenseUrl: 'https://',
    extra: 'Hecho con Three.js, React Three Fiber y GSAP. Experimento sin ánimo de lucro.',
  },
}

export const MODEL = {
  url: '/models/model.glb', // GLB comprimido en public/models
  length: 4.4, // largo objetivo en unidades del mundo (≈ metros) a lo largo del eje Z. Las tomas de choreo.ts asumen ~4,4.
  front: 'z+' as 'z+' | 'z-', // hacia dónde mira el "frente" del objeto tras normalizar (afecta luces y focos)
  // Nombres de materiales del GLB (obténlos con scripts/inspect-model.mjs). Vacío = función desactivada.
  paint: 'auto' as 'auto' | string[], // materiales cuyo color cambia con las muestras. 'auto' = el material con más geometría
  hide: [] as string[], // materiales a ocultar (cáscaras duplicadas, colisiones, etc.)
  glass: [] as string[], // materiales a tratar como cristal transparente
  shiny: [] as string[], // materiales a los que subir el reflejo del entorno (cromados, llantas)
  lights: [] as string[], // lámparas emisivas; se separan en delanteras (z > 0) y traseras (z < 0)
  lens: [] as string[], // lentes transparentes delante de las lámparas, se iluminan solas
  dash: [] as string[], // materiales del interior que brillan cuando hay luces
  wheels: null as { rim: string; tire: string } | null, // ruedas: llanta + neumático agrupados por cercanía y girados con el scroll
  hanging: null as string | null, // un objeto colgante que se balancea con la velocidad (ambientador, etiqueta…)
  lamps: [] as [number, number, number][], // posiciones locales de los focos delanteros (iluminan el suelo). Ej.: [[0.72, 0.74, 2.0], [-0.72, 0.74, 2.0]]
  tail: null as [number, number, number] | null, // posición del resplandor trasero. Ej.: [0, 0.6, -2.5]
}
