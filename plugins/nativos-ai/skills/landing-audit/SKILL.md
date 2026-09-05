---
name: landing-audit
description: Audit a finished landing page against evidence — or, if there is no page yet, spec the components it needs. Finds and renders the real build (a single mega-HTML with inline CSS/JS, or a Next/Vite/Astro/CRA/Nuxt project that must be built first), runs 12 objectively-checkable core checks in a headless browser at two viewports, and reports in plain language what works and what does not. Recommends rather than dictates, and speaks firmly only where the visitor genuinely cannot convert. Use whenever someone has built or is building a landing page and wants to know whether it works — "revisa mi landing", "audita esta página", "¿por qué no convierte?", "¿está bien hecha mi landing page?", "mejora mi landing", "qué le falta a mi página", "arma la estructura de una landing", "review my landing page", "why isn't this page converting" — even if they only paste a URL or point at a folder. NOT for general accessibility sweeps of a whole app, NOT for app screens behind a login, NOT for writing the marketing copy itself.
---

> **Rutas:** `${CLAUDE_PLUGIN_ROOT}` apunta a la carpeta del plugin instalado. Nunca uses
> rutas relativas: Bash corre desde el proyecto del usuario, no desde el skill. Si la
> variable llega vacía, el plugin está en
> `~/.claude/plugins/cache/nativos-ai-marketplace/nativos-ai/<version>/` — encuéntralo con
> un `ls` de esa carpeta y usa la ruta absoluta que salga.


## Brevity mandate (non-negotiable)

- Be direct. No preambles, no "¡Buena pregunta!", no closing summaries.
- Findings as a table or a tight list, not surrounded by prose.
- Straight feedback. No hedging, and no flattery to soften a real defect.

## What this is

An audit that grades only what is objectively checkable, **recommends** everything
else, and **declares** what it could not measure instead of filling the gap with
opinion. Built from research that audited three practitioner frameworks claim by
claim; 21 of their claims did not survive. The blacklist in
`references/forbidden-numbers.md` is part of the product, not an appendix.

## Posture — the rule that governs every sentence you write

**Recommend, not dictate.** The default register is "yo cambiaría X porque Y", and
the person decides. The firm register unlocks **only** for a tier-4 finding — one
where the visitor genuinely cannot convert. In v1 that is `D-09` (unlabelled form
controls), `M-06` (contrast), and `M-01` when the first viewport names no offer at
all. If the page has none of those, say so as good news.

Never emit a score that reads like an exam grade.

## Phase flow

**0 · Mode.** URL or renderable page → AUDIT. No page, or being replaced wholesale →
SPEC (`references/spec-mode.md`). Ambiguous → ask exactly one question: "¿Quieres que
califique lo que hay, o que especifique lo que lo reemplaza?"

**1 · Intake.** `references/intake.md`. Eight questions, ~6 minutes, before any
grading. Respect the never-ask list — asking something visible on the page is a
report defect.

**2 · Resolve what to render.** `references/build-detection.md`.
```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/landing-audit/scripts/detect-build.mjs" --project <dir>
```
Returns the plan as JSON. Honour it: `ask-install` means **ask** (`references/deps.md`),
`require-url` means the page is a page-builder export, `ask` means never guess.
Then `--build <dir>` if needed, and `--serve <dir>` to get a url. **`--stop` at the
end is mandatory.**

**3 · Render and extract.** Two paths; announce which one you used.

*Path B, preferido cuando hay Chrome instalado (el script lo busca solo)* — one command, and it is the only
path that can emulate JS-off and reduced-motion:
```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/landing-audit/scripts/audit-cdp.mjs" \
  --url <url> --dump-html /tmp/landing-audit/rendered.html > /tmp/landing-audit/report.json
node "${CLAUDE_PLUGIN_ROOT}/skills/landing-audit/scripts/extract.mjs" --digest < /tmp/landing-audit/report.json
```

*Path A, MCP* — `browser_navigate` → `browser_resize` to 1920×1080 then 390×844 →
`browser_evaluate` with each expression from `EXTRACTORS` in `scripts/extract.mjs`
(import the module to read them; they are function bodies) → `browser_take_screenshot`
of the first viewport at both sizes.

**4 · Gate before grading.** `references/gate.md`. Read `affordanceInventory` and
**name the conversion path in one line** — if you cannot, that is the top finding and
this may not be a landing page. `appScreenScore ≥ 3` → stop and say so. Template
placeholder → SPEC, never AUDIT.

**5 · Static scorers, against the RENDERED html only.** They cannot see the page
themselves — `a11y_scanner.py` takes a path, and the others' `--url` uses `urllib`,
which on any SPA scores an empty shell. So point all three at the dump from step 3,
**never at the repo and never with `--url`**:
```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/landing-audit/scripts/a11y_scanner.py" /tmp/landing-audit/rendered.html --json
python3 "${CLAUDE_PLUGIN_ROOT}/skills/landing-audit/scripts/conversion_audit.py" --file /tmp/landing-audit/rendered.html --json
python3 "${CLAUDE_PLUGIN_ROOT}/skills/landing-audit/scripts/seo_checker.py" --file /tmp/landing-audit/rendered.html --json
python3 "${CLAUDE_PLUGIN_ROOT}/skills/landing-audit/scripts/contrast_checker.py" "#fg" "#bg" --suggest "#fg" --json
```

**6 · Judge.** `references/checks-dom.md` and `references/checks-render.md`. The
extractors return **observations only** — the verdict is yours, so that evidence and
judgement never get silently welded together.

**7 · Report.** `references/report.md`. Fixed section order. Every figure passes
`references/forbidden-numbers.md` first.

## Guardrails

- **The repo is not the page.** Always audit something rendered. A grep over
  React/Tailwind source is a false-positive generator.
- **Never measure performance on a dev server.** Structural checks are fine there;
  say which substrate every finding came from.
- **`NO MEDIDO` is not `BLOCKED`.** A missing optional tool is unmeasured. `BLOCKED`
  is only for a page that cannot be rendered at all.
- **No lift promises.** GoodUI: 639 tests, ~67% produced no significant result.
- **Never install anything without being asked**, and never treat silence as yes.
- **390×844 is a narrow-viewport proxy, not device emulation.** Disclose it.
- **Never document a command without running its `--help` first.** Two skills on this
  machine document flags that do not exist; do not become the third.

## Verify (self-check before finishing)

- [ ] Intake ran, and nothing on the never-ask list was asked.
- [ ] The gate ran before any check was graded.
- [ ] Every finding names its substrate, and every unmeasured check says why.
- [ ] No finding outside tier 4 is written in the firm register.
- [ ] No number in the report appears in `forbidden-numbers.md`.
- [ ] `detect-build.mjs --stop` was called; no server left listening.

## When to read each bundled file

| Read this… | …when |
|---|---|
| `references/build-detection.md` | Resolving what to render, or a build failed, timed out, or needs an install. |
| `references/deps.md` | Something is missing and you must ask before installing. |
| `references/gate.md` | Before grading anything — is this a landing page at all? |
| `references/intake.md` | Running the eight questions, or deciding what a missing answer blocks. |
| `references/checks-dom.md` | Judging D-01, D-02, D-03, D-07, D-09, D-12. |
| `references/checks-render.md` | Judging M-01, M-02, M-03, M-06, M-07, J-05 — and M-11's key requirement. |
| `references/report.md` | Writing the report: register, section order, honest uncertainty. |
| `references/forbidden-numbers.md` | Before any number ships. Every time. |
| `references/spec-mode.md` | There is no page yet, or it is being replaced wholesale. |
