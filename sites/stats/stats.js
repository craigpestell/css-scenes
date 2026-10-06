/** Build-time half of the stats panel: per-scene data embedded as JSON, read by panel.js in the browser. */
import { brotliCompressSync } from 'node:zlib';

/**
 * How the panel checks a meta.json feature in the current browser, matched against the feature name in order.
 * A test is a CSS.supports() condition, or `window.<name>` for an API the condition syntax can't reach.
 * Features with no match show their Baseline note only.
 */
const TESTS = [
  [/sibling-(index|count)/, '(order: sibling-index())'],
  [/scroll-driven|animation-timeline/, '(animation-timeline: scroll())'],
  [/shape\(\)/, '(clip-path: shape(from 0 0, line to 1px 1px))'],
  [/@property/, 'window.CSSPropertyRule'],
  [/light-dark/, '(color: light-dark(#000, #fff))'],
  [/corner-shape/, '(corner-shape: bevel)'],
  [/linear\(\)/, '(transition-timing-function: linear(0, 1))'],
  [/mask-image/, '(mask-image: none) or (-webkit-mask-image: none)'],
  [/background-clip: text/, '(background-clip: text) or (-webkit-background-clip: text)'],
  [/motion path|offset-path/, '(offset-path: path("M0 0"))'],
  [/round\(\) and mod\(\)/, '(width: round(1px, 1px)) and (width: mod(1px, 1px))'],
  [/trigonometric|sin\(\)/, '(width: calc(sin(1rad) * 1px))'],
  [/clip-path/, '(clip-path: polygon(0 0, 1px 0, 0 1px))'],
  [/mix-blend-mode/, '(mix-blend-mode: multiply)'],
  [/individual transforms/, '(translate: 1px) and (rotate: 1deg)'],
  [/prefers-reduced-motion/, 'window.matchMedia'],
];

const br = (s) => brotliCompressSync(Buffer.from(s)).length;
const part = (s) => ({ raw: Buffer.byteLength(s), br: br(s) });

/**
 * @param {{ meta: object, markup: string, css: string, js: string | null, size: { br: number, budget: number } }} scene
 *   markup is the page minus its CSS and JS; size is the measured page the budget applies to.
 */
export function sceneStats({ meta, markup, css, js, size }) {
  return {
    title: meta.title,
    sizes: { html: part(markup), css: part(css), js: js ? part(js) : null, total: size.br, budget: size.budget },
    features: (meta.features ?? []).map((f) => ({
      name: f.name,
      baseline: f.baseline,
      test: TESTS.find(([re]) => re.test(f.name))?.[1] ?? null,
    })),
  };
}

/** Appended after the measured page, so neither the data nor the shared script counts toward the scene's budget. */
export const statsTags = (stats) =>
  `<script type="application/json" id="scene-stats">${JSON.stringify(stats).replaceAll('<', '\\u003c')}</script>
<script type="module" src="/stats.js"></script>`;
