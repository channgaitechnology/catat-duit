// js/13-share.js
// "Bantu keluarga & teman": bagikan app dengan nada mengajak membantu, bukan iklan.
// Kanal dengan tautan berbagi resmi (WhatsApp, Facebook, Telegram, X, LinkedIn, Email) dibuka langsung.
// Instagram & Slack tidak punya tautan berbagi web, jadi dilayani lewat menu berbagi bawaan HP
// (navigator.share) atau "Salin tautan".

const SHARE_URL = 'https://catat-duit-keuangan.netlify.app/';
const SHARE_TITLE = 'Catat Duit';
const SHARE_TEXT_ID = 'Lagi kesulitan mengatur uang? Bisa jadi penyebabnya catatan keuangan yang kacau. Coba pakai Catat Duit, aplikasi catatan keuangan yang simpel dan gratis. Semoga membantu:';
const SHARE_TEXT_EN = 'Struggling with money? The cause might be messy financial records. Try Catat Duit, a simple, free finance tracker. Hope it helps:';

const shareDialog = document.querySelector('#share-dialog');

function shareText() { return currentLang === 'en' ? SHARE_TEXT_EN : SHARE_TEXT_ID; }

function shareLinks() {
  const u = encodeURIComponent(SHARE_URL);
  const txt = shareText();
  const both = encodeURIComponent(`${txt} ${SHARE_URL}`);
  return {
    whatsapp: `https://wa.me/?text=${both}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${encodeURIComponent(txt)}`,
    telegram: `https://t.me/share/url?url=${u}&text=${encodeURIComponent(txt)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}&url=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    email: `mailto:?subject=${encodeURIComponent(SHARE_TITLE)}&body=${both}`
  };
}

function setShareMessage(text = '') {
  const el = document.querySelector('#share-msg');
  if (el) el.textContent = text ? t(text) : '';
}

function openShareDialog() {
  if (!shareDialog) return;
  const links = shareLinks();
  document.querySelectorAll('#share-grid [data-share]').forEach(a => { a.href = links[a.dataset.share] || '#'; });
  // Menu berbagi bawaan hanya ditampilkan bila perangkat mendukung
  const nativeBtn = document.querySelector('#share-native');
  if (nativeBtn) nativeBtn.hidden = typeof navigator.share !== 'function';
  setShareMessage();
  if (typeof closeSettings === 'function') closeSettings();
  if (!shareDialog.open) shareDialog.showModal();
}

async function copyShareLink() {
  const full = `${shareText()} ${SHARE_URL}`;
  try {
    await navigator.clipboard.writeText(full);
    setShareMessage('Tautan disalin. Tinggal tempel di chat atau media sosial.');
  } catch (e) {
    window.prompt(t('Salin tautan ini:'), full);
  }
}

document.querySelector('#open-share-overview')?.addEventListener('click', openShareDialog);
document.querySelector('#open-share-tile')?.addEventListener('click', openShareDialog);
document.querySelector('#share-close')?.addEventListener('click', () => shareDialog.close());
document.querySelector('#share-copy')?.addEventListener('click', copyShareLink);
document.querySelector('#share-native')?.addEventListener('click', async () => {
  try {
    await navigator.share({ title: SHARE_TITLE, text: shareText(), url: SHARE_URL });
  } catch (e) { /* dibatalkan pengguna */ }
});
