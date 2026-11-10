// The lenses are all CSS, and the sliders belong to the Controls panel, which writes their values onto the stage. This
// script does what CSS can't: it keeps the number of blocks in the page equal to the number the wall needs, and
// swaps in a photo the visitor chooses. The photo is read in place and never uploaded.
const stage = document.querySelector('.stage');
const photo = stage.querySelector('.photo');
const grid = stage.querySelector('.grid');
const note = stage.querySelector('.note');
const label = photo.ariaLabel;
let url = '';

async function use(file) {
  if (!file?.type.startsWith('image/')) return;
  const next = URL.createObjectURL(file);
  const img = new Image();
  img.src = next;
  try { await img.decode(); } catch {
    URL.revokeObjectURL(next);
    note.textContent = "That file didn't open as an image. Try a JPEG or PNG.";
    return;
  }
  stage.style.setProperty('--photo', `url("${next}")`);
  stage.style.setProperty('--ar', (img.naturalWidth / img.naturalHeight || 1).toFixed(4));
  stage.toggleAttribute('data-file', true); // the panel shows "Back to David" while this is set
  photo.ariaLabel = 'Your photo';
  note.textContent = '';
  URL.revokeObjectURL(url);
  url = next;
}
function restore() {
  stage.style.removeProperty('--photo');
  stage.style.removeProperty('--ar');
  stage.removeAttribute('data-file');
  photo.ariaLabel = label;
  note.textContent = '';
  URL.revokeObjectURL(url);
  url = '';
}

// The panel's photo button sends the file here, or nothing to go back. A photo can also be dropped or pasted
stage.addEventListener('scene:photo', (e) => (e.detail ? use(e.detail) : restore()));
addEventListener('dragover', (e) => { e.preventDefault(); stage.toggleAttribute('data-drop', true); });
addEventListener('dragleave', () => stage.removeAttribute('data-drop'));
addEventListener('drop', (e) => { e.preventDefault(); stage.removeAttribute('data-drop'); use(e.dataTransfer.files[0]); });
addEventListener('paste', (e) => use(e.clipboardData.files[0]));

// How many columns and rows the wall has. The CSS works out the same numbers for the page as it first loads; working
// them out here as well lets the blocks be added or removed before the browser restyles, so it restyles the wall once
// per change and not twice. Where sibling-index() is missing, each block's index is written in.
const indexed = CSS.supports('order', 'sibling-index()');
function fit() {
  const block = parseFloat(stage.style.getPropertyValue('--block') || 55);
  const ar = parseFloat(stage.style.getPropertyValue('--ar') || 0.6667);
  const shape = Math.min(3, Math.max(0.34, ar));
  const cols = Math.round(Math.sqrt(3456 * 144 ** (block / -100) * shape));
  const rows = Math.round(cols / shape);
  if (stage.style.getPropertyValue('--cols') != cols) stage.style.setProperty('--cols', cols);
  if (stage.style.getPropertyValue('--rows') != rows) stage.style.setProperty('--rows', rows);
  const want = cols * rows;
  while (grid.children.length > want) grid.lastElementChild.remove();
  if (grid.children.length < want) grid.append(...Array.from({ length: want - grid.children.length }, () => document.createElement('i')));
  if (!indexed) [...grid.children].forEach((b, n) => b.style.setProperty('--i', n + 1));
}
stage.toggleAttribute('data-indexed', !indexed);
fit();
// The count changes when a slider or a new photo changes the stage's inline style
new MutationObserver(fit).observe(stage, { attributeFilter: ['style'] });
