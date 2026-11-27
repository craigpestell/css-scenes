/** Render the techniques index (/techniques/) and one page per technique (/techniques/<key>/). Links are site-root
 * absolute, since these pages answer with and without a trailing slash. */
import { esc } from '../source/highlight.js';
import { excerpts, renderExcerpt, statusOf } from './techniques.js';
import { siteBar, renderTechTiles, num } from '../index/home.js';
import { MODES, modeOf } from '../index/cards.js';

const page = ({ head, css, body, title }) => `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>${esc(title)}</title>
${head}
<style>${css}</style>
${body}
<footer class="footnote"><span>CSS Scenes. Baseline status is from each scene’s notes; the live check asks your browser.</span><span><a href="/">Scenes</a> · <a href="/techniques/">Techniques</a></span></footer>
`;

/** "sibling-index()" → "sibling-index" with its brackets in the accent colour */
const title = (name) => esc(name).replace(/\(\)/g, '<span>()</span>');

/** A live "does your browser support it" line, filled in by a one-line script; hidden without one. */
const liveCheck = (test) => (test ? `<p class="live-check" data-test="${esc(test)}" hidden></p>` : '');
const LIVE = `<script type="module">for(const p of document.querySelectorAll('[data-test]')){const t=p.dataset.test;let ok;try{ok=t.startsWith('window.')?t.slice(7) in window:CSS.supports(t)}catch{ok=false}p.textContent=ok?'Your browser supports it':'Your browser doesn’t support it yet: you’ll see each scene’s fallback';p.className+=ok?' yes':' no';p.hidden=false}</script>`;

export function renderTechniquesIndex({ catalogue, head, css }) {
  const counts = { widely: 0, newly: 0, limited: 0 };
  for (const t of catalogue) counts[t.status.level]++;
  const chip = (v, label, n, on) => `<label><input type="radio" name="status" value="${v}"${on ? ' checked' : ''}>${label}<small>${n}</small></label>`;
  return page({
    title: 'Techniques · CSS Scenes',
    head,
    css,
    body: `${siteBar({ root: '/', here: 'techniques' })}
<main class="techniques-index">
  <header class="intro-block">
    <p class="label kicker">Techniques</p>
    <h1 class="display">${catalogue.length} CSS features,<br><em>at work in real scenes.</em></h1>
    <p class="lede">Every feature the gallery is built on. Each page says what the feature does, how widely it is supported, and shows the exact lines of every scene that uses it, with the fallback that scene ships.</p>
  </header>
  <div class="bar">
    <fieldset class="seg" aria-label="Show techniques"><legend class="sr">Show techniques</legend>${chip('all', 'All', catalogue.length, true)}${chip('widely', 'Widely available', counts.widely)}${chip('newly', 'Newly available', counts.newly)}${chip('limited', 'Limited', counts.limited)}</fieldset>
    <p class="legend"><span class="status widely">Works in every major browser for 2½ years</span> <span class="status newly">Works in every major browser</span> <span class="status limited">Not in every browser yet</span></p>
  </div>
  <ul class="atlas" role="list">
    ${renderTechTiles(catalogue, '/')}
  </ul>
</main>`.replace(/<li><a class="tech-tile" href="\/techniques\/([\w-]+)\/">/g, (m, key) =>
      `<li data-status="${catalogue.find((t) => t.key === key).status.level}"><a class="tech-tile" href="/techniques/${key}/">`),
  });
}

/**
 * @param {{ t: object, catalogue: object[], sources: Map<string, { file: string, css: string }[]>, head: string, css: string }} p
 *   sources maps each scene to the stylesheets to quote: its scene.css, then any lib snippets it imports.
 */
export function renderTechnique({ t, catalogue, sources, scenes, head, css }) {
  const uses = t.uses.map((u) => {
    const i = scenes.findIndex((s) => s.slug === u.slug);
    const mode = modeOf(u.meta);
    const [, fallback] = u.note.split(/;\s*/, 2);
    const quoted = (sources.get(u.slug) ?? []).flatMap(({ file, css: text }) => excerpts(text, t.css).map((x) => ({ file, ...x })));
    const lines = quoted.length ? quoted.map((x) => `<figure class="quote"><figcaption><code>${esc(x.file)}</code> · line ${x.rows.find((r) => r.n)?.n}</figcaption>${renderExcerpt(x)}</figure>`).join('')
      : '<p class="none">This scene gets it from the shared tokens or its markup, not from its own stylesheet.</p>';
    return `<article class="use">
    <a class="poster" href="/scenes/${esc(u.slug)}/" style="view-transition-name: scene-${esc(u.slug)}" aria-label="Open ${esc(u.meta.title)}"><img src="/posters/${esc(u.slug)}.jpg" alt="" width="960" height="600" loading="lazy"></a>
    <div class="body">
      <header>
        <h2><span class="n">${num(i)}</span> <a href="/scenes/${esc(u.slug)}/">${esc(u.meta.title)}</a></h2>
        <p class="links"><a href="/scenes/${esc(u.slug)}/">Open scene <span aria-hidden="true">→</span></a> <a href="/scenes/${esc(u.slug)}/source">How it’s made</a></p>
      </header>
      <p class="facts"><span class="label">${esc(MODES[mode].short)}</span> <span class="status ${statusOf(u.note).level}">${esc(statusOf(u.note).label)}</span>${fallback ? ` <span class="fallback">Fallback: ${esc(fallback)}</span>` : ''}</p>
      ${lines}
    </div>
  </article>`;
  }).join('\n  ');

  // Other techniques these scenes lean on, by how many of the same scenes use them
  const slugs = new Set(t.uses.map((u) => u.slug));
  const related = catalogue.filter((o) => o.key !== t.key)
    .map((o) => ({ ...o, shared: o.uses.filter((u) => slugs.has(u.slug)).length }))
    .filter((o) => o.shared).sort((a, b) => b.shared - a.shared).slice(0, 4);

  const since = t.status.since ? ` · since ${new Date(`${t.status.since}${t.status.since.length === 7 ? '-01' : ''}T12:00:00Z`).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', ...(t.status.since.length > 7 && { day: 'numeric' }) })}` : '';
  return page({
    title: `${t.name} · Techniques · CSS Scenes`,
    head,
    css,
    body: `${siteBar({ root: '/', here: 'techniques' })}
<main class="technique">
  <header class="intro-block">
    <div>
      <p class="label kicker"><a href="/techniques/">Techniques</a> / ${esc(t.group)}</p>
      <h1 style="--len: ${Math.max(8, ...t.name.split(' ').map((w) => w.length))}">${title(t.name)}</h1>
      ${t.also ? `<p class="also">with <code>${esc(t.also)}</code></p>` : ''}
      <p class="lede">${esc(t.summary)}</p>
    </div>
    <aside class="support" aria-label="Browser support">
      <p class="status ${t.status.level}">${esc(t.status.label)}${esc(since)}</p>
      ${liveCheck(t.test)}
      ${t.fallback ? `<pre class="excerpt fallback" tabindex="0"><code>${t.fallback.split('\n').map((l) => `<span class="ln">${esc(l) || ' '}</span>`).join('')}</code></pre>` : ''}
    </aside>
  </header>
  <h2 class="used">Used in ${t.uses.length} scene${t.uses.length === 1 ? '' : 's'}</h2>
  ${uses}
  ${related.length ? `<section class="related" aria-labelledby="related-title">
    <h2 id="related-title">Often alongside</h2>
    <ul class="atlas" role="list">
    ${renderTechTiles(related, '/')}
    </ul>
  </section>` : ''}
</main>
${t.test ? LIVE : ''}`,
  });
}
