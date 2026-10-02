---
name: scene-design
description: Art-direct a new full-window CSS scene and produce an approved-ready brief.md. Use before any scene CSS is written, when the user proposes a scene idea or asks to design/plan a scene.
---

# Scene design

Output: `scenes/<slug>/brief.md`. No scene CSS in this step.

## Process
1. **Concept** — one sentence a stranger would get ("dusk over a layered mountain range, scroll moves the sun"). Mood, 3–5 word motion language ("slow, drifting, parallax").
2. **Palette & tokens** — reuse tokens from `packages/tokens/tokens.json` where possible; list any new tokens needed (with `light-dark()` values). Check contrast of text/key shapes in both schemes.
3. **Composition** — layers back-to-front, what each is (gradient, inline SVG, pseudo-element), rough count. Fewer layers = fewer compositor layers; justify each.
4. **Motion plan** — for each animation: property, trigger (time / scroll / hover / view), duration, and whether it is compositor-safe (`transform`, `opacity`, `filter`, individual `translate/rotate/scale`). Paint-cost animations (e.g. `@property` gradients, large blur) must be flagged `paint-ok` with a reason.
5. **Techniques & support** — run `modern-web-guidance` search for every feature considered (mandatory), note Baseline status, and define the fallback (`@supports` → simpler or static scene). Prefer a technique that is novel *and* teachable; that is what the write-up will explain.
6. **Reduced motion** — what the scene looks like with `prefers-reduced-motion: reduce` (static composed frame, not a blank one).
7. **Exceptions** — the baseline is no JS, system fonts, CSS/inline-SVG only. Exceptions are allowed when design needs them: declare each in the brief with a one-line justification and its byte cost (`meta.json` `exceptions`). Don't add one for convenience.
8. **Reuse** — name existing `packages/lib/src` snippets to use, and patterns likely worth extracting later.
9. **Budget & success** — byte budget (default 14 KB brotli + exceptions), target scores (Lighthouse perf ≥ 95, CLS 0, dropped frames < 2%).

## brief.md template
```
# <Title> (<slug>)
Concept / Mood / Motion language
Palette & new tokens
Layers (back→front)
Motion plan (table: element | property | trigger | duration | compositor-safe?)
Techniques (with Baseline status + fallback)
Reduced-motion frame
Exceptions (or "none")
Snippets reused / candidates to extract
Budget & targets
Open questions for the human
```

For visual craft, defer to the `frontend-design` skill. Stop after writing the brief and ask the human to approve it.
