import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform, browserslistToTargets } from 'lightningcss';
import { generateTokens } from './tokens.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = path.join(root, 'dist');
const targets = browserslistToTargets(['chrome >= 120', 'safari >= 17.4', 'firefox >= 128']);
const BUDGET = 14 * 1024; // brotli bytes, HTML + CSS

/** Inline `@import "lib/<name>"` lines, then run Lightning CSS. */
async function bundleCss(source, tokensCss) {
  const parts = [tokensCss];
  for (const m of source.matchAll(/@import\s+["']lib\/([\w-]+)["'];?/g)) {
    parts.push(await readFile(path.join(root, 'packages/lib/src', `${m[1]}.css`), 'utf8'));
  }
  parts.push(source.replace(/@import[^;]+;/g, ''));
  const { code } = transform({
    filename: 'scene.css',
    code: Buffer.from(parts.join('\n')),
    minify: true,
    targets,
  });
  return code.toString();
}

async function build() {
  const tokensCss = await generateTokens(path.join(root, 'packages/tokens/tokens.json'));
  const slugs = (await readdir(path.join(root, 'scenes'), { withFileTypes: true }))
    .filter((d) => d.isDirectory()).map((d) => d.name);
  const report = [];

  for (const slug of slugs) {
    const dir = path.join(root, 'scenes', slug);
    const [html, css, meta] = await Promise.all([
      readFile(path.join(dir, 'index.html'), 'utf8'),
      readFile(path.join(dir, 'scene.css'), 'utf8'),
      readFile(path.join(dir, 'meta.json'), 'utf8').then(JSON.parse),
    ]);
    const out = html.replace('<!--css-->', `<style>${await bundleCss(css, tokensCss)}</style>`);
    const outDir = path.join(dist, 'scenes', slug);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'index.html'), out);
    const raw = Buffer.byteLength(out);
    const br = brotliCompressSync(Buffer.from(out)).length;
    const budget = BUDGET + (meta.exceptions?.extraBytes ?? 0);
    report.push({ slug, raw, gzip: gzipSync(out).length, br, budget, ok: br <= budget });
  }

  console.table(report);
  if (report.some((r) => !r.ok)) { console.error('Budget exceeded'); process.exitCode = 1; }
}

async function dev() {
  await build();
  const types = { '.html': 'text/html; charset=utf-8' };
  createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    try {
      await build(); // rebuild on every request: simple and fast enough for tiny scenes
      const file = path.join(dist, p);
      if (!file.startsWith(dist + path.sep)) throw new Error('bad path');
      const body = await readFile(file); // read before sending headers so a failure can still 404
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      if (!res.headersSent) res.writeHead(404);
      res.end('not found');
    }
  }).listen(4321, () => console.log('http://localhost:4321/scenes/aurora/'));
}

const cmd = process.argv[2];
if (cmd === 'build') await build();
else if (cmd === 'dev') await dev();
else console.log('usage: cli.js build|dev');
