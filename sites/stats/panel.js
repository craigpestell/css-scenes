/**
 * Floating stats panel for scene pages: live frame rate, code sizes against the budget, feature support in this
 * browser, and the viewing environment. Loaded as one shared script (dist/stats.js) and kept out of every scene's
 * budget; it reads its build-time data from <script id="scene-stats">. Skipped inside the index page's previews.
 *
 * Each section is a { title, render(el), update?(el) } entry in SECTIONS, so later sections (such as controls for
 * animation speed or custom properties) slot in without touching the shell.
 */
const data = JSON.parse(document.getElementById('scene-stats')?.textContent ?? 'null');
const KEY = 'scene-stats:open';
const store = {
  get: () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } },
  set: (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch {} },
};

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/* Frame sampler: rAF deltas folded into a sample every half second. */
const frames = { fps: 0, avg: 0, worst: 0, long: 0, history: [] };
{
  let last = 0, start = 0, count = 0, sum = 0, worst = 0;
  const tick = (now) => {
    if (last) {
      const dt = now - last;
      count++; sum += dt; worst = Math.max(worst, dt);
      if (dt > 50) frames.long++;
    } else start = now;
    last = now;
    if (now - start >= 500 && count) {
      frames.fps = Math.round((count * 1000) / (now - start));
      frames.avg = sum / count;
      frames.worst = worst;
      frames.history = [...frames.history.slice(-59), frames.fps];
      start = now; count = 0; sum = 0; worst = 0;
      panel?.update();
    }
    requestAnimationFrame(tick);
  };
  // A hidden tab pauses rAF; restart the window so the gap doesn't read as one huge frame.
  document.addEventListener('visibilitychange', () => { last = 0; });
  if (data && window === window.top) requestAnimationFrame(tick);
}

const supports = (test) => {
  if (!test) return null;
  if (test.startsWith('window.')) return test.slice(7) in window;
  try { return CSS.supports(test); } catch { return false; }
};

const SECTIONS = [
  {
    title: 'Performance',
    render: (el) => {
      el.innerHTML = `<p class="big"><output data-k="fps">–</output> <span>fps</span></p>
        <svg class="spark" viewBox="0 0 59 30" preserveAspectRatio="none" aria-hidden="true"><polyline/></svg>
        <dl>
          <dt>Frame time</dt><dd><output data-k="avg">–</output></dd>
          <dt>Worst frame (0.5 s)</dt><dd><output data-k="worst">–</output></dd>
          <dt>Long frames (&gt;50 ms)</dt><dd><output data-k="long">0</output></dd>
          <dt>Animations</dt><dd><output data-k="anims">–</output></dd>
        </dl>`;
    },
    update: (el) => {
      const set = (k, v) => { el.querySelector(`[data-k="${k}"]`).value = v; };
      set('fps', frames.fps);
      set('avg', `${frames.avg.toFixed(1)} ms`);
      set('worst', `${frames.worst.toFixed(1)} ms`);
      set('long', frames.long);
      const anims = document.getAnimations?.() ?? [];
      const scroll = anims.filter((a) => a.timeline && !(a.timeline instanceof DocumentTimeline)).length;
      set('anims', `${anims.length}${scroll ? ` (${scroll} scroll-linked)` : ''}`);
      const top = Math.max(60, ...frames.history);
      el.querySelector('polyline').setAttribute('points',
        frames.history.map((v, i) => `${i + 59 - frames.history.length},${30 - (v / top) * 28}`).join(' '));
    },
  },
  {
    title: 'Size',
    render: (el) => {
      const { html, css, js, total, budget } = data.sizes;
      const row = (name, p) => `<dt>${name}</dt><dd>${p ? `${kb(p.br)} <small>${kb(p.raw)} raw</small>` : 'none'}</dd>`;
      el.innerHTML = `<meter min="0" max="${budget}" low="${budget * 0.75}" high="${budget * 0.9}" optimum="0" value="${total}">${kb(total)}</meter>
        <p class="note">${kb(total)} of ${kb(budget)} budget, brotli</p>
        <dl>${row('HTML', html)}${row('CSS', css)}${row('JS', js)}</dl>
        <p class="note">Parts compress separately, so they sum to more than the page. Excludes this panel.</p>`;
    },
  },
  {
    title: 'Compatibility',
    render: (el) => {
      if (!data.features.length) {
        el.innerHTML = `<p class="note">No feature data for this scene.</p>`;
        return;
      }
      const results = data.features.map((f) => ({ ...f, ok: supports(f.test) }));
      const tested = results.filter((f) => f.ok !== null);
      const passed = tested.filter((f) => f.ok).length;
      const mark = { true: ['yes', 'Supported here'], false: ['no', 'Not supported here; fallback in use'], null: ['na', 'Not tested'] };
      el.innerHTML = `<p class="note">${passed} of ${tested.length} tested features supported in this browser.</p>
        <ul>${results.map((f) => {
          const [cls, label] = mark[f.ok];
          return `<li class="${cls}"><span class="dot" role="img" aria-label="${label}" title="${label}"></span>
            <span>${esc(f.name)}<small>${esc(f.baseline)}</small></span></li>`;
        }).join('')}</ul>`;
    },
  },
  {
    title: 'Environment',
    render: (el) => {
      el.innerHTML = `<dl>
        <dt>Viewport</dt><dd><output data-k="vp"></output></dd>
        <dt>Colour scheme</dt><dd><output data-k="scheme"></output></dd>
        <dt>Reduced motion</dt><dd><output data-k="motion"></output></dd>
        <dt>DOM elements</dt><dd><output data-k="dom"></output></dd>
        <dt>Scene JavaScript</dt><dd>${data.sizes.js ? 'yes' : 'none'}</dd>
      </dl>`;
    },
    update: (el) => {
      const set = (k, v) => { el.querySelector(`[data-k="${k}"]`).value = v; };
      set('vp', `${innerWidth} × ${innerHeight} @${devicePixelRatio}x`);
      set('scheme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      set('motion', matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'no preference');
      // The panel lives in a shadow root, so this counts the scene's elements only.
      set('dom', document.getElementsByTagName('*').length);
    },
  },
];

const CSS_TEXT = `
:host{all:initial;color-scheme:light dark;--bg:light-dark(#fffd,#111d);--fg:light-dark(#111,#eee);--dim:light-dark(#555,#aaa);
  --line:light-dark(#0002,#fff2);--yes:light-dark(#08703a,#5fd38d);--no:light-dark(#b3261e,#ff8a80);
  font:12px/1.4 system-ui,sans-serif;font-variant-numeric:tabular-nums;color:var(--fg)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
button{font:inherit;color:inherit;cursor:pointer}
.toggle{position:fixed;inset:auto auto 1rem 1rem;z-index:2147483646;display:flex;gap:.4em;align-items:center;
  padding:.35rem .75rem;border:0;border-radius:99rem;background:#000a;color:#fff;font-weight:600;opacity:.35}
.toggle:hover,.toggle:focus-visible,.toggle[aria-expanded=true]{opacity:1}
.toggle:focus-visible,.close:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.toggle i{width:.5em;height:.5em;border-radius:50%;background:var(--state,#5fd38d)}
[popover]{position:fixed;inset:auto auto 3.5rem 1rem;margin:0;width:min(20rem,calc(100vw - 2rem));
  max-height:calc(100dvh - 5rem);overflow:auto;padding:0;border:1px solid var(--line);border-radius:.75rem;
  background:var(--bg);color:var(--fg);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 8px 32px #0004}
header{display:flex;justify-content:space-between;align-items:center;padding:.6rem .8rem;border-bottom:1px solid var(--line)}
h2{margin:0;font-size:13px}
.close{border:0;background:none;padding:.1rem .4rem;font-size:16px;line-height:1;border-radius:.3rem}
section{padding:.6rem .8rem;border-bottom:1px solid var(--line)}
section:last-child{border:0}
h3{margin:0 0 .4rem;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}
dl{display:grid;grid-template-columns:auto auto;gap:.15rem 1rem;margin:0}
dt{color:var(--dim)}dd{margin:0;text-align:end}
small{display:block;color:var(--dim);font-size:11px}
dd small{display:inline}
.big{margin:0;font-size:28px;font-weight:700;line-height:1}.big span{font-size:12px;font-weight:400;color:var(--dim)}
.spark{display:block;width:100%;height:30px;margin:.3rem 0 .5rem}
.spark polyline{fill:none;stroke:currentColor;stroke-width:1.5;vector-effect:non-scaling-stroke}
.note{margin:.3rem 0;color:var(--dim)}
meter{display:block;width:100%;height:.5rem}
ul{list-style:none;margin:.3rem 0 0;padding:0;display:grid;gap:.35rem}
li{display:grid;grid-template-columns:auto 1fr;gap:.5rem;align-items:start}
.dot{width:.6rem;height:.6rem;margin-top:.3em;border-radius:50%;background:var(--dim)}
.yes .dot{background:var(--yes)}.no .dot{background:var(--no)}.na .dot{background:none;border:1px solid var(--dim)}
`;

let panel;

class SceneStats extends HTMLElement {
  connectedCallback() {
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS_TEXT}</style>
      <button class="toggle" popovertarget="p" aria-expanded="false">
        <i></i><output>– fps</output><span class="sr"> scene stats</span></button>
      <div id="p" popover="manual" role="dialog" aria-label="Scene stats">
        <header><h2>${esc(data.title)} stats</h2><button class="close" popovertarget="p" popovertargetaction="hide" aria-label="Close stats">×</button></header>
        ${SECTIONS.map((s, i) => `<section data-i="${i}" aria-label="${s.title}"><h3>${s.title}</h3><div></div></section>`).join('')}
      </div>`;
    this.toggle = root.querySelector('.toggle');
    this.sheet = root.getElementById('p');
    this.bodies = SECTIONS.map((s, i) => root.querySelector(`[data-i="${i}"] div`));
    SECTIONS.forEach((s, i) => s.render(this.bodies[i]));

    this.sheet.addEventListener('toggle', (e) => {
      const open = e.newState === 'open';
      this.toggle.setAttribute('aria-expanded', open);
      store.set(open);
      if (open) this.update();
    });
    // Manual popovers don't light-dismiss; Escape still closes this one.
    this.sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.sheet.hidePopover(); });
    if (store.get()) this.sheet.showPopover();
  }

  update() {
    this.toggle.querySelector('output').value = `${frames.fps} fps`;
    // Green at 55+ fps, amber at 30+, red below.
    this.toggle.style.setProperty('--state', frames.fps >= 55 ? '#5fd38d' : frames.fps >= 30 ? '#f5c451' : '#ff8a80');
    if (!this.sheet.matches(':popover-open')) return;
    SECTIONS.forEach((s, i) => s.update?.(this.bodies[i]));
  }
}

if (data && window === window.top) {
  customElements.define('scene-stats', SceneStats);
  panel = document.body.appendChild(document.createElement('scene-stats'));
}
