// js/00-globals.js
// Konfigurasi Supabase, state global, referensi DOM umum, dan helper formatting

const SUPABASE_URL = 'https://boygncniytuhcacnshcd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-dOn_dVEEZDTvQjvM0Lgcw_9W3pWe0a';
const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;

var activeUser = null;
var records = [];
var assets = [];
var authMode = 'signin';
var authBusy = false;
var txSearchQuery = '';
var realtimeChannel = null;
var collapsedDates = new Set();

const authView = document.querySelector('#auth-view');
const appShell = document.querySelector('#app-shell');
const authForm = document.querySelector('#auth-form');
const authEmail = document.querySelector('#auth-email');
const authPassword = document.querySelector('#auth-password');
const authConfirm = document.querySelector('#auth-confirm-password');
const togglePassword = document.querySelector('#toggle-password');
const toggleConfirmPassword = document.querySelector('#toggle-confirm-password');
const workspace = document.querySelector('#finance-workspace');

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
  return Number(value) >= 1e6 ? `Rp ${(value / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : rupiah(value);
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
