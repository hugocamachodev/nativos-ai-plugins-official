#!/usr/bin/env node
// detect-build.mjs — landing-audit skill.
// Resolves "what do I actually render?" for a repo, runs its production build,
// and serves the built output. Zero npm dependencies (node:* only).
//
//   --project <dir>        detect only; print a resolution plan as JSON
//   --build <dir>          run the resolved production build (600s timeout)
//   --serve <dir>          serve <dir> on 127.0.0.1:0; prints {url,pid,root}
//   --stop                 stop the server started by --serve
//   --json                 machine output (default for --project)
//
// Governing rule: the repo is not the page. Everything downstream audits a
// RENDERED url, never a grep over source.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { join, resolve, extname, basename } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'

const BUILD_TIMEOUT_MS = 600_000
const STATE_DIR = join(tmpdir(), 'landing-audit')
// One file per server, not one shared array. Two --serve starting at the same time
// used to read the same array and the second write clobbered the first, orphaning a
// process that --stop <url> could no longer find — measured at 2 in 4 concurrent
// starts. A file per pid has no read-modify-write, so the race cannot happen.
const REGISTRY_DIR = join(STATE_DIR, 'servers')
const LEGACY_REGISTRY = join(STATE_DIR, 'servers.json')
const OUTPUT_DIRS = ['dist', 'build', 'out', '.output/public', '_site', 'public']
const BUILDER_MARKERS = [
  ['wp-content', 'WordPress'], ['wp-includes', 'WordPress'],
  ['_next/static/chunks/webpack', null], // not a marker, placeholder
]

// ---------- helpers ----------
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null } }
const isDir = (p) => { try { return statSync(p).isDirectory() } catch { return false } }

function htmlFilesIn(dir, depth = 0) {
  const found = []
  if (depth > 1) return found
  let entries = []
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return found }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue
    const p = join(dir, e.name)
    if (e.isFile() && extname(e.name).toLowerCase() === '.html') found.push(p)
    else if (e.isDirectory() && depth === 0) found.push(...htmlFilesIn(p, depth + 1))
  }
  return found
}

function pickInstaller(dir) {
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return { manager: 'pnpm', install: 'pnpm install', run: 'pnpm' }
  if (existsSync(join(dir, 'yarn.lock'))) return { manager: 'yarn', install: 'yarn install', run: 'yarn' }
  if (existsSync(join(dir, 'package-lock.json'))) return { manager: 'npm', install: 'npm ci', run: 'npm run' }
  // No lockfile: do NOT default to npm silently. That is the stack_detector.py bug.
  return { manager: null, install: null, run: null, ask: 'No lockfile found — ask which package manager this project uses.' }
}

// dependency-and-config based framework probe (not language detection)
function detectFramework(dir, pkg) {
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  const has = (n) => Object.prototype.hasOwnProperty.call(deps, n)
  const scripts = pkg.scripts || {}
  const cfg = (n) => ['js', 'mjs', 'cjs', 'ts'].some(x => existsSync(join(dir, `${n}.config.${x}`)))

  if (has('next') || cfg('next')) return {
    framework: 'next', build: 'next build',
    // Do NOT parse next.config (executable JS). Build, then look at the filesystem.
    serveRule: 'after build: out/index.html exists -> serve out/ statically; else .next/ -> `next start`',
  }
  if (has('nuxt') || has('nuxt3') || cfg('nuxt')) return { framework: 'nuxt', build: 'nuxt build', serveRule: 'nuxt preview, or serve .output/public' }
  if (has('astro') || cfg('astro')) return { framework: 'astro', build: 'astro build', serveRule: 'astro preview, or serve dist/' }
  if (has('@angular/cli') || existsSync(join(dir, 'angular.json'))) return { framework: 'angular', build: 'ng build', serveRule: 'serve dist/<project>/browser statically' }
  if (has('react-scripts')) return { framework: 'cra', build: 'react-scripts build', serveRule: 'serve build/ statically' }
  if (has('@sveltejs/kit')) return { framework: 'sveltekit', build: 'vite build', serveRule: 'vite preview, or serve build/' }
  if (has('@11ty/eleventy')) return { framework: 'eleventy', build: 'eleventy', serveRule: 'serve _site/ statically' }
  if (has('gatsby')) return { framework: 'gatsby', build: 'gatsby build', serveRule: 'serve public/ statically' }
  if (has('vite') || cfg('vite')) return { framework: 'vite', build: 'vite build', serveRule: 'vite preview, or serve dist/' }
  if (scripts.build) return { framework: 'unknown-with-build-script', build: 'run the build script', serveRule: 'inspect the output dir after building' }
  return null
}

// ---------- resolution order (first match wins) ----------
function resolvePlan(dir) {
  dir = resolve(dir)
  const plan = { project: dir, step: null, action: null, notes: [] }

  if (!isDir(dir)) { plan.step = 'error'; plan.action = 'ask'; plan.notes.push(`${dir} is not a directory`); return plan }

  const pkgPath = join(dir, 'package.json')
  const pkg = existsSync(pkgPath) ? readJson(pkgPath) : null

  // step 5 (checked early — a page-builder export is never a repo audit)
  const wp = ['wp-content', 'wp-includes'].some(m => existsSync(join(dir, m)))
  if (wp) {
    plan.step = 5; plan.action = 'require-url'
    plan.notes.push('WordPress/page-builder output detected. Not auditable from source. Ask for the live URL.')
    return plan
  }

  // step 2 — any .html and no package.json => the file IS the build
  if (!pkg) {
    const htmls = htmlFilesIn(dir)
    if (htmls.length) {
      const index = htmls.find(p => basename(p).toLowerCase() === 'index.html')
      const entry = index || htmls.sort((a, b) => statSync(b).size - statSync(a).size)[0]
      plan.step = 2; plan.action = 'serve'
      plan.serveRoot = dir; plan.entry = entry
      plan.notes.push(`${htmls.length} .html file(s), no package.json — this is already the final build.`)
      if (!index) plan.notes.push(`No index.html; entry chosen by size: ${basename(entry)}`)
      return plan
    }
    plan.step = 6; plan.action = 'ask'
    plan.notes.push('No package.json and no .html found. Ask for a URL or the build command. Never guess.')
    return plan
  }

  // step 3 — already-built output present
  for (const d of OUTPUT_DIRS) {
    const root = join(dir, d)
    if (isDir(root) && existsSync(join(root, 'index.html'))) {
      plan.step = 3; plan.action = 'serve'
      plan.serveRoot = root; plan.entry = join(root, 'index.html')
      plan.notes.push(`Existing build output at ${d}/ — serving it directly, no rebuild.`)
      plan.framework = detectFramework(dir, pkg)?.framework ?? null
      return plan
    }
  }

  // step 4 — framework build
  const fw = detectFramework(dir, pkg)
  if (fw) {
    plan.step = 4; plan.action = 'build'
    Object.assign(plan, fw)
    const inst = pickInstaller(dir)
    plan.installer = inst
    if (!isDir(join(dir, 'node_modules'))) {
      plan.action = 'ask-install'
      plan.notes.push('node_modules is absent — the build cannot run yet. ASK before installing.')
      if (inst.ask) plan.notes.push(inst.ask)
      else plan.notes.push(`Lockfile says: ${inst.install}`)
    }
    if (pkg.workspaces) plan.notes.push('Monorepo workspaces detected — confirm WHICH package holds the landing page before building.')
    return plan
  }

  // step 6 — catch-all
  plan.step = 6; plan.action = 'ask'
  plan.notes.push('package.json present but no known framework signal. Ask for the URL or the build command. Never guess.')
  return plan
}

// ---------- build ----------
function runBuild(dir) {
  const plan = resolvePlan(dir)
  if (plan.action === 'ask-install') return { ok: false, reason: 'needs-install', plan }
  if (plan.action !== 'build') return { ok: false, reason: `nothing to build (step ${plan.step})`, plan }
  const inst = plan.installer
  if (!inst.run) return { ok: false, reason: 'no package manager resolved', plan }
  const started = Date.now()
  const r = spawnSync(inst.run.split(' ')[0], [...inst.run.split(' ').slice(1), 'build'], {
    cwd: dir, timeout: BUILD_TIMEOUT_MS, encoding: 'utf8', shell: false,
  })
  const elapsed = Date.now() - started
  if (r.error?.code === 'ETIMEDOUT' || r.signal === 'SIGTERM') {
    return { ok: false, reason: 'build-timeout', elapsedMs: elapsed, plan,
      fallback: 'Run the dev server instead: structural checks only, performance NO MEDIDO.' }
  }
  if (r.status !== 0) {
    return { ok: false, reason: 'build-failed', status: r.status, elapsedMs: elapsed,
      stderrTail: (r.stderr || '').split('\n').slice(-15).join('\n'), plan,
      fallback: 'Run the dev server instead: structural checks only, performance NO MEDIDO.' }
  }
  // resolve output by filesystem, never by parsing config
  for (const d of OUTPUT_DIRS) {
    const root = join(dir, d)
    if (isDir(root) && existsSync(join(root, 'index.html'))) {
      return { ok: true, elapsedMs: elapsed, serveRoot: root, entry: join(root, 'index.html'), plan }
    }
  }
  return { ok: true, elapsedMs: elapsed, serveRoot: null, plan,
    note: 'Build succeeded but no static index.html found. Framework needs its own server (e.g. `next start`).' }
}

// ---------- static server ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.map': 'application/json',
}

function serve(root) {
  root = resolve(root)
  const server = createServer((req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
      if (p.endsWith('/')) p += 'index.html'
      const full = resolve(join(root, p))
      if (!full.startsWith(root)) { res.writeHead(403).end('forbidden'); return }   // no traversal
      let target = full
      if (!existsSync(target) || isDir(target)) {
        const idx = join(full, 'index.html')
        if (existsSync(idx)) target = idx
        else if (existsSync(join(root, 'index.html'))) target = join(root, 'index.html') // SPA fallback
        else { res.writeHead(404).end('not found'); return }
      }
      const body = readFileSync(target)
      res.writeHead(200, {
        'content-type': MIME[extname(target).toLowerCase()] || 'application/octet-stream',
        'content-length': body.length, 'cache-control': 'no-store',
      }).end(body)
    } catch (e) { res.writeHead(500).end(String(e.message)) }
  })
  // port 0 => kernel-assigned, so collisions are impossible
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address()
    const info = { url: `http://127.0.0.1:${port}`, pid: process.pid, root }
    mkdirSync(REGISTRY_DIR, { recursive: true })
    writeFileSync(join(REGISTRY_DIR, `${process.pid}.json`), JSON.stringify(info))
    console.log(JSON.stringify(info))
    if (process.send) process.send(info)
  })
  const bye = () => {
    try { unlinkSync(join(REGISTRY_DIR, `${process.pid}.json`)) } catch {}
    process.exit(0)
  }
  process.on('SIGTERM', bye); process.on('SIGINT', bye)
}

const loadRegistry = () => {
  const out = []
  try {
    for (const f of readdirSync(REGISTRY_DIR)) {
      const e = readJson(join(REGISTRY_DIR, f))
      if (e && e.pid) { alive(e.pid) ? out.push(e) : (() => { try { unlinkSync(join(REGISTRY_DIR, f)) } catch {} })() }
    }
  } catch {}
  const legacy = readJson(LEGACY_REGISTRY)  // servers started before this change
  if (Array.isArray(legacy)) out.push(...legacy.filter(s => s && s.pid && alive(s.pid)))
  return out
}
const alive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }

function stop(which) {
  const all = loadRegistry()
  if (!all.length) { console.log(JSON.stringify({ stopped: [], reason: 'no servers recorded' })); return }
  const targets = typeof which === 'string'
    ? all.filter(s => s.url === which || String(s.pid) === which)
    : all
  const stopped = [], failed = []
  for (const s of targets) {
    try { process.kill(s.pid, 'SIGTERM'); stopped.push(s) } catch { failed.push({ ...s, reason: 'already gone' }) }
  }
  const remaining = all.filter(s => !targets.includes(s) && alive(s.pid))
  for (const t of targets) { try { unlinkSync(join(REGISTRY_DIR, `${t.pid}.json`)) } catch {} }
  try {
    const legacy = readJson(LEGACY_REGISTRY)
    if (Array.isArray(legacy)) {
      const left = legacy.filter(s => s && !targets.some(t => t.pid === s.pid))
      left.length ? writeFileSync(LEGACY_REGISTRY, JSON.stringify(left)) : unlinkSync(LEGACY_REGISTRY)
    }
  } catch {}
  console.log(JSON.stringify({ stopped, failed, remaining }, null, 2))
}

// ---------- cli ----------
const argv = process.argv.slice(2)
const flag = (n) => { const i = argv.indexOf(n); return i === -1 ? null : (argv[i + 1] ?? true) }
const HELP = `detect-build.mjs — resolve, build and serve the page to audit

  --project <dir>   detect only; prints the resolution plan as JSON
  --build <dir>     run the resolved production build (timeout ${BUILD_TIMEOUT_MS / 1000}s)
  --serve <dir>     serve <dir> on 127.0.0.1:0 (kernel-assigned port, never collides);
                    prints {"url","pid","root"} and stays in the foreground
  --stop [url|pid]  stop ALL servers from --serve, or just the one named
  --json            machine output (already the default)
  -h, --help        this text

Resolution order (first match wins): url given > any .html with no package.json >
existing build output > framework build > page-builder export (require url) >
ask for url or build command (never guess).`

if (!argv.length || argv.includes('-h') || argv.includes('--help')) { console.log(HELP); process.exit(0) }
else if (argv.includes('--stop')) stop(flag('--stop'))
else if (flag('--serve')) serve(flag('--serve'))
else if (flag('--build')) console.log(JSON.stringify(runBuild(flag('--build')), null, 2))
else if (flag('--project')) console.log(JSON.stringify(resolvePlan(flag('--project')), null, 2))
else { console.error('unknown arguments. Try --help'); process.exit(2) }
