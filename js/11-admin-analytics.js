// js/11-admin-analytics.js
// Menu "Analitik" khusus admin platform (pola Dokter Laundry, tapi satu di dalam aplikasi):
// - Ringkasan pengguna: total terdaftar, aktif, tidak aktif, daftar baru, lengkap dengan daftar akun
// - Analitik pengunjung: total, unik, hari ini, tren harian, perangkat, halaman populer
// Siapa admin ditentukan SERVER (fungsi is_platform_admin di Supabase), bukan daftar email di kode ini.
// Penyiapan SQL: docs/analitik-pengunjung.md

var isPlatformAdmin = false;
var analyticsToken = 0;
const ANALYTICS_ACTIVE_DAYS = 30;
const ANALYTICS_PAGE_SIZE = 1000;   // batas baris per permintaan Supabase
const ANALYTICS_MAX_PAGES = 20;     // batas atas 20.000 baris per pemuatan

function setPlatformAdmin(flag) {
  isPlatformAdmin = !!flag;
  const nav = document.querySelector('#nav-analytics');
  if (nav) nav.hidden = !isPlatformAdmin;
  const tab = document.querySelector('#tab-analytics');
  if (tab) tab.hidden = !isPlatformAdmin;
  if (!isPlatformAdmin && typeof currentActiveTab !== 'undefined' && currentActiveTab === 'analytics' && typeof switchTab === 'function') {
    switchTab('overview');
  }
}

async function checkPlatformAdmin() {
  try {
    if (!db) return setPlatformAdmin(false);
    const { data, error } = await db.rpc('is_platform_admin');
    setPlatformAdmin(!error && data === true);
  } catch (e) {
    setPlatformAdmin(false);
  }
}

/* ---------- helper ---------- */
function anNum(n) { return Number(n || 0).toLocaleString(APP_LOCALE); }

// Tanggal lokal (YYYY-MM-DD) agar "hari ini" sesuai zona waktu pengguna, bukan UTC
function anLocalDay(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function anDate(iso) {
  const d = new Date(iso);
  if (!iso || isNaN(d)) return '-';
  return new Intl.DateTimeFormat(APP_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function anAgo(iso) {
  const t = new Date(iso).getTime();
  if (!iso || isNaN(t)) return 'belum pernah';
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return 'hari ini';
  if (days === 1) return 'kemarin';
  if (days < 30) return days + ' hari lalu';
  if (days < 365) return Math.floor(days / 30) + ' bulan lalu';
  return Math.floor(days / 365) + ' tahun lalu';
}

/* ---------- pengguna ---------- */
function analyzeUsers(rows) {
  const now = Date.now();
  const activeMs = ANALYTICS_ACTIVE_DAYS * 86400000;
  const weekAgo = now - 7 * 86400000;
  return (rows || []).map(u => {
    const times = [u.last_sign_in_at, u.last_record_at].map(x => (x ? new Date(x).getTime() : 0)).filter(x => x > 0);
    const lastActive = times.length ? Math.max(...times) : 0;
    const active = lastActive > 0 && now - lastActive <= activeMs;
    const createdMs = u.created_at ? new Date(u.created_at).getTime() : 0;
    return {
      email: u.email || '(tanpa email)',
      createdAt: u.created_at,
      lastActive: lastActive ? new Date(lastActive).toISOString() : null,
      active,
      unconfirmed: u.email_confirmed === false,
      isNew: createdMs >= weekAgo
    };
  });
}

function renderUserSummary(users) {
  const total = users.length;
  const active = users.filter(u => u.active).length;
  const fresh = users.filter(u => u.isNew).length;
  document.querySelector('#an-u-total').textContent = anNum(total);
  document.querySelector('#an-u-active').textContent = anNum(active);
  document.querySelector('#an-u-inactive').textContent = anNum(total - active);
  document.querySelector('#an-u-new').textContent = anNum(fresh);

  const list = document.querySelector('#an-user-list');
  if (!users.length) {
    list.innerHTML = '<div class="an-empty">Belum ada akun terdaftar.</div>';
    return;
  }
  list.innerHTML = users.map(u => {
    const badge = u.active
      ? '<span class="an-badge ok">Aktif</span>'
      : u.unconfirmed
        ? '<span class="an-badge warn">Belum konfirmasi</span>'
        : '<span class="an-badge off">Tidak aktif</span>';
    return `<div class="an-user">
      <div class="an-user-main"><strong title="${escapeHtml(u.email)}">${escapeHtml(u.email)}</strong><small>Daftar ${anDate(u.createdAt)}${u.isNew ? ' · baru' : ''}</small></div>
      <div class="an-user-side">${badge}<small>Terakhir aktif ${anAgo(u.lastActive)}</small></div>
    </div>`;
  }).join('');
}

/* ---------- pengunjung ---------- */
async function fetchVisitorLogs(days) {
  let since = null;
  if (days !== 'all') {
    const s = new Date();
    s.setDate(s.getDate() - Number(days));
    since = s.toISOString();
  }
  let all = [], truncated = false;
  for (let page = 0; page < ANALYTICS_MAX_PAGES; page++) {
    let q = db.from('visitor_logs')
      .select('visitor_id, page_path, device_type, created_at')
      .order('created_at', { ascending: true })
      .range(page * ANALYTICS_PAGE_SIZE, page * ANALYTICS_PAGE_SIZE + ANALYTICS_PAGE_SIZE - 1);
    if (since) q = q.gte('created_at', since);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < ANALYTICS_PAGE_SIZE) break;
    if (page === ANALYTICS_MAX_PAGES - 1) truncated = true;
  }
  return { logs: all, truncated };
}

function renderVisitorSummary(logs, truncated) {
  const uniq = new Set(logs.map(l => l.visitor_id)).size;
  const today = anLocalDay(new Date().toISOString());
  const todayLogs = logs.filter(l => anLocalDay(l.created_at) === today);
  const todayUniq = new Set(todayLogs.map(l => l.visitor_id)).size;

  document.querySelector('#an-v-total').textContent = anNum(logs.length);
  document.querySelector('#an-v-unique').textContent = anNum(uniq);
  document.querySelector('#an-v-today').textContent = anNum(todayLogs.length);
  document.querySelector('#an-v-today-unique').textContent = anNum(todayUniq);

  const note = document.querySelector('#an-trunc');
  note.hidden = !truncated;
  if (truncated) note.textContent = `Data sangat banyak: hanya ${anNum(ANALYTICS_MAX_PAGES * ANALYTICS_PAGE_SIZE)} kunjungan paling awal pada rentang ini yang dihitung. Persempit rentang waktu untuk angka yang lebih akurat.`;

  const chart = document.querySelector('#an-chart');
  if (!logs.length) {
    chart.innerHTML = '<div class="an-empty">Belum ada data kunjungan untuk rentang waktu ini.</div>';
  } else {
    const daily = {};
    logs.forEach(l => {
      const d = anLocalDay(l.created_at);
      if (!d) return;
      if (!daily[d]) daily[d] = { pv: 0, v: new Set() };
      daily[d].pv++;
      daily[d].v.add(l.visitor_id);
    });
    const dates = Object.keys(daily).sort();
    const max = Math.max(1, ...dates.map(d => daily[d].pv));
    chart.innerHTML = dates.map(d => {
      const pv = daily[d].pv, un = daily[d].v.size;
      const pct = Math.max(6, Math.round(pv / max * 100));
      return `<div class="an-bar-wrap" title="${d}: ${pv} kunjungan, ${un} unik"><div class="an-bar-val">${pv}</div><div class="an-bar" style="height:${pct}%"></div><div class="an-bar-label">${d.slice(5).replace('-', '/')}</div></div>`;
    }).join('');
  }

  let mob = 0, desk = 0;
  logs.forEach(l => { if ((l.device_type || 'desktop').toLowerCase() === 'mobile') mob++; else desk++; });
  const mp = Math.round(mob / (logs.length || 1) * 100);
  document.querySelector('#an-devices').innerHTML =
    `<div class="an-row"><span>📱 Perangkat HP / Mobile</span><b>${anNum(mob)} (${mp}%)</b></div>` +
    `<div class="an-row"><span>💻 Komputer / Desktop</span><b>${anNum(desk)} (${100 - mp}%)</b></div>`;

  const pm = {};
  logs.forEach(l => { const p = l.page_path || '/'; pm[p] = (pm[p] || 0) + 1; });
  const sorted = Object.keys(pm).sort((a, b) => pm[b] - pm[a]).slice(0, 20);
  document.querySelector('#an-pages').innerHTML = sorted.length
    ? sorted.map(p => `<div class="an-row"><span><code>${escapeHtml(p)}</code></span><b>${anNum(pm[p])} kunjungan</b></div>`).join('')
    : '<div class="an-empty">Belum ada data halaman.</div>';
}

/* ---------- tampilan ---------- */
async function loadAnalytics() {
  if (!db || !isPlatformAdmin) return;
  const token = ++analyticsToken;
  const btn = document.querySelector('#an-refresh');
  if (btn) btn.disabled = true;
  document.querySelector('#an-chart').innerHTML = '<div class="an-empty">Sedang memuat data analitik...</div>';
  document.querySelector('#an-user-list').innerHTML = '<div class="an-empty">Memuat daftar akun...</div>';

  const days = document.querySelector('#an-range')?.value || '30';

  const usersPromise = db.rpc('admin_user_overview').then(({ data, error }) => {
    if (token !== analyticsToken) return;
    if (error) {
      document.querySelector('#an-user-list').innerHTML = '<div class="an-empty">Gagal memuat daftar akun (pastikan fungsi admin_user_overview sudah dibuat di Supabase — lihat docs/analitik-pengunjung.md).</div>';
      return;
    }
    renderUserSummary(analyzeUsers(data).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });

  const visitorsPromise = fetchVisitorLogs(days).then(({ logs, truncated }) => {
    if (token !== analyticsToken) return;
    renderVisitorSummary(logs, truncated);
  }).catch(() => {
    if (token !== analyticsToken) return;
    document.querySelector('#an-chart').innerHTML = '<div class="an-empty">Gagal memuat data (pastikan tabel visitor_logs sudah dibuat di Supabase — lihat docs/analitik-pengunjung.md).</div>';
  });

  await Promise.all([usersPromise, visitorsPromise]);
  if (btn && token === analyticsToken) btn.disabled = false;
}

function renderAnalyticsView() {
  const host = document.querySelector('#view-analytics');
  if (!host || !isPlatformAdmin) return;
  host.innerHTML = `<div class="panel">
    <div class="panel-heading">
      <div><h3>📊 Analitik Catat Duit</h3><p>Panel ini hanya terlihat oleh admin platform.</p></div>
      <button class="primary-button" id="an-refresh" type="button">🔄 Refresh</button>
    </div>

    <div class="an-section">
      <h4>Pengguna Terdaftar</h4>
      <p class="an-hint">Aktif = masuk atau mencatat dalam ${ANALYTICS_ACTIVE_DAYS} hari terakhir.</p>
      <div class="an-stats">
        <div class="an-stat"><span id="an-u-total">-</span><small>Total Terdaftar</small></div>
        <div class="an-stat good"><span id="an-u-active">-</span><small>Aktif</small></div>
        <div class="an-stat bad"><span id="an-u-inactive">-</span><small>Tidak Aktif</small></div>
        <div class="an-stat"><span id="an-u-new">-</span><small>Baru (7 hari)</small></div>
      </div>
      <div id="an-user-list" class="an-user-list"></div>
    </div>

    <div class="an-section">
      <div class="an-head">
        <h4>Analitik Pengunjung</h4>
        <select id="an-range" aria-label="Rentang waktu data">
          <option value="7">7 Hari Terakhir</option>
          <option value="30" selected>30 Hari Terakhir</option>
          <option value="all">Semua Waktu</option>
        </select>
      </div>
      <div class="an-note" id="an-trunc" hidden></div>
      <div class="an-stats">
        <div class="an-stat"><span id="an-v-total">-</span><small>Total Kunjungan</small></div>
        <div class="an-stat"><span id="an-v-unique">-</span><small>Pengunjung Unik</small></div>
        <div class="an-stat"><span id="an-v-today">-</span><small>Hari Ini (Kunjungan)</small></div>
        <div class="an-stat"><span id="an-v-today-unique">-</span><small>Hari Ini (Unik)</small></div>
      </div>
      <h5>📈 Tren Kunjungan Harian</h5>
      <div class="an-chart" id="an-chart"></div>
      <div class="an-cols">
        <div><h5>📱 Perangkat Pengunjung</h5><div id="an-devices"></div></div>
        <div><h5>📄 Halaman Populer</h5><div id="an-pages"></div></div>
      </div>
    </div></div>`;
  host.querySelector('#an-refresh')?.addEventListener('click', loadAnalytics);
  host.querySelector('#an-range')?.addEventListener('change', loadAnalytics);
  loadAnalytics();
}
