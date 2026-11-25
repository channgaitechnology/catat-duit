# Langganan Lacak Duit Pro

## Model
- Pengguna baru otomatis dapat **trial Pro 30 hari** (dibuat server saat login pertama).
- Sesudahnya status **Gratis**: mencatat, runway, utang-piutang, aset, sinkronisasi tetap gratis. Yang butuh Pro: **unduh laporan** (Excel/PDF/JPG). Tambah fitur Pro baru lewat `PRO_FEATURES` di `js/14-subscription.js` + `requireProFeature('kunci')`.
- Paket (tabel `subscription_plans`, ubah harga lewat SQL Editor): 1 bulan Rp19.000, 3 bulan Rp49.000, 12 bulan Rp149.000, seumur hidup Rp249.000 (nonaktif).
- Bayar manual: transfer/QRIS dengan **kode unik 1–99** ditambahkan ke harga agar mudah dicocokkan di mutasi. Pro aktif setelah admin menyetujui.
- Sisa trial tidak hangus; perpanjangan menumpuk dari tanggal berakhir.

## Penyiapan (sekali)
1. Pastikan Bagian 2 `docs/analitik-pengunjung.md` sudah dijalankan (fungsi `is_platform_admin`).
2. Supabase SQL Editor: jalankan seluruh `docs/migrasi-langganan.sql`.
3. Isi instruksi bayar (ganti isi sesuai milikmu):
```sql
insert into public.app_config(key,value) values
 ('payment_text','Transfer ke BCA 1234567890 a.n. NAMA. Cantumkan nominal persis.'),
 ('qris_url','https://.../qris.png'),
 ('admin_wa','628xxxxxxxxxx')
on conflict (key) do update set value = excluded.value;
```
(Disimpan di database, bukan di repo publik.)
4. Atur email: `docs/setup-email-auth.md`.

## Alur harian admin
Login sebagai admin > menu **Analitik** > kartu **Pembayaran Pro**: cocokkan nominal dengan mutasi bank/QRIS, lalu **Setujui** (atau **Tolak** dengan alasan). Kartu yang sama punya form **Beri akses Pro manual** (email + hari).

## Cek keamanan
1. Klien tidak bisa menulis status langganan/pembayaran: tanpa policy insert/update/delete; semua perubahan lewat fungsi server.
2. Hanya admin (`is_platform_admin()`) yang bisa menyetujui, menolak, melihat semua tagihan, atau memberi hari.
3. Data rahasia (rekening/QRIS) di tabel `app_config`, hanya terbaca pengguna login, tidak ada di repo.
4. Gagal memuat status = pengguna tidak dikunci (fail-open); batas 5 tagihan/24 jam per pengguna. Catatan: pengunduhan dilakukan di klien sehingga gerbang ini "lunak" (cukup untuk monetisasi, bukan DRM).

SQL diuji pada Postgres (PGlite) dengan 50 skenario termasuk percobaan curang.
