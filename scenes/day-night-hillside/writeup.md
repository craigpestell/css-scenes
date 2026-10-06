---
title: Day / Night Hillside
slug: day-night-hillside
---
## The idea

A paper-cut hillside town sits under a golden-hour sky. A pill-shaped switch at the bottom says "Night". Flip it and, over 3.6 seconds, the sun drops behind the horizon while a crescent moon rises, the sky and every hill and roof cross-fade to a night palette, a warm haze slides along the horizon, stars fade in after the sky darkens, and the windows light up one by one. Flip it back and it all reverses. One HTML file, one CSS file, no JavaScript. The whole state is one checkbox.

## Techniques

### Checkbox as preceding sibling (no :has())

The `<input id="night">` is the first child of `.stage`, before `.world` and the label. Every night-state rule is a plain sibling selector:

```css
#night:checked ~ .world {
  --c-sky-top: #0e1230; --c-sky-low: #3a2a5c; --c-glow: #6b5aa8;
```

Because the checkbox precedes everything it styles, `~` is enough. The brief reached for `:has()`; this deviates on purpose. `:has()` would let the checkbox live anywhere, but costs a wider invalidation scope and gains nothing here. Trade-off: the checkbox must stay before its targets in source order. The label (`for="night"`) toggles it, so keyboard and click both work. Support: universal.

### Typed @property palette crossfade

Nine colours are registered as `<color>`, so a change to them interpolates instead of snapping:

```css
@property --c-sky-top  { syntax: "<color>"; inherits: true; initial-value: #5aa9e6; }
```

`.world` lists all nine in `transition-property`, and the night rule only reassigns them. Everything downstream (`fill: var(--c-far-hill)`, the sky gradient) follows for free, with one transition on one container and the same `--ease-out` curve as the orbit so colour tracks the sun.

Cost, stated in the source as `paint-ok`: this is a main-thread transition. Each frame the inheriting properties restyle every descendant and repaint the SVG fills and the full-size sky gradient. It is flat fills with no blur, but it is not compositor work. Support: `@property` is Baseline newly available (2024-07-09). Without it the palette snaps at once to the night values; the scene still works.

### One pivot rotation swaps sun and moon

Sun and moon are children of a zero-size pivot on the horizon, one placed `--r` above it and one `--r` below:

```css
#night:checked ~ .world .orbit { rotate: 180deg; }
```

Rotating the pivot by 180deg sends the sun down and brings the moon up along the same arc, with a single `rotate` transition. `rotate` is an individual transform, so on its own it is a compositor-friendly property. The horizon landscape hides whichever body is below it. Support: Baseline widely available.

### Registered angle driving the haze

The glow blob reads one registered `<angle>`, `--glow-angle`, which transitions from 0deg to 180deg:

```css
translate: calc(-50% + sin(var(--glow-angle, 0deg)) * var(--r)) 50%;
opacity: calc(.2 + .7 * sin(var(--glow-angle, 0deg)));
```

`sin()` is 0 at both ends and 1 at 90deg, so the haze is faint at noon and midnight, brightest and farthest to the side mid-swing (sunset), and moves in x in step with the sun. Two properties derive from one number, so they cannot drift apart. The honest cost: this is not compositor-driven. Style recalculation runs on the main thread each frame to resolve `translate` and `opacity` from the transitioning angle, followed by a layer update. It is one small element.

The `, 0deg` default in `var()` matters. Without `@property` support the variable would be invalid, the `calc()` would be invalid at computed-value time, and `opacity` would fall back to full. The default keeps day quiet. That fix was added after a reviewer saw the unguarded glow blob; it has not been re-tested in a browser without `@property`. Support: `sin()` is Baseline widely available; `@property` as above.

### sibling-index() stagger with --i fallback

The 12 lit windows (`.lit rect`) fade in one by one at night and out in reverse order by day. There is a fallback with an inline `--i` on each rect, then an `@supports` upgrade:

```css
@supports (transition-delay: calc(sibling-index() * 1ms)) {
  .lit rect { transition-delay: calc((sibling-count() - sibling-index()) * 60ms); }
  #night:checked ~ .world .lit rect { transition-delay: calc(sibling-index() * 140ms + 1.6s); }
}
```

The fallback is `calc(var(--i) * 140ms + 1.6s)`, with `--n: 12` standing in for `sibling-count()`. The 1.6s offset lets the sky darken first. A review compared the two paths and found identical computed delays, 1.74s to 3.28s, for the night direction. The `@supports` block makes the upgrade explicit instead of relying on a parse-time drop. Support: `sibling-index()` and `sibling-count()` are Baseline newly available (2026-08-18); the `--i` path is the fallback.

### Masked-disc crescent moon

The moon is a full disc with a circular hole cut by a mask:

```css
mask: radial-gradient(circle at 70% 36%, transparent 0 52%, #000 53%); /* crescent bite */
```

The transparent circle, offset up and right, bites the disc into a crescent. No second element or clip-path is needed, and the shape stays a single `background: var(--moon)`. Support: `mask` is Baseline widely available (2023-12-07).

### --u stage unit and bottom-anchored SVG crop

One custom property turns the SVG's 160-unit viewBox into pixels:

```css
--u: max(100vw / 160, 100dvh / 200);    /* one SVG viewBox unit in px; portrait crops to the town centre */
```

`.land` is `calc(var(--u) * 160)` wide, centred, and pinned to the bottom, and its SVG uses `preserveAspectRatio="xMidYMax slice"`. Horizon height (`--hz`), orbit radius (`--r`), and body size (`--s`) are all derived from `--u`, so sky objects stay aligned with the landscape at any size. In portrait the town is cropped from the sides around its centre instead of shrinking.

### Two-tone focus ring

The scene behind the toggle changes from light green to near-black, so one outline colour cannot work:

```css
#night:focus-visible ~ .toggle {
  outline: 3px solid #fff;
  outline-offset: 3px;
  box-shadow: 0 0 0 3px #14121f;
}
```

A white outer band plus a dark inner band means one of them always contrasts. The colours are fixed, not tokens, because the backdrop follows the scene state, not the OS scheme.

### light-dark() chrome and reduced motion

The toggle pill uses `--c-ink`, `--c-paper`, and `--c-accent`, which the token build emits as `light-dark(...)` (see `packages/build/src/tokens.js`), so the UI follows the OS scheme while the scene itself does not. Support: `light-dark()` is Baseline newly available (2024-05-13). Under `prefers-reduced-motion: reduce`, every transition in `.world` and the thumb gets zero duration and delay, so the toggle still works but the scene switches instantly.

## Performance notes

Measured by `pnpm build`:

| raw | gzip | brotli | budget | ok |
|---|---|---|---|---|
| 9,441 B | 3,062 B | 2,597 B | 14,336 B | yes |

No exceptions are declared. The build found no script, font, `img`, or raster `url()`.

One earlier review measured, in headless software rendering (indicative only, not a real-device number): a clean console and a maximum `requestAnimationFrame` interval of 16.8 ms.

Not measured: Lighthouse score, CLS, dropped-frame percentage, promoted layer count, and behaviour in Safari or Firefox.

What costs the most, from reading the CSS rather than profiling: the nine-colour crossfade restyles all descendants and repaints the sky gradient and SVG fills every frame for 3.6s, and the haze recomputes `translate` and `opacity` on the main thread. Both are main-thread work in a swing that happens only on user action, never idle. The orbit `rotate` and the window `opacity` fades are the cheap parts.

## Accessibility

- A native checkbox with a visible `<label>`, 44px minimum height, keyboard operable. It is visually hidden at 1px with `opacity: 0`, not `display: none`, so it stays focusable.
- The focus ring is two-tone. From the CSS values only, the white outline has at least 3.29:1 against every backdrop, and the dark inner band is about 3.6:1 on the day near-hill. These are calculated, not measured from rendered pixels.
- `.world` is `aria-hidden`; the `main` carries an `aria-label`. The checkbox has its label as the accessible name.
- Reduced motion: transitions go to 0s, so the night state appears instantly. The reduced-motion render itself has not been checked by eye here.
- The stage never relies on OS colour scheme for scene legibility; the chrome does.

## Reuse

- `stage` (library): the contained, fixed scene root, used with `@layer scene`.
- The checkbox-sibling state pattern, the registered-colour crossfade, and the `--u` unit are not library snippets yet. To adapt the palette trick: register each colour as `<color>`, set the day values on the container, override them under `#state:checked ~ .container`, and list them in `transition-property`.
- The `--glow-angle` pattern generalises to any "peaks mid-transition" effect: register one angle, transition it, and derive several properties from `sin()` of it. Always give the `var()` a default.
- Keep the inline `--i` on staggered items until you can drop browsers without `sibling-index()`.
