// The lenses are all CSS. This script passes in what CSS can't read for itself (the sliders' values, and a chosen photo
// with its shape) and keeps the number of blocks in the page equal to the number the CSS asks for. The photo is read in
// place and never uploaded.
const stage = document.querySelector('.stage');
const tools = stage.querySelector('.tools');
const photo = stage.querySelector('.photo');
const grid = stage.querySelector('.grid');
const note = tools.querySelector('.note');
const original = { label: photo.ariaLabel, note: note.textContent };
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
  stage.toggleAttribute('data-own', true);
  photo.ariaLabel = 'Your photo';
  note.textContent = original.note;
  URL.revokeObjectURL(url);
  url = next;
  fit();
}
function restore() {
  stage.style.removeProperty('--photo');
  stage.style.removeProperty('--ar');
  stage.removeAttribute('data-own');
  photo.ariaLabel = original.label;
  URL.revokeObjectURL(url);
  url = '';
  fit();
}

tools.querySelector('input').addEventListener('change', (e) => { use(e.target.files[0]); e.target.value = ''; });
tools.querySelector('.back').addEventListener('click', restore);
// A photo can also be dropped on the window or pasted
addEventListener('dragover', (e) => { e.preventDefault(); stage.toggleAttribute('data-drop', true); });
addEventListener('dragleave', () => stage.removeAttribute('data-drop'));
addEventListener('drop', (e) => { e.preventDefault(); stage.removeAttribute('data-drop'); use(e.dataTransfer.files[0]); });
addEventListener('paste', (e) => use(e.clipboardData.files[0]));
tools.hidden = false;

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

// Each slider writes its value to the custom property it names
const dials = stage.querySelector('.dials');
dials.addEventListener('input', (e) => {
  if (!e.target.dataset.var) return;
  stage.style.setProperty(e.target.dataset.var, e.target.value);
  fit();
});
dials.toggleAttribute('data-live', true);
