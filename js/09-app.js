// js/09-app.js
// Navigasi view/tab, Service Worker PWA, pembersihan HUD Netlify, testing hooks, dan inisialisasi awal

// Tanggal hari ini di header
const todayEl = document.querySelector('#today');
if (todayEl) {
  todayEl.textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
}

// Navigasi view/tab
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === button.dataset.view));
  const view = button.dataset.view;
  if (view === 'overview') {
    if (workspace) workspace.hidden = true;
    document.querySelector('.runway-card')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (view === 'transactions') {
    document.querySelector('.transactions-panel')?.scrollIntoView({ behavior: 'smooth' });
  } else {
    renderWorkspace(view);
    workspace?.scrollIntoView({ behavior: 'smooth' });
  }
}));

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
  getRecords: () => records,
  setRecords: (r) => { records = r; },
  getAssets: () => assets,
  setAssets: (a) => { assets = a; },
  getFilteredTransactionsForReport,
  exportToExcel,
  exportToPDF,
  exportToJPG
};

// Keep the unpublished starter design from showing fabricated sample values before login.
showLogin();
