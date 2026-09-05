# Dependencies — ask, explain, never assume

Nothing is installed without the person saying yes. Silence is not yes. When
something is missing, explain in plain language what it is, what they gain, what it
costs, and what happens if they decline. Then respect the answer.

## Detect first, in this order

| Path | Needs | Covers | Loses |
|---|---|---|---|
| **A — MCP** | Playwright MCP already enabled | The 12 CORE via `browser_*` | Lighthouse; and cannot do JS-off or reduced-motion |
| **B — CDP** | Chrome instalado (el script lo autodetecta) | The 12 CORE, **plus** JS-off and reduced-motion | Lighthouse |
| **Full** | `+ lighthouse` | Lab performance, median of 3 with its range | — |

**Path B is not the degraded path.** Verified: raw CDP over Node 22's built-in
`WebSocket` and `fetch` reads `getBoundingClientRect` and `getComputedStyle`, and
emulates `prefers-reduced-motion` (`Emulation.setEmulatedMedia`) and JS-off
(`Emulation.setScriptExecutionDisabled`) — two things the MCP browser surface
cannot do, because they are context-creation options in Playwright, immutable at
runtime. For those two checks B is the *better* path.

## What actually gets negotiated

**1. The project's own `node_modules`** — the big one, and the one beginners hit
first. A fresh clone cannot build without it. Say this:

> "Tu proyecto necesita instalar sus librerías antes de poder construirse. Es lo
> normal, no es un problema de tu código: son los paquetes que tu proyecto ya
> declara en `package.json`, y se guardan en una carpeta `node_modules` dentro del
> proyecto. Puede tardar de 1 a 5 minutos y bajar bastantes megas. ¿Lo corro?"

Pick the installer **from the lockfile**, never a default:
`pnpm-lock.yaml` → `pnpm install` · `yarn.lock` → `yarn install` ·
`package-lock.json` → `npm ci` · **no lockfile → ask which one they use.**
Defaulting to npm is a real bug in an existing tool on this machine; do not repeat it.

**2. Lighthouse** — optional, only for the performance number:

> "Lighthouse es el medidor de velocidad de Google, el mismo que usa PageSpeed.
> Sin él puedo revisar toda la estructura de tu página, pero no te puedo dar el
> número de velocidad — lo voy a marcar como NO MEDIDO en el reporte en lugar de
> inventarlo. ¿Lo instalo?"

## When they decline

Run the floor and **declare it**. Every unmeasured check appears in the report as
`NO MEDIDO` with the reason. Degrading in silence is the failure mode that makes an
audit worthless: the reader cannot tell "we checked and it's fine" from
"we never checked."

Never write `BLOCKED` for a missing optional tool. `BLOCKED` is only for a page
that cannot be rendered at all.
