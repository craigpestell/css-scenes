---
title: Ramen Counter
slug: ramen-counter
---
## The idea

Late night, after the last train. A bowl of ramen steams on a wooden counter in front of an open doorway. A red paper lantern sways, a noren curtain reading らーめん stirs in gusts, and four menu tags hang on the wall (醤油 味噌 塩 豚骨). It is one HTML file, one CSS file, and no JavaScript.

## Techniques

### Steam: morphing clip-path: shape()

Each wisp is a soft vertical gradient cut into a curling ribbon by `clip-path: shape()`. All keyframes use the same command list (`from`, two `curve`, `hline`, two `curve`, `close`) with different points, so the browser interpolates point by point:

```css
@keyframes curl {
  0% {
    opacity: 0; translate: 0 4vmin;
    clip-path: shape(from 45% 100%, curve to 30% 50% with 65% 75%, curve to 55% 0% with 0% 25%, hline to 70%, curve to 45% 50% with 20% 25%, curve to 60% 100% with 80% 75%, close);
  }
  35% { opacity: 1; }
  50% {
    clip-path: shape(from 45% 100%, curve to 65% 50% with 20% 75%, curve to 40% 0% with 100% 25%, hline to 55%, curve to 80% 50% with 90% 25%, curve to 60% 100% with 35% 75%, close);
  }
  100% {
    opacity: 0; translate: 0 -8vmin;
    clip-path: shape(from 45% 100%, curve to 30% 50% with 65% 75%, curve to 55% 0% with 0% 25%, hline to 70%, curve to 45% 50% with 20% 25%, curve to 60% 100% with 80% 75%, close);
  }
}
```

Unlike `path()`, `shape()` takes percentages, so the wisp scales with its box. Without `shape()` support, the wisps keep their `border-radius: 50%` and rise as soft blobs.

### Blur on the parent of clipped children

A filter on a clipped element is applied before the clip, so its blur would be cut off by its own clip-path edge. The blur therefore goes on `.steam`, the wisps' parent, and softens the clipped result:

```css
.steam {
  inset: auto 18% calc(100% + 2vmin);
  block-size: 46vmin;
  filter: blur(1.4vmin); /* paint-ok: re-filtered as the wisps animate. On the parent: a filter on the clipped wisps would be cut off by their own clip */
}
```

Trade-off: the parent's filter is recomputed each frame while the children animate. The area is small, but this is the scene's one paint-cost animation.

### A whole gust in one linear() curve

The noren keyframes only go from rest to "fully blown". The easing curve does the choreography: it rises, overshoots, settles, and returns to 0 at 100%, so every iteration is one gust that ends at rest:

```css
--gust: linear(0, 0.55 12%, 1 24%, 0.78 38%, 0.9 50%, 0.4 72%, 0.08 88%, 0);
.noren i {
  /* … layout and type … */
  transform-origin: 50% 0;
  animation: stir 7s var(--gust) infinite;
  animation-delay: calc(var(--i) * 0.35s);
  animation-delay: calc(sibling-index() * 0.35s);
}
@keyframes stir { from { rotate: 0deg; transform: skewX(0deg); } to { rotate: 3deg; transform: skewX(-4deg); } }
```

Panels are staggered with `sibling-index()`, with an inline `--i` declared first as the fallback (the same pattern as Tokyo Subway).

### Menu tags: vertical-rl, corner-shape and sibling-count()

The menu is `writing-mode: vertical-rl` with `flex-direction: column`. In vertical writing the column axis runs horizontally from right to left, so the tags read in Japanese order. Each tag has a bevelled point (`corner-shape: bevel` on its bottom radii). Older browsers fall back to plain rounded corners. The tags fan around the centre using `sibling-count()`:

```css
@supports (order: sibling-index()) {
  .menu li { rotate: calc((sibling-index() - (sibling-count() + 1) / 2) * 1.5deg); }
}
```

### light-dark() palette

The wall, wood, cloth and tags are each one `light-dark()` declaration. The doorway, lantern and bowl stay fixed, so the light scheme reads as the same shop with the lights up.

## Performance notes

| raw | gzip | brotli | budget | ok |
|---|---|---|---|---|
| 9,180 B | 3,275 B | 2,835 B | 14,336 B | yes |

The noren and lantern animate only `rotate` and `transform`. The steam animates `clip-path`, `translate` and `opacity` under a parent blur, so it repaints its own region each frame. Frame times are not measured yet.

## Accessibility

- Under `prefers-reduced-motion: reduce` the noren, lantern and steam stop. The steam is held at 60% opacity, clipped to its mid-curl `shape()` frame, so the bowl still reads as hot.
- Everything decorative is `aria-hidden`. The stage's `aria-label` describes the scene, and Japanese text carries `lang="ja"`.

## Known limitations

- Vertical text needs a Japanese font with vertical metrics. The stack names Hiragino Sans, Yu Gothic UI and Noto Sans CJK JP first. A Linux machine whose only CJK fallback is WenQuanYi rendered the menu glyphs overlapping until a proper face was used.
- On narrow phones the lantern overlaps the doorway edge, and the noren characters crowd their panels.
- Checked only in headless Chromium (desktop light and dark, and a 390px phone), not in Safari or Firefox.

## Reuse

- `stage` (library): the contained scene root, plus `.stage * { position: absolute; }` so nested parts can be placed.
- Candidate snippets: `steam` (morphing `shape()` wisps under a blurred parent) and `gust` (a one-curve `linear()` easing that returns to rest). Neither has been extracted to `packages/lib` yet.
- Scene colours are local `light-dark()` custom properties, not entries in `tokens.json`. That breaks the repo rule that new tokens go in the token file. It was kept local because every token is inlined into every scene's bundle. The user accepted it as an exception on 2026-10-03 (recorded in `meta.json`).
