// The pixelation is all CSS. This script only swaps the photo: it points --photo at the chosen file and gives the CSS
// the photo's shape, which CSS has no way to read from an image. The file is read in place and never uploaded.
const stage = document.querySelector('.stage');
const tools = stage.querySelector('.tools');
const photo = stage.querySelector('.photo');
const note = tools.querySelector('.note');
const original = { label: photo.ariaLabel, note: note.textContent };
let url = '';

const use = async (file) => {
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
};
const restore = () => {
  stage.style.removeProperty('--photo');
  stage.style.removeProperty('--ar');
  stage.removeAttribute('data-own');
  photo.ariaLabel = original.label;
  URL.revokeObjectURL(url);
  url = '';
};

tools.querySelector('input').addEventListener('change', (e) => { use(e.target.files[0]); e.target.value = ''; });
tools.querySelector('.back').addEventListener('click', restore);
// A photo can also be dropped on the window or pasted
addEventListener('dragover', (e) => { e.preventDefault(); stage.toggleAttribute('data-drop', true); });
addEventListener('dragleave', () => stage.removeAttribute('data-drop'));
addEventListener('drop', (e) => { e.preventDefault(); stage.removeAttribute('data-drop'); use(e.dataTransfer.files[0]); });
addEventListener('paste', (e) => use(e.clipboardData.files[0]));
tools.hidden = false;

// Browsers without sibling-index() get each tile's index written in
if (!CSS.supports('order', 'sibling-index()')) {
  stage.querySelectorAll('.grid i').forEach((tile, n) => tile.style.setProperty('--i', n + 1));
  stage.toggleAttribute('data-indexed', true);
}
