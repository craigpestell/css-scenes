---
name: perf-triage
description: Diagnose and fix a scene that misses its budgets or has dropped frames, using measure reports and DevTools traces. Use when build budget, Lighthouse score, or frame stats regress.
---

# Perf triage

Inputs: the build size report, `reports/<slug>.json` (once the measure suite exists), a Chrome trace if available.

## Order of suspects
1. **Bytes over budget** — look for repeated gradient stops/shadows (generate with a smaller pattern or `repeating-*`), unused snippet imports, un-minified inline SVG, exceptions bigger than declared.
2. **Dropped frames / high paint time**
   - Animated registered properties (`@property`) repaint every frame: fine for small areas, costly full-window. Switch to rotating a pre-painted layer with `transform` where visuals allow.
   - Large `filter: blur()` or `backdrop-filter` on moving or full-window layers; reduce radius, blur a smaller element, or pre-blur via gradient.
   - Many `box-shadow` layers or huge gradient layers animating; prefer one layer moved by `transform`.
   - Animating layout props (`top/left/width`) → convert to `transform`.
3. **Too many compositor layers / GPU memory** — merge layers, drop unneeded `will-change`, avoid overlapping promoted layers.
4. **CLS / LCP** — stage is fixed so CLS should be 0; if not, find late-loading fonts/images (exceptions) and add dimensions, `size-adjust`, preload.
5. **Off-screen work** — pause animations when hidden (`animation-play-state` via `:has()` / view timeline), `content-visibility: auto` for off-screen sections.

## Method
Change one thing at a time, rebuild, re-measure, record before/after in the write-up's Performance notes. Prefer removing cost to hiding it. Report the diagnosis with numbers before editing.
