/** Render a scene's source page: its authored files in tabs, the bundled CSS that ships, and an Open in CodePen button. */
import { esc, highlight } from './highlight.js';

/** CodePen's HTML panel is the body, so drop the document head and the build placeholders. */
const bodyOf = (html) => html
  .split('\n')
  .filter((l) => !/^\s*(<!doctype|<html|<meta|<title|<!--(css|js)-->)/i.test(l))
  .join('\n')
  .trim();

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

/**
 * @param {{ slug: string, meta: object, html: string, css: string, js: string | null,
 *           bundled: string, size: { br: number, budget: number }, pageCss: string }} scene
 */
export function renderSource({ slug, meta, html, css, js, bundled, size, pageCss }) {
  const files = [
    { name: 'index.html', code: html, lang: 'html' },
    { name: 'scene.css', code: css, lang: 'css' },
    js && { name: 'scene.js', code: js, lang: 'js' },
    { name: 'bundled CSS', code: bundled, lang: 'css', note: 'What ships: tokens and lib snippets inlined, lowered for the browser targets (minified in the real page).' },
  ].filter(Boolean);

  const tabs = files.map((f, i) => `<label><input type="radio" name="file" value="${i}"${i ? '' : ' checked'}> ${esc(f.name)}</label>`).join('\n    ');
  const panels = files.map((f) => `<section class="panel" aria-label="${esc(f.name)}">
    ${f.note ? `<p class="note">${esc(f.note)}</p>` : ''}<pre tabindex="0"><code>${highlight[f.lang](f.code.trimEnd())}</code></pre>
  </section>`).join('\n  ');

  const pen = JSON.stringify({
    title: `${meta.title} (CSS Scenes)`,
    html: bodyOf(html),
    css: bundled,
    js: js ?? '',
    editors: js ? '111' : '110',
  });

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(meta.title)} source · CSS Scenes</title>
<style>${pageCss}</style>
<header class="masthead">
  <nav><a href="../../">All scenes</a> / <a href="./">${esc(meta.title)}</a></nav>
  <h1>${esc(meta.title)} <span>source</span></h1>
  <ul class="facts" role="list">
    <li class="${js ? 'js' : 'no-js'}">${js ? 'Uses JavaScript' : 'No JavaScript'}</li>
    <li>${kb(size.br)} of ${kb(size.budget)} budget (brotli)</li>
  </ul>
  <form action="https://codepen.io/pen/define" method="post" target="_blank">
    <input type="hidden" name="data" value="${esc(pen)}">
    <button>Open in CodePen</button>
  </form>
</header>
<main class="tabs">
  <div class="tablist" role="radiogroup" aria-label="Source file">
    ${tabs}
  </div>
  ${panels}
</main>
`;
}
