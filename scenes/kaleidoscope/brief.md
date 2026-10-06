# Kaleidoscope (kaleidoscope)

Status: APPROVED. The owner asked for a kaleidoscope scene on 2026-10-06. Claude picked the defaults below, including the slug, and they have not been reviewed separately.

## Concept / mood / motion language
- **Concept:** Looking down a brass kaleidoscope. Coloured glass beads and shards tumble inside the object chamber, and twelve mirrored slices fold them into six-fold patterns that never repeat. Scrolling turns the barrel.
- **Mood:** Jewel-box, hypnotic, a little Victorian.
- **Motion language:** Slow tumble, mirrored, endless.

## Palette & tokens
Six glass colours (ruby, amber, teal, cobalt, violet, lime), a field colour and a brass ramp, all local custom properties using `light-dark()`. No new tokens; this asks for the same local-colours exception earlier scenes have used.
- Dark: opaque jewel colours on near-black, the second glass layer blended with `screen` so overlaps glow like lit glass.
- Light: translucent colours on a pale daylight field, the second layer blended with `multiply` so overlaps darken like stained glass held up to a window.

## Layers (back to front)
1. Stage background: dark/paper with a soft violet bloom behind the eyepiece.
2. Brass barrel `.tube`: static conic-gradient ring with a drop shadow.
3. `.scope`: the round eyepiece (`overflow: clip` + `border-radius`), turning.
4. Twelve `b` wedges, each a `clip-path` triangle; even ones mirrored with `scaleY(-1)`.
5. Inside each wedge an identical `i` (beads, rings, conic shards) and its `::before` (second glass layer, blended).
6. `.tube::after`: static eyepiece glint and inner shadow, so the light doesn't turn with the view.
7. Scroll hint.

## Motion plan
| element | property | trigger | duration | compositor-safe? |
|---|---|---|---|---|
| glass `i` | `transform: rotate` around an off-centre origin | time | 38s loop | yes |
| glass `i::before` | `transform: rotate`, reverse | time | 23s loop | yes |
| `.scope` | `rotate` | scroll(root), 2 turns; time fallback | 150s loop | yes |
| `.scope` | `filter: hue-rotate() saturate()` | time, alternate | 40s | yes (filter) |
| hint | `opacity` | scroll(root), first 4% | — | yes |

## Techniques
- **Mirror wedges from `clip-path` + `scaleY(-1)`.** Widely available.
- **`sibling-count()` / `sibling-index()`** derive wedge angle and rotation from the markup. Newly available (2026-08-18); `:nth-child` fallback hardcodes 12 wedges.
- **`tan()`** sizes each wedge from its angle. Widely available.
- **Scroll-driven animation** turns the barrel. Limited availability (not Firefox); fallback is a slow time-based turn.
- **`mix-blend-mode` switched by colour scheme** through a custom property.

## Reduced-motion frame
A composed still pattern: glass layers at their resting angles (35deg / -80deg), barrel unturned, no hint, page doesn't scroll.

## Exceptions
Only local colours. No JS, fonts or images.

## Snippets reused / candidates to extract
Uses `lib/stage`. Candidate: the mirrored-wedge kaleidoscope rig (any content dropped into `i` becomes symmetric).

## Budget & targets
14 KB brotli. Lighthouse perf ≥ 95, CLS 0, dropped frames < 2%.

## Open questions for the human
- OK to use local colours rather than adding the glass palette to `tokens.json`?
