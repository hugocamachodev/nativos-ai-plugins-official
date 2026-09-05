# Report — shape, register, and honest uncertainty

Audience: the person who built the page, or the business owner who paid for it. Not a
marketer, not a developer.

## The register rule — this is the whole tone of the skill

Two registers, and the firm one is **unlocked, not assumed**:

| Tier | Meaning | How it is written |
|---|---|---|
| **4** | Stops the visitor converting | **Firm.** Say it plainly, once, without softening. |
| 3 | Significant difficulty | "Yo cambiaría X, porque Y." |
| 2 | Causes hesitation | Recommendation. |
| 1 | Cosmetic | Footnote, or omit. |

**Only tier 4 goes firm.** Everything else is a recommendation carrying its reason
and its evidence level. Never a score that reads like an exam grade — the point is
that they can act on it, not that they feel judged.

v1 has exactly two tier-4 checks: **D-09** (unlabelled controls) and **M-06**
(contrast), plus **M-01** when the first viewport names no offer at all. If the page
has none of those, the report has no firm section. Say that as good news.

## Finding shape — one block each

```
Issue     — what is true about the page, in one sentence
Impact    — what it costs the visitor, not the abstract principle
Evidence  — the measurement, with substrate: DOM@390x844 / render / NO MEDIDO
Fix       — the smallest concrete change, with the value where one exists
Priority  — tier 1-4
```

## Section order — fixed, never varied

1. **Verdict** — 3–5 bullets. What the page does well first; it is not flattery, it
   is calibration, and a reader who sees only faults stops reading.
2. **What to change first** — at most three items, tier-ordered.
3. **Everything else** — full findings.
4. **What NOT to change** — the things that are already right and would get broken by
   a well-meaning redesign. Beginners need this more than the fault list.
5. **What was not measured, and why** — never omitted, never buried.

## Honest uncertainty

Three states, and they are not interchangeable:

- **A measurement** — "el H1 mide 44px; hay 2 elementos a esa escala." Deterministic.
- **`NO MEDIDO`** — the tool could not measure it. Always with the reason: no CrUX
  key, no lighthouse, text over an image, dev server only. **Never** a guess dressed
  as a number.
- **`BLOCKED`** — the page could not be rendered at all. Only then. A missing
  optional tool is `NO MEDIDO`, not `BLOCKED`.

## Banned: the lift promise

Never write "esto va a subir tu conversión X%". You cannot know it, and it is the
claim that ends the relationship when it does not happen.

The honest version: **GoodUI ran 639 A/B tests over 141 patterns and 148,828,209
visitors — 166 winners, 43 losers, and ~67% produced no significant result.** Two
thirds of the patterns everyone "knows" work did not reach significance. Say that
before invoicing, not after.

And for a page with a few hundred visits a month, A/B testing is not available at
all: the sample does not exist. Recommend best-practice adoption and qualitative
checks, and say why the test they read about on YouTube cannot run on their traffic.

## Every number carries its tier

Before any figure goes in the report, it passes `forbidden-numbers.md`. One fabricated
number found by the client discredits the other fifty, including the true ones.
