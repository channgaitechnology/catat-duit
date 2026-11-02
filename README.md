# Catat Duit — uang sebagai energi hidup

Catat Duit adalah aplikasi keuangan pribadi dengan **Runway Keuangan** sebagai fitur utama: perkiraan berapa lama dana yang tersedia dapat menopang biaya hidup berdasarkan pengeluaran bulanan.

## Login dan penyimpanan

- Login, pendaftaran, konfirmasi email, reset kata sandi, dan keluar akun memakai Supabase Auth.
- Proyek Supabase Catat Duit terpisah dari Dokter Laundry: `boygncniytuhcacnshcd`.
- Transaksi, utang/piutang, dan aset disimpan di database proyek Catat Duit, terlindungi oleh Row Level Security sehingga pengguna hanya dapat melihat datanya sendiri.
- Frontend hanya memakai Supabase publishable key. Jangan menambahkan `service_role` atau secret key ke kode browser.

## Tech stack dan deploy

- Frontend statis (HTML, CSS, JavaScript) di-deploy ke Netlify dari repository GitHub.
- Supabase Catat Duit menangani Auth dan database; kebijakan RLS memastikan tiap pengguna hanya dapat mengakses datanya sendiri.
- Konfigurasi pengiriman email Auth Supabase belum selesai. Resend belum dihubungkan dan belum ada SMTP khusus untuk Catat Duit.
- Netlify Functions dapat dipakai untuk email server-side/notifikasi ketika fitur tersebut dibutuhkan; API key tidak boleh diletakkan di frontend.
- Catatan status lengkap dan langkah berikutnya ada di [PROGRESS.md](PROGRESS.md).

Netlify membaca konfigurasi deploy dari `netlify.toml`. Situs menggunakan root repository sebagai publish directory. Repository sudah terhubung ke Netlify; commit baru pada branch `main` memicu deploy otomatis.

### Status email

Email konfirmasi dan reset kata sandi Supabase belum siap untuk pengguna umum karena pengaturan Redirect URL dan SMTP belum dilengkapi. Resend juga belum dikonfigurasi untuk Catat Duit.

Dokter Laundry memakai Resend `onboarding@resend.dev` hanya untuk notifikasi admin terbatas dan Gmail SMTP untuk email Auth. Pola tersebut belum diterapkan di Catat Duit. Jangan menganggap mode Resend tanpa domain dapat mengirim email ke semua pengguna. Lihat [PROGRESS.md](PROGRESS.md) untuk temuan dan langkah lanjutan.

Jangan memasukkan API key, App Password, atau kredensial lain ke repo. Bila Resend/Gmail SMTP dipilih, gunakan kredensial baru khusus Catat Duit dan simpan langsung pada dashboard provider.

## Runway Keuangan

`runway (bulan) = aset likuid ÷ rata-rata pengeluaran bulanan`

Rata-rata menggunakan hingga tiga bulan pengeluaran terakhir yang tercatat. Angka ini estimasi; hasil awal bergantung pada data yang dimasukkan pengguna.

## Status fitur

- Ringkasan uang masuk/keluar, aset likuid, dan runway berdasarkan rata-rata pengeluaran sampai tiga bulan terakhir.
- Pencatatan transaksi, pengelolaan utang/piutang beserta status pelunasan, dan aset per jenis.
- Login Supabase, pendaftaran, konfirmasi email, reset kata sandi, dan sinkronisasi data lintas perangkat.
- Penghasilan berulang dan ekspor/impor belum tersedia.

## Privasi

Autentikasi dan database memakai proyek Supabase Catat Duit, terpisah dari Dokter Laundry. Database menggunakan kebijakan Row Level Security per akun. Frontend memakai publishable key; jangan menambahkan `service_role` atau secret key ke kode browser.

