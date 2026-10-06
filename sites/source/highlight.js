/** Tiny build-time syntax highlighter for scene sources: HTML, CSS and JS in, escaped HTML with <span class="t-*"> out. */

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const span = (cls, s) => `<span class="t-${cls}">${esc(s)}</span>`;

/** Rules are [class, regex] pairs tried left to right at each position; unmatched text passes through. */
function tokenize(src, rules) {
  const re = new RegExp(rules.map(([, r]) => `(${r.source})`).join('|'), 'gi');
  let out = '';
  let last = 0;
  for (const m of src.matchAll(re)) {
    const i = m.slice(1).findIndex((g) => g !== undefined);
    const [cls] = rules[i];
    out += esc(src.slice(last, m.index)) + (typeof cls === 'function' ? cls(m[0]) : span(cls, m[0]));
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}

const STRING = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/;
const NUMBER = /(?<![\w-])-?(?:\d*\.)?\d+(?:e-?\d+)?[a-z%]*|#[\da-f]{3,8}\b/;

const css = (src) => tokenize(src, [
  ['com', /\/\*[\s\S]*?\*\//],
  ['str', STRING],
  ['kw', /@[\w-]+/],
  // a property is a name followed by a colon whose value ends before the next block opens (so not a:hover {)
  ['prop', /--[\w-]+(?=\s*:[^;{}]*(?:[;}]|$))|[a-z-]+(?=\s*:(?!:)[^;{}]*(?:[;}]|$))/],
  ['var', /--[\w-]+/],
  ['fn', /[\w-]+(?=\()/],
  ['num', NUMBER],
]);

const KEYWORDS = 'const let var function return if else for of in while do break continue new class extends import export from default async await yield try catch finally throw typeof instanceof this null undefined true false';

const js = (src) => tokenize(src, [
  ['com', /\/\/[^\n]*|\/\*[\s\S]*?\*\//],
  ['str', /`(?:[^`\\]|\\.)*`/],
  ['str', STRING],
  ['kw', new RegExp(`\\b(?:${KEYWORDS.replaceAll(' ', '|')})\\b`)],
  ['fn', /[\w$]+(?=\()/],
  ['num', /\b\d+(?:\.\d+)?\b/],
]);

/** Inside a tag: name, attribute names and quoted values; inline style attributes get CSS highlighting. */
const tag = (src) => src.replace(/^(<\/?)([\w-]+)([\s\S]*?)(\/?>)$/, (_, open, name, attrs, close) =>
  esc(open) + span('kw', name) + tokenize(attrs, [
    [(s) => {
      const [, n, q] = s.match(/^([\w:-]+)=("[^"]*"|'[^']*')$/);
      const value = n === 'style' ? `${esc(q[0])}${css(q.slice(1, -1))}${esc(q[0])}` : esc(q);
      return `${span('prop', n)}=<span class="t-str">${value}</span>`;
    }, /[\w:-]+=(?:"[^"]*"|'[^']*')/],
    ['prop', /[\w:-]+/],
  ]) + esc(close));

const html = (src) => tokenize(src, [
  ['com', /<!--[\s\S]*?-->/],
  ['kw', /<!doctype[^>]*>/],
  [tag, /<\/?[\w-]+(?:\s[^>]*)?\/?>/],
]);

export const highlight = { html, css, js };
