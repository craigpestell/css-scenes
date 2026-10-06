---
title: Full Send
slug: full-send
---
## The idea

A race-day poster built by scrolling. The outlines of FULL SEND draw themselves in, lime floods the letters from the bottom up, and colour sweeps across ALL GAS, NO BRAKES. All the while, a tilted lime ticker slides behind the word. No JavaScript and no web fonts.

## Techniques

### stroke-dashoffset draw-in on SVG text, shared through <use>

The word is two `<text>` lines in a `<defs>` group. A dash longer than any glyph's outline, offset by its own length, starts invisible. Scrolling the offset to 0 draws every glyph at once. The dash pattern restarts for each glyph, so the letters draw in together:

```css
.line {
  fill: none;
  stroke: var(--ink);
  stroke-width: 0.9; /* only the outer half shows, see .knock */
  stroke-linejoin: round;
  stroke-dasharray: 220;
  stroke-dashoffset: 0;
  animation: inherit;
  animation-name: draw;
}
```

System fonts are often variable fonts with overlapping contours. On macOS the N's diagonal shows a stray stroke inside the letter. A second `<use>` filled with the background colour sits on top and hides the stroke's inner half, overlaps included:

```css
/* a background-coloured fill over the stroke hides its inner half, including where system-font contours overlap (the N) */
.knock { fill: var(--bg); }
```

`textLength` with `lengthAdjust="spacingAndGlyphs"` pins each line to 96 units wide, so the poster lays out the same whatever system font renders it.

### clip-path flood on a third <use>

The lime copy is clipped with `inset()`. On an SVG element with no CSS box, the reference box is the text's own bounds, so `inset(100% 0 0)` → `inset(0)` raises the lime from the baseline area up through the glyphs:

```css
@keyframes flood { 0%, 35% { clip-path: inset(100% 0 0); } } /* paint-ok: clip on two short text runs */
```

### background-clip: text colour sweep

The tagline's background is a hard two-tone gradient twice the line's width. Sliding it from 100% to 0 moves the colour edge across the letters:

```css
@supports (background-clip: text) {
  .sub {
    background: linear-gradient(90deg, light-dark(var(--night), var(--lime)) 50%, var(--muted) 0) 0 0 / 200% 100%;
    background-clip: text;
    color: #0000;
  }
```

web-features lists `background-clip: text` as limited availability. Outside the `@supports` block the line is plain solid ink.

### Finished-frame base styles, from-only keyframes

Every base style describes the finished poster (`stroke-dashoffset: 0`, `clip-path: inset(0)`, `background-position: 0 0`). Keyframes only say where things start, as in `@keyframes approach { from { scale: 0.9; } }`. Reduced motion therefore needs no still-frame values at all: turning animation off shows the end state.

### One keyframe script on two timelines

A shared shorthand gives every stage child the same clock. Without scroll timelines it runs a 9s loop that alternates forwards and back, so the poster draws and undraws instead of snapping back to empty. With scroll timelines it runs once, forwards, on the scrollbar:

```css
@supports (animation-timeline: scroll()) {
  body { overflow: auto; }
  .runway { display: block; block-size: 400dvh; }
  .hint { display: block; }
  .stage { --dir: normal; }
  .stage > *, .flood, .line, .band span {
    animation-duration: auto;
    animation-iteration-count: 1;
    animation-timeline: scroll(root);
  }
}
```

## Performance notes

| raw | gzip | brotli | budget | ok |
|---|---|---|---|---|
| 5,555 B | 2,276 B | 1,942 B | 14,336 B | yes |

The ticker and the word's scale are compositor-only. The stroke draw, the flood clip and the tagline sweep repaint, but only two short text runs and one line of text (all marked paint-ok). There are no filters and no blur. Frame times and layer counts are not measured yet.

A build gotcha: Lightning CSS turned `font-stretch: condensed` plus the `font` shorthand into an invalid `font: 900 75% 40px`, so the whole declaration was dropped. The scene sets the width with `textLength` instead.

## Accessibility

- `prefers-reduced-motion: reduce` shows the finished poster and stops the page scrolling. Checked in headless Chromium at 1280 and 390 px wide, light and dark.
- The outline is ink in both schemes, so the letters read before the lime arrives. Once swept, the tagline is near-black on paper (light) or lime on near-black (dark).
- The SVG, tagline and ticker are `aria-hidden`; the stage's `aria-label` says what is shown.

## Reuse

Uses `lib/stage`. Candidate snippets: the three-layer SVG text treatment (stroke, knockout, flood) and the finished-frame / from-only keyframe convention.
