#!/usr/bin/env node
// audit-cdp.mjs — landing-audit skill, PATH B.
// Renders a url in headless Chrome over RAW CDP (Node 22 built-in WebSocket +
// fetch, zero npm deps) and extracts every DOM/render signal the CORE checks need.
// Verified capabilities CDP has that the MCP surface does not: JS-off and
// prefers-reduced-motion emulation.
//
//   --url <url>          page to audit (required)
//   --viewport <WxH>     repeatable; default 1920x1080 and 390x844
//   --chrome <path>      chrome binary (default: autodetected, see findChrome)
//   --dump-html <file>   write the hydrated outerHTML here (the bridge to the
//                        python scorers — they must never see the repo)
//   --json               machine output (default)

import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EXTRACTORS } from './extract.mjs'

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function connect(port) {
  let target
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      target = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl)
      if (target) break
    } catch {}
    await sleep(250)
  }
  if (!target) throw new Error('no page target on the devtools endpoint')
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', () => rej(new Error('devtools websocket failed to open')), { once: true })
  })
  let id = 0
  const pending = new Map()
  const events = []
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id); pending.delete(m.id)
      m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)
    } else if (m.method) events.push(m)
  })
  const send = (method, params = {}) => new Promise((res, rej) => {
    const n = ++id; pending.set(n, { res, rej })
    ws.send(JSON.stringify({ id: n, method, params }))
    setTimeout(() => pending.has(n) && (pending.delete(n), rej(new Error(method + ' timed out'))), 30000)
  })
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: `(()=>{${expr}})()`, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description || '').slice(0, 200))
    return r.result.value
  }
  return { ws, send, evaluate, events }
}

// Chrome no se llama igual en cada sistema, y en macOS ni siquiera esta en el PATH.
// Se prueba en orden y gana el primero que exista; --chrome <path> siempre manda.
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)
  for (const c of candidates) if (existsSync(c)) return c
  // ultimo recurso: algo en el PATH
  for (const name of ['google-chrome', 'chromium', 'chrome']) {
    if (spawnSync(process.platform === 'win32' ? 'where' : 'which', [name]).status === 0) return name
  }
  throw new Error('no encontre Chrome. Instalalo, o pasa --chrome <ruta al binario>')
}

async function run(opts) {
  const profile = mkdtempSync(join(tmpdir(), 'landing-audit-'))
  const port = 9500 + Math.floor((Date.now() % 400))
  const chrome = spawn(opts.chrome, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
    '--hide-scrollbars', 'about:blank',
  ], { stdio: 'ignore' })

  const result = { url: opts.url, chrome: null, viewports: {}, warnings: [] }
  let conn
  try {
    // wait for the endpoint, then record the exact browser build in the report
    for (let i = 0; i < 80; i++) {
      try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) { result.chrome = (await r.json()).Browser; break } } catch {}
      await sleep(250)
    }
    if (!result.chrome) throw new Error('chrome devtools endpoint never came up')

    conn = await connect(port)
    const { send, evaluate } = conn
    await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('CSS.enable')

    for (const vp of opts.viewports) {
      const [w, h] = vp.split('x').map(Number)
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false })
      await send('Page.navigate', { url: opts.url })
      // settle: document complete plus a beat for hydration
      for (let i = 0; i < 60; i++) {
        const st = await evaluate(`return document.readyState`)
        if (st === 'complete') break
        await sleep(200)
      }
      await sleep(600)

      const bucket = { viewport: { w, h, note: 'narrow-viewport proxy, NOT device emulation: no deviceScaleFactor or mobile UA' } }
      for (const [name, expr] of Object.entries(EXTRACTORS)) {
        try { bucket[name] = await evaluate(expr) }
        catch (e) { bucket[name] = { error: String(e.message).slice(0, 220) }; result.warnings.push(`${vp}/${name}: ${e.message}`.slice(0, 200)) }
      }
      result.viewports[vp] = bucket

      // the bridge: hydrated html for the python scorers, from the widest viewport
      if (opts.dumpHtml && vp === opts.viewports[0]) {
        const html = await evaluate(`return document.documentElement.outerHTML`)
        writeFileSync(opts.dumpHtml, html)
        result.dumpedHtml = { path: opts.dumpHtml, bytes: html.length }
      }
    }

    // capabilities CDP has and the MCP browser surface does not
    const narrow = opts.viewports[opts.viewports.length - 1]
    const [nw, nh] = narrow.split('x').map(Number)
    await send('Emulation.setDeviceMetricsOverride', { width: nw, height: nh, deviceScaleFactor: 1, mobile: false })

    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await send('Page.navigate', { url: opts.url }); await sleep(900)
    result.reducedMotion = {
      honoured: await evaluate(`return matchMedia('(prefers-reduced-motion: reduce)').matches`),
      stillTransparent: await evaluate(EXTRACTORS.hiddenOnReveal),
    }
    await send('Emulation.setEmulatedMedia', { features: [] })

    await send('Emulation.setScriptExecutionDisabled', { value: true })
    await send('Page.navigate', { url: opts.url }); await sleep(900)
    result.jsDisabled = await evaluate(EXTRACTORS.noScriptSubstance).catch(e => ({ error: String(e.message).slice(0, 200) }))
    await send('Emulation.setScriptExecutionDisabled', { value: false })

    result.ok = true
  } catch (e) {
    result.ok = false
    result.error = String(e?.message || e)
  } finally {
    try { conn?.ws.close() } catch {}
    try { chrome.kill('SIGKILL') } catch {}
    try { rmSync(profile, { recursive: true, force: true }) } catch {}
  }
  return result
}

// ---------- cli ----------
const argv = process.argv.slice(2)
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1] }
const flags = (n) => argv.reduce((a, v, i) => (v === n && argv[i + 1] ? [...a, argv[i + 1]] : a), [])
const HELP = `audit-cdp.mjs — render a url over raw CDP and extract the CORE check signals

  --url <url>          page to audit (required)
  --viewport <WxH>     repeatable; default 1920x1080 then 390x844
  --chrome <path>      chrome binary (default: autodetected, see findChrome)
  --dump-html <file>   write hydrated outerHTML here, for the python scorers
  -h, --help           this text

Zero npm dependencies: uses Node 22's built-in WebSocket and fetch.
Emulates prefers-reduced-motion and JS-off, which the MCP browser surface cannot.`

if (!argv.length || argv.includes('-h') || argv.includes('--help')) { console.log(HELP); process.exit(0) }
const url = flag('--url')
if (!url) { console.error('--url is required. Try --help'); process.exit(2) }
const out = await run({
  url,
  viewports: flags('--viewport').length ? flags('--viewport') : ['1920x1080', '390x844'],
  chrome: flag('--chrome') || findChrome(),
  dumpHtml: flag('--dump-html'),
})
console.log(JSON.stringify(out, null, 2))
process.exit(out.ok ? 0 : 1)
