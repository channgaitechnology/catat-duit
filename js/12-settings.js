// js/12-settings.js
// Panel Pengaturan (pola Dokter Laundry): layar utama berisi kotak kategori, tiap kotak membuka
// panel khusus. Saat ini: Pengaturan, Keamanan Akun, Bahasa. Kategori lain menyusul.

const settingsDialog = document.querySelector('#settings-dialog');
const settingsHome = document.querySelector('#settings-home');
const settingsSubview = document.querySelector('#settings-subview');
const settingsTitle = document.querySelector('#settings-title');

const SETTINGS_TITLES = {
  profil: '👤 Profil',
  keamanan: '🔒 Keamanan Akun',
  bahasa: '🌐 Bahasa / Language'
};

function setSettingsMessage(text = '', type = '', target = '#settings-account-msg') {
  const el = document.querySelector(target);
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
  if (name === 'profil') fillProfilePanel();
  setSettingsMessage();
  setSettingsMessage('', '', '#settings-profile-msg');
}

function formatRegisteredSince(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d)) return '-';
  return new Intl.DateTimeFormat(APP_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

function fillProfilePanel() {
  const cached = getCachedData(STORAGE_KEY_USER, null) || {};
  const user = activeUser || {};
  const emailEl = document.querySelector('#profile-panel-email');
  if (emailEl) emailEl.textContent = user.email || cached.email || '-';
  const sinceEl = document.querySelector('#profile-panel-since');
  if (sinceEl) sinceEl.textContent = formatRegisteredSince(user.created_at || cached.created_at);
  const nameInput = document.querySelector('#settings-display-name');
  if (nameInput) {
    const custom = user.user_metadata && user.user_metadata.display_name;
    nameInput.value = custom || cached.name || '';
  }
}

async function saveDisplayName() {
  const input = document.querySelector('#settings-display-name');
  const name = (input?.value || '').replace(/\s+/g, ' ').trim();
  const msg = (text, type) => setSettingsMessage(text, type, '#settings-profile-msg');
  if (name.length > 40) return msg('Nama maksimal 40 karakter.', 'error');
  if (!navigator.onLine || !db) return msg('Butuh koneksi internet untuk mengganti data akun.', 'error');
  msg('Menyimpan…');
  // Nama disimpan di metadata akun Supabase (tidak ada tabel baru). Kosong = kembali ke nama dari email.
  const { data, error } = await db.auth.updateUser({ data: { display_name: name } });
  if (error) return msg(translateAuthError(error), 'error');
  if (data && data.user) activeUser = data.user;
  if (activeUser) {
    applyUserIdentity(activeUser);
    const cached = getCachedData(STORAGE_KEY_USER, null) || {};
    setCachedData(STORAGE_KEY_USER, { ...cached, name });
  }
  msg(name ? 'Nama berhasil disimpan.' : 'Nama dikembalikan ke nama dari email.', 'success');
}

document.querySelector('#settings-save-name')?.addEventListener('click', saveDisplayName);
document.querySelector('#settings-display-name')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); saveDisplayName(); }
});

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
