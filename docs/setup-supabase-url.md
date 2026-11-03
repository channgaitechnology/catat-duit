# Panduan Konfigurasi Supabase Site URL & Redirect URLs

Dokumentasi ini menjelaskan konfigurasi URL untuk Supabase Auth pada proyek Catat Duit agar tautan konfirmasi pendaftaran akun dan reset kata sandi mengarahkan pengguna kembali ke aplikasi dengan benar.

---

## 1. Lokasi Pengaturan di Supabase Dashboard

1. Buka [Supabase Dashboard](https://supabase.com/dashboard).
2. Pilih proyek Catat Duit (ID Proyek: `boygncniytuhcacnshcd`).
3. Pada bilah navigasi kiri, pilih **Authentication** > **URL Configuration**.

---

## 2. Nilai Konfigurasi yang Harus Diisi

### A. Site URL
Setel **Site URL** ke domain produksi aplikasi:
```text
https://catat-duit-keuangan.netlify.app
```
*(Jangan gunakan `http://localhost:3000` atau URL lain yang bukan domain utama produksi).*

### B. Redirect URLs
Tambahkan URL berikut pada daftar **Redirect URLs** (klik tombol **Add URL** untuk setiap baris):

1. **Produksi (dengan wildcard)**:
   ```text
   https://catat-duit-keuangan.netlify.app/**
   ```
2. **Produksi (exact)**:
   ```text
   https://catat-duit-keuangan.netlify.app/
   ```
3. **Pengujian Lokal / Pengembangan**:
   ```text
   http://localhost:3000/**
   http://localhost:8888/**
   http://127.0.0.1:3000/**
   http://127.0.0.1:8888/**
   ```

*Klik **Save** setelah menambahkan semua URL.*

---

## 3. Cara Kerja Redirect di Aplikasi

Di kode aplikasi (`app.js`), URL pengalihan ditentukan secara dinamis menggunakan:
```javascript
const redirectTo = window.location.origin + window.location.pathname;
```
- Saat pengguna mendaftar (`signUp`), parameter `emailRedirectTo: redirectTo` dikirimkan ke Supabase.
- Saat pengguna meminta tautan reset kata sandi (`resetPasswordForEmail`), parameter `redirectTo` dikirimkan ke Supabase.
- Ketika pengguna mengklik tautan di inbox email, Supabase memeriksa apakah URL tujuan cocok dengan **Site URL** atau salah satu dari daftar **Redirect URLs**. Jika cocok, pengguna akan diarahkan kembali ke aplikasi bersama token auth untuk menyelesaikan verifikasi/reset kata sandi.
