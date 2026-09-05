# Gate — is this even a landing page?

Run this BEFORE any check. Every check in `checks-dom.md` and `checks-render.md`
assumes a first-time, unauthenticated visitor who is deciding whether to convert.
Grading anything else against them produces confident nonsense.

Source: `gate` extractor in `scripts/extract.mjs`.

## Necessary condition — a judgement you make, not a boolean the tool hands you

**Is there any real way to convert on this page?** A form with a submit control, a
`tel:` link, a booking embed, or a clear CTA that leads to a signup/contact/checkout
path. **No → not a landing page. Stop, whatever the score says.**

The extractor gives you `affordanceInventory` — forms, submit controls, tel: links,
booking embeds, clickable count, same-site links, and the text and path of the first
dozen off-page links. It deliberately does **not** decide for you.

That is not laziness; it is the result of two failed attempts to compute it:

- Matching CTA copy by keyword read **"Aardvark Book Club"** as a booking CTA,
  because `book` appears in the brand name.
- Taking the max-visual-weight interactive element failed on **Basecamp**, whose two
  heaviest buttons are a video trigger and a product tour, and whose homepage has
  **zero forms**. Its real conversion path is an ordinary text link to signup.

Across languages and brands this cannot be pattern-matched. So look at the inventory
and answer it yourself, in one line, in the report: *"la conversión aquí es X."* If
you cannot name X, that is itself the top finding.

## Soft signals — need ≥5 of 7

| Signal | What it means |
|---|---|
| `dominantConversionAffordance` | One dominant form, or a tel:/booking CTA, with no persistent app nav |
| `outcomeHeading` | A heading promising a result, not a data label |
| `proofPresent` | Testimonial, rating, logo strip or guarantee text somewhere |
| `moneyInBody` | A price, "desde", "gratis", or a currency figure |
| `footerNap` | Footer carries address, hours or service area |
| `marketingMeta` | Meta description or OG written as marketing copy |
| `enoughProse` | ≥300 words in the main region |

Two of these are weak on their own — `proofPresent` and `moneyInBody` both fire on
any page that merely *discusses* proof or pricing. They are worth a point each and
nothing more. That is why the affordance is a separate, necessary gate.

## Hard stop: app screen

`appScreenScore ≥ 3` → **stop and say so.** Signals: auth gate · `role="grid"` or a
data table over 8 rows · persistent app nav · per-user content · login as the
max-weight CTA.

Note a bare login page will trip `authGate` and may trip little else. Decide
explicitly and say which bucket you put it in — do not let the halt fire for the
wrong reason and call the test passed.

## Template placeholder → SPEC, never AUDIT

`templatePlaceholder` is true only for the canonical `lorem ipsum dolor sit amet`,
or three or more placeholder markers with no quoting. A page that *quotes* «Lorem
ipsum» while discussing it is not a template — that false positive was real and is
now guarded.

Unwired template → route to `spec-mode.md`. Grading stock demo copy is theatre.
