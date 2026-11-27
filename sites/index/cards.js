/** Shared scene facts (description, mode) and the chrome every scene page gets. The home page lives in home.js. */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The stage's aria-label doubles as the card description. */
export const describe = (html) => html.match(/<main class="stage"[^>]*aria-label="([^"]*)"/)?.[1] ?? '';

/** How a visitor drives the scene; the gallery filters on it. */
export function modeOf(meta) {
  const tags = meta.tags ?? [];
  if (tags.includes('story')) return 'story';
  if (tags.some((t) => t === 'interactive' || t === 'state-toggle')) return 'interactive';
  return 'loop';
}

export const MODES = {
  story: { label: 'Stories', hint: 'Plays through', short: 'Story' },
  interactive: { label: 'Interactive', hint: 'Interactive', short: 'Interactive' },
  loop: { label: 'Loops', hint: 'Loops', short: 'Ambient loop' },
};

/** The 404 page's way back: every scene as a link, with how to play it. Root-absolute, since a 404 answers any path. */
export const renderLost = (scenes) => scenes.map(({ slug, meta }) =>
  `<li><a href="/scenes/${esc(slug)}/"><img src="/posters/${esc(slug)}-sm.jpg" alt="" width="480" height="300" loading="lazy"><span>${esc(meta.title)}</span><small>${esc(MODES[modeOf(meta)].short)}</small></a></li>`).join('\n      ');

/** Chrome added to every scene page, generated from the scene list: a toolbar across the top holding the way home,
 * previous/next scene links (wrapping at the ends) around the title and how to play the scene, and the scene's tools:
 * How it’s made, Controls and the live frame rate. The first works on its own; the other two are rendered hidden and
 * the shared panel script (dist/stats.js) reveals and wires them to the Controls and Stats tabs of its column on the
 * right. The toolbar and that column take their own space (the stage is inset by --chrome-*), so neither covers the
 * scene. Every toolbar part has a fixed width, so the arrows sit in the same place on every scene. ← and → move
 * between scenes and S toggles How it’s made. Between the arrows, the scene's number opens the scene switcher (panel.js;
 * without it, the gallery). The gallery hero loads the scene at #preview and its cards at #card, which both hide the chrome and
 * give the stage the whole window; cards also hide the scene's own controls (labels and control groups).
 *
 * How it’s made toggles source.html (what the scene is, its write-up and its code, in one view) in a <dialog> over
 * the stage. The dialog stops at the Controls column, so the two never overlap and both can be open; on phones, where
 * the column is a sheet at the bottom, opening one closes the other. It's non-modal so the toolbar stays usable: the
 * dialog dims the scene with a spread shadow, and Escape or a click on the scene closes it. Previous/next carry it to
 * the next scene (#source opens it on load). The iframe gets its src on first hover, focus or open, so the page costs
 * nothing until it's wanted; modified clicks and no-JS visitors get the page itself. */
export const sceneChrome = ({ slug, title, prev, next, mode, n, total }) => `<style>
@media (prefers-reduced-motion:no-preference){@view-transition{navigation:auto}}
.stage{view-transition-name:scene-${esc(slug)}}
/* The chrome never covers the scene: the stage is inset by the toolbar on top and, once the panel script loads, by the
   Controls column on the right (or, on phones, its sheet at the bottom). Gallery previews get the whole window. */
:root{--chrome-top:calc(3.25rem + env(safe-area-inset-top));--chrome-right:0px;--chrome-bottom:0px;--controls-w:min(19rem,100vw - 6rem)}
:root:has(scene-controls){--chrome-right:2.25rem}
:root[data-controls-open]{--chrome-right:calc(2.25rem + var(--controls-w))}
@media (width<40rem){:root:has(scene-controls){--chrome-right:0px}:root[data-controls-open]{--chrome-right:0px;--chrome-bottom:min(55dvh,30rem)}}
:root:has(:is(#preview,#card):target){--chrome-top:0px;--chrome-right:0px;--chrome-bottom:0px}
.stage{inset:var(--chrome-top) var(--chrome-right) var(--chrome-bottom) 0}
.scene-dock{--dock-line:light-dark(#16131d24,#f2eee62b);position:fixed;inset:0 0 auto;z-index:9;display:flex;align-items:center;gap:.15rem;box-sizing:border-box;block-size:var(--chrome-top);padding:env(safe-area-inset-top) max(.5rem,env(safe-area-inset-right)) 0 max(.6rem,env(safe-area-inset-left));background:light-dark(#f6f4ef,#09080e);color:light-dark(#16131d,#f2eee6);box-shadow:0 1px 0 var(--dock-line);font:600 .82rem/1 system-ui,sans-serif;white-space:nowrap;view-transition-name:scene-nav}
.scene-dock .tools{margin-inline-start:auto}
.scene-dock nav{display:flex;align-items:center;gap:.15rem}
.scene-dock :is(a,button){display:inline-flex;align-items:center;gap:.45em;padding:.5rem .7rem;border:0;border-radius:99rem;background:none;color:inherit;font:inherit;text-decoration:none;cursor:pointer}
.scene-dock :is(a,button):hover{background:light-dark(#16131d12,#f2eee617)}
.scene-dock :is(a,button):focus-visible{outline:2px solid currentColor;outline-offset:-2px}
.scene-dock :is(a,button):is([aria-expanded=true],[aria-pressed=true]){background:light-dark(#16131d,#f2eee6);color:light-dark(#f6f4ef,#09080e)}
/* The wordmark: an aperture in the brand sweep */
.scene-dock .home{margin-inline-end:.35rem;padding-inline-end:.9rem;border-radius:99rem 0 0 99rem;box-shadow:1px 0 0 var(--dock-line);font-weight:700}
.scene-dock .home::before{content:"";inline-size:1.1em;aspect-ratio:1;border-radius:50%;background:conic-gradient(from 210deg,#a48bff,#ff7ac6,#ffc27a,#a48bff);box-shadow:inset 0 0 0 .26em light-dark(#f6f4ef,#09080e);outline:1.5px solid var(--dock-line)}
.scene-dock [rel]{min-inline-size:2.1rem;justify-content:center}
/* Where this scene sits among the rest; opens the scene switcher (the panel script), or the gallery without it */
.scene-dock .idx{anchor-name:--scene-idx;padding:.45rem .75rem;box-shadow:inset 0 0 0 1px var(--dock-line);font:500 .74rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
.scene-dock .idx::after{content:"";inline-size:.38em;aspect-ratio:1;border:solid currentColor;border-width:0 1.5px 1.5px 0;rotate:45deg;translate:0 -.12em;opacity:.7}
/* The title and how it plays: a fixed width, so the tools never move */
.scene-dock .now{display:grid;gap:.22rem;inline-size:clamp(6rem,100vw - 40rem,15rem);padding-inline:.6rem;line-height:1.1}
.scene-dock .now>*{overflow:hidden;text-overflow:ellipsis}
.scene-dock .now small{font:500 .64rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;opacity:.62}
.scene-dock .pending{visibility:hidden} /* space held for the buttons the panel script wires up */
.scene-dock .fps{font:500 .74rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}.scene-dock .fps output{inline-size:3ch;text-align:end}.scene-dock .unit{margin-inline-start:-.15em;opacity:.62}.scene-dock .fps-dot{inline-size:.5em;aspect-ratio:1;border-radius:50%;background:var(--state,#3ddc97)}
/* Narrow screens keep the wordmark's aperture, the arrows and their count, How it's made and Controls; the title stays for screen readers, and Stats is a tab in the Controls sheet */
@media (width<40rem){.scene-dock :is(.home span,.now){position:absolute;clip-path:inset(50%);inline-size:1px;overflow:hidden}.scene-dock .home{padding-inline-end:.6rem}.scene-dock .fps{display:none}.scene-dock :is(a,button){padding:.5rem .5rem}}
@media (width<24rem){.scene-dock .idx{display:none}}
:root:has(:is(#preview,#card):target) .scene-dock{display:none}
:root:has(#card:target) .stage :is(label,[role=group]:has(label)){visibility:hidden}
/* The dialog sits over the stage only: it stops at the Controls column, as the stage does */
.scene-source{position:fixed;z-index:8;inset:calc(var(--chrome-top) + .5rem) var(--chrome-right) auto 0;inline-size:min(82rem,100% - var(--chrome-right) - 1.5rem);block-size:min(52rem,100dvh - var(--chrome-top) - 1rem);max-inline-size:none;max-block-size:none;margin:0 auto;padding:0;border:0;border-radius:1.25rem;background:light-dark(#f6f4ef,#09080e);color:light-dark(#16131d,#f2eee6);box-shadow:0 1.5rem 4rem #0008,0 0 0 1px light-dark(#16131d1f,#f2eee62b),0 0 0 100vmax #0009;overflow:hidden;font:600 .8rem/1 system-ui,sans-serif}
.scene-source[open]{display:flex;flex-direction:column}
.scene-source form{display:flex;justify-content:end;gap:.25rem;padding:.4rem;border-block-end:1px solid light-dark(#16131d1f,#f2eee62b)}
.scene-source :is(a,button){padding:.45rem .7rem;border:0;border-radius:99rem;background:none;color:inherit;font:inherit;text-decoration:none;cursor:pointer}
.scene-source :is(a,button):hover{background:light-dark(#14121f14,#fff2)}
.scene-source :is(a,button):focus-visible{outline:2px solid currentColor;outline-offset:-2px}
.scene-source iframe{flex:1;inline-size:100%;border:0}
@media (prefers-reduced-motion:no-preference){.scene-source[open]{animation:scene-source-in .2s ease-out}}
@keyframes scene-source-in{from{opacity:0;translate:0 .5rem}}
:root:has(.scene-source[open]){overflow:hidden}
</style>
<header class="scene-dock">
<a class="home" href="../../" aria-label="CSS Scenes: all scenes"><span>CSS Scenes</span></a>
<nav aria-label="Scenes"><a href="../${esc(prev.slug)}/" rel="prev" title="Previous: ${esc(prev.title)} (←)" aria-label="Previous scene: ${esc(prev.title)}">←</a><a class="idx" href="../../#scenes" title="All scenes (G)" aria-label="Scene ${n} of ${total}: all scenes">${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}</a><a href="../${esc(next.slug)}/" rel="next" title="Next: ${esc(next.title)} (→)" aria-label="Next scene: ${esc(next.title)}">→</a></nav>
<span class="now"><span aria-current="page" title="${esc(title)}">${esc(title)}</span><small>${esc(MODES[mode].short)}</small></span>
<nav aria-label="Scene tools" class="tools"><a href="source.html" title="How it’s made (S)">How it’s made</a><button type="button" data-tab="controls" class="pending" aria-hidden="true" tabindex="-1">Controls</button><button type="button" data-tab="stats" class="fps pending" aria-label="Stats" aria-hidden="true" tabindex="-1"><i class="fps-dot"></i><output>–</output><span class="unit">fps</span></button></nav>
</header>
<dialog class="scene-source" id="scene-source" aria-label="How ${esc(title)} is made" closedby="closerequest">
<form method="dialog"><a href="source.html">Open as page</a><button autofocus>Close</button></form>
<iframe title="How ${esc(title)} is made"></iframe>
</dialog>
<script type="module">
const d=document.getElementById('scene-source'),f=d.querySelector('iframe'),n=document.querySelector('.scene-dock'),a=n.querySelector('[href="source.html"]');
const load=()=>{f.src||=a.href+'#embed'},open=()=>{load();if(matchMedia('(width<40rem)').matches)document.querySelector('scene-controls')?.toggle(false);d.show();a.setAttribute('aria-expanded',true)};
a.setAttribute('aria-expanded',false);a.setAttribute('aria-controls',d.id);
a.addEventListener('pointerenter',load);a.addEventListener('focus',load);
a.addEventListener('click',e=>{if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();d.open?d.close():open()});
// Escape closes it (closedby); so does a click on the scene (not on the toolbar or the Controls column)
addEventListener('pointerdown',(e)=>{if(d.open&&!e.composedPath().some((el)=>el===d||el===n||el.localName==='scene-controls'))d.close()});
d.addEventListener('close',()=>a.setAttribute('aria-expanded',false));
// Previous/next keep the source open on the next scene; ← and → follow them unless a control has the keys
const [p,x]=n.querySelectorAll('[rel]');
[p,x].forEach((l)=>l.addEventListener('click',()=>{if(d.open)l.hash='source'}));
addEventListener('keydown',(e)=>{const l={ArrowLeft:p,ArrowRight:x,s:a}[e.key];if(!l||e.defaultPrevented||e.altKey||e.metaKey||e.ctrlKey||e.shiftKey||e.composedPath().some((el)=>el.matches?.('input,select,textarea,[role=slider],[contenteditable]')))return;l.click()});
if(location.hash==='#source')open();
</script>
<b id="preview" hidden></b><b id="card" hidden></b>`;
