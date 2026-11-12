# Progres Catat Duit

Catatan ini merangkum keadaan repo, deploy, dan integrasi per 2 November 2026 agar pekerjaan dapat dilanjutkan dari titik terakhir.

## Sudah dikerjakan

- Repo GitHub terpisah dan bernama [catat-duit](https://github.com/channgaitechnology/catat-duit); tidak mencampur kode atau database Dokter Laundry.
- Frontend statis HTML, CSS, dan JavaScript terhubung ke Netlify dan deploy otomatis dari branch `main`.
- Situs produksi saat ini: [catat-duit-keuangan.netlify.app](https://catat-duit-keuangan.netlify.app/).
- **Sinkronisasi Saldo Kas Real-Time:** Penambahan kartu metrik Sisa Saldo (Arus Kas Bersih) yang menghitung selisih uang masuk dan uang keluar bulan ini, status Surplus/Defisit, akumulasi saldo kas berjalan all-time, serta sinkronisasi otomatis ke energi Runway Keuangan.
- **Mode Offline Penuh (PWA & Offline Sync Queue):** Service Worker v6 dengan caching offline SDK Supabase & Google Fonts; LocalStorage persistence untuk records, assets, dan user; kemampuan mencatat/mengedit/menghapus secara offline dengan antrean sinkronisasi otomatis saat terhubung kembali; badge status jaringan online/offline dan notifikasi toast.
- **Halaman Depan / Edukasi Auth:** Desain dual-layout pada layar login/daftar yang memuat informasi lengkap tentang filosofi aplikasi, 4 fungsi utama (Runway, Arus Kas, Klasifikasi Aset, Utang-Piutang), dan 4 keunggulan aplikasi.
- Pembaruan dashboard: angka, grafik enam bulan, dan kategori pengeluaran menggunakan data akun; data contoh tidak ditampilkan sebagai transaksi nyata.
- Proyek Supabase terpisah untuk Catat Duit sudah dibuat. Tabel transaksi/aset menggunakan Row Level Security dan pembatasan data per pengguna.
- UI Supabase Auth di aplikasi mencakup masuk, daftar, reset kata sandi, dan keluar akun.

## Belum selesai

- **Alamat Auth Supabase:** Konfigurasi Site URL dan Redirect URLs telah didokumentasikan dan disiapkan sesuai URL produksi (`https://catat-duit-keuangan.netlify.app/`). Lihat panduan di [docs/setup-supabase-url.md](docs/setup-supabase-url.md).
- **Email Auth:** Custom SMTP belum disetel. Email pendaftaran/konfirmasi/reset belum siap untuk pengguna umum.
- **Resend:** Backend Netlify Function (`netlify/functions/notify-admin.js`) dan panduan integrasi [docs/setup-resend.md](docs/setup-resend.md) telah disiapkan. Tinggal memasukkan `RESEND_API_KEY` dan `ADMIN_NOTIFY_EMAIL` pada environment variables Netlify.
- **Domain:** Tidak ada domain milik sendiri. Nama subdomain Netlify `catatduit`, `catatbelanja`, dan `catatkeuangan` dicoba tetapi dinyatakan tidak tersedia. URL aktif tetap `catat-duit-keuangan.netlify.app`.
- **PWA (Progressive Web App):** Telah diaktifkan dengan `manifest.json`, icon 192/512px, dan `sw.js` agar aplikasi dapat di-install langsung di HP Android maupun iOS.
- **Fitur SaaS tambahan:** Belum ada paket/langganan dan pembayaran.

## Temuan dari Dokter Laundry

Pola Dokter Laundry menggunakan dua jalur email yang berbeda:

1. Notifikasi internal admin dikirim lewat Resend dengan pengirim `onboarding@resend.dev`. Dokumentasinya menyebut mode tanpa verifikasi domain hanya untuk penerima yang sama dengan email akun Resend. API key diletakkan pada environment variable Netlify, tidak di Git.
2. Email Supabase Auth (konfirmasi akun dan reset kata sandi) menggunakan Gmail SMTP di Supabase, bukan Resend.

Rujukan: [panduan notifikasi Dokter Laundry](https://github.com/channgaitechnology/laundrybatapasid/blob/main/docs/notifikasi.md), [panduan email Auth](https://github.com/channgaitechnology/laundrybatapasid/blob/main/docs/setup-email-auth.md).

Catat Duit belum meniru konfigurasi tersebut. Untuk melayani email Auth ke pengguna umum, tentukan provider/pengirim yang sesuai terlebih dahulu. Mode onboarding Resend tanpa domain tidak boleh diasumsikan bisa mengirim ke semua pengguna. Jangan menggunakan API key atau password Dokter Laundry; kalau Resend dipakai, buat kredensial tersendiri untuk Catat Duit.

## Langkah berikutnya

1. Pengguna masuk sendiri ke akun Resend di browser; jangan mengirim password atau API key ke chat.
2. Tentukan cara mengirim email konfirmasi/reset untuk pengguna umum dan sender yang akan dipakai.
3. Siapkan kredensial terpisah untuk Catat Duit langsung di pengaturan provider terkait; simpan rahasia hanya di dashboard provider.
4. Setelah URL produksi final dipastikan, setel Site URL dan Redirect URLs pada proyek Supabase Catat Duit.
5. Uji alur daftar, konfirmasi email, masuk, lupa kata sandi, dan reset sebelum mengundang pengguna umum.
6. Jika notifikasi admin Resend dibutuhkan, implementasikan Netlify Function server-side dan letakkan key khusus Catat Duit pada Netlify environment variables; jangan pernah menaruhnya di frontend/Git.

## Catatan keamanan

- Repo ini publik. Jangan menambahkan kata sandi, App Password, API key, service-role key, token, webhook secret, atau environment file.
- Frontend hanya boleh memakai Supabase publishable key. Semua kredensial server harus tersimpan pada environment variable provider yang sesuai.
- Database harus mempertahankan RLS yang membatasi baris ke pemiliknya.
