/** Tiny build-time Markdown renderer for scene write-ups. It covers what writeup.md files use and nothing more:
 * front matter (dropped), ## and ### headings (with ids), paragraphs, `-` lists, pipe tables, fenced code (highlighted),
 * and inline code, **bold**, *italic* / _italic_ and [links](url). Anything else renders as plain paragraph text. */
import { esc, highlight } from './highlight.js';

export const slugify = (s) => s.toLowerCase().replace(/<[^>]+>|&#?\w+;/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');

/** Inline spans. Code is cut out first so nothing inside backticks is treated as markup. */
function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
  s = esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[i])}</code>`);
}

const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/**
 * @returns {{ html: string, toc: { level: number, id: string, text: string }[] }}
 */
export function renderMarkdown(src) {
  const lines = src.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n');
  const out = [];
  const toc = [];
  let para = [];
  const flush = () => { if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`); para = []; };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      flush();
      const body = [];
      while (++i < lines.length && !lines[i].startsWith('```')) body.push(lines[i]);
      const code = body.join('\n');
      const hl = highlight[fence[1]] ?? esc;
      out.push(`<pre class="snippet"><code>${hl(code)}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{2,3})\s+(.*)/);
    if (h) {
      flush();
      const level = h[1].length;
      const html = inline(h[2]);
      const id = slugify(h[2]);
      toc.push({ level, id, text: html });
      out.push(`<h${level} id="${id}">${html}</h${level}>`);
      continue;
    }
    if (/^\s*- /.test(line)) {
      flush();
      const items = [];
      for (; i < lines.length && /^\s*- /.test(lines[i]); i++) {
        let item = lines[i].replace(/^\s*- /, '');
        // continuation lines indented under the bullet
        while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !/^\s*- /.test(lines[i + 1])) item += ` ${lines[++i].trim()}`;
        items.push(`<li>${inline(item)}</li>`);
      }
      i--;
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (/^\|/.test(line) && /^\|[\s:|-]+\|$/.test(lines[i + 1]?.trim() ?? '')) {
      flush();
      const head = cells(line);
      const rows = [];
      for (i += 2; i < lines.length && /^\|/.test(lines[i]); i++) rows.push(cells(lines[i]));
      i--;
      out.push(`<div class="table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${
        rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (!line.trim() || /^---\s*$/.test(line)) { flush(); continue; }
    if (/^#\s/.test(line)) { flush(); continue; } // a document title duplicates the page's own h1
    para.push(line.trim());
  }
  flush();
  return { html: out.join('\n'), toc };
}
