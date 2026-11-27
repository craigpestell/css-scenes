/** Techniques: the CSS features the scenes are built on, each with its own page listing every scene that uses it and the
 * lines that do. Generated from the scenes: a scene uses a technique when one of its meta.json `features` names match the
 * technique's `match`, and the excerpts are the lines of its scene.css that match `css`, shown with their enclosing rule.
 * A technique no scene uses yet gets no page. Baseline status comes from the scenes' own notes (`features[].baseline`).
 *
 * To add one: give it a key (its URL), a name as written in CSS, a short plain summary, `match` for meta feature names,
 * `css` for the lines that use it, and optionally a CSS.supports() `test` for the live check on its page. */
import { esc, highlight } from '../source/highlight.js';

export const TECHNIQUES = [
  { key: 'sibling-index', name: 'sibling-index()', also: 'sibling-count()', group: 'Tree counting',
    match: /sibling-(index|count)/, css: /sibling-(index|count)\(\)/, test: '(order: sibling-index())',
    summary: 'sibling-index() is an element’s position among its siblings, counting from 1, and sibling-count() is how many there are. One rule can then stagger, spread or rotate a row of identical elements, with no :nth-child ladder and no index written on each element.',
    fallback: '/* An inline index for browsers without it */\n.rain i { --i: 1; } /* style="--i: n" */\n@supports (order: sibling-index()) {\n  .rain i { --i: sibling-index(); }\n}' },
  { key: 'property', name: '@property', group: 'Custom properties',
    match: /@property/, css: /@property/, test: 'window.CSSPropertyRule',
    summary: 'Registers a custom property with a type, an initial value and whether it inherits. A typed property can be animated: the browser interpolates an <angle>, <color> or <length> instead of flipping between two strings. It is also cheaper, because the value is stored as a value rather than re-read as text.' },
  { key: 'light-dark', name: 'light-dark()', group: 'Colour',
    match: /light-dark/, css: /light-dark\(/, test: '(color: light-dark(#000, #fff))',
    summary: 'Takes two colours and returns the first in a light colour scheme and the second in a dark one, following color-scheme. One declaration covers both themes, with no media query per colour.' },
  { key: 'shape', name: 'shape()', group: 'Shapes and paths',
    match: /shape\(\)/, css: /\bshape\(/, test: '(clip-path: shape(from 0 0, line to 1px 1px))',
    summary: 'A path for clip-path and offset-path written in CSS, with any units and calc(), instead of an SVG path string in pixels. A shape can scale with its element and animate between states.' },
  { key: 'motion-path', name: 'offset-path', also: 'offset-distance, offset-rotate', group: 'Shapes and paths',
    match: /motion path|offset-path/, css: /offset-(path|distance|rotate)/, test: '(offset-path: path("M0 0"))',
    summary: 'offset-path puts an element on a path, offset-distance moves it along, and offset-rotate turns it to face the way it travels. Animating offset-distance is all it takes to follow a curve.' },
  { key: 'mask-image', name: 'mask-image', group: 'Compositing',
    match: /mask-image/, css: /\bmask(-image)?\s*:/, test: '(mask-image: none) or (-webkit-mask-image: none)',
    summary: 'Uses an image or gradient as an alpha mask: the element shows where the mask is opaque and disappears where it is transparent. Gradients give soft edges, fades and cut-outs without extra elements.' },
  { key: 'trig', name: 'sin() cos() tan()', group: 'Maths',
    match: /trigonometric|sin\(\)|tan\(\)/, css: /\b(sin|cos|tan|atan2?)\(/, test: '(width: calc(sin(1rad) * 1px))',
    summary: 'Trigonometric functions work inside calc(), so points on a circle, waves and angles can be worked out in CSS from an index or an angle.' },
  { key: 'round-mod', name: 'round() mod()', also: 'rem()', group: 'Maths',
    match: /round\(\)|mod\(\)/, css: /\b(round|mod|rem)\(/, test: '(width: round(1px, 1px)) and (width: mod(1px, 1px))',
    summary: 'Stepped value functions. round() snaps a value to a multiple of a step (up, down, nearest or towards zero); mod() and rem() give the remainder. They turn a smooth number into grid cells, clock digits or repeating patterns.' },
  { key: 'pow-sqrt', name: 'pow() sqrt()', group: 'Maths',
    match: /sqrt|pow\(\)/, css: /\b(sqrt|pow|hypot|exp|log)\(/, test: '(width: calc(sqrt(4) * 1px))',
    summary: 'Exponential functions in calc(): pow(), sqrt(), hypot(), log() and exp(). CSS can then compute curves, distances and scales that grow faster or slower than a straight line.' },
  { key: 'corner-shape', name: 'corner-shape', group: 'Shapes and paths',
    match: /corner-shape/, css: /corner-shape/, test: '(corner-shape: bevel)',
    summary: 'Changes the curve of a rounded corner: round, scoop, bevel, notch, squircle or any superellipse. border-radius still sets the size; corner-shape sets the shape.' },
  { key: 'random', name: 'random()', group: 'Maths',
    match: /random\(\)/, css: /\brandom\(/, test: '(width: random(1px, 2px))',
    summary: 'Picks a random value in a range when styles are computed, so scatter and variation need no preprocessor and no script.' },
  { key: 'backdrop-filter', name: 'backdrop-filter', group: 'Compositing',
    match: /backdrop-filter/, css: /backdrop-filter/, test: '(backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))',
    summary: 'Applies filters such as blur or saturate() to whatever is behind an element, for frosted glass. Each filtered element re-renders the area behind it, so it costs more the more elements use it.' },
  { key: 'linear-easing', name: 'linear()', group: 'Motion',
    match: /linear\(\)/, css: /\blinear\(/, test: '(transition-timing-function: linear(0, 1))',
    summary: 'An easing function made of straight segments between points. With enough points it draws springs and bounces that cubic-bezier() can’t.' },
  { key: 'background-clip-text', name: 'background-clip: text', group: 'Typography',
    match: /background-clip: text/, css: /background-clip\s*:\s*text/, test: '(background-clip: text) or (-webkit-background-clip: text)',
    summary: 'Clips a background to the shape of the text in front of it, so gradients, images or animated fills show through the letters.' },
  { key: 'clip-path', name: 'clip-path', group: 'Shapes and paths',
    match: /clip-path/, css: /clip-path\s*:/, test: '(clip-path: polygon(0 0, 1px 0, 0 1px))',
    summary: 'Cuts an element to a shape: inset(), circle(), polygon(), path() or shape(). Shapes with the same number of points animate from one to the other.' },
  { key: '3d-transforms', name: 'perspective', also: 'preserve-3d, rotate: x', group: 'Motion',
    match: /3D transforms/, css: /perspective|preserve-3d|rotate\s*:\s*(x|y)\b|rotate[XY]\(/, test: '(transform-style: preserve-3d)',
    summary: 'perspective, transform-style: preserve-3d and rotation around the x and y axes place flat elements in one shared 3D space, drawn by the compositor.' },
  { key: 'individual-transforms', name: 'translate rotate scale', group: 'Motion',
    match: /individual transform/, css: /^\s*(translate|rotate|scale)\s*:/, test: '(translate: 1px) and (rotate: 1deg)',
    summary: 'translate, rotate and scale as properties of their own, so each one can be animated or transitioned without rewriting a whole transform list.' },
  { key: 'conic-gradient', name: 'conic-gradient()', group: 'Colour',
    match: /conic-gradient/, css: /conic-gradient\(/, test: '(background: conic-gradient(red, blue))',
    summary: 'A gradient whose colours sweep around a centre. Repeated, it draws rays, pie slices and checkerboards; in perspective, brick and tile.' },
  { key: 'container-units', name: 'cqw cqh', group: 'Layout',
    match: /container query units/, css: /\d(cq[whib]|cqmin|cqmax)\b/, test: '(width: 1cqw)',
    summary: 'Container query units are percentages of the nearest size container: 1cqw is 1% of its width. A scene can size everything from its own box rather than the window.' },
  { key: 'mix-blend-mode', name: 'mix-blend-mode', group: 'Compositing',
    match: /mix-blend-mode/, css: /mix-blend-mode/, test: '(mix-blend-mode: multiply)',
    summary: 'Blends an element’s colours with what is behind it (multiply, screen, overlay, difference and more), as layers do in an image editor.' },
  { key: 'has', name: ':has()', group: 'Selectors',
    match: /:has\(\)/, css: /:has\(/, test: 'selector(:has(a))',
    summary: 'Selects an element by what it contains or what comes after it, so a checked box can restyle a whole scene without JavaScript.' },
  { key: 'reduced-motion', name: 'prefers-reduced-motion', group: 'Accessibility',
    match: /prefers-reduced-motion/, css: /prefers-reduced-motion/, test: null,
    summary: 'A media query for visitors who ask their system for less motion. Every scene here keeps a complete still frame for them.' },
];

/** Baseline status from a scene's note, such as "newly available (2024-07-09); --i fallback". */
export function statusOf(note = '') {
  const s = note.toLowerCase();
  const level = s.startsWith('limited') ? 'limited' : s.startsWith('newly') || s.includes('newly available') ? 'newly' : 'widely';
  const since = note.match(/\((\d{4}-\d{2}(?:-\d{2})?)\)/)?.[1] ?? null;
  return { level, since, label: { widely: 'Widely available', newly: 'Newly available', limited: 'Limited availability' }[level] };
}

/** The techniques a scene uses, from its meta.json features, each with that scene's own Baseline note. */
export const techniquesOf = (meta) => TECHNIQUES.flatMap((t) => {
  const f = (meta.features ?? []).find((x) => t.match.test(x.name));
  return f ? [{ ...t, note: f.baseline }] : [];
});

/** Index every technique to the scenes that use it, most used first; techniques nobody uses are dropped. */
export function catalogue(scenes) {
  return TECHNIQUES.map((t) => {
    const uses = scenes.flatMap((s) => {
      const f = (s.meta.features ?? []).find((x) => t.match.test(x.name));
      return f ? [{ ...s, note: f.baseline }] : [];
    });
    // The status is the scenes' most cautious note: limited beats newly beats widely
    const rank = { limited: 0, newly: 1, widely: 2 };
    const status = uses.map((u) => statusOf(u.note)).sort((a, b) => rank[a.level] - rank[b.level] || (b.since ?? '').localeCompare(a.since ?? ''))[0];
    return { ...t, uses, status };
  }).filter((t) => t.uses.length).sort((a, b) => b.uses.length - a.uses.length);
}

/**
 * The lines of a stylesheet that use a technique, each shown inside its enclosing rule. A long rule keeps its first line
 * and a few lines around the match, with a gap between. Overlapping excerpts merge; at most `limit` are returned.
 * @returns {{ rows: ({ n: number, text: string, hit: boolean } | { gap: true })[] }[]} line numbers count from 1
 */
export function excerpts(css, re, limit = 2, max = 12) {
  const lines = css.split('\n');
  const indent = (l) => l.match(/^\s*/)[0].length;
  const comment = (l) => /^\s*(\/\*|\*)/.test(l);
  const hits = lines.flatMap((l, i) => (re.test(l.replace(/\/\*.*?\*\//g, '')) && !comment(l) ? [i] : []));
  const blocks = [];
  for (const i of hits) {
    const inside = blocks.find((r) => i >= r.a && i <= r.b);
    if (inside) { inside.hits.push(i); continue; }
    // Up to the selector or at-rule that opens the block holding this line (a line that opens its own block is one)
    let a = i;
    if (!/\{\s*(\/\*.*\*\/)?\s*$/.test(lines[i])) {
      for (let j = i - 1; j >= 0 && i - j <= 80; j--) {
        if (/\{\s*(\/\*.*\*\/)?\s*$/.test(lines[j]) && indent(lines[j]) < indent(lines[i])) { a = j; break; }
        if (/^\s*\}/.test(lines[j]) && indent(lines[j]) < indent(lines[i])) break;
      }
    }
    // Down to the brace that closes it
    let b = i, depth = 0;
    for (let j = a; j < lines.length && j - a <= 120; j++) {
      depth += (lines[j].match(/\{/g) ?? []).length - (lines[j].match(/\}/g) ?? []).length;
      b = j;
      if (j >= i && depth <= 0) break;
    }
    const prev = blocks.at(-1);
    if (prev && a <= prev.b + 1) { prev.b = Math.max(prev.b, b); prev.hits.push(i); }
    else blocks.push({ a, b, hits: [i] });
  }
  return blocks.slice(0, limit).map(({ a, b, hits: own }) => {
    // Keep the opening line, the closing line and a window around each match; anything else becomes a gap
    const keep = new Set([a, b]);
    if (b - a + 1 <= max) for (let j = a; j <= b; j++) keep.add(j);
    else for (const h of own) for (let j = Math.max(a, h - 2); j <= Math.min(b, h + 2); j++) keep.add(j);
    const shown = [...keep].sort((x, y) => x - y);
    const cut = Math.min(...shown.map((j) => lines[j]).filter((l) => l.trim()).map(indent));
    const rows = [];
    shown.forEach((j, k) => {
      if (k && j > shown[k - 1] + 1) rows.push({ gap: true });
      rows.push({ n: j + 1, text: lines[j].slice(cut), hit: hits.includes(j) });
    });
    // A long excerpt stops after the first lines, closing with a gap
    return { rows: rows.length > 16 ? [...rows.slice(0, 15), { gap: true }] : rows };
  });
}

/** An excerpt as highlighted, numbered lines; the lines that use the technique are marked. */
export const renderExcerpt = ({ rows }) => `<pre class="excerpt"><code>${rows.map((r) => (r.gap
  ? '<span class="ln gap" data-n="⋮"></span>'
  : `<span class="ln${r.hit ? ' hit' : ''}" data-n="${r.n}">${highlight.css(r.text) || ' '}</span>`)).join('')}</code></pre>`;

