// js/09-app.js
// Navigasi view/tab, Service Worker PWA, pembersihan HUD Netlify, testing hooks, dan inisialisasi awal

// Tanggal hari ini di header
const todayEl = document.querySelector('#today');
if (todayEl) {
  todayEl.textContent = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}

// Navigasi view/tab (Dokter Laundry pattern: pisah halaman per tab dengan bottom tab bar)
let currentActiveTab = 'overview';

function switchTab(name) {
  if (!name) name = 'overview';
  if (name === 'analytics' && !isPlatformAdmin) name = 'overview';
  currentActiveTab = name;

  const viewMap = {
    overview: 'view-overview',
    catat: 'view-catat',
    transactions: 'view-transactions',
    debts: 'view-debts',
    assets: 'view-assets',
    analytics: 'view-analytics'
  };

  const targetId = viewMap[name] || 'view-overview';

  // 1. Tampilkan hanya view yang aktif, sembunyikan yang lain
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
  });
  const targetView = document.getElementById(targetId);
  if (targetView) {
    targetView.classList.add('active');
  }
  // 2. Tandai tab bar bawah aktif
  document.querySelectorAll('.tabbar .tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
  });

  // 3. Sinkronkan navigasi menu lain bila ada
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === name);
  });

  // 4. Update judul di appbar / breadcrumb
  const crumbEl = document.querySelector('#appbar-current-view');
  if (crumbEl) {
    const titles = {
      overview: 'Ringkasan',
      catat: 'Catat transaksi',
      transactions: 'Transaksi',
      debts: 'Utang & Piutang',
      assets: 'Aset',
      analytics: 'Analitik'
    };
    crumbEl.textContent = titles[name] || 'Ringkasan';
  }

  // 5. Render data spesifik tab
  if (name === 'overview') {
    if (typeof render === 'function') render();
  } else if (name === 'transactions') {
    if (typeof renderRows === 'function') renderRows();
  } else if (name === 'debts') {
    if (typeof renderDebtsView === 'function') renderDebtsView();
  } else if (name === 'assets') {
    if (typeof renderAssetsView === 'function') renderAssetsView();
  } else if (name === 'catat') {
    if (typeof populateCategorySelects === 'function') populateCategorySelects();
    const di = document.querySelector('#transaction-form [name=date]');
    if (di && !di.value) di.value = today();
  } else if (name === 'analytics') {
    if (typeof renderAnalyticsView === 'function') renderAnalyticsView();
  }

  // 6. Scroll langsung ke atas view yang baru dibuka
  window.scrollTo({ top: 0, behavior: 'instant' });

  // 7. Simpan state tab terakhir
  try {
    localStorage.setItem('catatduit_active_tab', name);
  } catch (e) {}
}

// Event listener klik pada bottom tab bar
document.querySelectorAll('.tabbar .tab').forEach(button => {
  button.addEventListener('click', () => {
    switchTab(button.dataset.tab);
  });
});

// Event listener untuk elemen shortcut navigasi [data-view]
document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => {
    switchTab(button.dataset.view);
  });
  button.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      switchTab(button.dataset.view);
    }
  });
});

// PWA Service Worker Registration & Auto-Update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('Catat Duit PWA Service Worker registered:', reg.scope);

      // Cek pembaruan berkala dan saat halaman dimuat
      reg.update();

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Service Worker baru siap, langsung aktifkan
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch((err) => {
      console.error('Service Worker registration failed:', err);
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

// Event listener tombol close pada semua modal dialog agar tidak memicu validasi form
document.querySelectorAll('.close-manager-dialog').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('#manage-categories-dialog')?.close();
  });
});

document.querySelectorAll('.close-button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const dialog = btn.closest('dialog');
    if (dialog) {
      dialog.close();
      const form = dialog.querySelector('form');
      if (form) form.reset();
    }
  });
});

// Bersihkan dan sembunyikan Netlify badge / HUD jika diinjeksi
const removeNetlifyBadge = () => {
  document.querySelectorAll('#nl-badge-frame, #nl-hud-frame, iframe[title*="Netlify"], script[src*="hud?variant=public"]').forEach(el => el.remove());
};
removeNetlifyBadge();
const badgeObserver = new MutationObserver(removeNetlifyBadge);
badgeObserver.observe(document.documentElement, { childList: true, subtree: true });

// Expose test hooks for development/verification
window.catatduit = {
  showApp,
  render,
  switchTab,
  renderDebtsView,
  renderAssetsView,
  getRecords: () => records,
  setRecords: (r) => { records = r; },
  getAssets: () => assets,
  setAssets: (a) => { assets = a; },
  getFilteredTransactionsForReport,
  exportToExcel,
  exportToPDF,
  exportToJPG,
  saveCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
  getCustomCategories: () => customCategories,
  syncOfflineQueue,
  openCategoryDetail
};

// Inisialisasi awal: jika offline dan ada user di cache, langsung buka app
const cachedUser = getCachedData(STORAGE_KEY_USER, null);
if (!navigator.onLine && cachedUser) {
  showApp(cachedUser);
} else {
  showLogin();
}

// Inisialisasi status tab aktif dari storage atau default 'overview'
try {
  const initialTab = localStorage.getItem('catatduit_active_tab') || 'overview';
  switchTab(initialTab);
} catch (e) {
  switchTab('overview');
}
