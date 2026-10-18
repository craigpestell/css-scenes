/**
 * Floating stats panel for scene pages: live frame rate, code sizes against the budget, feature support in this
 * browser, and the viewing environment. Loaded as one shared script (dist/stats.js) and kept out of every scene's
 * budget; it reads its build-time data from <script id="scene-stats">. Skipped inside the index page's previews.
 *
 * Each section is a { title, render(el), update?(el) } entry in SECTIONS, so new sections slot in without touching the shell.
 *
 * A second sheet, Controls, drives the page: a dial that scrolls it (scroll-driven scenes run on the scrollbar), auto-play,
 * a speed multiplier for time-based animations, a colour-scheme override, and the scene's own meta.json `params`.
 * Nothing in Controls persists; Reset restores the page as authored.
 */
const data = JSON.parse(document.getElementById('scene-stats')?.textContent ?? 'null');
const html = document.documentElement;
const store = {
  get: (k) => { try { return localStorage.getItem(`scene-stats:${k}`) === '1'; } catch { return false; } },
  set: (k, v) => { try { localStorage.setItem(`scene-stats:${k}`, v ? '1' : '0'); } catch {} },
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

/* Controls. Scene params come from meta.json:
 *   { "type": "range", "label", "var": "--x", "target"?: ".stage", "min", "max", "step", "value", "unit"?, "when"?: "time" }
 *     sets a custom property inline on target; `value` is the authored default, and Reset removes the inline value.
 *   { "type": "count", "label", "selector", "min", "max", "step"? }
 *     clones or removes elements matching selector inside each of their parents, then sets --i (1-based index) and
 *     --n (count) inline on each, so --i-driven CSS keeps working where sibling-index() is missing.
 *   { "type": "color", "label", "var", "target"?, "value" }
 * "when": "time" hides a param where scroll timelines drive the scene, since it only affects the time-based fallback.
 */
const scroller = document.scrollingElement;
const scrollRange = () => scroller.scrollHeight - innerHeight;
const scrollDriven = () => CSS.supports('animation-timeline: scroll()') && scrollRange() > 1;
const play = { rate: 1, paused: false, auto: false, run: 20, scheme: '' };
const TURN = 4; // dial turns for one full scroll of the page

/* Speed applies to animations on the document timeline; scroll-linked ones follow the scrollbar instead. */
const applyRate = () => {
  const r = play.paused ? 0 : play.rate;
  for (const a of document.getAnimations?.() ?? []) {
    if (a.timeline instanceof DocumentTimeline && a.playbackRate !== r) a.playbackRate = r;
  }
};

/* Auto-play scrolls through the page once every `run` seconds, then starts over. A manual scroll moves its position. */
let autoPos = 0, autoLast = 0;
const autoTick = (t) => {
  if (!play.auto) return;
  const range = scrollRange();
  if (Math.abs(scroller.scrollTop - autoPos) > 2) autoPos = scroller.scrollTop;
  autoPos += autoLast ? (range * Math.min(t - autoLast, 100)) / (play.run * 1000) : 0;
  if (autoPos >= range) autoPos = 0;
  autoLast = t;
  scroller.scrollTop = autoPos;
  requestAnimationFrame(autoTick);
};
const setAuto = (on) => {
  play.auto = on; autoLast = 0; autoPos = scroller.scrollTop;
  if (on) requestAnimationFrame(autoTick);
};

const counts = new Map(); // selector -> { template, homes: [{ parent, anchor }], initial }
const countSetup = (p) => {
  const els = [...document.querySelectorAll(p.selector)];
  if (!els.length) return null;
  const homes = [...new Set(els.map((e) => e.parentElement))].map((parent) => {
    const own = [...parent.children].filter((e) => e.matches(p.selector));
    return { parent, anchor: own.at(-1).nextElementSibling };
  });
  const c = { template: els[0].cloneNode(true), homes, initial: els.length / homes.length };
  counts.set(p.selector, c);
  return c;
};
const setCount = (p, n) => {
  const c = counts.get(p.selector);
  // Parents cloned by an earlier param (wedges holding glass) are found through their current children.
  const parents = new Map(c.homes.map((h) => [h.parent, h.anchor]));
  for (const e of document.querySelectorAll(p.selector)) if (!parents.has(e.parentElement)) parents.set(e.parentElement, null);
  for (const [parent, anchor] of parents) {
    const own = () => [...parent.children].filter((e) => e.matches(p.selector));
    let kids = own();
    while (kids.length > n) kids.pop().remove();
    while (kids.length < n) {
      const clone = c.template.cloneNode(true);
      parent.insertBefore(clone, kids.at(-1)?.nextElementSibling ?? anchor);
      kids.push(clone);
    }
    kids.forEach((e, i) => { e.style.setProperty('--i', i + 1); e.style.setProperty('--n', n); });
  }
};
const targets = (p) => document.querySelectorAll(p.target ?? '.stage');
const fmt = (p, v) => `${v}${p.unit ?? ''}`; // the CSS value
const show = (p, v) => `${v}${/^[a-z]/i.test(p.unit ?? '') ? ' ' : ''}${p.unit ?? ''}`; // the label: 20 s, 1.5×
const hex = (c) => {
  const m = /^rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(c.trim());
  return m && `#${m.slice(1).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
};

const controlsSection = {
  title: 'Playback',
  render: (el) => {
    const id = (i) => `ctl-${i}`;
    const rows = data.params.map((p, i) => {
      if (p.type === 'count' && !countSetup(p)) return '';
      if (p.type === 'count') p.value = counts.get(p.selector).initial;
      // A colour starts from what the page computes now, so the picker matches light or dark.
      if (p.type === 'color') p.value = hex(getComputedStyle(targets(p)[0] ?? html).getPropertyValue(p.var)) ?? p.value;
      const input = p.type === 'color'
        ? `<input type="color" id="${id(i)}" value="${esc(p.value)}">`
        : `<input type="range" id="${id(i)}" min="${p.min}" max="${p.max}" step="${p.step ?? 1}" value="${p.value}">`;
      return `<div class="row" data-p="${i}"${p.when === 'time' && scrollDriven() ? ' hidden' : ''}>
        <label for="${id(i)}">${esc(p.label)}</label><output for="${id(i)}">${esc(show(p, p.value))}</output>${input}</div>`;
    }).join('');
    el.innerHTML = `<div class="scroll" hidden>
        <div class="dial" role="slider" tabindex="0" aria-label="Scroll position" aria-valuemin="0" aria-valuemax="100"
          aria-valuenow="0" aria-valuetext="0%"><i></i></div>
        <div class="stack">
          <button type="button" class="btn" data-a="auto" aria-pressed="false">Auto-play</button>
          <div class="row"><label for="ctl-run">Full run</label><output for="ctl-run">20 s</output>
            <input type="range" id="ctl-run" min="2" max="90" step="1" value="20"></div>
        </div>
      </div>
      <div class="row"><label for="ctl-rate">Animation speed</label><output for="ctl-rate">1×</output>
        <input type="range" id="ctl-rate" min="0" max="4" step="0.05" value="1"></div>
      <div class="pair">
        <button type="button" class="btn" data-a="pause" aria-pressed="false">Pause</button>
        <label class="pick">Scheme <select data-a="scheme"><option value="">auto</option><option>light</option><option>dark</option></select></label>
      </div>
      ${rows ? `<h3>Scene</h3>${rows}` : ''}
      <button type="button" class="btn reset" data-a="reset">Reset all</button>`;

    const dial = el.querySelector('.dial');
    const out = (id, v) => { el.querySelector(`output[for="${id}"]`).value = v; };
    const applyParam = (p, v) => {
      if (p.type === 'count') {
        // Counts nest (glass inside wedges), so every count is replayed in order to keep clones in step.
        p.current = +v;
        data.params.filter((q) => q.type === 'count' && counts.has(q.selector)).forEach((q) => setCount(q, q.current ?? q.value));
      } else targets(p).forEach((t) => t.style.setProperty(p.var, fmt(p, v)));
      applyRate();
    };

    el.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'ctl-rate') { play.rate = +t.value; out(t.id, `${play.rate}×`); applyRate(); }
      else if (t.id === 'ctl-run') { play.run = +t.value; out(t.id, `${play.run} s`); }
      else if (t.dataset.a === 'scheme') { play.scheme = t.value; html.style.colorScheme = t.value; }
      else {
        const p = data.params[t.closest('[data-p]')?.dataset.p];
        if (!p) return;
        out(t.id, show(p, t.value));
        applyParam(p, t.value);
      }
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const press = (on) => b.setAttribute('aria-pressed', on);
      if (b.dataset.a === 'auto') { setAuto(!play.auto); press(play.auto); }
      if (b.dataset.a === 'pause') { play.paused = !play.paused; press(play.paused); applyRate(); }
      if (b.dataset.a === 'reset') {
        Object.assign(play, { rate: 1, paused: false, scheme: '' });
        setAuto(false);
        html.style.colorScheme = '';
        data.params.forEach((p, i) => {
          const input = el.querySelector(`#${id(i)}`);
          if (!input) return;
          input.value = p.value;
          out(input.id, show(p, p.value));
          if (p.type === 'count') applyParam(p, p.value);
          else targets(p).forEach((t) => t.style.removeProperty(p.var));
        });
        el.querySelector('#ctl-rate').value = 1; out('ctl-rate', '1×');
        play.run = 20; el.querySelector('#ctl-run').value = 20; out('ctl-run', '20 s');
        el.querySelector('[data-a=scheme]').value = '';
        el.querySelectorAll('[aria-pressed]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
        applyRate();
      }
    });

    /* The dial is a jog wheel: turning it scrolls the page, TURN turns from top to bottom, and its ring shows progress. */
    const scrollBy = (dy) => { scroller.scrollTop += dy; };
    let angle = null;
    const at = (e) => {
      const r = dial.getBoundingClientRect();
      return (Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180) / Math.PI;
    };
    dial.addEventListener('pointerdown', (e) => { dial.setPointerCapture(e.pointerId); angle = at(e); });
    dial.addEventListener('pointermove', (e) => {
      if (angle === null) return;
      const a = at(e);
      const d = ((a - angle + 540) % 360) - 180; // shortest way round, so crossing ±180° doesn't jump
      angle = a;
      scrollBy((d / 360 / TURN) * scrollRange());
    });
    dial.addEventListener('pointerup', () => { angle = null; });
    dial.addEventListener('pointercancel', () => { angle = null; });
    dial.addEventListener('keydown', (e) => {
      const range = scrollRange();
      const step = { ArrowUp: -0.01, ArrowLeft: -0.01, ArrowDown: 0.01, ArrowRight: 0.01, PageUp: -0.1, PageDown: 0.1 }[e.key];
      if (step) scrollBy(step * range);
      else if (e.key === 'Home') scroller.scrollTop = 0;
      else if (e.key === 'End') scroller.scrollTop = range;
      else return;
      e.preventDefault();
    });
    const sync = () => {
      const p = scrollRange() > 1 ? scroller.scrollTop / scrollRange() : 0;
      dial.style.setProperty('--p', p);
      const pct = Math.round(p * 100);
      dial.setAttribute('aria-valuenow', pct);
      dial.setAttribute('aria-valuetext', `${pct}%`);
    };
    addEventListener('scroll', sync, { passive: true });
    controlsSection.layout = () => {
      el.querySelector('.scroll').hidden = scrollRange() <= 1;
      el.querySelectorAll('[data-p]').forEach((r) => {
        r.hidden = data.params[r.dataset.p].when === 'time' && scrollDriven();
      });
      sync();
    };
  },
  update: () => { controlsSection.layout(); applyRate(); },
};

const CSS_TEXT = `
:host{all:initial;color-scheme:light dark;--bg:light-dark(#fffd,#111d);--fg:light-dark(#111,#eee);--dim:light-dark(#555,#aaa);
  --line:light-dark(#0002,#fff2);--yes:light-dark(#08703a,#5fd38d);--no:light-dark(#b3261e,#ff8a80);
  font:12px/1.4 system-ui,sans-serif;font-variant-numeric:tabular-nums;color:var(--fg)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
button,select{font:inherit;color:inherit;cursor:pointer}
.bar{position:fixed;inset:auto auto 1rem 1rem;z-index:2147483646;display:flex;gap:.4rem}
.toggle{display:flex;gap:.4em;align-items:center;
  padding:.35rem .75rem;border:0;border-radius:99rem;background:#000a;color:#fff;font-weight:600;opacity:.35}
.toggle:hover,.toggle:focus-visible,.toggle[aria-expanded=true]{opacity:1}
:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.toggle i{width:.5em;height:.5em;border-radius:50%;background:var(--state,#5fd38d)}
.toggle svg{width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
[popover]{position:fixed;inset:auto auto 3.5rem 1rem;margin:0;width:min(20rem,calc(100vw - 2rem));
  max-height:calc(100dvh - 5rem);overflow:auto;padding:0;border:1px solid var(--line);border-radius:.75rem;
  background:var(--bg);color:var(--fg);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 8px 32px #0004}
#c{inset:auto 1rem 3.5rem auto}
@media (width < 44rem){#c{inset:auto auto 3.5rem 1rem}}
header{display:flex;justify-content:space-between;align-items:center;padding:.6rem .8rem;border-bottom:1px solid var(--line)}
h2{margin:0;font-size:13px}
.close{border:0;background:none;padding:.1rem .4rem;font-size:16px;line-height:1;border-radius:.3rem}
section{padding:.6rem .8rem;border-bottom:1px solid var(--line)}
section:last-child{border:0}
h3{margin:0 0 .4rem;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}
section h3+div>h3{margin-top:.8rem}
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
.row{display:grid;grid-template-columns:1fr auto;gap:0 .5rem;margin:0 0 .5rem}
.row output{color:var(--dim)}
.row input{grid-column:1/-1;width:100%;margin:.2rem 0 0;accent-color:var(--fg)}
input[type=color]{height:1.6rem;padding:0;border:1px solid var(--line);border-radius:.3rem;background:none}
[hidden]{display:none!important}
.scroll{display:grid;grid-template-columns:auto 1fr;gap:.8rem;align-items:center;margin:0 0 .6rem}
.stack .row{margin:.5rem 0 0}
.dial{--p:0;position:relative;width:5rem;aspect-ratio:1;border-radius:50%;touch-action:none;cursor:grab;
  background:conic-gradient(var(--fg) calc(var(--p) * 1turn),var(--line) 0)}
.dial:active{cursor:grabbing}
.dial i{position:absolute;inset:.35rem;border-radius:50%;background:var(--bg);box-shadow:inset 0 1px 4px #0003;
  rotate:calc(var(--p) * ${TURN}turn)}
.dial i::before{content:"";position:absolute;inset:.3rem auto auto calc(50% - .15rem);width:.3rem;height:.9rem;border-radius:.2rem;background:var(--fg)}
.pair{display:flex;gap:.5rem;align-items:center;justify-content:space-between;margin:0 0 .3rem}
.btn{padding:.3rem .7rem;border:1px solid var(--line);border-radius:99rem;background:none}
.btn[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.pick{display:flex;gap:.4rem;align-items:center;color:var(--dim)}
select{padding:.2rem .3rem;border:1px solid var(--line);border-radius:.3rem;background:none}
.reset{display:block;margin:.6rem 0 0 auto}
`;

let panel;

const sheet = (id, title, sections) => `<div id="${id}" popover="manual" role="dialog" aria-label="${title}">
  <header><h2>${esc(title)}</h2><button class="close" popovertarget="${id}" popovertargetaction="hide" aria-label="Close ${title.toLowerCase()}">×</button></header>
  ${sections.map((s) => `<section aria-label="${s.title}"><h3>${s.title}</h3><div></div></section>`).join('')}
</div>`;

class SceneStats extends HTMLElement {
  connectedCallback() {
    const root = this.attachShadow({ mode: 'open' });
    data.params ??= [];
    this.sections = [...SECTIONS, controlsSection];
    root.innerHTML = `<style>${CSS_TEXT}</style>
      <div class="bar">
        <button class="toggle" popovertarget="p" aria-expanded="false"><i></i><output>– fps</output><span class="sr"> scene stats</span></button>
        <button class="toggle" popovertarget="c" aria-expanded="false" aria-label="Scene controls">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>Controls</button>
      </div>
      ${sheet('p', `${data.title} stats`, SECTIONS)}
      ${sheet('c', `${data.title} controls`, [controlsSection])}`;
    const bodies = [...root.querySelectorAll('section > div')];
    this.sections.forEach((s, i) => { s.body = bodies[i]; s.render(s.body); });
    this.fps = root.querySelector('.toggle output');
    this.stateDot = root.querySelector('.toggle i');
    this.sheets = [...root.querySelectorAll('[popover]')];

    for (const sh of this.sheets) {
      const btn = root.querySelector(`[popovertarget="${sh.id}"]`);
      sh.addEventListener('toggle', (e) => {
        const open = e.newState === 'open';
        btn.setAttribute('aria-expanded', open);
        store.set(sh.id === 'p' ? 'open' : 'controls', open);
        // Narrow screens stack both sheets in one place, so opening one closes the other.
        if (open && matchMedia('(width < 44rem)').matches) this.sheets.forEach((o) => o !== sh && o.hidePopover());
        if (open) this.update();
      });
      // Manual popovers don't light-dismiss; Escape still closes them.
      sh.addEventListener('keydown', (e) => { if (e.key === 'Escape') sh.hidePopover(); });
    }
    if (store.get('open')) this.sheets[0].showPopover();
    if (store.get('controls')) this.sheets[1].showPopover();
    addEventListener('resize', () => this.update());
  }

  update() {
    this.fps.value = `${frames.fps} fps`;
    // Green at 55+ fps, amber at 30+, red below.
    this.stateDot.style.setProperty('--state', frames.fps >= 55 ? '#5fd38d' : frames.fps >= 30 ? '#f5c451' : '#ff8a80');
    applyRate(); // CSS restarts animations when their properties change; keep new ones at the chosen speed
    const [stats, controls] = this.sheets.map((sh) => sh.matches(':popover-open'));
    this.sections.forEach((s) => { if (s === controlsSection ? controls : stats) s.update?.(s.body); });
  }
}

if (data && window === window.top) {
  customElements.define('scene-stats', SceneStats);
  panel = document.body.appendChild(document.createElement('scene-stats'));
}
