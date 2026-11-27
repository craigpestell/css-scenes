// The home page's player: the reel swaps the scene in place (a view transition where there is one) and advances on its
// own, every --dwell, until someone picks a scene, hovers or focuses the player; reduced motion turns that off. Then the
// collection: a poster plays live while it is hovered or focused, one at a time, on devices that hover.
const screen = document.querySelector('.screen');
const data = JSON.parse(document.getElementById('reel-data').textContent);
const frame = screen.querySelector('.frame');
const reel = [...screen.querySelectorAll('.reel a')];
const field = (k) => screen.querySelector(`[data-k="${k}"]`);
const calm = matchMedia('(prefers-reduced-motion: reduce)');
let busy = false;

// Start the reel with the current scene in view (scrolling the reel only, never the page)
{
  const li = screen.querySelector('.reel [aria-current]')?.parentElement;
  if (li) li.parentElement.scrollLeft = li.offsetLeft - li.parentElement.offsetLeft - parseFloat(getComputedStyle(li.parentElement).paddingInlineStart);
}

function show(a, picked) {
  if (picked) delete screen.dataset.auto;
  const s = data[a.dataset.slug];
  if (busy || a.hasAttribute('aria-current')) return;
  busy = true;
  const old = frame.querySelector('iframe');
  const next = Object.assign(document.createElement('iframe'), { src: `scenes/${s.slug}/#card`, title: `${s.title}, playing`, tabIndex: -1, inert: true, className: 'next' });
  frame.append(next);
  next.addEventListener('load', () => {
    const swap = () => {
      old.remove();
      next.className = '';
      field('n').textContent = s.n;
      field('mode').textContent = s.mode;
      field('title').textContent = s.title;
      field('desc').textContent = s.desc;
      field('chips').innerHTML = s.chips;
      field('enter').href = `scenes/${s.slug}/`;
      field('source').href = `scenes/${s.slug}/source`;
      reel.forEach((r) => r.toggleAttribute('aria-current', r === a));
      a.setAttribute('aria-current', 'true');
      const ol = a.closest('ol'), li = a.parentElement;
      if (li.offsetLeft < ol.scrollLeft || li.offsetLeft + li.offsetWidth > ol.scrollLeft + ol.clientWidth) ol.scrollTo({ left: li.offsetLeft - 24, behavior: calm.matches ? 'auto' : 'smooth' });
    };
    const t = !calm.matches && document.startViewTransition?.(swap);
    (t ? t.finished : Promise.resolve(t || swap())).finally(() => { busy = false; });
  }, { once: true });
}

for (const a of reel) {
  a.addEventListener('click', (e) => {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    show(a, true);
  });
}

// Advancing: the current poster's bar is a CSS animation; when it ends, the next scene comes on. It only runs while
// the player is on screen and the page is visible.
if (!calm.matches) {
  screen.dataset.auto = '';
  screen.addEventListener('animationend', (e) => {
    if (e.animationName !== 'advance' || !('auto' in screen.dataset)) return;
    const i = reel.findIndex((r) => r.hasAttribute('aria-current'));
    show(reel[(i + 1) % reel.length], false);
  });
  new IntersectionObserver(([e]) => screen.toggleAttribute('data-paused', !e.isIntersecting), { threshold: 0.35 }).observe(screen);
}

// Posters play live on hover or focus, after a short pause so sweeping the pointer across the grid stays quiet
if (matchMedia('(hover: hover)').matches && !calm.matches) {
  let timer, live;
  const stop = () => { clearTimeout(timer); live?.remove(); live = null; };
  const play = (a) => {
    stop();
    timer = setTimeout(() => {
      const f = Object.assign(document.createElement('iframe'), { src: `scenes/${a.dataset.slug}/#card`, tabIndex: -1, inert: true, title: '' });
      f.setAttribute('aria-hidden', 'true');
      f.addEventListener('load', () => f.classList.add('on'), { once: true });
      a.querySelector('.poster').append(f);
      live = f;
    }, 220);
  };
  for (const a of document.querySelectorAll('.tile a')) {
    a.addEventListener('pointerenter', () => play(a));
    a.addEventListener('pointerleave', stop);
    a.addEventListener('focus', () => play(a));
    a.addEventListener('blur', stop);
  }
}
