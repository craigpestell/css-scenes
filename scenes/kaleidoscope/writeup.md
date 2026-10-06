---
title: Kaleidoscope
slug: kaleidoscope
---
## The idea

You look down the eyepiece of a brass kaleidoscope. Glass beads, rings and shards tumble in the object chamber, and twelve mirrored slices fold them into six-fold patterns that keep changing. Scrolling turns the barrel. In dark mode the glass glows like jewels under a lamp; in light mode it filters daylight like stained glass. No JavaScript, no images, no web fonts.

## Techniques

### Mirrored clip-path wedges (rotate + scaleY(-1))

A real kaleidoscope is two mirrors at an angle. Here each wedge is a box from the centre, `r` wide and `r · tan(a)` tall, so its diagonal sits at exactly `a` degrees. A `clip-path` triangle keeps the slice between 0 and `a`:

```css
.scope b {
  --a: calc(360deg / var(--n));
  --k: 0;
  position: absolute;
  inset: 50% auto auto 50%;
  inline-size: var(--r);
  block-size: calc(var(--r) * tan(var(--a)));
  transform-origin: 0 0;
  transform: rotate(calc(var(--k) * 2 * var(--a)));
  clip-path: polygon(0 0, 100% -1%, 100% 101%); /* a hair wider than the wedge hides anti-aliased seams */
}
.scope b:nth-child(even) { transform: rotate(calc((var(--k) * 2 + 2) * var(--a))) scaleY(-1); }
```

Wedges come in pairs. The odd one sits at `2ka`. The even one is flipped with `scaleY(-1)`, which maps the slice to `−a…0`, then rotated one pair further, so it lands at `2ka + a … 2ka + 2a`. Every seam therefore meets its own reflection, which is why the joins are invisible. The polygon is a hair wider than the wedge so anti-aliased edges overlap instead of showing a dark hairline.

### sibling-count() and sibling-index() fold count with :nth-child fallback

The fold count comes from the markup. Where `sibling-index()` is supported, `--n` is the number of wedges and `--k` (the pair index) is computed per wedge:

```css
@supports (order: sibling-index()) {
  .scope b { --n: sibling-count(); --k: round(down, (sibling-index() - 1) / 2); }
}
```

Delete four `<b>` elements and you get four-fold symmetry with no CSS change (checked in Chrome). Keep the count even and at least 6, since `tan(90deg)` is infinite. `sibling-index()` is newly available (2026-08-18). Without it, `--n: 12` and five `:nth-child(n + 3)`… rules set `--k`, so the shipped markup looks the same everywhere.

### Identical object chambers on one clock, orbiting off-centre

CSS has no way to render one element in twelve places, so every wedge holds its own copy of the glass. They stay perfectly symmetric because they share the same styles and the same document timeline: twelve animations with the same duration, started on the same frame, are always in step.

```css
.scope i,
.scope i::before {
  position: absolute;
  inset: calc(var(--r) * -0.5) auto auto calc(var(--r) * -0.18);
  inline-size: calc(var(--r) * 1.45);
  aspect-ratio: 1;
  animation: orbit 38s linear infinite;
}
```

The glass is a stack of radial gradients (beads with a highlight dot, a thin ring) and narrow conic gradients (shards). The `i` turns around `52% 48%` and its `::before` turns the other way every 23s around `44% 58%`, so pieces slide past each other rather than the whole picture just spinning. The resting angle lives in the `rotate` property and the animation adds a turn through `transform`; both apply, so turning animation off leaves a composed still frame.

Everything that moves is a transform, so it runs on the compositor. The gradients paint once per layer and are then only moved.

### mix-blend-mode switched by colour scheme

`mix-blend-mode` can't take `light-dark()`, but it can take a custom property:

```css
--blend: screen; /* overlapping glass adds light on black... */
```

```css
@media (prefers-color-scheme: light) {
  .stage { --blend: multiply; } /* ...and filters it like stained glass held up to a window */
}
```

The second glass layer uses `mix-blend-mode: var(--blend)`. On black, `screen` makes overlaps brighter; on the pale daylight field, `multiply` makes them deeper, and the light palette uses translucent colours so the effect reads.

### scroll(root) barrel turn with longhand-only timeline

With scroll timelines the scrollbar turns the barrel two full turns over a 400dvh runway, while the glass keeps tumbling on time. Without them the barrel turns once every 150s.

```css
.scope {
  animation-duration: auto, 40s;
  animation-timing-function: linear, ease-in-out;
  animation-iteration-count: 1, infinite;
  animation-fill-mode: both, none;
  animation-timeline: scroll(root), auto;
}
@keyframes turn { to { rotate: 2turn; } }
```

A build gotcha: written as `animation: turn linear both, …; animation-timeline: scroll(root), auto;`, Lightning CSS merged the two into `animation: linear both turn scroll(root), …`. `animation-timeline` is reset-only in the shorthand, so Chrome dropped the whole declaration and the barrel silently went back to the time loop. Setting longhands only avoids the merge.

## Performance notes

| raw | gzip | brotli | budget | ok |
|---|---|---|---|---|
| 7,809 B | 2,866 B | 2,483 B | 14,336 B | yes |

All motion is `transform`, `rotate`, `opacity` or `filter`. The costliest part is 24 clipped, composited glass layers plus one blend per wedge, and the hue drift filter over the eyepiece. A 3s requestAnimationFrame sample in Chrome on the dev machine held 60 fps with no frames over 25 ms. Lighthouse and dropped-frame stats are not measured yet (TODO: `pnpm measure` once it exists).

The eyepiece is capped at `min(88vmin, 62rem)` rather than filling the window, which keeps every wedge's layer small.

## Accessibility

- `prefers-reduced-motion: reduce` stops every animation and shows the glass at its resting angles, with no hint and no scrolling. Checked with headless Chrome `--force-prefers-reduced-motion`.
- The barrel and glass are `aria-hidden`; the stage's `aria-label` describes the view.
- The only text is the scroll hint, at 70% ink on paper in both schemes.

## Reuse

Uses `lib/stage`. Candidate snippet: the mirrored-wedge rig. Anything placed inside `.scope i` becomes kaleidoscopic.
