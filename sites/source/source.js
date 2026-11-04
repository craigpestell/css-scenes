/** Render a scene's How it's made page: the write-up beside the code. The write-up (writeup.md, when the scene has one) gets
 * a section index; the code shows each authored file and the bundled CSS that ships, in tabs, with line numbers, a wrap
 * toggle and a copy button, plus an Open in CodePen button. Scenes without a write-up get the code alone.
 * The scene's Source button shows this page in a dialog at source.html#embed, which drops the page's own navigation. */
import { esc, highlight } from './highlight.js';
import { renderMarkdown } from './markdown.js';

/** CodePen's HTML panel is the body, so drop the document head and the build placeholders. */
const bodyOf = (html) => html
  .split('\n')
  .filter((l) => !/^\s*(<!doctype|<html|<meta|<title|<!--(css|js)-->)/i.test(l))
  .join('\n')
  .trim();

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

/**
 * @param {{ slug: string, meta: object, html: string, css: string, js: string | null, writeup: string | null,
 *           bundled: string, size: { br: number, budget: number }, pageCss: string, hint: string, head: string }} scene
 */
export function renderSource({ meta, html, css, js, writeup, bundled, size, pageCss, hint, head }) {
  const files = [
    { name: 'index.html', code: html, lang: 'html' },
    { name: 'scene.css', code: css, lang: 'css' },
    js && { name: 'scene.js', code: js, lang: 'js' },
    { name: 'bundled CSS', code: bundled, lang: 'css', note: 'What ships: tokens and lib snippets inlined, lowered for the browser targets (minified in the real page).' },
  ].filter(Boolean);

  const tabs = files.map((f, i) => `<label><input type="radio" name="file" value="${i}"${i ? '' : ' checked'}> ${esc(f.name)}</label>`).join('\n      ');
  const panels = files.map((f) => {
    const code = f.code.trimEnd();
    const numbers = code.split('\n').map((_, i) => i + 1).join('\n');
    return `<section class="panel" aria-label="${esc(f.name)}">
      ${f.note ? `<p class="note">${esc(f.note)}</p>` : ''}<div class="code" tabindex="0"><pre class="gutter" aria-hidden="true">${numbers}</pre><pre><code>${highlight[f.lang](code)}</code></pre></div>
    </section>`;
  }).join('\n    ');

  const story = writeup ? renderMarkdown(writeup) : null;
  // The index lists every section, and the techniques under Techniques
  let section = '';
  const toc = story?.toc.filter((t) => (t.level === 2 ? (section = t.id) : section === 'techniques'))
    .map((t) => `<li class="l${t.level}"><a href="#${t.id}">${t.text}</a></li>`).join('');

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
<title>${esc(meta.title)}: how it's made · CSS Scenes</title>
${head}
<script>
// Opened in the scene's source dialog (source.html#embed). The class survives the section links changing the hash, and
// Escape pressed in here never reaches the parent page, so close the dialog from here.
if (location.hash === '#embed') {
  document.documentElement.classList.add('embed');
  if (frameElement) addEventListener('keydown', (e) => e.key === 'Escape' && frameElement.closest('dialog')?.close());
}
</script>
<style>${pageCss}</style>
<header class="masthead">
  <nav><a class="wordmark" href="../../">CSS Scenes</a> <span aria-hidden="true">/</span> <a href="./">${esc(meta.title)}</a></nav>
  <h1>${esc(meta.title)} <span>${story ? 'how it’s made' : 'source'}</span></h1>
  <ul class="facts" role="list">
    <li>${esc(hint)}</li>
    <li class="${js ? 'js' : 'no-js'}">${js ? 'Uses JavaScript' : 'No JavaScript'}</li>
    <li>${kb(size.br)} of ${kb(size.budget)} budget (brotli)</li>
  </ul>
  <form action="https://codepen.io/pen/define" method="post" target="_blank">
    <input type="hidden" name="data" value="${esc(pen)}">
    <button>Open in CodePen</button>
  </form>
</header>
<div class="layout${story ? ' has-story' : ''}">
  ${story ? `<article class="story">
    <nav class="toc" aria-label="Sections"><ul role="list">${toc}</ul></nav>
    ${story.html}
  </article>` : ''}
  <main class="tabs">
    <div class="toolbar">
      <div class="tablist" role="radiogroup" aria-label="Source file">
      ${tabs}
      </div>
      <label class="wrap"><input type="checkbox" id="wrap"> Wrap lines</label>
      <button type="button" class="copy" hidden>Copy</button>
    </div>
    ${panels}
  </main>
</div>
<script>
// Copy the file in the open tab; without JavaScript the button stays hidden
const copy = document.querySelector('.copy');
copy.hidden = false;
copy.addEventListener('click', async () => {
  const i = [...document.querySelectorAll('[name=file]')].findIndex((r) => r.checked);
  const code = document.querySelectorAll('.panel pre:not(.gutter)')[i];
  try { await navigator.clipboard.writeText(code.textContent); copy.textContent = 'Copied'; }
  catch { getSelection().selectAllChildren(code); copy.textContent = 'Selected'; }
  setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
});
</script>
`;
}
