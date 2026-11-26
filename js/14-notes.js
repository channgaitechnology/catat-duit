/* ===================== CATATAN (buku catatan bebas, gaya Dokter Laundry) ===================== */
var notes = [];
var editingNoteId = null;
var notesLoaded = false;
const NOTE_BOOK_PALETTE = [['#4f7a3a', '#2e5233'], ['#6f9a4a', '#3d6a40'], ['#d9a24b', '#a8742a'], ['#7da7d8', '#4a76a8'], ['#1d3328', '#0f1c15'], ['#e98972', '#b95a47']];
const NOTE_MAX_CHARS = 1400000;

function noteDt(v) {
  try { return new Intl.DateTimeFormat(APP_LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(v)); } catch (e) { return ''; }
}
function noteById(id) { return notes.find(x => String(x.id) === String(id)); }

async function loadNotes() {
  if (!db || !activeUser) return;
  const { data, error } = await db.from('notes').select('*').eq('user_id', activeUser.id).order('updated_at', { ascending: false });
  if (error) { showToast('Gagal memuat catatan.', 'warning'); return; }
  notes = (data || []).map(r => ({ id: r.id, judul: r.judul || 'Tanpa Judul', isi: r.isi || '', createdAt: r.created_at, updatedAt: r.updated_at }));
  notesLoaded = true;
}
function showNotesHome() {
  document.querySelector('#notes-home').hidden = false;
  document.querySelector('#notes-editor-view').hidden = true;
  renderNotesGrid();
}
async function openNotes() {
  const dlg = document.querySelector('#notes-dialog');
  if (!dlg) return;
  showNotesHome();
  if (!dlg.open) dlg.showModal();
  await loadNotes();
  renderNotesGrid();
}
function renderNotesGrid() {
  const grid = document.querySelector('#notes-grid');
  if (!grid) return;
  if (!notes.length) { grid.innerHTML = `<div class="notes-empty">${escapeHtml('Belum ada catatan. Ketuk "+ Catatan Baru" di atas untuk mulai mencatat.')}</div>`; return; }
  grid.innerHTML = notes.map((n, i) => {
    const [c1, c2] = NOTE_BOOK_PALETTE[i % NOTE_BOOK_PALETTE.length];
    return `<button type="button" class="note-book" data-note-id="${escapeHtml(String(n.id))}" style="background:linear-gradient(160deg,${c1},${c2});"><div class="note-book-title">${escapeHtml(n.judul)}</div><div class="note-book-dates">Dibuat: ${escapeHtml(noteDt(n.createdAt))}<br>Diedit: ${escapeHtml(noteDt(n.updatedAt))}</div></button>`;
  }).join('');
}
function showNoteEditor(n) {
  editingNoteId = n ? n.id : null;
  document.querySelector('#note-judul').value = n ? n.judul : '';
  document.querySelector('#note-isi').innerHTML = n ? sanitizeNoteHTML(n.isi) : '';
  document.querySelector('#note-dates-info').textContent = n ? `Dibuat: ${noteDt(n.createdAt)}  •  Terakhir diedit: ${noteDt(n.updatedAt)}` : 'Catatan baru — belum disimpan.';
  document.querySelector('#note-delete-btn').hidden = !n;
  document.querySelector('#notes-home').hidden = true;
  document.querySelector('#notes-editor-view').hidden = false;
  document.querySelector('#notes-dialog .notes-body').scrollTop = 0;
  setTimeout(() => document.querySelector('#note-judul')?.focus({ preventScroll: true }), 50);
}
function noteFocusEditor() { const ed = document.querySelector('#note-isi'); if (document.activeElement !== ed) ed.focus(); }
function noteFormat(cmd) { noteFocusEditor(); document.execCommand(cmd, false, null); }
function noteHighlight(color) { noteFocusEditor(); document.execCommand('hiliteColor', false, color); }
function insertNoteChecklist() { noteFocusEditor(); document.execCommand('insertHTML', false, '<div class="note-check-line"><input type="checkbox"> <span>&nbsp;</span></div>'); }

const NOTE_ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'DIV', 'BR', 'SPAN', 'P', 'IMG', 'INPUT', 'FONT']);
const NOTE_STRIP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'NOSCRIPT']);
function sanitizeNoteHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  (function walk(parent) {
    Array.from(parent.childNodes).forEach(node => {
      if (node.nodeType === 1) {
        if (NOTE_STRIP_TAGS.has(node.tagName)) { parent.removeChild(node); return; }
        if (!NOTE_ALLOWED_TAGS.has(node.tagName)) { while (node.firstChild) parent.insertBefore(node.firstChild, node); parent.removeChild(node); return; }
        Array.from(node.attributes).forEach(attr => {
          const name = attr.name.toLowerCase(), val = attr.value || '';
          if (name.startsWith('on')) { node.removeAttribute(attr.name); return; }
          if (node.tagName === 'IMG') {
            if (name === 'src') { if (!/^data:image\/(jpeg|png|gif|webp);base64,/i.test(val)) node.removeAttribute(attr.name); }
            else if (name !== 'alt') node.removeAttribute(attr.name);
            return;
          }
          if (node.tagName === 'INPUT') { if (name !== 'type' && name !== 'checked') node.removeAttribute(attr.name); return; }
          if (name === 'style') { if (/url\(|expression|javascript:/i.test(val)) node.removeAttribute(attr.name); return; }
          if (name !== 'color' && name !== 'class') node.removeAttribute(attr.name);
        });
        if (node.tagName === 'INPUT') node.setAttribute('type', 'checkbox');
        walk(node);
      } else if (node.nodeType !== 3) parent.removeChild(node);
    });
  })(tmp);
  return tmp.innerHTML;
}
function insertNoteImage(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Pilih berkas gambar (JPG/PNG)', 'warning'); return; }
  if (file.size > 15 * 1024 * 1024) { showToast('Ukuran file terlalu besar (maks 15MB)', 'warning'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 480 / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      document.querySelector('#note-isi').focus();
      document.execCommand('insertImage', false, c.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => showToast('Gagal membaca gambar', 'warning');
    img.src = reader.result;
  };
  reader.onerror = () => showToast('Gagal membaca berkas', 'warning');
  reader.readAsDataURL(file);
}
async function saveNote() {
  if (!db || !activeUser) return;
  const judul = (document.querySelector('#note-judul').value.trim() || 'Tanpa Judul').slice(0, 80);
  const isi = sanitizeNoteHTML(document.querySelector('#note-isi').innerHTML);
  if (isi.length > NOTE_MAX_CHARS) { showToast('Catatan terlalu besar. Kurangi foto atau teks.', 'warning'); return; }
  if (!navigator.onLine) { showToast('Catatan butuh koneksi internet untuk disimpan.', 'warning'); return; }
  const q = editingNoteId
    ? db.from('notes').update({ judul, isi, updated_at: new Date().toISOString() }).eq('id', editingNoteId).eq('user_id', activeUser.id).select().single()
    : db.from('notes').insert({ user_id: activeUser.id, judul, isi }).select().single();
  const { data, error } = await q;
  if (error) { showToast(/Batas 200/.test(error.message || '') ? 'Batas 200 catatan tercapai.' : 'Gagal menyimpan catatan.', 'warning'); return; }
  notes = notes.filter(n => String(n.id) !== String(data.id));
  notes.unshift({ id: data.id, judul: data.judul, isi: data.isi || '', createdAt: data.created_at, updatedAt: data.updated_at });
  showToast('Catatan tersimpan', 'success');
  showNotesHome();
}
async function deleteNote() {
  const n = noteById(editingNoteId);
  if (!n) return;
  if (!confirm(`Hapus catatan "${n.judul}"?`)) return;
  const { error } = await db.from('notes').delete().eq('id', n.id).eq('user_id', activeUser.id);
  if (error) { showToast('Gagal menghapus catatan.', 'warning'); return; }
  notes = notes.filter(x => String(x.id) !== String(n.id));
  showToast('Catatan dihapus', 'success');
  showNotesHome();
}

document.querySelector('#open-notes-top')?.addEventListener('click', openNotes);
document.querySelector('#notes-close')?.addEventListener('click', () => document.querySelector('#notes-dialog').close());
document.querySelector('#notes-new-btn')?.addEventListener('click', () => showNoteEditor(null));
document.querySelector('#notes-back-btn')?.addEventListener('click', showNotesHome);
document.querySelector('#note-save-btn')?.addEventListener('click', saveNote);
document.querySelector('#note-delete-btn')?.addEventListener('click', deleteNote);
document.querySelector('#note-image-input')?.addEventListener('change', insertNoteImage);
document.querySelector('#notes-grid')?.addEventListener('click', e => {
  const b = e.target.closest('[data-note-id]');
  if (b) { const n = noteById(b.dataset.noteId); if (n) showNoteEditor(n); }
});
document.querySelector('#notes-dialog')?.addEventListener('mousedown', e => {
  if (e.target.closest('[data-note-cmd]') || e.target.closest('[data-note-hl]')) e.preventDefault();
});
document.querySelector('#notes-dialog')?.addEventListener('click', e => {
  const c = e.target.closest('[data-note-cmd]');
  if (c) { const cmd = c.dataset.noteCmd; if (cmd === 'check') insertNoteChecklist(); else if (cmd === 'image') document.querySelector('#note-image-input').click(); else noteFormat(cmd); return; }
  const h = e.target.closest('[data-note-hl]');
  if (h) noteHighlight(h.dataset.noteHl);
});
document.querySelector('#note-isi')?.addEventListener('change', e => {
  if (e.target && e.target.type === 'checkbox') { if (e.target.checked) e.target.setAttribute('checked', 'checked'); else e.target.removeAttribute('checked'); }
});
