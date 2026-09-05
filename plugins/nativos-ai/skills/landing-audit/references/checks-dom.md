# CORE checks — DOM substrate

Read from the **rendered, hydrated DOM**, never from source. Extractors in
`scripts/extract.mjs` return observations; the verdict is yours, against the
thresholds here.

Tier drives register: **only tier 4 is written firmly.** Everything else is a
recommendation with its reason. See `report.md`.

---

## D-01 · One h1, one thing at h1 scale · tier 2
**Extractor:** `d01_headings`
**Pass:** exactly one visible `<h1>`, and at most one element rendered at ≥92% of
the h1's font size. No skipped heading levels.
**Why:** headings are the scan path. Two things at h1 scale means no focal point —
NN/g's layer-cake pattern is how people actually find things, and it needs one entry.
**Recommend:** name the single promise that deserves h1, demote the rest to h2.

## D-02 · Trust content not concealed · tier 3
**Extractor:** `d02_concealed`
**Pass:** no guarantee, price or testimonial content sits inside a collapsed
accordion, tab panel, or carousel slide.
**Why:** hidden content is not consumed. NN/g: "hiding content behind navigation
diminishes people's awareness of it"; accordions raise interaction cost. And a
carousel is worse than hidden — later slides reach roughly 0.04% of visitors
(Runyon, 3,755,297 nd.edu visits, 89.1% of clicks on slide 1), while auto-advance
fails **WCAG 2.2.2 Level A**.
**Recommend:** expose reviews as static stacked cards. It is also the cheaper build.

## D-03 · Disclosure before the first CTA · tier 3
**Extractor:** `d03_disclosure`
**Pass:** a price signal and, where one exists, the guarantee appear in document
order **before** the first primary CTA.
**Why:** you cannot reverse a risk that has not been quantified — the risk *is* the
money. NN/g names upfront disclosure of cost, fees and return policy as one of four
credibility factors.
**Recommend:** a "from $X" or a flat callout fee in the hero. "Call for a quote"
defers the number the visitor is actually deciding on.

## D-07 · Field TYPE, not field count · tier 3
**Extractor:** `d07_form`
**Pass:** no password field on a lead form. No textarea. No stacked selects. A
phone field exists for a phone-first vertical.
**Why:** **do not promise a lift from cutting fields.** Zuko, 739 forms and 93M
sessions: the field-count trendline is flat. What is measured is the field *type*.
**Recommend:** one name field, labels above the inputs, and one line justifying any
field beyond four. A password field means this is a signup page, not a lead form —
re-run the gate.

## D-09 · Every control labelled · tier 4
**Extractor:** `d09_labels`
**Pass:** zero unlabelled controls (`<label for>`, wrapping label, `aria-label` or
`aria-labelledby` — a placeholder is not a label). Required fields marked in text,
not by colour alone.
**Why:** tier 4 because an unlabelled field stops a screen-reader user from
converting at all, and colour-only marking fails for colour-blind users. This is the
one DOM check that is firm.
**Recommend / state firmly:** name the field. It is a one-attribute fix.

## D-12 · Headings-only test · tier 3
**Extractor:** `d12_headingsOnly`
**Pass:** delete every word of body copy; the surviving headings still make the
argument and reach a CTA. No generic section headings.
**Why:** the single best-supported instruction in the whole practitioner corpus —
the F-pattern (232 users), first-2-words (n=80: 85–100% accuracy on a front-loaded
label vs 15% on "Introducing…"), the 20–28% read rate, and the 4.4-seconds-per-100-
words slope all point at it. Apply it to **every** block as a pass condition.
**Recommend:** replace "Cómo funciona" with what actually happens; replace "Real
people, real results" with the result. The extractor flags these by name.
