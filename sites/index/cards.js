/** Render the index page's scene cards from each scene's meta.json and index.html. */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The stage's aria-label doubles as the card description. */
export const describe = (html) => html.match(/<main class="stage"[^>]*aria-label="([^"]*)"/)?.[1] ?? '';

/** Credit links are written relative to the scene folder; re-root them for the index. */
function href(url, slug) {
  if (/^[a-z]+:/i.test(url)) return url;
  return new URL(url, `http://x/scenes/${slug}/`).pathname.slice(1);
}

/** How a visitor drives the scene; the gallery filters on it. */
export function modeOf(meta) {
  const tags = meta.tags ?? [];
  if (tags.includes('story')) return 'story';
  if (tags.some((t) => t === 'interactive' || t === 'state-toggle')) return 'interactive';
  return 'loop';
}

export const MODES = {
  story: { label: 'Stories', hint: 'Plays through' },
  interactive: { label: 'Interactive', hint: 'Interactive' },
  loop: { label: 'Ambient loops', hint: 'Loops' },
};

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const techTags = (meta) => (meta.tags ?? []).filter((t) => t !== 'no-js');

/** The featured scene opens the gallery, live and interactive, in a large frame. */
export function renderHero({ slug, meta, description, size }) {
  return `<figure class="hero-scene">
    <div class="mat"><iframe src="scenes/${esc(slug)}/#preview" title="${esc(meta.title)}, live" loading="eager" scrolling="no"></iframe></div>
    <figcaption>
      <span class="plate"><b>Now showing</b> ${esc(meta.title)}</span>
      <span class="plate-meta">${esc(kb(size.br))} brotli · ${esc(MODES[modeOf(meta)].hint)}</span>
      <a class="enter" href="scenes/${esc(slug)}/">Enter scene <span aria-hidden="true">→</span></a>
    </figcaption>
    <p class="sr">${esc(description)}</p>
  </figure>`;
}

export function renderCard({ slug, meta, description, hasJs, size }) {
  const mode = modeOf(meta);
  const tags = techTags(meta).slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join('');
  const techniques = (meta.techniques ?? []).map((t) => `<li>${esc(t)}</li>`).join('');
  const features = (meta.features ?? [])
    .map((f) => `<li><span>${esc(f.name)}</span> <small>${esc(f.baseline)}</small></li>`).join('');
  const credits = (meta.inspiration ?? [])
    .map((c) => `<a href="${esc(href(c.url, slug))}">${esc(c.title)}</a> by ${esc(c.author)}`).join(', ');

  return `    <li class="card" data-mode="${mode}">
      <div class="preview" style="view-transition-name: scene-${esc(slug)}" inert>
        <iframe src="scenes/${esc(slug)}/#card" title="${esc(meta.title)} preview" loading="lazy" scrolling="no" tabindex="-1" aria-hidden="true"></iframe>
      </div>
      <div class="body">
        <p class="kicker"><span>${esc(MODES[mode].hint)}</span> <span>${esc(kb(size.br))}${hasJs ? ' · uses JS' : ''}</span></p>
        <h2><a href="scenes/${esc(slug)}/">${esc(meta.title)}</a></h2>
        ${description ? `<p class="desc">${esc(description)}</p>` : ''}
        ${tags ? `<ul class="tags" role="list">${tags}</ul>` : ''}
        ${credits ? `<p class="credits">Inspired by ${credits}</p>` : ''}
      </div>
      <div class="foot">
        ${techniques || features ? `<details>
          <summary>How it's made</summary>
          ${techniques ? `<h3>Techniques</h3><ul>${techniques}</ul>` : ''}
          ${features ? `<h3>Features</h3><ul class="features">${features}</ul>` : ''}
        </details>` : ''}
        <a class="source" href="scenes/${esc(slug)}/source.html">Source<span class="sr"> for ${esc(meta.title)}</span></a>
      </div>
    </li>`;
}

/** The 404 page's way back: every scene as a link, with how to play it. Root-absolute, since a 404 answers any path. */
export const renderLost = (scenes) => scenes.map(({ slug, meta }) =>
  `<li><a href="/scenes/${esc(slug)}/">${esc(meta.title)}</a> <small>${esc(MODES[modeOf(meta)].hint)}</small></li>`).join('\n      ');

/** Filter chips for the gallery: radios, so :has() filters the grid without JavaScript. */
export function renderFilters(modes) {
  const counts = Object.fromEntries(Object.keys(MODES).map((m) => [m, modes.filter((x) => x === m).length]));
  const chip = (value, label, n, checked = false) =>
    `<label><input type="radio" name="mode" value="${value}"${checked ? ' checked' : ''}> ${esc(label)} <small>${n}</small></label>`;
  return [chip('all', 'All scenes', modes.length, true),
    ...Object.entries(MODES).filter(([m]) => counts[m]).map(([m, { label }]) => chip(m, label, counts[m]))].join('\n      ');
}

/** Chrome added to every scene page, generated from the scene list: one dock at the top right holding the way home,
 * previous/next scene links (wrapping at the ends) around the title and how to play the scene, and the scene's tools.
 * Without JavaScript the tools are just Source; the shared panel script (dist/stats.js) adds About, Controls and Stats,
 * which open one tabbed sheet below the dock. ← and → move between scenes. The dock dims after a few seconds on hover
 * devices and wakes on hover or focus. The gallery hero loads the scene at #preview and its cards at #card, which both
 * hide the dock; cards also hide the scene's own controls (labels and control groups), since a card can't be clicked into.
 *
 * Source toggles source.html in a <dialog> below the dock. It's non-modal so the dock stays usable: the dialog dims the
 * scene with a spread shadow, and Escape or a click outside the dialog and dock closes it. Previous/next carry it to the
 * next scene (#source opens it on load). The iframe gets its src on first hover, focus or open, so the source page costs
 * nothing until it's wanted; modified clicks and no-JS visitors get the page. The dialog and the sheet close each other. */
export const sceneChrome = ({ slug, title, prev, next, mode }) => `<style>
@media (prefers-reduced-motion:no-preference){@view-transition{navigation:auto}}
.stage{view-transition-name:scene-${esc(slug)}}
.scene-dock{--dock-line:light-dark(#14121f26,#fff3);position:fixed;inset:max(.75rem,env(safe-area-inset-top)) max(.75rem,env(safe-area-inset-right)) auto auto;z-index:9;display:flex;align-items:center;gap:.15rem;padding:.25rem;border-radius:99rem;background:light-dark(#fffd,#0b0a14cc);color:light-dark(#14121f,#f4f1ff);box-shadow:0 0 0 1px light-dark(#14121f1f,#fff2),0 .5rem 1.5rem #0003;backdrop-filter:blur(10px);font:600 .8rem/1 system-ui,sans-serif;white-space:nowrap;view-transition-name:scene-nav}
.scene-dock nav{display:flex;align-items:center;gap:.15rem}
.scene-dock nav+nav{border-inline-start:1px solid var(--dock-line);padding-inline-start:.25rem;margin-inline-start:.1rem}
.scene-dock :is(a,button){display:inline-flex;align-items:center;gap:.4em;padding:.5rem .65rem;border:0;border-radius:99rem;background:none;color:inherit;font:inherit;text-decoration:none;cursor:pointer}
.scene-dock :is(a,button):hover{background:light-dark(#14121f14,#fff2)}
.scene-dock :is(a,button):focus-visible{outline:2px solid currentColor;outline-offset:-2px}
.scene-dock :is([aria-expanded=true],[aria-pressed=true]){background:light-dark(#14121f,#f4f1ff);color:light-dark(#f4f1ff,#14121f)}
.scene-dock .home::before{content:"";inline-size:.7em;aspect-ratio:1;border-radius:50%;background:conic-gradient(from 210deg,#9d85ff,#ff7ac6,#ffc27a,#9d85ff)}
.scene-dock [rel]{min-inline-size:2rem;justify-content:center}
.scene-dock .now{display:grid;gap:.2rem;padding-inline:.35rem;line-height:1.1}
.scene-dock .fps{font-variant-numeric:tabular-nums}.scene-dock .fps output{min-inline-size:1.3em;text-align:end}.scene-dock .unit{margin-inline-start:-.15em;opacity:.65}.scene-dock .fps-dot{inline-size:.5em;aspect-ratio:1;border-radius:50%;background:var(--state,#5fd38d)}
.scene-dock .now small{font:500 .68rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.65}
/* Narrow screens keep the home dot, the arrows, Source and Controls, so the dock clears scene HUDs; the title stays for
   screen readers, and About and Stats stay one tap away as tabs in the sheet */
@media (width<40rem){.scene-dock :is(.home span,.now){position:absolute;clip-path:inset(50%);inline-size:1px;overflow:hidden}.scene-dock :is([data-tab=about],.fps){display:none}.scene-dock :is(a,button){padding:.5rem .5rem}}
@media (hover:hover){.scene-dock{animation:scene-dock-idle .6s 3s both}.scene-dock:is(:hover,:focus-within){animation:none}}
@media (prefers-reduced-motion:reduce){.scene-dock{animation-duration:0s}}
@keyframes scene-dock-idle{to{opacity:.35}}
:root:has(:is(#preview,#card):target) .scene-dock{display:none}
:root:has(#card:target) .stage :is(label,[role=group]:has(label)){visibility:hidden}
.scene-source{position:fixed;z-index:8;inset:calc(max(.75rem,env(safe-area-inset-top)) + 3.4rem) 0 auto;inline-size:min(82rem,100% - 1.5rem);block-size:min(52rem,100dvh - max(.75rem,env(safe-area-inset-top)) - 4.4rem);max-inline-size:none;max-block-size:none;margin:0 auto;padding:0;border:0;border-radius:1.25rem;background:var(--c-paper,Canvas);color:var(--c-ink,CanvasText);box-shadow:0 1.5rem 4rem #0008,0 0 0 1px light-dark(#14121f1f,#fff2),0 0 0 100vmax #0007;overflow:hidden;font:600 .8rem/1 system-ui,sans-serif}
.scene-source[open]{display:flex;flex-direction:column}
.scene-source form{display:flex;justify-content:end;gap:.25rem;padding:.4rem;border-block-end:1px solid light-dark(#14121f1f,#fff2)}
.scene-source :is(a,button){padding:.45rem .7rem;border:0;border-radius:99rem;background:none;color:inherit;font:inherit;text-decoration:none;cursor:pointer}
.scene-source :is(a,button):hover{background:light-dark(#14121f14,#fff2)}
.scene-source :is(a,button):focus-visible{outline:2px solid currentColor;outline-offset:-2px}
.scene-source iframe{flex:1;inline-size:100%;border:0}
@media (prefers-reduced-motion:no-preference){.scene-source[open]{animation:scene-source-in .2s ease-out}}
@keyframes scene-source-in{from{opacity:0;translate:0 .5rem}}
/* While the source is open the dock stays awake above it */
:root:has(.scene-source[open]) .scene-dock,.scene-dock.awake{animation:none}
:root:has(.scene-source[open]){overflow:hidden}
</style>
<header class="scene-dock">
<nav aria-label="Site"><a class="home" href="../../" aria-label="All scenes"><span>CSS Scenes</span></a></nav>
<nav aria-label="Scenes"><a href="../${esc(prev.slug)}/" rel="prev" title="Previous: ${esc(prev.title)} (←)" aria-label="Previous scene: ${esc(prev.title)}">←</a><span class="now"><span aria-current="page">${esc(title)}</span><small>${esc(MODES[mode].hint)}</small></span><a href="../${esc(next.slug)}/" rel="next" title="Next: ${esc(next.title)} (→)" aria-label="Next scene: ${esc(next.title)}">→</a></nav>
<nav aria-label="Scene tools" class="tools"><a href="source.html">Source</a></nav>
</header>
<dialog class="scene-source" id="scene-source" aria-label="${esc(title)} source" closedby="closerequest">
<form method="dialog"><a href="source.html">Open as page</a><button autofocus>Close</button></form>
<iframe title="${esc(title)} source"></iframe>
</dialog>
<script type="module">
const d=document.getElementById('scene-source'),f=d.querySelector('iframe'),n=document.querySelector('.scene-dock'),a=n.querySelector('[href="source.html"]');
const load=()=>{f.src||=a.href+'#embed'},open=()=>{load();document.querySelector('scene-stats')?.close();d.show();a.setAttribute('aria-expanded',true)};
a.setAttribute('aria-expanded',false);a.setAttribute('aria-controls',d.id);
a.addEventListener('pointerenter',load);a.addEventListener('focus',load);
a.addEventListener('click',e=>{if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();d.open?d.close():open()});
// Escape closes it (closedby); so does a click outside it and the dock
addEventListener('pointerdown',(e)=>{if(d.open&&!e.composedPath().some((el)=>el===d||el===n))d.close()});
d.addEventListener('close',()=>a.setAttribute('aria-expanded',false));
// Previous/next keep the source open on the next scene; ← and → follow them unless a control has the keys
const [p,x]=n.querySelectorAll('[rel]');
[p,x].forEach((l)=>l.addEventListener('click',()=>{if(d.open)l.hash='source'}));
addEventListener('keydown',(e)=>{const l={ArrowLeft:p,ArrowRight:x}[e.key];if(!l||e.defaultPrevented||e.altKey||e.metaKey||e.ctrlKey||e.shiftKey||e.composedPath().some((el)=>el.matches?.('input,select,textarea,[role=slider],[contenteditable]')))return;l.click()});
if(location.hash==='#source')open();
</script>
<b id="preview" hidden></b><b id="card" hidden></b>`;
