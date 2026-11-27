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
  `<li><a href="/scenes/${esc(slug)}/">${esc(meta.title)}</a> <small>${esc(MODES[modeOf(meta)].hint)}</small></li>`).join('\n      ');

/** Chrome added to every scene page, generated from the scene list: a toolbar across the top holding the way home,
 * previous/next scene links (wrapping at the ends) around the title and how to play the scene, and the scene's tools:
 * About & source, Controls and the live frame rate. The first works on its own; the other two are rendered hidden and
 * the shared panel script (dist/stats.js) reveals and wires them to the Controls and Stats tabs of its column on the
 * right. The toolbar and that column take their own space (the stage is inset by --chrome-*), so neither covers the
 * scene. Every toolbar part has a fixed width, so the arrows sit in the same place on every scene. ← and → move
 * between scenes. The gallery hero loads the scene at #preview and its cards at #card, which both hide the chrome and
 * give the stage the whole window; cards also hide the scene's own controls (labels and control groups).
 *
 * About & source toggles source.html (what the scene is, its write-up and its code, in one view) in a <dialog> over
 * the stage. The dialog stops at the Controls column, so the two never overlap and both can be open; on phones, where
 * the column is a sheet at the bottom, opening one closes the other. It's non-modal so the toolbar stays usable: the
 * dialog dims the scene with a spread shadow, and Escape or a click on the scene closes it. Previous/next carry it to
 * the next scene (#source opens it on load). The iframe gets its src on first hover, focus or open, so the page costs
 * nothing until it's wanted; modified clicks and no-JS visitors get the page itself. */
export const sceneChrome = ({ slug, title, prev, next, mode }) => `<style>
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
.scene-dock{--dock-line:light-dark(#14121f26,#fff3);position:fixed;inset:0 0 auto;z-index:9;display:flex;align-items:center;gap:.15rem;box-sizing:border-box;block-size:var(--chrome-top);padding:env(safe-area-inset-top) max(.5rem,env(safe-area-inset-right)) 0 max(.5rem,env(safe-area-inset-left));background:light-dark(#fff,#0b0a14);color:light-dark(#14121f,#f4f1ff);box-shadow:0 1px 0 light-dark(#14121f1f,#fff2);font:600 .8rem/1 system-ui,sans-serif;white-space:nowrap;view-transition-name:scene-nav}
.scene-dock .tools{margin-inline-start:auto}
.scene-dock nav{display:flex;align-items:center;gap:.15rem}
.scene-dock nav+nav{border-inline-start:1px solid var(--dock-line);padding-inline-start:.25rem;margin-inline-start:.1rem}
.scene-dock :is(a,button){display:inline-flex;align-items:center;gap:.4em;padding:.5rem .65rem;border:0;border-radius:99rem;background:none;color:inherit;font:inherit;text-decoration:none;cursor:pointer}
.scene-dock :is(a,button):hover{background:light-dark(#14121f14,#fff2)}
.scene-dock :is(a,button):focus-visible{outline:2px solid currentColor;outline-offset:-2px}
.scene-dock :is(a,button):is([aria-expanded=true],[aria-pressed=true]){background:light-dark(#14121f,#f4f1ff);color:light-dark(#f4f1ff,#14121f)}
.scene-dock .home::before{content:"";inline-size:.7em;aspect-ratio:1;border-radius:50%;background:conic-gradient(from 210deg,#9d85ff,#ff7ac6,#ffc27a,#9d85ff)}
.scene-dock [rel]{min-inline-size:2rem;justify-content:center}
/* Fixed widths for everything that changes between scenes or frames (the title, the fps), so the arrows sit in the same
   place on every scene and can be clicked again and again without moving the pointer */
.scene-dock .now{display:grid;gap:.2rem;inline-size:clamp(6rem,100vw - 36rem,13rem);padding-inline:.35rem;line-height:1.1}
.scene-dock .now>*{overflow:hidden;text-overflow:ellipsis}
.scene-dock .pending{visibility:hidden} /* space held for the buttons the panel script wires up */
.scene-dock .fps{font-variant-numeric:tabular-nums}.scene-dock .fps output{inline-size:3ch;text-align:end}.scene-dock .unit{margin-inline-start:-.15em;opacity:.65}.scene-dock .fps-dot{inline-size:.5em;aspect-ratio:1;border-radius:50%;background:var(--state,#5fd38d)}
.scene-dock .now small{font:500 .68rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;opacity:.65}
/* Narrow screens keep the home dot, the arrows, About & source and Controls; the title stays for screen readers, and Stats is a tab in the Controls sheet */
@media (width<40rem){.scene-dock :is(.home span,.now){position:absolute;clip-path:inset(50%);inline-size:1px;overflow:hidden}.scene-dock .fps{display:none}.scene-dock :is(a,button){padding:.5rem .5rem}}
:root:has(:is(#preview,#card):target) .scene-dock{display:none}
:root:has(#card:target) .stage :is(label,[role=group]:has(label)){visibility:hidden}
/* The dialog sits over the stage only: it stops at the Controls column, as the stage does */
.scene-source{position:fixed;z-index:8;inset:calc(var(--chrome-top) + .5rem) var(--chrome-right) auto 0;inline-size:min(82rem,100% - var(--chrome-right) - 1.5rem);block-size:min(52rem,100dvh - var(--chrome-top) - 1rem);max-inline-size:none;max-block-size:none;margin:0 auto;padding:0;border:0;border-radius:1.25rem;background:var(--c-paper,Canvas);color:var(--c-ink,CanvasText);box-shadow:0 1.5rem 4rem #0008,0 0 0 1px light-dark(#14121f1f,#fff2),0 0 0 100vmax #0007;overflow:hidden;font:600 .8rem/1 system-ui,sans-serif}
.scene-source[open]{display:flex;flex-direction:column}
.scene-source form{display:flex;justify-content:end;gap:.25rem;padding:.4rem;border-block-end:1px solid light-dark(#14121f1f,#fff2)}
.scene-source :is(a,button){padding:.45rem .7rem;border:0;border-radius:99rem;background:none;color:inherit;font:inherit;text-decoration:none;cursor:pointer}
.scene-source :is(a,button):hover{background:light-dark(#14121f14,#fff2)}
.scene-source :is(a,button):focus-visible{outline:2px solid currentColor;outline-offset:-2px}
.scene-source iframe{flex:1;inline-size:100%;border:0}
@media (prefers-reduced-motion:no-preference){.scene-source[open]{animation:scene-source-in .2s ease-out}}
@keyframes scene-source-in{from{opacity:0;translate:0 .5rem}}
:root:has(.scene-source[open]){overflow:hidden}
</style>
<header class="scene-dock">
<nav aria-label="Site"><a class="home" href="../../" aria-label="All scenes"><span>CSS Scenes</span></a></nav>
<nav aria-label="Scenes"><a href="../${esc(prev.slug)}/" rel="prev" title="Previous: ${esc(prev.title)} (←)" aria-label="Previous scene: ${esc(prev.title)}">←</a><span class="now"><span aria-current="page" title="${esc(title)}">${esc(title)}</span><small>${esc(MODES[mode].hint)}</small></span><a href="../${esc(next.slug)}/" rel="next" title="Next: ${esc(next.title)} (→)" aria-label="Next scene: ${esc(next.title)}">→</a></nav>
<nav aria-label="Scene tools" class="tools"><a href="source.html">About &amp; source</a><button type="button" data-tab="controls" class="pending" aria-hidden="true" tabindex="-1">Controls</button><button type="button" data-tab="stats" class="fps pending" aria-label="Stats" aria-hidden="true" tabindex="-1"><i class="fps-dot"></i><output>–</output><span class="unit">fps</span></button></nav>
</header>
<dialog class="scene-source" id="scene-source" aria-label="About ${esc(title)}, with its source" closedby="closerequest">
<form method="dialog"><a href="source.html">Open as page</a><button autofocus>Close</button></form>
<iframe title="About ${esc(title)}, with its source"></iframe>
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
addEventListener('keydown',(e)=>{const l={ArrowLeft:p,ArrowRight:x}[e.key];if(!l||e.defaultPrevented||e.altKey||e.metaKey||e.ctrlKey||e.shiftKey||e.composedPath().some((el)=>el.matches?.('input,select,textarea,[role=slider],[contenteditable]')))return;l.click()});
if(location.hash==='#source')open();
</script>
<b id="preview" hidden></b><b id="card" hidden></b>`;
