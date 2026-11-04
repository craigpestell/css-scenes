/** Render the link-preview images: each scene (and the gallery) at 1200×630 in the dark scheme, saved as
 * sites/og/<slug>.jpg and sites/og/index.jpg. Run `pnpm build` first, then `pnpm og`, and commit the images.
 * Needs Playwright with Chromium, which isn't a project dependency; install it globally or run with NODE_PATH set. */
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'sites/og');

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch {
  console.error('pnpm og needs Playwright: install it globally (npm i -g playwright) or set NODE_PATH to where it lives.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const body = await readFile(path.join(dist, p));
    res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.svg') ? 'image/svg+xml' : 'text/html' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const slugs = (await readdir(path.join(dist, 'scenes'), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: 'dark' });
for (const [name, url] of [['index', '/'], ...slugs.map((s) => [s, `/scenes/${s}/#card`])]) {
  await page.goto(base + url);
  await page.waitForTimeout(2500); // let previews load and loops settle into a representative frame
  await page.screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 80 });
  console.log(`sites/og/${name}.jpg`);
}
await browser.close();
server.close();
