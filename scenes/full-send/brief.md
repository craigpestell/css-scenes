# Full Send (full-send)

Status: APPROVED. The owner asked for this scene to be built on 2026-10-03 ("build the first and third idea", from the landonorris.com review). Claude picked the defaults below, including the slug (the working title was "lime-title"), and they have not been reviewed separately.

## Concept / mood / motion language
- **Concept:** The words FULL SEND in giant outlined letters. Scrolling draws the outlines in, floods the letters with lime from the bottom up, then sweeps colour across a tagline. A tilted lime ticker crosses behind the word.
- **Mood:** Loud, poster-like, race-day merch.
- **Motion language:** Draw, fill, sweep; one beat after another.

## Palette & tokens
Lime `#d2ff00` and near-black `#111112` as local custom properties, with `light-dark()` for paper and ink. The outline is ink in both schemes, so it reads on lime and on paper. There are no new tokens: this falls under the local-colours exception the user accepted on 2026-10-03.

## Layers (back to front)
1. Ticker band: lime strip, rotated −5°, with the text written twice.
2. SVG word: one `<g>` of two `<text>` lines in `<defs>`, used three times: stroke, knockout fill, lime flood.
3. Tagline `<p>` with `background-clip: text`.
4. Scroll hint.

## Motion plan
| element | property | when | compositor-safe? |
|---|---|---|---|
| outline | `stroke-dashoffset` 220 → 0 | 0–50% | paint-ok: two text runs |
| flood | `clip-path: inset()` bottom-up | 35–100% | paint-ok: two text runs |
| word | `scale` 0.9 → 1 | 0–100% | yes |
| tagline | `background-position` | 70–95% | paint-ok: one line |
| ticker | `translate` | 0–100% | yes |

The trigger is scroll(root). The fallback is a 9s time loop that alternates forwards and back.

## Techniques
- Text stroke draw-in on SVG text through `<use>`.
- `background-clip: text`: limited availability per web-features. Without it the tagline is solid ink.
- Base styles hold the finished frame and keyframes declare only `from`, so reduced motion just turns animation off.
- `textLength` + `lengthAdjust` fixes the word's width on every system font. That replaces font-stretch, which Lightning CSS mis-serialises in the font shorthand.

## Reduced-motion frame
The finished poster: outlined, filled, tagline swept, ticker still. The page doesn't scroll.

## Exceptions
Only local colours. No JS, fonts or images.

## Budget & targets
14 KB brotli. Lighthouse perf ≥ 95, CLS 0.

## Inspiration
landonorris.com, design by OFF+BRAND: outlined display type and the lime ticker. The scene uses generic words only and no names, numbers or branding.
