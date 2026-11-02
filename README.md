# Catat Duit — uang sebagai energi hidup

Catat Duit adalah aplikasi keuangan pribadi dengan **Runway Keuangan** sebagai fitur utama: perkiraan berapa lama dana yang tersedia dapat menopang biaya hidup berdasarkan pengeluaran bulanan.

## Login dan penyimpanan

- Login, pendaftaran, konfirmasi email, reset kata sandi, dan keluar akun memakai Supabase Auth.
- Proyek Supabase Catat Duit terpisah dari Dokter Laundry: `boygncniytuhcacnshcd`.
- Data keuangan saat ini disimpan di browser per akun. Data belum tersinkron antar perangkat dan tidak memakai tabel atau database Dokter Laundry.
- Frontend hanya memakai Supabase publishable key. Jangan menambahkan `service_role` atau secret key ke kode browser.

## Menjalankan

Buka `index.html` lewat server lokal atau host statis. Login Supabase di alamat lokal maupun production memerlukan alamat situs yang sesuai di **Authentication → URL Configuration → Redirect URLs**.

Untuk GitHub Pages repo ini, tambahkan alamat berikut setelah Pages aktif:

`https://channgaitechnology.github.io/ruang-keuangan/`

## Runway Keuangan

`runway (bulan) = aset likuid ÷ rata-rata pengeluaran bulanan`

Rata-rata menggunakan hingga tiga bulan pengeluaran terakhir yang tercatat. Angka ini estimasi; hasil awal bergantung pada data yang dimasukkan pengguna.

## Status fitur

- Ringkasan uang masuk/keluar, aset, arus uang, dan runway.
- Pencatatan transaksi masuk/keluar.
- Login Supabase, pendaftaran, reset kata sandi, dan data browser yang dipisahkan per akun.
- Utang/piutang, aset per jenis, penghasilan berulang, sinkronisasi cloud, dan ekspor/impor masih dalam rencana pengembangan.

## Privasi

Autentikasi akun dikelola proyek Supabase Catat Duit. Transaksi dan jumlah aset pada versi ini disimpan pada `localStorage` browser per user ID. Membersihkan data browser akan menghapus data finansial lokal tersebut.
