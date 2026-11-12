// js/00-globals.js
// Konfigurasi Supabase, state global, referensi DOM umum, helper formatting, dan offline support

const SUPABASE_URL = 'https://boygncniytuhcacnshcd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-dOn_dVEEZDTvQjvM0Lgcw_9W3pWe0a';

var db = null;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } catch (err) {
    console.warn('Gagal inisialisasi Supabase client:', err);
  }
}

var activeUser = null;
var records = [];
var assets = [];
var customCategories = [];
var authMode = 'signin';
var authBusy = false;
var txSearchQuery = '';
var realtimeChannel = null;
var collapsedDates = new Set();

// Kunci penyimpanan LocalStorage untuk Mode Offline
const STORAGE_KEY_RECORDS = 'catatduit_cached_records';
const STORAGE_KEY_ASSETS = 'catatduit_cached_assets';
const STORAGE_KEY_USER = 'catatduit_cached_user';
const STORAGE_KEY_QUEUE = 'catatduit_offline_queue';

function getCachedData(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setCachedData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

// Elemen DOM Global
const authView = document.querySelector('#auth-view');
const appShell = document.querySelector('#app-shell');
const authForm = document.querySelector('#auth-form');
const authEmail = document.querySelector('#auth-email');
const authPassword = document.querySelector('#auth-password');
const authConfirm = document.querySelector('#auth-confirm-password');
const togglePassword = document.querySelector('#toggle-password');
const toggleConfirmPassword = document.querySelector('#toggle-confirm-password');
const workspace = document.querySelector('#finance-workspace');

// Toast Notification
let toastTimer = null;
function showToast(message, type = 'info', duration = 3500) {
  const toast = document.querySelector('#app-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `app-toast ${type}`;
  toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, duration);
}

// Status Jaringan UI (Badge)
function updateNetworkStatusUI(online) {
  const badge = document.querySelector('#network-badge');
  if (!badge) return;
  if (online) {
    badge.className = 'network-badge online';
    badge.textContent = '● Online';
    badge.title = 'Terhubung ke server cloud';
  } else {
    badge.className = 'network-badge offline';
    badge.textContent = '● Offline';
    badge.title = 'Bekerja secara offline. Data tersimpan di perangkat ini.';
  }
}

window.addEventListener('online', () => {
  updateNetworkStatusUI(true);
  showToast('Koneksi internet kembali aktif. Menyinkronkan data...', 'success');
  if (typeof refreshData === 'function') refreshData();
});

window.addEventListener('offline', () => {
  updateNetworkStatusUI(false);
  showToast('Mode Offline aktif. Data tersimpan aman di perangkat ini.', 'warning');
});

setTimeout(() => updateNetworkStatusUI(navigator.onLine), 50);

function parseAssetName(fullName) {
  const match = String(fullName || '').match(/^\[(.*?)\]\s*(.*)$/);
  if (match) {
    const tag = match[1], rawName = match[2];
    const isNonLiquid = tag.startsWith('Tidak Cair') || ['Tanah', 'Bangunan', 'Properti', 'Kendaraan', 'Saham / Bisnis', 'Lainnya'].some(k => tag.includes(k));
    return { isLiquid: !isNonLiquid, category: tag, displayName: rawName || fullName };
  }
  // Default legacy without prefix is treated as liquid
  return { isLiquid: true, category: 'Aset Cair', displayName: fullName };
}

function rupiah(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function compact(value) {
  return Math.abs(Number(value)) >= 1e6 ? `Rp ${(value / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : rupiah(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(date) {
  return String(date).slice(0, 7);
}
