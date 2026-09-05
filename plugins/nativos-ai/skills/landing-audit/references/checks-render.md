# CORE checks — render substrate

Both viewports, always: **1920×1080** and **390×844**.

Declare in the report that 390×844 is a **narrow-viewport proxy, not device
emulation** — no device scale factor, no mobile UA. That changes M-03's text:media
ratio and M-07's tap targets, and the reader deserves to know.

---

## M-01 · First-viewport comprehension · tier 4
**Extractor:** `m01_firstViewport`
**Pass:** from the first viewport alone, a stranger can say what is offered and who
it is for. Needs a visible h1, enough visible words to carry a claim, and — for a
local service — a visible price signal or `tel:`.
**Why:** ~57% of viewing time is above the fold, 42% in the top 20% (NN/g 2018,
**120 participants**, 130,000+ fixations — the impressive number is fixations, not
people). The 100px above the fold gets 102% more views than the 100px below: a step,
not a gradient.
**Do NOT say "60% never scroll past the fold."** It is false — ~71% of visitors do
scroll, and 66% of attention is spent below the fold (Chartbeat, 2bn visits). The
57% figure is viewing-*time* distribution, not a count of people. The surviving
directive carries no number: **the hero decides the visit.**
**Firm only if** nothing in the first viewport names the offer at all.

## M-02 · One element at max visual weight · tier 3
**Extractor:** `m02_visualWeight`
**Pass:** exactly one element carries max visual weight, **fully** inside the first
viewport, looking like a button. `contested` true means the runner-up is within 15% —
two focal points, i.e. none.
**Why:** attention-ratio discipline. Also report `outboundLinkCount` — every extra
link is an exit that competes with the one action.
**Recommend:** one primary action per screen. Do **not** promise a multiple from
removing choices: the choice-overload meta-analysis (63 conditions, 50 experiments,
N=5,036) found **D=0.02**, CI crossing zero, and the jam study everyone cites shows the
24-jam display attracted **more** visitors (60% vs 40%) while converting far worse.
**Variety attracts; simplicity converts** — two jobs, two positions.

## M-03 · Above-fold textual context · tier 2
**Extractor:** `m01_firstViewport` (`visibleWordCount`, `textToMediaAreaRatio`)
**Pass:** the first viewport is not media-only. An h1 present, and text area not
dwarfed by hero media.
**Why:** decorative imagery is skipped — NN/g: big feel-good images are "completely
ignored"; on Amazon product pages 18% of viewing time went to photos vs 82% to text.
Real photos of real people do work: FreshBooks employee portraits drew 10% *more*
time than the bios beside them.
**Recommend:** show the thing they get or the outcome they want — never stock.

## M-06 · Contrast · tier 4
**Extractor:** `m06_contrast`
**Pass:** 4.5:1 for body text, 3:1 for large (≥24px, or ≥18.66px bold). Measured
against the **actually painted** background, walking ancestors — not the nearest
declared colour.
**Honest limit:** text over a background **image** is `NO MEDIDO` in v1.
`getComputedStyle` returns the image URL, not a colour, and `canvas.getImageData`
throws `SecurityError` on a cross-origin hero — exactly on the deployed path. Report
it unmeasured; never guess a ratio.
**Fix aid:** `python3 scripts/contrast_checker.py "#fg" "#bg" --suggest "#fg" --json`
returns a concrete replacement hex — the most actionable artifact in the whole kit.
**Do NOT say a colour converts better.** No traceable source exists. Contrast is the
defensible rule.

## M-07 · Target size and focus obstruction · tier 3
**Extractor:** `m07_targets`
**Pass:** interactive targets ≥24×24 CSS px (WCAG 2.5.8), and no sticky bar or chat
widget covering a CTA or a focused field.
**Exemption, implemented and tested:** a link inline in a sentence of text is exempt.
A standalone nav or list link is **not** — it is a navigation target, not prose.
**Note the two numbers:** 24×24 is WCAG 2.5.8. The 44×44 figure often quoted is
Apple HIG, stricter. Say which one you are reporting against.

## J-05 · Headline · tier 3
**Extractor:** `j05_headline` — returns the text plus observations, never a verdict.
Decomposed into **five binary leaves** so it cannot degenerate into opinion. Score =
how many are yes:

1. Names a specific outcome (not who you are).
2. Names who it is for.
3. Gives a timeframe or a quantity.
4. Reuses a word from the owner's verbatim answer to intake Q8.
5. **Would be false if a competitor said it.**

Leaf 5 is the one that catches "líder en soluciones integrales". Leaf 4 is why the
intake runs before the audit — see `intake.md`.
**Do NOT say "you have 3 seconds"** or 5, or 8. The only sourced comprehension
window is **10 seconds** (NN/g over 2bn dwell times). The 5-second test is a real
method but its 5 seconds is a test-administration convenience from a 2007 article
with no cited study. The 50ms figure is about *aesthetic impression* only.

---

## Optional, never CORE

**M-11 · Core Web Vitals at p75.** Needs a CrUX API key. **No key → `NO MEDIDO — sin
API key de CrUX`, never `BLOCKED`.** The lab substitute needs lighthouse; absent that,
also `NO MEDIDO`. Never present origin-level numbers as this page's. Google's
thresholds: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1. **FID is retired** (March 2024).
