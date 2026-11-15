// js/10-visitor-tracker.js
// Pelacak pengunjung anonim (pola yang sama dengan Dokter Laundry).
// - visitor_id acak & persisten di localStorage (bukan data pribadi, tidak terhubung ke akun)
// - 1 halaman hanya dicatat 1x per sesi tab (sessionStorage) supaya refresh tidak menggandakan hitungan
// - non-blocking: kegagalan apa pun diabaikan diam-diam dan tidak pernah mengganggu aplikasi
// Tabel & aturan keamanan: lihat docs/analitik-pengunjung.md

function getOrCreateVisitorId() {
  let id = '';
  try {
    id = localStorage.getItem('cd_visitor_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('cd_visitor_id', id);
    }
  } catch (e) {
    id = 'v_anon_' + Math.random().toString(36).substring(2, 10);
  }
  return id;
}

function trackVisitorPage() {
  try {
    if (!db) return;
    const path = (window.location.pathname || '/').slice(0, 100);
    const sessionKey = 'cd_visited_' + path;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    const visitorId = getOrCreateVisitorId();
    const referrer = (document.referrer || '').slice(0, 250);
    const userAgent = (navigator.userAgent || '').slice(0, 250);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';

    db.from('visitor_logs').insert([{
      visitor_id: visitorId,
      page_path: path,
      referrer: referrer,
      user_agent: userAgent,
      device_type: deviceType
    }]).then(() => {}, () => {});
  } catch (e) {}
}

// Otomatis catat kunjungan saat script dimuat
trackVisitorPage();
