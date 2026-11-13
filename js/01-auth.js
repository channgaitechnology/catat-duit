// js/01-auth.js
// Penanganan Supabase Auth, tampilan form autentikasi, dan toggle kata sandi

function setupPasswordToggle(button, input) {
  if (!button || !input) return;
  button.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    button.textContent = isPassword ? 'Sembunyi' : 'Lihat';
    button.setAttribute('aria-label', `${isPassword ? 'Sembunyikan' : 'Tampilkan'} ${button.id === 'toggle-confirm-password' ? 'ulangi kata sandi' : 'kata sandi'}`);
  });
}

function resetPasswordVisibility() {
  if (authPassword) {
    authPassword.type = 'password';
    if (togglePassword) togglePassword.textContent = 'Lihat';
  }
  if (authConfirm) {
    authConfirm.type = 'password';
    if (toggleConfirmPassword) toggleConfirmPassword.textContent = 'Lihat';
  }
}

setupPasswordToggle(togglePassword, authPassword);
setupPasswordToggle(toggleConfirmPassword, authConfirm);

function setAuthMessage(message = '', type = '') {
  const el = document.querySelector('#auth-message');
  if (!el) return;
  el.textContent = message;
  el.className = `auth-message${type ? ` ${type}` : ''}`;
}

function setAuthMode(mode) {
  resetPasswordVisibility();
  authMode = mode;
  const choose = mode === 'choose';
  const signup = mode === 'signup', forgot = mode === 'forgot', reset = mode === 'reset';

  // Mode "choose": hanya tombol Masuk & Daftar. Kolom email/sandi baru muncul setelah salah satu diklik.
  const choiceBox = document.querySelector('#auth-choice');
  if (choiceBox) choiceBox.hidden = !choose;
  if (authForm) authForm.hidden = choose;
  const linksBox = document.querySelector('#auth-links');
  if (linksBox) linksBox.hidden = choose;
  const backChoice = document.querySelector('#auth-back-choice');
  if (backChoice) backChoice.hidden = choose || reset;

  const authTitle = document.querySelector('#auth-title');
  if (authTitle) authTitle.textContent = choose ? 'Selamat datang' : signup ? 'Buat akun Catat Duit' : forgot ? 'Reset kata sandi' : reset ? 'Buat kata sandi baru' : 'Masuk ke Catat Duit';

  const authDesc = document.querySelector('#auth-description');
  if (authDesc) authDesc.textContent = choose ? 'Masuk atau daftar untuk mulai mencatat.' : reset ? 'Masukkan kata sandi baru untuk akun Anda.' : 'Gunakan akun Catat Duit Anda.';

  const authSubmitBtn = document.querySelector('#auth-submit');
  if (authSubmitBtn) authSubmitBtn.textContent = signup ? 'Daftar' : forgot ? 'Kirim tautan reset' : reset ? 'Simpan kata sandi' : 'Masuk';

  const pwdLabel = document.querySelector('#auth-password-label');
  if (pwdLabel) pwdLabel.hidden = forgot;
  if (authPassword) {
    authPassword.disabled = forgot;
    authPassword.required = !forgot;
    authPassword.autocomplete = signup || reset ? 'new-password' : 'current-password';
  }

  const confirmLabel = document.querySelector('#auth-confirm-label');
  if (confirmLabel) confirmLabel.hidden = !(signup || reset);
  if (authConfirm) {
    authConfirm.disabled = !(signup || reset);
    authConfirm.required = signup || reset;
  }

  const modeToggle = document.querySelector('#auth-mode-toggle');
  if (modeToggle) {
    modeToggle.hidden = forgot || reset;
    modeToggle.textContent = signup ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar';
  }

  const forgotBtn = document.querySelector('#auth-forgot');
  if (forgotBtn) forgotBtn.hidden = mode !== 'signin';

  const backToLogin = document.querySelector('#auth-back-to-login');
  if (backToLogin) backToLogin.hidden = !(forgot || reset);

  setAuthMessage();
}

function showLogin() {
  cleanupRealtime();
  activeUser = null;
  if (appShell) appShell.hidden = true;
  if (authView) authView.hidden = false;
  setAuthMode('choose');
}

function translateAuthError(e) {
  const m = e?.message || 'Terjadi kesalahan. Coba lagi.';
  if (/invalid login credentials/i.test(m)) return 'Email atau kata sandi tidak cocok.';
  if (/email not confirmed/i.test(m)) return 'Konfirmasi email Anda sebelum masuk.';
  if (/already registered|already exists/i.test(m)) return 'Email sudah terdaftar. Silakan masuk.';
  if (/password should be at least/i.test(m)) return 'Kata sandi minimal 6 karakter.';
  if (/rate limit/i.test(m)) return 'Terlalu banyak percobaan. Coba lagi beberapa saat.';
  if (/redirect.*not allowed|redirect url/i.test(m)) return 'Alamat aplikasi belum terdaftar sebagai URL pengalihan Supabase.';
  return m;
}

async function submitAuth(event) {
  event.preventDefault();
  if (authBusy) return;
  authBusy = true;
  const submitBtn = document.querySelector('#auth-submit');
  if (submitBtn) submitBtn.disabled = true;
  setAuthMessage('Memproses…');

  const email = authEmail.value.trim();
  const password = authPassword.value;
  const redirectTo = location.origin + location.pathname;

  try {
    if (authMode === 'signin') {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    if (authMode === 'signup') {
      if (password !== authConfirm.value) throw Error('Ulangan kata sandi tidak cocok.');
      const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      if (data.user && !data.session) setAuthMessage('Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.', 'success');
    }
    if (authMode === 'forgot') {
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setAuthMessage('Jika email terdaftar, tautan reset kata sandi akan dikirim.', 'success');
    }
    if (authMode === 'reset') {
      if (password !== authConfirm.value) throw Error('Ulangan kata sandi tidak cocok.');
      const { error } = await db.auth.updateUser({ password });
      if (error) throw error;
      setAuthMessage('Kata sandi berhasil diperbarui.', 'success');
      setTimeout(() => showLogin(), 1300);
    }
  } catch (e) {
    setAuthMessage(translateAuthError(e), 'error');
  } finally {
    authBusy = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

if (authForm) authForm.addEventListener('submit', submitAuth);
document.querySelector('#auth-mode-toggle')?.addEventListener('click', () => setAuthMode(authMode === 'signup' ? 'signin' : 'signup'));
document.querySelector('#auth-forgot')?.addEventListener('click', () => setAuthMode('forgot'));
document.querySelector('#auth-back-to-login')?.addEventListener('click', () => setAuthMode('signin'));
document.querySelector('#auth-choose-signin')?.addEventListener('click', () => { setAuthMode('signin'); authEmail?.focus(); });
document.querySelector('#auth-choose-signup')?.addEventListener('click', () => { setAuthMode('signup'); authEmail?.focus(); });
document.querySelector('#auth-back-choice')?.addEventListener('click', () => setAuthMode('choose'));

async function handleLogout() {
  cleanupRealtime();
  const { error } = await db.auth.signOut();
  if (error) setAuthMessage(translateAuthError(error), 'error');
}

document.querySelector('#auth-logout')?.addEventListener('click', handleLogout);
document.querySelector('#auth-logout-top')?.addEventListener('click', handleLogout);
