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
        <iframe src="scenes/${esc(slug)}/#preview" title="${esc(meta.title)} preview" loading="lazy" scrolling="no" tabindex="-1" aria-hidden="true"></iframe>
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

/** Chrome added to every scene page, generated from the scene list: a header with breadcrumbs, previous/next scene
 * links (wrapping at the ends) and a source link, plus the view transition back to the scene's card. The header dims
 * after a few seconds on hover devices and wakes on hover or focus. Card previews load the scene at #preview, which
 * hides it. */
export const sceneChrome = ({ slug, title, prev, next }) => `<style>
@media (prefers-reduced-motion:no-preference){@view-transition{navigation:auto}}
.stage{view-transition-name:scene-${esc(slug)}}
.scene-nav{position:fixed;inset:max(.75rem,env(safe-area-inset-top)) max(.75rem,env(safe-area-inset-right)) auto auto;z-index:9;display:flex;align-items:center;gap:.25rem;padding:.25rem;border-radius:99rem;background:light-dark(#fffc,#0009);color:light-dark(#14121f,#f4f1ff);box-shadow:0 0 0 1px light-dark(#14121f1f,#fff2);backdrop-filter:blur(8px);font:600 .8rem/1 system-ui,sans-serif;white-space:nowrap;view-transition-name:scene-nav}
.scene-nav :is(ol,nav){display:flex;align-items:center;margin:0;padding:0;list-style:none}
.scene-nav li+li::before{content:"/"/"";margin-inline-start:-.3rem;opacity:.5}
.scene-nav a,.scene-nav [aria-current]{display:inline-block;padding:.45rem .6rem;border-radius:99rem;color:inherit;text-decoration:none}
.scene-nav [aria-current]{padding-inline-start:.3rem}
.scene-nav a:hover{background:light-dark(#14121f14,#fff2)}
.scene-nav a:focus-visible{outline:2px solid currentColor;outline-offset:-2px}
.scene-nav [rel]{min-inline-size:1.9rem;text-align:center}
.scene-nav nav:last-child{border-inline-start:1px solid light-dark(#14121f26,#fff3);padding-inline-start:.25rem}
/* Narrow screens keep the current crumb for screen readers only, so the header clears scene HUDs */
@media (width<34rem){.scene-nav :is(.home,li+li){position:absolute;clip-path:inset(50%);inline-size:1px;overflow:hidden;white-space:nowrap}}
@media (hover:hover){.scene-nav{animation:scene-nav-idle .6s 3s both}.scene-nav:is(:hover,:focus-within){animation:none}}
@media (prefers-reduced-motion:reduce){.scene-nav{animation-duration:0s}}
@keyframes scene-nav-idle{to{opacity:.35}}
:root:has(#preview:target) .scene-nav{display:none}
</style>
<header class="scene-nav">
<nav aria-label="Breadcrumb"><ol role="list"><li><a href="../../"><span class="home">CSS </span>Scenes</a></li><li><span aria-current="page">${esc(title)}</span></li></ol></nav>
<nav aria-label="Scenes"><a href="../${esc(prev.slug)}/" rel="prev" title="Previous: ${esc(prev.title)}" aria-label="Previous scene: ${esc(prev.title)}">←</a><a href="source.html">Source</a><a href="../${esc(next.slug)}/" rel="next" title="Next: ${esc(next.title)}" aria-label="Next scene: ${esc(next.title)}">→</a></nav>
</header>
<b id="preview" hidden></b>`;
