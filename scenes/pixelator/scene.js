// The lenses are all CSS, and the sliders belong to the Controls panel, which writes their values onto the stage. This
// script does what CSS can't: it keeps the number of blocks in the page equal to the number the CSS asks for, and
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

// CSS decides how many columns and rows the wall has; this keeps exactly that many blocks in the page, so the browser
// never styles blocks nobody can see. Where sibling-index() is missing, each block's index is written in.
const indexed = CSS.supports('order', 'sibling-index()');
function fit() {
  const wall = getComputedStyle(grid);
  const want = wall.getPropertyValue('--cols') * wall.getPropertyValue('--rows');
  while (grid.children.length > want) grid.lastElementChild.remove();
  while (grid.children.length < want) grid.append(document.createElement('i'));
  if (!indexed) [...grid.children].forEach((block, n) => block.style.setProperty('--i', n + 1));
}
stage.toggleAttribute('data-indexed', !indexed);
fit();
// The count changes when a slider or a new photo changes the stage's inline style
new MutationObserver(fit).observe(stage, { attributeFilter: ['style'] });
