// js/03-data.js
// Inisialisasi aplikasi setelah login, pemuatan data awal dari Supabase / Cache lokal, dan sinkronisasi antrean offline

function addToOfflineQueue(action) {
  const queue = getCachedData(STORAGE_KEY_QUEUE, []);
  queue.push({ ...action, timestamp: Date.now() });
  setCachedData(STORAGE_KEY_QUEUE, queue);
}

let isSyncing = false;
async function syncOfflineQueue() {
  if (!navigator.onLine || !db || !activeUser || isSyncing) return;
  const queue = getCachedData(STORAGE_KEY_QUEUE, []);
  if (!queue.length) return;

  isSyncing = true;
  showToast(`Menyinkronkan ${queue.length} perubahan data offline...`, 'info', 2500);

  const remainingQueue = [];
  for (const action of queue) {
    try {
      if (action.type === 'insert_record') {
        const { error } = await db.from('finance_records').insert(action.data);
        if (error) throw error;
      } else if (action.type === 'update_record') {
        if (!String(action.id).startsWith('temp-') && !String(action.id).startsWith('offline_')) {
          const { error } = await db.from('finance_records').update(action.data).eq('id', action.id).eq('user_id', activeUser.id);
          if (error) throw error;
        }
      } else if (action.type === 'delete_record') {
        if (!String(action.id).startsWith('temp-') && !String(action.id).startsWith('offline_')) {
          const { error } = await db.from('finance_records').delete().eq('id', action.id).eq('user_id', activeUser.id);
          if (error) throw error;
        }
      } else if (action.type === 'insert_asset') {
        const { error } = await db.from('assets').upsert(action.data, { onConflict: 'user_id,name' });
        if (error) throw error;
      } else if (action.type === 'delete_asset') {
        if (!String(action.id).startsWith('offline_')) {
          const { error } = await db.from('assets').delete().eq('id', action.id).eq('user_id', activeUser.id);
          if (error) throw error;
        }
      } else if (action.type === 'toggle_debt') {
        if (!String(action.id).startsWith('temp-') && !String(action.id).startsWith('offline_')) {
          const { error } = await db.from('finance_records').update({ settled: action.settled }).eq('id', action.id).eq('user_id', activeUser.id);
          if (error) throw error;
        }
      }
    } catch (err) {
      console.warn('Gagal sinkronkan operasi offline:', action, err);
      remainingQueue.push(action);
    }
  }

  setCachedData(STORAGE_KEY_QUEUE, remainingQueue);
  isSyncing = false;

  if (remainingQueue.length === 0) {
    showToast('Semua data offline berhasil disinkronkan ke server!', 'success', 3000);
    try {
      const [r, a] = await Promise.all([
        db.from('finance_records').select('*').eq('user_id', activeUser.id).order('record_date', { ascending: false }).order('created_at', { ascending: true }),
        db.from('assets').select('*').eq('user_id', activeUser.id).order('name')
      ]);
      if (!r.error && !a.error) {
        records = r.data || [];
        assets = a.data || [];
        setCachedData(STORAGE_KEY_RECORDS, records);
        setCachedData(STORAGE_KEY_ASSETS, assets);
        render();
      }
    } catch (e) {}
  }
}

async function showApp(user) {
  activeUser = user;
  setCachedData(STORAGE_KEY_USER, { id: user.id, email: user.email });

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

  if (typeof setupRealtime === 'function') setupRealtime(user.id);
  await refreshData();
}

async function refreshData() {
  if (!activeUser) return;

  // Jika sedang offline atau db belum tersedia, muat data dari cache lokal
  if (!navigator.onLine || !db) {
    records = getCachedData(STORAGE_KEY_RECORDS, records);
    assets = getCachedData(STORAGE_KEY_ASSETS, assets);
    customCategories = getCustomCategories();
    populateCategorySelects();
    updateNetworkStatusUI(false);
    render();
    return;
  }

  try {
    const [r, a, c] = await Promise.all([
      db.from('finance_records').select('*').eq('user_id', activeUser.id).order('record_date', { ascending: false }).order('created_at', { ascending: true }),
      db.from('assets').select('*').eq('user_id', activeUser.id).order('name'),
      db.from('categories').select('*').eq('user_id', activeUser.id).order('name')
    ]);

    if (r.error || a.error) {
      throw (r.error || a.error);
    }

    records = r.data || [];
    assets = a.data || [];
    setCachedData(STORAGE_KEY_RECORDS, records);
    setCachedData(STORAGE_KEY_ASSETS, assets);

    if (c && !c.error && c.data) {
      customCategories = c.data.map(item => item.name);
      if (typeof syncCategoriesToLocal === 'function') syncCategoriesToLocal(customCategories);
    } else {
      customCategories = getCustomCategories();
    }
    populateCategorySelects();
    updateNetworkStatusUI(true);
    render();

    // Periksa antrean operasi offline yang perlu disinkronkan ke Supabase
    await syncOfflineQueue();
  } catch (err) {
    console.warn('Gagal memuat data dari cloud, beralih ke cache lokal:', err);
    records = getCachedData(STORAGE_KEY_RECORDS, records);
    assets = getCachedData(STORAGE_KEY_ASSETS, assets);
    customCategories = getCustomCategories();
    populateCategorySelects();
    updateNetworkStatusUI(false);
    render();
    showToast('Bekerja dalam Mode Offline (Data lokal ditampilkan).', 'warning');
  }
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
    else {
      // Jika offline dan ada sesi tersimpan di cache, jangan tendang keluar ke login
      const cached = getCachedData(STORAGE_KEY_USER, null);
      if (!navigator.onLine && cached) {
        showApp(cached);
      } else {
        showLogin();
      }
    }
  });
}
