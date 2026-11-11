// js/03-data.js
// Inisialisasi aplikasi setelah login, pemuatan data awal dari Supabase, dan listener status autentikasi

async function showApp(user) {
  activeUser = user;
  if (authView) authView.hidden = true;
  if (appShell) appShell.hidden = false;
  const email = user.email || 'Akun Catat Duit';
  const profileEmail = document.querySelector('#profile-email');
  if (profileEmail) profileEmail.textContent = email;

  const initial = (email[0] || 'C').toUpperCase();
  const avatarEl = document.querySelector('#profile-avatar');
  if (avatarEl) avatarEl.textContent = initial;
  const avatarSmallEl = document.querySelector('#profile-avatar-small');
  if (avatarSmallEl) avatarSmallEl.textContent = initial;

  const welcomeTitle = document.querySelector('#welcome-title');
  if (welcomeTitle) {
    welcomeTitle.innerHTML = `Halo, ${escapeHtml(email.split('@')[0])} <span class="wave">✳</span>`;
  }

  setupRealtime(user.id);
  await refreshData();
}

async function refreshData() {
  if (!activeUser || !db) return;
  const [r, a, c] = await Promise.all([
    db.from('finance_records').select('*').eq('user_id', activeUser.id).order('record_date', { ascending: false }).order('created_at', { ascending: true }),
    db.from('assets').select('*').eq('user_id', activeUser.id).order('name'),
    db.from('categories').select('*').eq('user_id', activeUser.id).order('name')
  ]);
  if (r.error || a.error) {
    console.error(r.error || a.error);
    alert('Data belum dapat dimuat. Periksa koneksi lalu muat ulang halaman.');
    return;
  }
  records = r.data || [];
  assets = a.data || [];
  if (c && !c.error && c.data) {
    customCategories = c.data.map(item => item.name);
    syncCategoriesToLocal(customCategories);
  } else {
    customCategories = getCustomCategories();
  }
  populateCategorySelects();
  render();
}

if (db && db.auth) {
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      if (appShell) appShell.hidden = true;
      if (authView) authView.hidden = false;
      setAuthMode('reset');
      setAuthMessage('Masukkan kata sandi baru untuk akun Anda.');
      return;
    }
    if (session) showApp(session.user);
    else showLogin();
  });
}
