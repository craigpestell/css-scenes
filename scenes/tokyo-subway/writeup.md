---
title: Tokyo Subway
slug: tokyo-subway
---
## The idea

You are standing in a Tokyo metro car at night. Three windows show tunnel lamps streaming past at two depths, hanging straps sway, and every 24 seconds the train brakes into a station: a platform and a 銀座 sign slide into the windows, dwell, then slide away as the lamps dim and return. It is one HTML file, one CSS file, and no JavaScript.

## Techniques

### Period-locked repeating-gradient tile loop

The lamp streaks are not elements. Each lane is a `repeat-x` gradient tile on an oversized layer, and the layer is translated by exactly one tile width. Frame 0 and the last frame are pixel-identical, so the loop has no seam and needs no `steps()` or JS reset.

```css
.near {
  inline-size: calc(100% + var(--tile-near));
  /* background-image (lamp gradients) omitted */
  background-size: var(--tile-near) 8px, var(--tile-near) 2px;
  animation: tile-near var(--t-rush) linear infinite, dip var(--t-drift) linear infinite;
}
@keyframes tile-far { to { translate: calc(var(--tile-far) * -1); } }
@keyframes tile-near { to { translate: calc(var(--tile-near) * -1); } }
```

Three rules make it work. The layer is wider than the viewport by one tile (`100% + var(--tile-near)`), so no gap shows as it slides. The keyframe distance equals the tile size, read from the same custom property. The easing is `linear`. The far lane (`--tile-far: 120px`) takes `calc(var(--t-rush) * 3)`, 4.8s; the near lane (`--tile-near: 480px`) takes `--t-rush`, 1.6s.

Why it is cheap: the gradient is painted once into a layer, and animating `translate` only moves that layer on the compositor. The main thread is idle after the first paint. This claim rests on how compositor-driven `translate` animations work; frame times are not yet measured (see Performance).

Honest trade-off: the parallax is a 12x speed ratio (120px per 4.8s = 25px/s versus 480px per 1.6s = 300px/s), not the roughly 3x the brief suggested. It reads as fast-train depth, but it is not a subtle drift. Because each speed is `tile / period`, you cannot change one tile size without changing its period, or the loop breaks.

Support: individual transform properties (`translate`) are Baseline widely available. Gradients are universal.

### Ratio-locked parallax

The two lanes share one `--t-rush` token, with the far lane at an integer multiple of it. They re-align on a common period instead of drifting apart, and the ratio can be tuned in one place.

### mask-image window cutouts

`.windows` is a single element filled with the tunnel color. A repeating gradient mask punches three openings:

```css
--holes: repeating-linear-gradient(90deg, #000 0 30.4%, transparent 30.4% 33.333%);
```

One element and one mask replace three windows. The pillars between them are `.stage::before`, a darker band behind the masked element. Support: `mask-image` is Baseline widely available (2023-12-07).

### light-dark()

The sign text uses `light-dark()` so one declaration covers both schemes:

```css
color: light-dark(var(--c-ink), var(--c-paper));
background: var(--c-line);
```

Support: Baseline newly available (2024-05-13). No `@supports not (color: light-dark(...))` fallback exists, although the brief called for one. In an older browser the whole `color` declaration is dropped, and the sign text inherits `--c-ink` from `body`.

### sibling-index() stagger with --i fallback

Eight straps sway out of phase. Each gets a negative delay from its position, so the motion is already mid-cycle at load:

```css
animation-delay: calc(var(--i) * -0.4s);
animation-delay: calc(sibling-index() * -0.4s);
```

The first line is the fallback. Each `<i>` carries an inline `--i`. A browser that does not understand `sibling-index()` drops the second declaration as invalid at parse time and keeps the first. Where it is supported, the second wins and the inline `--i` is redundant. Support: `sibling-index()` is Baseline newly available (2026-08-18). The `--i` fallback keeps older browsers visually identical.

## Performance notes

Measured by the build:

| raw | gzip | brotli | budget | ok |
|---|---|---|---|---|
| 6,803 B | 2,270 B | 1,947 B | 14,336 B | yes |

Not yet measured: Lighthouse scores, frame times and dropped frames, and layer counts from the browser. `pnpm measure` does not exist yet. TODO: fill these in when it does.

Known deviations, from review (not fixed):
- About 11 promoted layers (`.far`, `.near`, `.station`, 8 straps) against the brief's target of 4. This count is from reading the CSS, not from DevTools. Each strap is its own animated layer. The cost is compositor memory, not paint.
- The brief called for one SVG for the straps. They are 8 `<i>` divs.
- `.station` fades `opacity` and slides `translate` over a full-window area. Both properties are compositor-only.

## Accessibility

- Under `prefers-reduced-motion: reduce` all animation stops. The lamps freeze at fixed offsets (`.far` at -40px, `.near` at -170px) and the straps hang straight. The `.station` animation is set to none, so its base `opacity: 0` applies and the sign never shows. The visual result has not been checked by eye.
- Sign contrast uses `light-dark(ink, paper)` on `--c-line`: about 8:1 in light and 9:1 in dark. These are hand-computed, not tool-verified.
- At narrow widths the sign overlaps a strap during the station stop. It is decorative and everything is `aria-hidden`, but it is a visible flaw and remains unfixed.
- The stage has an `aria-label` describing the scene. The sign carries `lang="ja"`.
- Unverified: the light scheme at 1920px, and whether the lamps dim during the stop as intended.

## Reuse

- `stage` (library): the contained, fixed scene root. The scene sits in `@layer scene`.
- The tile loop pattern is not yet a library snippet. To adapt it, pick a tile size and a period, make the layer one tile wider than its container, and animate `translate` by `-tile`. Keep the tile size in one custom property used for the width, `background-size`, and keyframe.
- The `--i` plus `sibling-index()` pair works for any staggered list. Keep the inline `--i` until you can drop older browsers.
