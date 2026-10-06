# Scene ideas from CSS galleries (2026-10-02)

Sources browsed: Alvaro Montoro's monthly "10 Cool CodePen Demos" roundups (Apr, May, Jun, Sep 2026), Chrome's CSS Wrapped 2025 and "What's new in web UI" (I/O 2026), CSS-Tricks' scroll-driven-animation tag, and Codrops' recent demos. Codrops and Awwwards highlights this year are mostly GSAP/WebGL, so they fed mood more than technique.

Existing scenes checked so nothing repeats: **Aurora** (`@property` conic spin) and **Tokyo Subway** (gradient tile parallax, `mask-image`, `light-dark()`, `sibling-index()`).

Each idea leans on a feature neither existing scene uses. Code sketches are starting points, not tested builds. Techniques credited to a pen are from the roundup's description; I did not open every pen's source.

---

## 1. Liftoff (scroll to launch)
A rocket on a pad; scrolling the page ignites, lifts off, drops the booster and climbs through cloud layers into stars.
- **Showcases:** `animation-timeline: scroll()`, `animation-range`, multiple ranges on one element (stage separation). Support is limited (web-features 3.40.1): Chrome/Edge 115+ and Safari 26, no Firefox, so the scene needs a non-scroll fallback.
- **Inspired by:** [Artemis 2 – Scroll to Launch](https://codepen.io/cbolson/pen/jEMxeZW) by Chris Bolson; [Quick Hit #124](https://css-tricks.com/quick-hit-124/) on Firefox support.
```css
.rocket  { animation: climb linear both;  animation-timeline: scroll(root); animation-range: 10% 100%; }
.booster { animation: drop  linear both;  animation-timeline: scroll(root); animation-range: 45% 70%; }
.sky     { animation: dusk-to-space linear both; animation-timeline: scroll(root); }
@keyframes drop { to { translate: -20vw 60vh; rotate: -50deg; opacity: 0; } }
```

## 2. Storybook scrollytelling (scroll-triggered)
A picture book where each spread's characters pop in once when it scrolls into view and tuck away when it leaves, rather than scrubbing with the scrollbar.
- **Showcases:** scroll-triggered animations (Chrome 145): `timeline-trigger-*` and `animation-trigger`, contrasted with scroll-driven. Confirm exact property syntax against the Chrome post at build time.
- **Inspired by:** [Meet the monsters](https://codepen.io/bramus/pen/ZYWPRbr) by Bramus; [Chrome: scroll-triggered animations](https://developer.chrome.com/blog/scroll-triggered-animations); [A Scrollytelling Gift for Mum](https://css-tricks.com/a-scrollytelling-gift-for-mum-on-mothers-day-2026/) by Lee Meyer.
```css
.spread    { timeline-trigger-name: --spread; timeline-trigger-source: view(); }
.character { animation: pop 600ms var(--ease-out) both;
             animation-trigger: --spread play-forwards play-backwards; }
```

## 3. Day / Night hillside (no-JS toggle)
A small hill town; a toggle swings the sun under the horizon, the moon rises, windows light one by one, and the palette crossfades smoothly instead of snapping.
- **Showcases:** `:has()` driving state, `@property`-typed colours and angles so the whole scene *transitions*, `sibling-index()` stagger for windows, `light-dark()` for the UI chrome.
- **Inspired by:** [Looped Day/Night Blob Toggle](https://codepen.io/Margarita-the-solid/pen/myroOeo) by Margarita; [beach sunset](https://codepen.io/vii120/pen/vEgZPpR) by Vivi Tseng.
```css
@property --sun  { syntax: "<angle>"; inherits: true; initial-value: -20deg; }
@property --sky  { syntax: "<color>"; inherits: true; initial-value: #9ad0ff; }
.stage { transition: --sun 2.4s var(--ease-out), --sky 2.4s; }
.stage:has(#night:checked) { --sun: 200deg; --sky: #0b1030; }
.window { transition: background 400ms calc(sibling-index() * 120ms); }
```

## 4. Marionette (anchor-positioned strings)
A 3D puppet hanging from a wooden control bar; the bar sways and the strings stay attached to hands and feet.
- **Showcases:** CSS anchor positioning used for *drawing* (each string is an element anchored between a control-bar point and a limb), `transform-style: preserve-3d`, `transform-origin` chains.
- **Risk to prototype first:** anchors resolve from layout boxes, so strings may not follow limbs moved only by `transform`. If not, fall back to strings as children of each limb.
- **Inspired by:** [Puppet Strings – CSS](https://codepen.io/josetxu/pen/MYjzwgG) by Josetxu.
```css
.hand-l  { anchor-name: --hand-l; }
.bar-l   { anchor-name: --bar-l; }
.string-l { position: absolute; inline-size: 1px; background: currentColor;
            left: anchor(--bar-l center); top: anchor(--bar-l bottom); bottom: anchor(--hand-l top); }
```

## 5. Night circus marquee
A vintage circus front: chasing marquee bulbs, notched paper tickets fanning out, a striped tent breathing in the wind.
- **Showcases:** `corner-shape: scoop | notch` for ticket stubs and banners, `sibling-index()` / `sibling-count()` for the bulb chase and ticket fan angle, `shape()` for the tent scallops.
- **Inspired by:** [Vintage Circus Tickets](https://codepen.io/GemmaCroad/pen/myWmqRJ) by Gemma Croad; [Pure CSS LED Playboard](https://codepen.io/ivorjetski) by Ben Evans; [corner-shape demos](https://codepen.io/web-dot-dev/pen/OPNzoqW) from Chrome.
```css
.ticket { border-radius: 14px; corner-shape: scoop;
          rotate: calc((sibling-index() - (sibling-count() + 1) / 2) * 8deg); }
.bulb   { animation: chase 1.2s steps(1) infinite;
          animation-delay: calc(sibling-index() * -0.1s); }
```

## 6. Op-art cylinder
A checkerboard that rolls into a cylinder and back, a pure optical illusion scene. Pairs nicely with Aurora as a "hypnotic" set.
- **Showcases:** `@property`-animated `conic-gradient` / `repeating-conic-gradient` cell sizes, `perspective`, `mask-image` shading, `@function` (if available) to compute cell distortion.
- **Inspired by:** [Checkerboard Cylinder Illusion](https://codepen.io/jkantner) by Jon Kantner; [Color Name Wheel](https://codepen.io/meodai) by David Aerne.

## 7. Ramen counter, late night
A companion to Tokyo Subway: a bowl on a wooden counter, steam curling up, a noren curtain stirring, a paper lantern swaying. Same palette tokens, so the two read as a series.
- **Showcases:** `shape()` keyframe morphing for steam wisps (same command list, different points), `filter: blur()` + `mask-image` fade, `corner-shape: squircle` bowl rim, `linear()` easing for the curtain's sway.
- **Inspired by:** [Rise & Steam (sleepy dumplings)](https://codepen.io/GemmaCroad/pen/bNqWNWx) by Gemma Croad; [shape() generator](https://codepen.io/Miss-Fox) by Miss Fox.
```css
@keyframes wisp {
  from { clip-path: shape(from 50% 100%, curve to 40% 50% with 70% 75%, curve to 55% 0% with 20% 25%, line to 60% 0%, close); }
  to   { clip-path: shape(from 50% 100%, curve to 60% 50% with 30% 75%, curve to 45% 0% with 80% 25%, line to 50% 0%, close); }
}
```

## 8. Rain on a koi pond
Raindrops land and expand into rings that merge "gooily" where they overlap; koi drift underneath.
- **Showcases:** the blur + `contrast()` gooey trick on radial gradients, `@property` radius animation, `sibling-index()` randomish offsets, `offset-path` for koi swimming paths.
- **Inspired by:** [Pure CSS Ripple Effect](https://codepen.io/NikxDa) by Nik; [Realistic Interactive Pool Water](https://codepen.io/tmpl/pen/YPZQxeN) by Temple (shader-based, so this would be a CSS reinterpretation).

---

### Also noted, better as gallery chrome than as scenes
- Native scroll-spy (`scroll-target-group: auto`) and `::scroll-marker` carousels for the gallery index ([Chrome carousel gallery](https://chrome.dev/carousel/)).
- Cross-document view transitions between scene pages, so opening a scene morphs its thumbnail into the stage.
- Scroll-state queries to shrink the gallery header ([Chrome post](https://developer.chrome.com/blog/css-scroll-state-queries)).

### Roundups used
- [10 Cool CodePen Demos: April](https://dev.to/alvaromontoro/10-cool-codepen-demos-april-2026-4lm6), [May](https://dev.to/alvaromontoro/10-cool-codepen-demos-may-2026-42ni), [June](https://dev.to/alvaromontoro/10-cool-codepen-demos-june-2026-559), [September](https://dev.to/alvaromontoro/10-cool-codepen-demos-september-2026-3fnl) (Alvaro Montoro)
- [CSS Wrapped 2025](https://chrome.dev/css-wrapped-2025/), [What's new in web UI, I/O 2026](https://developer.chrome.com/blog/new-in-web-ui-io26)
- [CSS-Tricks: scroll-driven animation](https://css-tricks.com/tag/scroll-driven-animation/), [Codrops demos](https://tympanus.net/codrops/hub/)
