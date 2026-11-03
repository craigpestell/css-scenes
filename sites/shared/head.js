/** Head tags every page shares: the site icon and link-preview (Open Graph) tags. Preview images are pre-rendered into
 * sites/og/ by `pnpm og` and copied to dist/og/; link previews need absolute URLs, so they point at production. */
export const SITE = 'https://css-scenes.vercel.app';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The wordmark's conic dot, as the tab icon. */
export const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9d85ff"/><stop offset=".55" stop-color="#ff7ac6"/><stop offset="1" stop-color="#ffc27a"/></linearGradient></defs><circle cx="16" cy="16" r="13" fill="url(#g)"/></svg>
`;

/**
 * @param {{ root: string, title: string, description: string, path: string, image: string | null }} page
 *   root is the relative way back to the site root ('' or '../../'); path and image are site-absolute paths ('/scenes/x/').
 */
export const headTags = ({ root, title, description, path, image }) => [
  `<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">`,
  `<meta property="og:site_name" content="CSS Scenes">`,
  `<meta property="og:title" content="${esc(title)}">`,
  description && `<meta property="og:description" content="${esc(description)}">`,
  `<meta property="og:url" content="${SITE}${path}">`,
  image && `<meta property="og:image" content="${SITE}${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">`,
].filter(Boolean).join('');
