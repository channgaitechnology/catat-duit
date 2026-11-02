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
- Resend digunakan sebagai SMTP Supabase untuk email konfirmasi dan reset kata sandi. Gunakan domain pengirim milik Catat Duit dan API key terpisah; jangan menaruh key di kode atau Git.
- Netlify Functions akan dipakai untuk pekerjaan server-side yang membutuhkan rahasia, misalnya integrasi pembayaran ketika paket dan harga SaaS sudah ditentukan.

Netlify membaca konfigurasi deploy dari `netlify.toml`. Situs menggunakan root repository sebagai publish directory. Hubungkan repository ini ke Netlify dan aktifkan deploy otomatis dari branch `main`.

### Persiapan email Resend

1. Daftarkan domain milik Catat Duit di Resend dan pasang record DNS yang diminta sampai domain terverifikasi.
2. Buat API key khusus Catat Duit.
3. Di Supabase Catat Duit, buka **Authentication → Emails → SMTP Settings**, lalu isi host `smtp.resend.com`, port `465`, username `resend`, password dengan API key Resend, dan sender email dari domain yang terverifikasi.
4. Atur Site URL ke domain production Catat Duit dan tambahkan URL yang sama ke Redirect URLs Supabase.

Jangan gunakan domain bawaan `*.netlify.app` sebagai domain pengirim email Resend; domain tersebut tidak berada di bawah kendali DNS Anda. Simpan semua API key dan kredensial hanya pada pengaturan provider, bukan di repository.

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

