// js/14-subscription.js
// Langganan "Lacak Duit Pro": status trial/aktif, paywall untuk fitur Pro, tagihan manual
// (transfer/QRIS dengan kode unik), dan panel persetujuan untuk admin platform.
//
// Prinsip:
// - Mencatat transaksi, runway, utang-piutang, aset, dan sinkronisasi SELALU gratis. Data pengguna
//   tidak pernah dikunci; yang dikunci hanya fitur tambahan (lihat PRO_FEATURES).
// - Status langganan hanya bisa diubah server (fungsi security definer). Browser hanya membaca.
// - Gagal memuat status (offline/migrasi belum dijalankan) = jangan kunci pengguna.
// Penyiapan SQL dan cara kerja: docs/langganan-pembayaran.md

var appSubscription = null;
var subscriptionPlans = [];
var paymentConfig = {};
var myLatestPayment = null;
var paywallReason = '';
var paywallNotice = '';
var paywallBusy = false;

const KEY_SUBSCRIPTION = 'catatduit_cached_subscription';
const KEY_PLANS = 'catatduit_cached_plans';

// Fitur yang butuh Pro. Tambah baris di sini untuk mengunci fitur baru.
const PRO_FEATURES = {
  export: 'Unduh laporan Excel, PDF, dan JPG'
};

/* ---------- status ---------- */
function isLifetimeDate(iso) {
  const d = new Date(iso);
  return !isNaN(d) && d.getFullYear() >= 2100;
}

function getSubscriptionState() {
  if (typeof isPlatformAdmin !== 'undefined' && isPlatformAdmin) {
    return { key: 'admin', pro: true, daysLeft: null, lifetime: false };
  }
  const s = appSubscription;
  // Belum termuat (offline pertama kali / migrasi belum dijalankan): jangan kunci pengguna.
  if (!s) return { key: 'unknown', pro: true, daysLeft: null, lifetime: false };

  const now = Date.now();
  if (s.status === 'aktif' && s.paid_until) {
    const end = new Date(s.paid_until).getTime();
    if (end >= now) {
      return { key: 'aktif', pro: true, until: s.paid_until, lifetime: isLifetimeDate(s.paid_until), daysLeft: Math.ceil((end - now) / 86400000) };
    }
  }
  if (s.status === 'trial') {
    const end = new Date(s.trial_ends_at).getTime();
    if (end >= now) {
      return { key: 'trial', pro: true, until: s.trial_ends_at, lifetime: false, daysLeft: Math.ceil((end - now) / 86400000) };
    }
  }
  return { key: 'gratis', pro: false, daysLeft: 0, lifetime: false };
}

function isProActive() {
  return getSubscriptionState().pro;
}

// Dipanggil sebelum menjalankan fitur Pro. Mengembalikan true bila boleh lanjut.
function requireProFeature(featureKey) {
  if (isProActive()) return true;
  openPaywall(featureKey);
  return false;
}

function fmtSubDate(iso) {
  const d = new Date(iso);
  if (!iso || isNaN(d)) return '-';
  return new Intl.DateTimeFormat(APP_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

function readCachedSubscription() {
  const c = getCachedData(KEY_SUBSCRIPTION, null);
  return c && activeUser && c.userId === activeUser.id ? c.row : null;
}

function resetSubscriptionState() {
  appSubscription = null;
  subscriptionPlans = [];
  paymentConfig = {};
  myLatestPayment = null;
  renderSubscriptionUI();
}

async function loadSubscription() {
  if (!activeUser) return;
  const cached = readCachedSubscription();
  if (cached) {
    appSubscription = cached;
    renderSubscriptionUI();
  }
  if (!navigator.onLine || !db) return;
  try {
    const { data, error } = await db.rpc('ensure_my_subscription');
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (row && row.status && row.trial_ends_at) {
      appSubscription = row;
      setCachedData(KEY_SUBSCRIPTION, { userId: activeUser.id, row });
    }
  } catch (err) {
    // Biasanya karena SQL migrasi belum dijalankan. Aplikasi tetap berjalan normal (tidak ada penguncian).
    console.warn('Gagal memuat status langganan:', err);
  }
  renderSubscriptionUI();
}

/* ---------- tampilan status (banner & panel Pengaturan) ---------- */
function renderSubscriptionUI() {
  renderSubscriptionBanner();
  renderSubscriptionPanel();
}

function renderSubscriptionBanner() {
  const el = document.querySelector('#sub-banner');
  if (!el) return;
  const st = getSubscriptionState();
  let title = '', text = '', cta = '', warn = false;

  if (st.key === 'trial') {
    title = `Pro gratis: ${st.daysLeft} hari lagi`;
    text = 'Semua fitur Pro terbuka selama masa coba. Mencatat tetap gratis selamanya.';
    cta = 'Lihat paket';
  } else if (st.key === 'gratis') {
    title = 'Masa coba Pro sudah berakhir';
    text = 'Mencatat dan melihat semua datamu tetap gratis. Unduh laporan butuh Pro.';
    cta = 'Aktifkan Pro';
    warn = true;
  } else if (st.key === 'aktif' && !st.lifetime && st.daysLeft <= 7) {
    title = `Pro berakhir ${st.daysLeft} hari lagi`;
    text = 'Perpanjang supaya unduh laporan tetap terbuka.';
    cta = 'Perpanjang';
    warn = true;
  }

  if (!title) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  el.className = `sub-banner${warn ? ' warn' : ''}`;
  el.innerHTML = `<div class="sub-banner-text"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(text)}</small></div>` +
    `<button type="button" class="primary-button" data-sub-open>${escapeHtml(cta)}</button>`;
  el.hidden = false;
}

function renderSubscriptionPanel() {
  const statusEl = document.querySelector('#sub-status-text');
  const untilEl = document.querySelector('#sub-status-until');
  const openBtn = document.querySelector('#sub-open-paywall');
  if (!statusEl || !untilEl) return;
  const st = getSubscriptionState();
  let label = '-', until = '-', btn = 'Lihat paket Pro';

  if (st.key === 'admin') { label = 'Admin platform (Pro tanpa batas)'; until = '-'; btn = 'Lihat paket Pro'; }
  else if (st.key === 'trial') { label = `Masa coba Pro (${st.daysLeft} hari lagi)`; until = fmtSubDate(st.until); }
  else if (st.key === 'aktif') {
    label = st.lifetime ? 'Pro Seumur Hidup' : 'Pro aktif';
    until = st.lifetime ? 'Selamanya' : fmtSubDate(st.until);
    btn = st.lifetime ? 'Lihat paket Pro' : 'Perpanjang';
  }
  else if (st.key === 'gratis') { label = 'Gratis'; until = 'Masa coba Pro berakhir'; btn = 'Aktifkan Pro'; }
  else { label = 'Belum termuat'; until = 'Coba lagi saat online'; }

  statusEl.textContent = label;
  untilEl.textContent = until;
  if (openBtn) openBtn.textContent = btn;
}

function fillSubscriptionPanel() {
  renderSubscriptionPanel();
  loadSubscription();
}

/* ---------- data paket, instruksi bayar, tagihan ---------- */
async function loadPlans() {
  let plans = null;
  if (navigator.onLine && db) {
    try {
      const { data, error } = await db.from('subscription_plans').select('plan,label,price,days,sort_order').order('sort_order');
      if (!error && Array.isArray(data)) {
        plans = data;
        setCachedData(KEY_PLANS, data);
      }
    } catch (e) {}
  }
  subscriptionPlans = plans || getCachedData(KEY_PLANS, []);
}

async function loadPaymentInfo() {
  if (!navigator.onLine || !db) return;
  try {
    const { data, error } = await db.from('app_config').select('key,value');
    if (!error && Array.isArray(data)) {
      paymentConfig = {};
      data.forEach(r => { paymentConfig[r.key] = r.value; });
    }
  } catch (e) {}
}

async function loadMyLatestPayment() {
  myLatestPayment = null;
  if (!navigator.onLine || !db || !activeUser) return;
  try {
    const { data, error } = await db.from('payment_requests')
      .select('id,plan,amount,base_price,unique_code,days,status,admin_note,created_at')
      .eq('user_id', activeUser.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!error && data && data[0]) myLatestPayment = data[0];
  } catch (e) {}
}

function planLabel(planKey) {
  const p = subscriptionPlans.find(x => x.plan === planKey);
  return p ? p.label : planKey;
}

// Hanya izinkan alamat gambar https atau path relatif satu situs.
function safeImageUrl(url) {
  const u = String(url || '').trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(u)) return u;
  if (/^\/(?!\/)[^\s"'<>]*$/.test(u)) return u;
  return '';
}

function buildConfirmWaLink() {
  const wa = String(paymentConfig.admin_wa || '').replace(/\D/g, '');
  if (!wa || !myLatestPayment) return '';
  const text = `Halo, saya sudah transfer ${rupiah(myLatestPayment.amount)} untuk Lacak Duit Pro (paket ${planLabel(myLatestPayment.plan)}). ` +
    `Email akun: ${(activeUser && activeUser.email) || '-'}. No. tagihan #${myLatestPayment.id}.`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
}

/* ---------- paywall ---------- */
async function openPaywall(reason) {
  paywallReason = reason || '';
  paywallNotice = '';
  const dlg = document.querySelector('#paywall-dialog');
  if (!dlg) return;
  if (!dlg.open) dlg.showModal();
  const body = document.querySelector('#paywall-body');
  if (body) body.innerHTML = '<p class="settings-hint">Memuat paket…</p>';
  await Promise.all([loadPlans(), loadPaymentInfo(), loadMyLatestPayment()]);
  renderPaywall();
}

function closePaywall() {
  const dlg = document.querySelector('#paywall-dialog');
  if (dlg && dlg.open) dlg.close();
}

function monthlyEquivalent(p) {
  return Math.round(p.price / (p.days / 30));
}

function renderPaywall() {
  const body = document.querySelector('#paywall-body');
  if (!body) return;
  const st = getSubscriptionState();
  const pending = myLatestPayment && myLatestPayment.status === 'menunggu' ? myLatestPayment : null;
  let html = '';

  if (paywallReason && PRO_FEATURES[paywallReason] && !st.pro) {
    html += `<div class="paywall-reason">🔒 <b>${escapeHtml(PRO_FEATURES[paywallReason])}</b> adalah fitur Pro.</div>`;
  }
  if (paywallNotice) {
    html += `<div class="paywall-notice">${escapeHtml(paywallNotice)}</div>`;
  }

  if (st.key === 'aktif') {
    html += `<div class="paywall-status ok">✓ Pro aktif ${st.lifetime ? 'selamanya' : 'sampai ' + escapeHtml(fmtSubDate(st.until))}</div>`;
  } else if (st.key === 'trial') {
    html += `<div class="paywall-status">Masa coba Pro: ${st.daysLeft} hari lagi (sampai ${escapeHtml(fmtSubDate(st.until))}). Sisa masa coba tidak hangus saat kamu berlangganan.</div>`;
  }

  if (!pending && myLatestPayment && myLatestPayment.status === 'ditolak' &&
      Date.now() - new Date(myLatestPayment.created_at).getTime() < 14 * 86400000) {
    html += `<div class="paywall-notice warn">Pembayaran terakhir ditolak${myLatestPayment.admin_note ? ': ' + escapeHtml(myLatestPayment.admin_note) : '.'} Silakan buat tagihan baru atau hubungi admin.</div>`;
  }

  html += `<ul class="paywall-benefits">
    <li>✓ Unduh laporan Excel, PDF &amp; JPG</li>
    <li>✓ Fitur Pro berikutnya ikut terbuka tanpa bayar lagi</li>
    <li>✓ Mencatat, runway, utang-piutang &amp; aset tetap gratis selamanya</li>
  </ul>`;

  html += pending ? renderPendingPaymentHtml(pending) : renderPlanChooserHtml();
  body.innerHTML = html;
  wirePaywallEvents(body);
}

function renderPlanChooserHtml() {
  if (!subscriptionPlans.length) {
    return `<p class="settings-hint">Daftar paket belum bisa dimuat. Pastikan kamu online, lalu buka lagi.</p>`;
  }
  const monthly = subscriptionPlans.find(p => p.plan === '1bulan');
  const preferred = subscriptionPlans.find(p => p.plan === '12bulan') || subscriptionPlans[0];
  const cards = subscriptionPlans.map(p => {
    const lifetime = p.days >= 36500;
    let sub = '';
    if (lifetime) sub = 'Sekali bayar, berlaku selamanya';
    else {
      sub = `≈ ${rupiah(monthlyEquivalent(p))} / bulan`;
      if (monthly && p.plan !== monthly.plan) {
        const save = Math.round((1 - monthlyEquivalent(p) / monthly.price) * 100);
        if (save > 0) sub += ` · hemat ${save}%`;
      }
    }
    const checked = p.plan === preferred.plan ? 'checked' : '';
    return `<label class="plan-card">
      <input type="radio" name="paywall-plan" value="${escapeHtml(p.plan)}" ${checked}>
      <span class="plan-card-main"><strong>${escapeHtml(p.label)}</strong><small>${escapeHtml(sub)}</small></span>
      <span class="plan-card-price">${rupiah(p.price)}</span>
    </label>`;
  }).join('');
  return `<div class="plan-list">${cards}</div>
    <p class="settings-hint">Pembayaran lewat transfer/QRIS. Pro aktif setelah pembayaranmu diverifikasi admin.</p>
    <button type="button" class="primary-button submit-button" id="paywall-start">Lanjut ke pembayaran</button>`;
}

function renderPendingPaymentHtml(p) {
  const qris = safeImageUrl(paymentConfig.qris_url);
  const text = String(paymentConfig.payment_text || '').trim();
  const wa = buildConfirmWaLink();
  let instr = '';
  if (text) instr += `<div class="pay-text">${escapeHtml(text)}</div>`;
  if (qris) instr += `<div class="pay-qris"><img src="${escapeHtml(qris)}" alt="QRIS pembayaran" loading="lazy"></div>`;
  if (!text && !qris) instr += `<div class="paywall-notice warn">Instruksi pembayaran belum disetel admin. Hubungi admin untuk cara bayar.</div>`;

  return `<div class="pay-box">
      <small>Transfer tepat sejumlah</small>
      <div class="pay-amount"><strong>${rupiah(p.amount)}</strong><button type="button" class="secondary-button" id="paywall-copy" data-amount="${Number(p.amount)}">Salin</button></div>
      <small>Paket ${escapeHtml(planLabel(p.plan))}: ${rupiah(p.base_price)} + kode unik ${Number(p.unique_code)} supaya pembayaranmu mudah dikenali.</small>
    </div>
    ${instr}
    <div class="paywall-status">Status: menunggu verifikasi admin</div>
    ${wa ? `<a class="primary-button submit-button pay-wa" href="${escapeHtml(wa)}" target="_blank" rel="noopener noreferrer">Saya sudah transfer: konfirmasi lewat WhatsApp</a>` : ''}
    <button type="button" class="secondary-button settings-wide-btn" id="paywall-refresh">Cek status pembayaran</button>
    <button type="button" class="secondary-button settings-wide-btn" id="paywall-cancel">Ganti paket / batalkan tagihan</button>`;
}

function wirePaywallEvents(body) {
  body.querySelector('#paywall-start')?.addEventListener('click', startPayment);
  body.querySelector('#paywall-cancel')?.addEventListener('click', cancelPayment);
  body.querySelector('#paywall-refresh')?.addEventListener('click', refreshPaymentStatus);
  body.querySelector('#paywall-copy')?.addEventListener('click', async (e) => {
    const amount = e.currentTarget.dataset.amount;
    try {
      await navigator.clipboard.writeText(String(amount));
      showToast('Nominal disalin.', 'success', 1800);
    } catch (err) {
      showToast('Salin manual: ' + amount, 'info', 4000);
    }
  });
}

async function startPayment() {
  if (paywallBusy) return;
  const chosen = document.querySelector('#paywall-body input[name="paywall-plan"]:checked');
  if (!chosen) return;
  if (!navigator.onLine || !db) {
    paywallNotice = 'Butuh koneksi internet untuk membuat tagihan.';
    return renderPaywall();
  }
  paywallBusy = true;
  const btn = document.querySelector('#paywall-start');
  if (btn) btn.disabled = true;
  try {
    const { data, error } = await db.rpc('create_payment_request', { p_plan: chosen.value });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    myLatestPayment = row || null;
    paywallNotice = '';
  } catch (err) {
    paywallNotice = (err && err.message) || 'Gagal membuat tagihan, coba lagi.';
  }
  paywallBusy = false;
  renderPaywall();
}

async function cancelPayment() {
  if (paywallBusy) return;
  if (!confirm('Batalkan tagihan ini dan pilih paket lain? Jika kamu sudah transfer, jangan dibatalkan: hubungi admin.')) return;
  if (!navigator.onLine || !db) {
    paywallNotice = 'Butuh koneksi internet.';
    return renderPaywall();
  }
  paywallBusy = true;
  try {
    const { error } = await db.rpc('cancel_my_payment_request');
    if (error) throw error;
    myLatestPayment = null;
    paywallNotice = '';
  } catch (err) {
    paywallNotice = (err && err.message) || 'Gagal membatalkan, coba lagi.';
  }
  paywallBusy = false;
  renderPaywall();
}

async function refreshPaymentStatus() {
  const btn = document.querySelector('#paywall-refresh');
  if (btn) btn.disabled = true;
  await Promise.all([loadSubscription(), loadMyLatestPayment()]);
  paywallNotice = '';
  const approved = myLatestPayment && myLatestPayment.status === 'disetujui' && getSubscriptionState().key === 'aktif';
  if (approved) showToast('Pro sudah aktif. Terima kasih!', 'success');
  renderPaywall();
}

/* ---------- panel admin: persetujuan pembayaran ---------- */
async function onPlatformAdminReady() {
  renderSubscriptionUI();
  if (!db) return;
  try {
    const { data, error } = await db.rpc('admin_list_payments', { p_status: 'menunggu' });
    if (!error && Array.isArray(data) && data.length) {
      showToast(`Ada ${data.length} pembayaran menunggu verifikasi (menu Analitik).`, 'info', 6000);
    }
  } catch (e) {}
}

async function renderAdminPaymentsPanel(host) {
  if (!host || !isPlatformAdmin || !db) return;
  let panel = host.querySelector('#admin-payments-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'admin-payments-panel';
    panel.className = 'panel';
    host.insertBefore(panel, host.firstChild);
  }
  panel.innerHTML = `<div class="panel-heading"><div><h3>💳 Pembayaran Pro</h3><p>Setujui hanya setelah uangnya benar-benar masuk. Cocokkan nominal (sudah termasuk kode unik).</p></div></div>
    <div id="admin-pay-list" class="an-user-list"><div class="an-empty">Memuat…</div></div>
    <div class="admin-grant">
      <h5>Beri akses Pro manual</h5>
      <div class="settings-inline">
        <input id="grant-email" type="email" placeholder="email pengguna" autocomplete="off">
        <input id="grant-days" type="number" min="1" max="3650" value="30" aria-label="Jumlah hari" style="max-width:90px">
        <button type="button" class="secondary-button" id="grant-btn">Beri</button>
      </div>
      <div id="grant-msg" class="settings-msg" role="status" aria-live="polite"></div>
    </div>`;
  panel.querySelector('#grant-btn')?.addEventListener('click', grantProManually);
  await loadAdminPaymentList();
}

async function loadAdminPaymentList() {
  const list = document.querySelector('#admin-pay-list');
  if (!list) return;
  try {
    const { data, error } = await db.rpc('admin_list_payments', { p_status: 'menunggu' });
    if (error) throw error;
    if (!data || !data.length) {
      list.innerHTML = '<div class="an-empty">Tidak ada pembayaran yang menunggu.</div>';
      return;
    }
    list.innerHTML = data.map(r => `<div class="an-user pay-row">
      <div class="an-user-main"><strong title="${escapeHtml(r.email)}">${escapeHtml(r.email)}</strong>
        <small>${escapeHtml(r.plan_label)} · <b>${rupiah(r.amount)}</b> · ${escapeHtml(fmtSubDate(r.created_at))}</small></div>
      <div class="pay-actions">
        <button type="button" class="primary-button" data-approve="${Number(r.id)}" data-email="${escapeHtml(r.email)}" data-amount="${Number(r.amount)}">Setujui</button>
        <button type="button" class="secondary-button" data-reject="${Number(r.id)}">Tolak</button>
      </div>
    </div>`).join('');
    list.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => approvePayment(b.dataset.approve, b.dataset.email, b.dataset.amount)));
    list.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => rejectPayment(b.dataset.reject)));
  } catch (err) {
    list.innerHTML = '<div class="an-empty">Gagal memuat (pastikan docs/migrasi-langganan.sql sudah dijalankan).</div>';
  }
}

async function approvePayment(id, email, amount) {
  if (!confirm(`Setujui pembayaran ${email} sebesar ${rupiah(amount)}? Pastikan uangnya sudah masuk.`)) return;
  try {
    const { error } = await db.rpc('admin_approve_payment', { p_id: Number(id) });
    if (error) throw error;
    showToast('Pembayaran disetujui. Pro pengguna aktif.', 'success');
  } catch (err) {
    showToast((err && err.message) || 'Gagal menyetujui.', 'warning');
  }
  loadAdminPaymentList();
}

async function rejectPayment(id) {
  const note = prompt('Alasan penolakan (boleh kosong):');
  if (note === null) return;
  try {
    const { error } = await db.rpc('admin_reject_payment', { p_id: Number(id), p_note: note.trim() || null });
    if (error) throw error;
    showToast('Pembayaran ditolak.', 'info');
  } catch (err) {
    showToast((err && err.message) || 'Gagal menolak.', 'warning');
  }
  loadAdminPaymentList();
}

async function grantProManually() {
  const email = (document.querySelector('#grant-email')?.value || '').trim();
  const days = Number(document.querySelector('#grant-days')?.value);
  const msg = (text, type) => {
    const el = document.querySelector('#grant-msg');
    if (el) { el.textContent = text; el.className = `settings-msg${type ? ' ' + type : ''}`; }
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg('Email tidak valid.', 'error');
  if (!Number.isInteger(days) || days < 1 || days > 3650) return msg('Jumlah hari harus 1 sampai 3650.', 'error');
  if (!confirm(`Beri ${days} hari Pro ke ${email}?`)) return;
  msg('Memproses…');
  try {
    const { data, error } = await db.rpc('admin_grant_days', { p_email: email, p_days: days });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    msg(`Berhasil. Pro aktif sampai ${fmtSubDate(row && row.paid_until)}.`, 'success');
  } catch (err) {
    msg((err && err.message) || 'Gagal memberi akses.', 'error');
  }
}

/* ---------- pemasangan event ---------- */
document.addEventListener('click', (e) => {
  const trigger = e.target.closest && e.target.closest('[data-sub-open]');
  if (trigger) openPaywall('');
});
document.querySelector('#sub-open-paywall')?.addEventListener('click', () => openPaywall(''));
document.querySelector('#paywall-close')?.addEventListener('click', closePaywall);
