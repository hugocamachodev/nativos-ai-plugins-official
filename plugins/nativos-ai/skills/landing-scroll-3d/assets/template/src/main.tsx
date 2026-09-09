import { createRoot } from 'react-dom/client'
import '@fontsource-variable/anybody/wdth.css'
import '@fontsource-variable/martian-mono/wdth.css'
import './styles.css'
import App from './App'

// ponytail: sin StrictMode; el doble montaje rompe GSAP/ScrollTrigger y R3F en dev
createRoot(document.getElementById('root')!).render(<App />)
