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
 * hides it.
 *
 * The source link toggles source.html in a <dialog> below the header. It's non-modal so the header stays usable: the
 * dialog dims the scene with a spread shadow, and Escape or a click outside the dialog and header closes it. Previous/next
 * carry it to the next scene (#source opens it on load). The iframe gets its src on first hover, focus or open, so
 * the source page costs nothing until it's wanted; modified clicks and no-JS visitors get the page. */
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
.scene-source{position:fixed;z-index:8;inset:calc(max(.75rem,env(safe-area-inset-top)) + 3rem) 0 auto;inline-size:min(76rem,100% - 2rem);block-size:min(52rem,100dvh - max(.75rem,env(safe-area-inset-top)) - 4rem);max-inline-size:none;max-block-size:none;margin:0 auto;padding:0;border:0;border-radius:1rem;background:var(--c-paper,Canvas);color:var(--c-ink,CanvasText);box-shadow:0 1.5rem 4rem #0008,0 0 0 100vmax #0007;overflow:hidden;font:600 .8rem/1 system-ui,sans-serif}
.scene-source[open]{display:flex;flex-direction:column}
.scene-source form{display:flex;justify-content:end;gap:.25rem;padding:.4rem;border-block-end:1px solid light-dark(#14121f1f,#fff2)}
.scene-source :is(a,button){padding:.45rem .7rem;border:0;border-radius:99rem;background:none;color:inherit;font:inherit;text-decoration:none;cursor:pointer}
.scene-source :is(a,button):hover{background:light-dark(#14121f14,#fff2)}
.scene-source :is(a,button):focus-visible{outline:2px solid currentColor;outline-offset:-2px}
.scene-source iframe{flex:1;inline-size:100%;border:0}
@media (prefers-reduced-motion:no-preference){.scene-source[open]{animation:scene-source-in .2s ease-out}}
@keyframes scene-source-in{from{opacity:0;translate:0 .5rem}}
/* While the source is open the header stays awake above it, and Source shows as pressed */
:root:has(.scene-source[open]) .scene-nav{animation:none}
:root:has(.scene-source[open]) .scene-nav [href="source.html"]{background:light-dark(#14121f1f,#fff3)}
:root:has(.scene-source[open]){overflow:hidden}
</style>
<header class="scene-nav">
<nav aria-label="Breadcrumb"><ol role="list"><li><a href="../../"><span class="home">CSS </span>Scenes</a></li><li><span aria-current="page">${esc(title)}</span></li></ol></nav>
<nav aria-label="Scenes"><a href="../${esc(prev.slug)}/" rel="prev" title="Previous: ${esc(prev.title)}" aria-label="Previous scene: ${esc(prev.title)}">←</a><a href="source.html">Source</a><a href="../${esc(next.slug)}/" rel="next" title="Next: ${esc(next.title)}" aria-label="Next scene: ${esc(next.title)}">→</a></nav>
</header>
<dialog class="scene-source" id="scene-source" aria-label="${esc(title)} source" closedby="closerequest">
<form method="dialog"><a href="source.html">Open as page</a><button autofocus>Close</button></form>
<iframe title="${esc(title)} source"></iframe>
</dialog>
<script type="module">
const d=document.getElementById('scene-source'),f=d.querySelector('iframe'),n=document.querySelector('.scene-nav'),a=n.querySelector('[href="source.html"]');
const load=()=>{f.src||=a.href+'#embed'},open=()=>{load();d.show();a.setAttribute('aria-expanded',true)};
a.setAttribute('aria-expanded',false);a.setAttribute('aria-controls',d.id);
a.addEventListener('pointerenter',load);a.addEventListener('focus',load);
a.addEventListener('click',e=>{if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();d.open?d.close():open()});
// Escape closes it (closedby); so does a click outside it and the header
addEventListener('pointerdown',(e)=>{if(d.open&&!e.composedPath().some((el)=>el===d||el===n))d.close()});
d.addEventListener('close',()=>a.setAttribute('aria-expanded',false));
// Previous/next keep the source open on the next scene
n.querySelectorAll('[rel]').forEach((l)=>l.addEventListener('click',()=>{if(d.open)l.hash='source'}));
if(location.hash==='#source')open();
</script>
<b id="preview" hidden></b>`;
