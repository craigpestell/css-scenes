/** Render the index page's scene cards from each scene's meta.json and index.html. */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The stage's aria-label doubles as the card description. */
export const describe = (html) => html.match(/<main class="stage"[^>]*aria-label="([^"]*)"/)?.[1] ?? '';

/** Credit links are written relative to the scene folder; re-root them for the index. */
function href(url, slug) {
  if (/^[a-z]+:/i.test(url)) return url;
  return new URL(url, `http://x/scenes/${slug}/`).pathname.slice(1);
}

export function renderCard({ slug, meta, description, hasJs }) {
  const tags = (meta.tags ?? []).map((t) => `<li>${esc(t)}</li>`).join('');
  const techniques = (meta.techniques ?? []).map((t) => `<li>${esc(t)}</li>`).join('');
  const features = (meta.features ?? [])
    .map((f) => `<li><span>${esc(f.name)}</span> <small>${esc(f.baseline)}</small></li>`).join('');
  const credits = (meta.inspiration ?? [])
    .map((c) => `<a href="${esc(href(c.url, slug))}">${esc(c.title)}</a> by ${esc(c.author)}`).join(', ');

  return `    <li class="card">
      <div class="preview" style="view-transition-name: scene-${esc(slug)}" inert>
        <iframe src="scenes/${esc(slug)}/" title="${esc(meta.title)} preview" loading="lazy" scrolling="no" tabindex="-1" aria-hidden="true"></iframe>
      </div>
      <h2><a href="scenes/${esc(slug)}/">${esc(meta.title)}</a></h2>
      ${description ? `<p class="desc">${esc(description)}</p>` : ''}
      ${tags ? `<ul class="tags" role="list">${tags}</ul>` : ''}
      ${techniques || features ? `<details>
        <summary>How it's made</summary>
        ${techniques ? `<h3>Techniques</h3><ul>${techniques}</ul>` : ''}
        ${features ? `<h3>Features</h3><ul class="features">${features}</ul>` : ''}
      </details>` : ''}
      <p class="source"><a href="scenes/${esc(slug)}/source.html">View source</a>${hasJs ? ' · uses JavaScript' : ''}</p>
      ${credits ? `<p class="credits">Inspired by ${credits}</p>` : ''}
    </li>`;
}

/** Tiny chrome added to every scene page: view transition back to its card, a focus-only link home, and a source link
 * that shows on hover or focus (card previews never get hover, since their iframes ignore the pointer). */
export const sceneChrome = (slug) => `<style>
@media (prefers-reduced-motion:no-preference){@view-transition{navigation:auto}}
.stage{view-transition-name:scene-${slug}}
.to-index{position:fixed;inset:1rem auto auto 1rem;z-index:1;padding:.5rem .9rem;border-radius:99rem;background:#000c;color:#fff;font:600 .9rem/1.2 system-ui,sans-serif;text-decoration:none;translate:0 -200%}
.to-index:focus-visible{translate:none;outline:2px solid #fff;outline-offset:2px}
.to-source{position:fixed;inset:auto 1rem 1rem auto;z-index:1;padding:.4rem .8rem;border-radius:99rem;background:#000a;color:#fff;font:600 .8rem/1.2 system-ui,sans-serif;text-decoration:none;opacity:0;transition:opacity .2s}
:root:hover .to-source,.to-source:focus-visible{opacity:1}
.to-source:focus-visible{outline:2px solid #fff;outline-offset:2px}
</style>
<a class="to-index" href="../../">← All scenes</a>
<a class="to-source" href="source.html">View source</a>`;
