// Captura headless de la landing en posiciones de scroll (viewport 1440×900).
// Requiere en el proyecto: npm i -D playwright && npx playwright install chromium-headless-shell
// Uso (desde la raíz del proyecto, con el dev server levantado):
//   URL=http://localhost:5173 node scripts/capture.cjs ./shots '[["hero",0],["s1",1.0],["s2",2.2]]'
// Cada número es la posición de scroll en "alturas de viewport" (vh/100): la sección N empieza en la suma de vh anteriores.
// Con render por software algunos frames del canvas salen negros: se toman hasta 3 capturas y se conserva la más pesada.
const fs = require('fs')
const { chromium } = require('playwright')
const out = process.argv[2] || './shots'
const stops = JSON.parse(process.argv[3] || '[["hero",0]]')
const W = Number(process.env.W || 1440), H = Number(process.env.H || 900)
;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 300)))
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 300)) })
  await page.goto(process.env.URL || 'http://localhost:5173')
  await page.waitForSelector('.pre__btn.is-ready', { timeout: 120000 })
  await page.evaluate(() => document.querySelector('.pre__btn').click()) // clic por JS: el clic sintético de Playwright falla con el preloader
  await page.waitForTimeout(5500)
  for (const [name, vh] of stops) {
    await page.evaluate((vh) => window.__dbg.getLenis().scrollTo(innerHeight * vh, { immediate: true }), vh)
    await page.waitForTimeout(2800)
    let best = null
    for (let i = 0; i < 3; i++) {
      const buf = await page.screenshot({ type: 'jpeg', quality: 82, timeout: 150000 })
      if (!best || buf.length > best.length) best = buf
      if (buf.length > 60000) break
      await page.waitForTimeout(900)
    }
    fs.writeFileSync(`${out}/${name}.jpg`, best)
    const st = await page.evaluate(() => { const r = window.__dbg.rig; return { progress: +r.progress.toFixed(3), fov: +r.fov.toFixed(1), lights: r.lights, section: r.section } })
    console.log(name, best.length, 'bytes', JSON.stringify(st))
  }
  await browser.close()
})().catch((e) => { console.error('FAIL', e.message); process.exit(1) })
