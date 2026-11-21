// js/12-settings.js
// Panel Pengaturan (pola Dokter Laundry): layar utama berisi kotak kategori, tiap kotak membuka
// panel khusus. Saat ini: Pengaturan, Keamanan Akun, Bahasa. Kategori lain menyusul.

const settingsDialog = document.querySelector('#settings-dialog');
const settingsHome = document.querySelector('#settings-home');
const settingsSubview = document.querySelector('#settings-subview');
const settingsTitle = document.querySelector('#settings-title');

const SETTINGS_TITLES = {
  keamanan: '🔒 Keamanan Akun',
  bahasa: '🌐 Bahasa / Language'
};

function setSettingsMessage(text = '', type = '') {
  const el = document.querySelector('#settings-account-msg');
  if (!el) return;
  el.textContent = text ? t(text) : '';
  el.className = `settings-msg${type ? ` ${type}` : ''}`;
}

function showSettingsHome() {
  if (settingsHome) settingsHome.hidden = false;
  if (settingsSubview) settingsSubview.hidden = true;
  if (settingsTitle) settingsTitle.textContent = t('Pengaturan');
  setSettingsMessage();
}

function openSettingsSub(name) {
  if (!SETTINGS_TITLES[name]) return;
  if (settingsHome) settingsHome.hidden = true;
  if (settingsSubview) settingsSubview.hidden = false;
  document.querySelectorAll('.settings-sub-panel').forEach(p => {
    p.classList.toggle('active', p.id === `settings-sub-${name}`);
  });
  if (settingsTitle) settingsTitle.textContent = t(SETTINGS_TITLES[name]);
  if (name === 'keamanan') {
    const emailEl = document.querySelector('#settings-account-email');
    if (emailEl) emailEl.textContent = (activeUser && activeUser.email) || '-';
  }
  if (name === 'bahasa') highlightLanguageButtons();
  setSettingsMessage();
}

function openSettings() {
  if (!settingsDialog) return;
  showSettingsHome(); // selalu mulai dari layar utama
  if (!settingsDialog.open) settingsDialog.showModal();
}

function closeSettings() {
  if (settingsDialog && settingsDialog.open) settingsDialog.close();
}

document.querySelector('#open-settings')?.addEventListener('click', openSettings);
document.querySelector('#open-settings-top')?.addEventListener('click', openSettings);
document.querySelector('#settings-close')?.addEventListener('click', closeSettings);
document.querySelector('#settings-back')?.addEventListener('click', showSettingsHome);
document.querySelectorAll('[data-settings-sub]').forEach(btn => {
  btn.addEventListener('click', () => openSettingsSub(btn.dataset.settingsSub));
});

document.querySelector('#settings-logout')?.addEventListener('click', () => {
  closeSettings();
  if (typeof handleLogout === 'function') handleLogout();
});

async function changeAccountEmail() {
  const input = document.querySelector('#settings-new-email');
  const email = (input?.value || '').trim();
  if (!email) return setSettingsMessage('Masukkan email baru terlebih dahulu.', 'error');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setSettingsMessage('Email tidak valid.', 'error');
  if (!navigator.onLine || !db) return setSettingsMessage('Butuh koneksi internet untuk mengganti data akun.', 'error');
  setSettingsMessage('Menyimpan…');
  const { error } = await db.auth.updateUser({ email }, { emailRedirectTo: location.origin + location.pathname });
  if (error) return setSettingsMessage(translateAuthError(error), 'error');
  if (input) input.value = '';
  setSettingsMessage('Tautan konfirmasi dikirim. Cek email baru (dan email lama) lalu klik tautannya untuk menyelesaikan penggantian.', 'success');
}

async function changeAccountPassword() {
  const input = document.querySelector('#settings-new-password');
  const password = input?.value || '';
  if (password.length < 6) return setSettingsMessage('Kata sandi minimal 6 karakter.', 'error');
  if (!navigator.onLine || !db) return setSettingsMessage('Butuh koneksi internet untuk mengganti data akun.', 'error');
  setSettingsMessage('Menyimpan…');
  const { error } = await db.auth.updateUser({ password });
  if (error) return setSettingsMessage(translateAuthError(error), 'error');
  if (input) input.value = '';
  setSettingsMessage('Kata sandi berhasil diganti.', 'success');
}

document.querySelector('#settings-change-email')?.addEventListener('click', changeAccountEmail);
document.querySelector('#settings-change-password')?.addEventListener('click', changeAccountPassword);
