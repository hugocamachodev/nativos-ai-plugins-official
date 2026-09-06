# Build detection — the repo is not the page

Governing rule: **always audit something rendered.** Over React/Next/Astro/Tailwind
a static grep answers almost nothing correctly — grepping `transition` over Tailwind
or CSS-in-JS is a false-positive generator. Source is read only where the
initial-vs-hydrated distinction *is* the finding.

Tool: `node "${CLAUDE_PLUGIN_ROOT}/skills/landing-audit/scripts/detect-build.mjs" --project <dir>`
returns the resolution plan as JSON. `--help` documents every flag.

## Resolution order — first match wins

| Step | Condition | Action |
|---|---|---|
| 1 | A URL was given | Use it. Cheapest, and the only path with field data. |
| 2 | Any `.html`, no `package.json` | The file **is** the build. Serve the containing dir; entry = `index.html`, else the largest `.html`. |
| 3 | `dist/` `build/` `out/` `.output/public/` `_site/` `public/` holds an `index.html` | Serve it directly. No rebuild — it is already the final build and it is faster. |
| 4 | `package.json` with a known framework | Build, then resolve the output (table below). |
| 5 | WordPress / Wix / Squarespace / GHL / Elementor markers | Not a repo audit. **Ask for the live URL.** Builder output is neither auditable from source nor fixable in it. |
| 6 | Nothing resolved | **Ask for the URL or the build command. Never guess.** |

## Step 4 — framework table

| Signal (dependency or config file) | Build | Serve |
|---|---|---|
| `next` | `next build` | Build, then look at the filesystem: `out/index.html` → serve `out/`; else `.next/` → `next start` |
| `nuxt` | `nuxt build` | `nuxt preview`, or serve `.output/public` |
| `astro` | `astro build` | `astro preview`, or serve `dist/` |
| `@angular/cli` | `ng build` | serve `dist/<project>/browser` |
| `react-scripts` | `react-scripts build` | serve `build/` |
| `@sveltejs/kit` | `vite build` | `vite preview`, or serve `build/` |
| `@11ty/eleventy` | `eleventy` | serve `_site/` |
| `gatsby` | `gatsby build` | serve `public/` |
| `vite` | `vite build` | `vite preview`, or serve `dist/` |
| a `build` script and nothing else | run it | inspect the output dir afterwards |

**Never parse `next.config.*`** to decide the output mode. It is executable
JavaScript. Build first, then ask the filesystem what appeared.

## The three failure branches, all named

- **6a — no `node_modules`.** The build cannot run. **Ask** before installing, and
  pick the installer from the lockfile. See `deps.md`.
- **6b — build timeout.** Hard limit 600s. A plain shell call would cut at 120s and
  kill a Next build with no branch, so the script owns the timeout.
- **6c — build fails, times out, or needs secrets.** Fall back to the dev server:
  **structural checks only, performance `NO MEDIDO`.**

**Monorepo:** `package.json` with `workspaces` → confirm WHICH package holds the
landing page before building anything.

## Never measure performance on a dev server

A dev server ships unminified modules with HMR injected. Its numbers are not the
build's numbers. Structural checks are still valid there; the report must state
which substrate every finding came from.

## Serving

`detect-build.mjs --serve <dir>` binds `127.0.0.1:0` — the kernel assigns the port,
so a collision is impossible — prints `{"url","pid","root"}` and records it in a
registry so concurrent servers all stay stoppable. `--stop` kills every recorded
server; `--stop <url|pid>` kills one. **Calling `--stop` at the end is mandatory.**
