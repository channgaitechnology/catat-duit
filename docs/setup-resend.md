# Panduan Integrasi Email Resend Catat Duit

Dokumen ini menjelaskan cara menghubungkan layanan email [Resend](https://resend.com/) dengan aplikasi Catat Duit melalui Netlify Functions.

---

## 1. Konsep & Batasan Mode Gratis Resend

- **Mode Onboarding (Tanpa Verifikasi Domain):**
  - Resend mengizinkan pengiriman email gratis (100 email/hari & 3.000 email/bulan) menggunakan pengirim `onboarding@resend.dev`.
  - **Penting:** Dalam mode gratis tanpa verifikasi domain sendiri, penerima email (`to`) **harus sama dengan alamat email akun Resend yang terdaftar**.
  - Oleh karena itu, jalur Resend mode gratis ini digunakan untuk **notifikasi internal/admin** (misal aktivitas aplikasi, pendaftaran baru, dsb.), bukan untuk email konfirmasi pendaftaran publik atau reset kata sandi semua pengguna.
- **Kredensial Server-Side:**
  - API Key Resend disimpan pada environment variables Netlify dan hanya diakses melalui Netlify Function (`netlify/functions/notify-admin.js`). Jangan pernah menaruh API Key di frontend/Git.

---

## 2. Langkah Pembuatan Akun & API Key Resend

1. Buka [resend.com](https://resend.com/) dan daftar/masuk menggunakan email admin Anda.
2. Buka menu **API Keys** di dashboard Resend.
3. Klik **Create API Key**. Beri nama (contoh: `catat-duit-admin`).
4. Salin API key yang dihasilkan (dimulai dengan `re_...`). Simpan di tempat yang aman (hanya muncul sekali).

---

## 3. Konfigurasi Environment Variables di Netlify

1. Buka dashboard Netlify untuk situs `catat-duit-keuangan`.
2. Masuk ke **Site configuration** > **Environment variables**.
3. Tambahkan variabel berikut:

| Nama Variabel | Contoh Nilai | Keterangan |
|---|---|---|
| `RESEND_API_KEY` | `re_123456789...` | API Key dari dashboard Resend |
| `ADMIN_NOTIFY_EMAIL` | `email-admin@domain.com` | Email akun Resend Anda (tujuan notifikasi) |
| `NOTIFY_WEBHOOK_SECRET` | *(string acak bebas)* | Secret opsional untuk memvalidasi pemanggil webhook (header `X-Webhook-Secret`) |
| `RESEND_FROM_EMAIL` | *(opsional)* `Catat Duit <onboarding@resend.dev>` | Alamat pengirim (gunakan default jika belum punya custom domain) |

---

## 4. Cara Pengujian Notifikasi

### Menggunakan cURL
```bash
curl -X POST https://catat-duit-keuangan.netlify.app/.netlify/functions/notify-admin \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: <NOTIFY_WEBHOOK_SECRET>" \
  -d '{"subject": "Uji Coba Notifikasi", "message": "Email notifikasi Resend berhasil terkirim dari Catat Duit!"}'
```

### Menggunakan Supabase Database Webhook (Opsional)
Jika Anda ingin menerima email saat ada data transaksi baru masuk:
1. Buka **Supabase Dashboard** > **Database** > **Webhooks**.
2. Klik **Create a new webhook**.
3. Pilih tabel `finance_records` dan event `Insert`.
4. URL tujuan: `https://catat-duit-keuangan.netlify.app/.netlify/functions/notify-admin`.
5. Tambahkan HTTP Header: `X-Webhook-Secret: <nilai NOTIFY_WEBHOOK_SECRET>`.
