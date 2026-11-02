# Ruang — uang sebagai energi hidup

Ruang adalah aplikasi pencatatan keuangan pribadi yang memandang uang sebagai energi untuk menjalani hidup. Fitur utamanya adalah **Runway Keuangan**: perkiraan berapa bulan dana yang tersedia bisa menopang biaya hidup berdasarkan rata-rata pengeluaran.

## Fitur versi awal

- Ringkasan uang masuk, uang keluar, total aset, dan runway keuangan.
- Pencatatan transaksi masuk/keluar dengan kategori dan tanggal.
- Riwayat transaksi terbaru dan visualisasi arus uang.
- Data disimpan di `localStorage` browser pada perangkat ini.

## Menjalankan

Buka `index.html` di browser. Tidak ada proses build atau dependensi.

## Perhitungan runway

`runway (bulan) = aset likuid ÷ rata-rata pengeluaran bulanan`

Rata-rata dihitung dari bulan-bulan yang memiliki transaksi pengeluaran (maksimal tiga bulan terakhir yang tercatat). Ini adalah estimasi sederhana; versi berikutnya bisa memasukkan pendapatan berulang, utang/piutang, dan pemisahan aset likuid dari total aset.

## Rencana pengembangan

- Catatan utang dan piutang dengan status pelunasan.
- Aset per jenis serta penghasilan bulanan.
- Pengaturan biaya hidup dan sumber dana yang benar-benar likuid.
- Ekspor/impor data, autentikasi, dan sinkronisasi lintas perangkat.

## Privasi

Versi ini berjalan sepenuhnya di browser dan menyimpan data di perangkat pengguna. Belum ada akun, server, atau sinkronisasi cloud.
