// js/00-i18n.js
// I18N Indonesia <-> English (pola sama seperti Dokter Laundry).
// Bahasa Indonesia tetap bahasa sumber/default (tertulis langsung di index.html dan js/*.js).
// Kamus I18N_EN hanya dipakai untuk menerjemahkan tampilan ke English saat currentLang === 'en'.
// Ganti bahasa = simpan pilihan lalu muat ulang halaman (setLanguage), sehingga seluruh tampilan
// konsisten dalam satu bahasa. Konten yang dirender JS setelah load ikut diterjemahkan oleh
// MutationObserver ringan (hanya aktif saat English).
var currentLang = (function () {
  try { return localStorage.getItem('cd_lang') === 'en' ? 'en' : 'id'; } catch (e) { return 'id'; }
})();

// Locale untuk tanggal & angka non-mata-uang. Format Rupiah tetap id-ID.
var APP_LOCALE = currentLang === 'en' ? 'en-GB' : 'id-ID';

const I18N_EN = {
  /* ---------- Judul halaman ---------- */
  'Lacak Duit — uang sebagai energi hidup': 'Lacak Duit — money as life energy',

  /* ---------- Halaman login: panel informasi ---------- */
  'KEUANGAN PRIBADI SADAR ENERGI': 'ENERGY-AWARE PERSONAL FINANCE',
  'Uang bukan sekadar angka,': 'Money is not just numbers,',
  'ia adalah energi hidupmu.': 'it is your life energy.',
  'Lacak Duit dirancang untuk membangun kesadaran finansial yang tenang, bukan menambah kecemasan. Pantau arus kas harian dan ketahui secara nyata seberapa jauh energi keuangan Anda mampu menopang ritme hidup.':
    'Lacak Duit is designed to build calm financial awareness, not add anxiety. Track your daily cash flow and see how far your financial energy can really sustain your lifestyle.',
  'Runway Keuangan': 'Financial Runway',
  'Estimasi cerdas berapa bulan dan hari dana likuid Anda mampu menopang gaya hidup berdasarkan rata-rata pengeluaran nyata.':
    'A smart estimate of how many months and days your liquid funds can sustain your lifestyle, based on your real average spending.',
  'Sinkronisasi Saldo Kas Real-Time': 'Real-Time Cash Balance Sync',
  'Mencatat pemasukan dan pengeluaran dengan perhitungan sisa saldo kas yang selalu sinkron dan transparan.':
    'Record income and expenses with a remaining cash balance that is always in sync and transparent.',
  'Pemisahan Aset Likuid & Tetap': 'Liquid & Fixed Asset Separation',
  'Bedakan dana darurat siap pakai (cash, bank, emas) dengan aset kekayaan tetap jangka panjang (properti, kendaraan).':
    'Tell ready-to-use emergency funds (cash, bank, gold) apart from long-term fixed assets (property, vehicles).',
  'Catatan Utang & Piutang': 'Debt & Receivable Records',
  'Kelola kewajiban dan hak penerimaan uang secara terarah dengan status pelunasan yang jelas.':
    'Manage what you owe and what is owed to you, with a clear settlement status.',
  'Bisa Diakses Offline (PWA)': 'Works Offline (PWA)',
  'Privasi Aman Terenkripsi RLS': 'Private & Secured (RLS)',
  'Bebas Iklan & Ringan': 'Ad-free & Lightweight',

  /* ---------- Halaman login: form ---------- */
  '‹ Kembali': '‹ Back',
  'AKUN PENGGUNA': 'USER ACCOUNT',
  'Selamat datang': 'Welcome',
  'Masuk atau daftar untuk mulai mencatat.': 'Sign in or sign up to start recording.',
  'Masuk': 'Sign in',
  'Daftar': 'Sign up',
  'Email': 'Email',
  'Kata sandi': 'Password',
  'Minimal 6 karakter': 'At least 6 characters',
  'Tampilkan kata sandi': 'Show password',
  'Sembunyikan kata sandi': 'Hide password',
  'Lihat': 'Show',
  'Sembunyi': 'Hide',
  'Ulangi kata sandi': 'Repeat password',
  'Tampilkan ulangi kata sandi': 'Show repeated password',
  'Sembunyikan ulangi kata sandi': 'Hide repeated password',
  'Belum punya akun? Daftar': "Don't have an account? Sign up",
  'Sudah punya akun? Masuk': 'Already have an account? Sign in',
  'Lupa kata sandi?': 'Forgot password?',
  'Kembali ke Masuk': 'Back to Sign in',
  'Data keuangan tersimpan aman & terisolasi pada akun Anda.': 'Your financial data is stored securely and isolated per account.',
  'Buat akun Lacak Duit': 'Create your Lacak Duit account',
  'Reset kata sandi': 'Reset password',
  'Buat kata sandi baru': 'Create a new password',
  'Masuk ke Lacak Duit': 'Sign in to Lacak Duit',
  'Masukkan kata sandi baru untuk akun Anda.': 'Enter a new password for your account.',
  'Gunakan akun Lacak Duit Anda.': 'Use your Lacak Duit account.',
  'Kirim tautan reset': 'Send reset link',
  'Simpan kata sandi': 'Save password',
  'Memproses…': 'Processing…',
  'Terjadi kesalahan. Coba lagi.': 'Something went wrong. Please try again.',
  'Email atau kata sandi tidak cocok.': 'Email or password does not match.',
  'Konfirmasi email Anda sebelum masuk.': 'Please confirm your email before signing in.',
  'Email sudah terdaftar. Silakan masuk.': 'This email is already registered. Please sign in.',
  'Kata sandi minimal 6 karakter.': 'Password must be at least 6 characters.',
  'Terlalu banyak percobaan. Coba lagi beberapa saat.': 'Too many attempts. Please try again in a moment.',
  'Alamat aplikasi belum terdaftar sebagai URL pengalihan Supabase.': 'This app address is not registered as a Supabase redirect URL.',
  'Ulangan kata sandi tidak cocok.': 'The repeated password does not match.',
  'Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.': 'Account created. Check your email to confirm, then sign in.',
  'Jika email terdaftar, tautan reset kata sandi akan dikirim.': 'If the email is registered, a password reset link will be sent.',
  'Kata sandi berhasil diperbarui.': 'Password updated successfully.',

  /* ---------- Sidebar, topbar, tab bar ---------- */
  'MENU': 'MENU',
  'Menu utama': 'Main menu',
  'Ringkasan': 'Overview',
  'Catat transaksi': 'Add transaction',
  'Catat': 'Add',
  'Riwayat': 'History',
  'Utang & piutang': 'Debts & receivables',
  'Utang': 'Debts',
  'Aset': 'Assets',
  'Analitik': 'Analytics',
  'RUANG PERSONAL': 'PERSONAL SPACE',
  'Akun': 'Account',
  'Akun Lacak Duit': 'Lacak Duit account',
  'Keluar': 'Sign out',
  'Data tersimpan aman': 'Data stored securely',
  'Tersinkron antar perangkat': 'Synced across devices',
  'Status koneksi': 'Connection status',
  '● Online': '● Online',
  '● Offline': '● Offline',
  'Terhubung ke server cloud': 'Connected to the cloud server',
  'Navigasi Bawah': 'Bottom navigation',
  'Pengaturan': 'Settings',
  'Transaksi': 'Transactions',
  'Utang & Piutang': 'Debts & Receivables',

  /* ---------- Ringkasan ---------- */
  'KEUANGAN SADAR ENERGI': 'ENERGY-AWARE FINANCE',
  'Setiap rupiah adalah energi. Yuk, lihat seberapa jauh ia membawamu.': 'Every rupiah is energy. Let\'s see how far it can take you.',
  'FITUR UTAMA · RUNWAY KEUANGAN': 'MAIN FEATURE · FINANCIAL RUNWAY',
  'Seberapa jauh energi': 'How far can your',
  'uangmu bisa bertahan?': 'money energy last?',
  'Dengan ritme hidupmu sekarang, aset likuidmu dapat menopang sekitar': 'At your current pace, your liquid assets can sustain about',
  'bulan': 'months',
  'biaya hidup': 'living costs',
  'ENERGI TERSEDIA': 'ENERGY AVAILABLE',
  'BIAYA HIDUP / BLN': 'LIVING COSTS / MO',
  'Perkiraan dari aset likuid / saldo kas dan rata-rata pengeluaran 3 bulan terakhir.': 'Estimated from liquid assets / cash balance and your average spending over the last 3 months.',
  'Perkiraan dari aset cair yang Anda catat dan rata-rata pengeluaran hingga 3 bulan terakhir.': 'Estimated from the liquid assets you recorded and your average spending over up to the last 3 months.',
  'Perkiraan dari saldo kas transaksi dan rata-rata pengeluaran hingga 3 bulan terakhir.': 'Estimated from your transaction cash balance and your average spending over up to the last 3 months.',
  'Catat pengeluaran selama beberapa bulan untuk melihat perkiraan kemampuan bertahan.': 'Record your spending for a few months to see how long your money can last.',
  'BULAN INI': 'THIS MONTH',
  'Uang masuk': 'Money in',
  'Uang keluar': 'Money out',
  'Sisa saldo (Arus Kas)': 'Remaining balance (Cash Flow)',
  'TOTAL KEKAYAAN': 'TOTAL WEALTH',
  'Total aset': 'Total assets',
  'Ke mana uang pergi?': 'Where does the money go?',
  'Pengeluaran bulan ini berdasarkan kategori (Klik bar untuk melihat rincian)': "This month's spending by category (click a bar for details)",
  'Lihat semua transaksi ↗': 'See all transactions ↗',
  'Total pengeluaran bulan ini:': 'Total spending this month:',
  'Riwayat Transaksi': 'Transaction History',
  'Cari & kelola semua catatan uang masuk dan keluar ↗': 'Search & manage all money-in and money-out records ↗',
  'Utang & Piutang ': 'Debts & Receivables',
  'Pantau pelunasan kewajiban & hak tagih uang ↗': 'Track settlement of what you owe and are owed ↗',
  'Manajemen Aset': 'Asset Management',
  'Atur dana likuid penopang runway & aset tetap ↗': 'Manage the liquid funds backing your runway & fixed assets ↗',
  'Belum ada pengeluaran yang dicatat bulan ini.': 'No spending recorded this month yet.',
  '· Lihat rincian ↗': '· See details ↗',
  'Surplus (piutang > utang)': 'Surplus (receivables > debts)',
  'Defisit kewajiban bayar': 'Deficit in payment obligations',
  'Kondisi seimbang': 'Balanced',

  /* ---------- Riwayat ---------- */
  'CATATAN MUTASI': 'TRANSACTION LOG',
  'Daftar Transaksi': 'Transaction List',
  'Semua catatan uang masuk dan uang keluar yang telah Anda simpan.': 'All the money-in and money-out records you have saved.',
  '🔍 Cari transaksi, kategori, atau tanggal...': '🔍 Search transactions, categories, or dates...',
  'Cari transaksi, kategori, atau tanggal...': 'Search transactions, categories, or dates...',
  'Cari transaksi': 'Search transactions',
  '📥 Unduh Laporan': '📥 Download Report',
  '⚙ Kelola Kategori': '⚙ Manage Categories',
  'Semua': 'All',
  'Uang Masuk (↙)': 'Money In (↙)',
  'Uang Keluar (↗)': 'Money Out (↗)',
  'TRANSAKSI': 'TRANSACTION',
  'KATEGORI': 'CATEGORY',
  'TANGGAL': 'DATE',
  'JUMLAH': 'AMOUNT',
  'AKSI': 'ACTIONS',
  'Edit': 'Edit',
  'Hapus': 'Delete',

  /* ---------- Utang & piutang ---------- */
  'KEWAJIBAN & HAK TAGIH': 'OBLIGATIONS & RECEIVABLES',
  'Kelola pinjaman yang harus dibayar dan uang yang akan Anda terima.': 'Manage the loans you must repay and the money you will receive.',
  'Catat utang/piutang': 'Add debt/receivable',
  'KEWAJIBAN SAYA': 'WHAT I OWE',
  'Total Utang': 'Total Debts',
  'HAK TAGIH SAYA': 'WHAT I AM OWED',
  'Total Piutang': 'Total Receivables',
  'POSISI BERSIH': 'NET POSITION',
  'Selisih Piutang - Utang': 'Receivables - Debts',
  'Daftar Catatan Utang & Piutang': 'Debt & Receivable Records',
  'Tandai lunas saat pembayaran sudah diselesaikan.': 'Mark as settled once the payment is done.',
  'Belum Lunas': 'Unpaid',
  'Sudah Lunas': 'Settled',
  'Utang Saya': 'My Debts',
  'Piutang Saya': 'My Receivables',

  /* ---------- Aset ---------- */
  'STRUKTUR KEKAYAAN': 'WEALTH STRUCTURE',
  'Pisahkan dana darurat siap pakai dengan kekayaan jangka panjang.': 'Keep ready-to-use emergency funds separate from long-term wealth.',
  'Catat aset': 'Add asset',
  'Total Semua Aset': 'Total of All Assets',
  'Cair + Tetap': 'Liquid + Fixed',
  'PENOPANG RUNWAY': 'RUNWAY SUPPORT',
  'Aset Cair (Likuid)': 'Liquid Assets',
  'Cash, Tabungan, Emas': 'Cash, Savings, Gold',
  'KEKAYAAN TETAP': 'FIXED WEALTH',
  'Aset Tidak Cair': 'Illiquid Assets',
  'Properti, Kendaraan, Tanah': 'Property, Vehicles, Land',
  '◈ Aset Cair (Likuid) — Penopang Runway': '◈ Liquid Assets — Runway Support',
  'Dana likuid siap pakai (uang tunai, rekening bank, emas) yang langsung menopang perkiraan Runway Keuangan Anda.':
    'Ready-to-use liquid funds (cash, bank accounts, gold) that directly support your Financial Runway estimate.',
  '❖ Aset Tidak Cair (Tetap & Investasi)': '❖ Illiquid Assets (Fixed & Investments)',
  'Aset yang membutuhkan waktu untuk dicairkan (kendaraan, rumah, tanah, properti, portofolio).':
    'Assets that take time to turn into cash (vehicles, houses, land, property, portfolios).',
  'Belum ada aset cair (cash, tabungan, deposito, emas). Catat sekarang untuk menopang Runway.':
    'No liquid assets yet (cash, savings, deposits, gold). Add some now to support your Runway.',
  'Belum ada aset tetap (kendaraan, rumah, tanah, properti) yang dicatat.': 'No fixed assets recorded yet (vehicles, houses, land, property).',
  'Aset Cair': 'Liquid Assets',
  'Tidak Cair': 'Illiquid',
  'Saham / Bisnis': 'Stocks / Business',
  'Uang Tunai / Cash': 'Cash',
  'Tabungan Bank': 'Bank Savings',
  'Deposito': 'Time Deposit',
  'Emas / Logam Mulia': 'Gold / Precious Metals',
  'Kendaraan (Mobil/Motor)': 'Vehicles (Car/Motorbike)',
  'Tanah / Bangunan / Properti': 'Land / Buildings / Property',
  'Barang Antik / Lainnya': 'Antiques / Other',
  'Cair': 'Liquid',
  'Tetap': 'Fixed',

  /* ---------- Halaman Catat & dialog ---------- */
  'CATAT ENERGI': 'RECORD ENERGY',
  'Catat uang masuk atau uang keluar, selesai dalam beberapa detik.': 'Record money in or money out, done in a few seconds.',
  'Nama transaksi': 'Transaction name',
  'Contoh: Belanja mingguan': 'Example: Weekly groceries',
  'Jenis': 'Type',
  'Kategori': 'Category',
  'Makan & minum': 'Food & drinks',
  'Makan & Minum': 'Food & Drinks',
  'Tempat tinggal': 'Housing',
  'Transportasi': 'Transport',
  'Gaji': 'Salary',
  'Freelance': 'Freelance',
  'Lainnya': 'Other',
  '+ Tambah kategori baru...': '+ Add new category...',
  '＋ Tambah kategori baru...': '＋ Add new category...',
  '✏️ Edit / kelola kategori...': '✏️ Edit / manage categories...',
  'Jumlah (Rp)': 'Amount (Rp)',
  'Tanggal': 'Date',
  'Simpan transaksi': 'Save transaction',
  'Uang adalah energi hidupmu.': 'Money is your life energy.',
  'Dirancang untuk lebih sadar, bukan lebih cemas.': 'Designed to be more aware, not more anxious.',
  'PERBARUI ENERGI': 'UPDATE ENERGY',
  'Edit Transaksi': 'Edit Transaction',
  'Tutup': 'Close',
  'Simpan Perubahan': 'Save Changes',
  'PENGATURAN KATEGORI': 'CATEGORY SETTINGS',
  'Kelola Kategori': 'Manage Categories',
  'Ubah nama atau hapus kategori kustom Anda. Kategori akan tersinkron otomatis antar HP & desktop.':
    'Rename or delete your custom categories. Categories sync automatically between phone & desktop.',
  '＋ Tambah Kategori Baru': '＋ Add New Category',
  'Selesai': 'Done',
  'Simpan': 'Save',
  'Batal': 'Cancel',
  'Belum ada kategori tambahan kustom. Klik tombol di bawah untuk menambah kategori.': 'No custom categories yet. Tap the button below to add one.',
  'Nama kategori tersebut sudah ada dalam kategori bawaan.': 'That category name already exists among the default categories.',
  'Masukkan nama kategori pengeluaran/pemasukan baru:': 'Enter the name of the new expense/income category:',
  'Masukkan nama kategori baru:': 'Enter the new category name:',
  'RINCIAN PENGELUARAN': 'SPENDING DETAILS',
  '＋ Catat di Kategori Ini': '＋ Add in This Category',
  'Bulan Ini': 'This Month',
  'Semua Waktu': 'All Time',
  '🔍 Filter di Tabel Transaksi Utama': '🔍 Filter in Main Transaction Table',
  'Belum ada catatan transaksi untuk kategori': 'No transaction records for the category',
  'MANAJEMEN ASET': 'ASSET MANAGEMENT',
  'Kelompok aset': 'Asset group',
  'Aset Tidak Cair (Non-Likuid)': 'Illiquid Assets (Non-Liquid)',
  'Sub-kategori': 'Sub-category',
  'Keterangan / Nama aset': 'Description / Asset name',
  'Contoh: Tabungan BCA atau Rumah Utama': 'Example: BCA Savings or Main House',
  'Nilai saat ini (Rp)': 'Current value (Rp)',
  'Simpan aset': 'Save asset',
  'CATAT KEWAJIBAN': 'RECORD OBLIGATION',
  'Utang atau piutang': 'Debt or receivable',
  'Catatan': 'Note',
  'Pinjaman ke Budi': 'Loan to Budi',
  'Utang saya': 'My debt',
  'Piutang saya': 'My receivable',
  'Simpan catatan': 'Save note',

  /* ---------- Laporan ---------- */
  'LAPORAN KEUANGAN': 'FINANCIAL REPORT',
  'Unduh Laporan Transaksi': 'Download Transaction Report',
  'Mode Periode': 'Period Mode',
  'Pilih Bulan': 'Choose Month',
  'Rentang Tanggal Khusus': 'Custom Date Range',
  'Bulan': 'Month',
  'Dari Tanggal': 'From Date',
  'Sampai Tanggal': 'To Date',
  'Format File Unduhan': 'Download File Format',
  'Excel (.xls / Spreadsheet)': 'Excel (.xls / Spreadsheet)',
  'PDF (Siap Cetak / Simpan PDF)': 'PDF (Print-ready / Save as PDF)',
  'Gambar JPG (High Resolution)': 'JPG Image (High Resolution)',
  'ℹ Laporan mencakup rekapitulasi semua transaksi dan ranking pengeluaran terbesar berdasarkan kategori.':
    'ℹ The report includes a recap of all transactions and a ranking of the biggest expenses by category.',
  'Unduh Sekarang': 'Download Now',
  'Popup diblokir oleh browser. Izinkan popup untuk mencetak/menyimpan PDF.': 'The popup was blocked by the browser. Allow popups to print/save the PDF.',
  'Lacak Duit — Laporan Keuangan': 'Lacak Duit — Financial Report',
  'Total Uang Masuk': 'Total Money In',
  'Total Uang Keluar': 'Total Money Out',
  'Arus Kas Bersih': 'Net Cash Flow',
  '1. Ranking Pengeluaran Berdasarkan Kategori': '1. Spending Ranking by Category',
  'KATEGORI PENGELUARAN': 'SPENDING CATEGORY',
  'JUMLAH (RP)': 'AMOUNT (RP)',
  'Belum ada pengeluaran pada periode ini.': 'No spending in this period.',
  '2. Daftar Lengkap Transaksi': '2. Complete Transaction List',
  'NAMA TRANSAKSI': 'TRANSACTION NAME',
  'NOMINAL (RP)': 'AMOUNT (RP)',
  'Tidak ada transaksi ditemukan pada periode ini.': 'No transactions found in this period.',
  'Dicetak secara otomatis dari Lacak Duit • Uang adalah energi hidupmu.': 'Automatically printed from Lacak Duit • Money is your life energy.',
  'LAPORAN KEUANGAN - LACAK DUIT': 'FINANCIAL REPORT - LACAK DUIT',
  '1. RINGKASAN & RANKING PENGELUARAN TERBESAR': '1. SUMMARY & TOP SPENDING RANKING',
  'Peringkat': 'Rank',
  'Kategori Pengeluaran': 'Spending Category',
  'Total Jumlah (Rp)': 'Total Amount (Rp)',
  'Persentase': 'Percentage',
  'Tidak ada data pengeluaran pada periode ini.': 'No spending data in this period.',
  'Total Pengeluaran': 'Total Spending',
  'Total Pemasukan': 'Total Income',
  'Sisa Bersih (Net Cashflow)': 'Net Remaining (Net Cashflow)',
  '2. RINCIAN SEMUA TRANSAKSI': '2. DETAILS OF ALL TRANSACTIONS',
  'Nama Transaksi': 'Transaction Name',
  'Nominal (Rp)': 'Amount (Rp)',
  'Laporan Rekapitulasi Keuangan & Transaksi': 'Financial & Transaction Recap Report',
  'Periode:': 'Period:',
  'Akun:': 'Account:',
  'Ranking Pengeluaran Berdasarkan Kategori (Terbesar ke Terkecil)': 'Spending Ranking by Category (Largest to Smallest)',
  'Jumlah': 'Amount',
  'Porsi Pengeluaran': 'Spending Share',
  'Tidak ada pengeluaran pada periode ini.': 'No spending in this period.',
  'Daftar Lengkap Transaksi': 'Complete Transaction List',
  'Dibuat pada:': 'Created on:',
  'Uang Masuk': 'Money In',
  'Uang Keluar': 'Money Out',
  'PERSENTASE': 'PERCENTAGE',
  'JENIS': 'TYPE',
  'NO': 'NO',

  /* ---------- Notifikasi / toast / konfirmasi ---------- */
  'Bekerja secara offline. Data tersimpan di perangkat ini.': 'Working offline. Data is saved on this device.',
  'Koneksi internet kembali aktif. Menyinkronkan data...': 'Internet is back. Syncing data...',
  'Mode Offline aktif. Data tersimpan aman di perangkat ini.': 'Offline mode is on. Data is safely stored on this device.',
  'Semua data offline berhasil disinkronkan ke server!': 'All offline data has been synced to the server!',
  'Bekerja dalam Mode Offline (Data lokal ditampilkan).': 'Working in Offline Mode (showing local data).',
  'Perubahan tersimpan lokal (Offline).': 'Changes saved locally (Offline).',
  'Perubahan berhasil disimpan.': 'Changes saved successfully.',
  'Koneksi terputus. Perubahan disimpan offline.': 'Connection lost. Changes saved offline.',
  'Hapus catatan ini?': 'Delete this record?',
  'Catatan dihapus secara offline.': 'Record deleted offline.',
  'Catatan berhasil dihapus.': 'Record deleted successfully.',
  'Catatan dihapus offline (akan disinkronkan).': 'Record deleted offline (will sync later).',
  'Transaksi tersimpan lokal (Mode Offline).': 'Transaction saved locally (Offline Mode).',
  'Transaksi berhasil disimpan.': 'Transaction saved successfully.',
  'Koneksi terputus. Transaksi disimpan lokal dan akan disinkronkan saat online.': 'Connection lost. Transaction saved locally and will sync when online.',
  'Hapus aset ini?': 'Delete this asset?',
  'Aset dihapus secara offline.': 'Asset deleted offline.',
  'Aset berhasil dihapus.': 'Asset deleted successfully.',
  'Aset dihapus offline.': 'Asset deleted offline.',
  'Status diperbarui secara offline.': 'Status updated offline.',
  'Aset tersimpan lokal (Mode Offline).': 'Asset saved locally (Offline Mode).',
  'Aset berhasil disimpan.': 'Asset saved successfully.',
  'Koneksi terputus. Aset tersimpan offline.': 'Connection lost. Asset saved offline.',
  'Catatan tersimpan lokal (Mode Offline).': 'Note saved locally (Offline Mode).',
  'Catatan berhasil disimpan.': 'Note saved successfully.',
  'Koneksi terputus. Catatan disimpan offline.': 'Connection lost. Note saved offline.',

  /* ---------- Panel Pengaturan ---------- */
  'Lunas': 'Settled',
  'Profil': 'Profile',
  'Bantu keluarga & teman': 'Help family & friends',
  'Ada yang sedang kesulitan mengatur uang?': 'Is someone struggling to manage their money?',
  'BERBAGI KEBAIKAN': 'SHARE THE GOOD',
  'Apakah keluarga & teman Anda sedang kesulitan keuangan?': 'Are your family & friends struggling financially?',
  'Bisa jadi penyebab kesulitan keuangan adalah catatan keuangan yang kacau. Bantu keluarga dan teman mengatur keuangan mereka dengan app ini.':
    'The cause of financial difficulty may be messy financial records. Help your family and friends manage their money with this app.',
  'Instagram, Slack & lainnya': 'Instagram, Slack & more',
  'Salin tautan': 'Copy link',
  'Bagikan ke:': 'Share to:',
  'Tautan disalin. Tinggal tempel di chat atau media sosial.': 'Link copied. Just paste it into a chat or social media.',
  'Salin tautan ini:': 'Copy this link:',
  '✓ Tersimpan': '✓ Saved',
  '👤 Profil': '👤 Profile',
  'Email akun': 'Account email',
  'Terdaftar sejak': 'Registered since',
  'Nama pengguna': 'Username',
  'Nama yang ditampilkan': 'Display name',
  'Nama maksimal 40 karakter.': 'Name must be at most 40 characters.',
  'Nama berhasil disimpan.': 'Name saved successfully.',
  'Nama dikembalikan ke nama dari email.': 'Name reset to the one from your email.',
  'Pengaturan Akun': 'Account Settings',
  'Pengaturan Umum': 'General Settings',
  'Keamanan Akun': 'Account Security',
  'Bahasa': 'Language',
  '⚙️ Pengaturan': '⚙️ Settings',
  '🔒 Keamanan Akun': '🔒 Account Security',
  '🌐 Bahasa / Language': '🌐 Language',
  '‹ Kembali ': '‹ Back',
  'Akun yang sedang masuk': 'Signed-in account',
  'Atur kategori transaksi dan preferensi umum aplikasi.': 'Manage transaction categories and general app preferences.',
  'Ganti Email': 'Change Email',
  'email baru': 'new email',
  'Ganti': 'Change',
  'Ganti Kata Sandi': 'Change Password',
  'kata sandi baru (min. 6 karakter)': 'new password (min. 6 characters)',
  '🚪 Keluar dari Akun': '🚪 Sign out',
  'Pilih bahasa tampilan aplikasi.': 'Choose the app display language.',
  'Masukkan email baru terlebih dahulu.': 'Enter the new email first.',
  'Email tidak valid.': 'Invalid email.',
  'Tautan konfirmasi dikirim. Cek email baru (dan email lama) lalu klik tautannya untuk menyelesaikan penggantian.':
    'A confirmation link was sent. Check your new (and old) inbox and click the link to finish the change.',
  'Kata sandi berhasil diganti.': 'Password changed successfully.',
  'Butuh koneksi internet untuk mengganti data akun.': 'An internet connection is needed to change account details.',
  'Menyimpan…': 'Saving…',
  'ID': 'ID',
  'EN': 'EN',

  /* ---------- Analitik (admin) ---------- */
  'hari ini': 'today',
  'belum pernah': 'never',
  '(tanpa email)': '(no email)',
  'Belum ada akun terdaftar.': 'No registered accounts yet.',
  'Aktif': 'Active',
  'Belum konfirmasi': 'Unconfirmed',
  'Tidak aktif': 'Inactive',
  'Belum ada data kunjungan untuk rentang waktu ini.': 'No visit data for this time range.',
  '📱 Perangkat HP / Mobile': '📱 Phone / Mobile',
  '💻 Komputer / Desktop': '💻 Computer / Desktop',
  'Belum ada data halaman.': 'No page data yet.',
  'Sedang memuat data analitik...': 'Loading analytics data...',
  'Memuat daftar akun...': 'Loading account list...',
  '📊 Analitik Lacak Duit': '📊 Lacak Duit Analytics',
  'Panel ini hanya terlihat oleh admin platform.': 'This panel is only visible to platform admins.',
  '🔄 Refresh': '🔄 Refresh',
  'Pengguna Terdaftar': 'Registered Users',
  'Total Terdaftar': 'Total Registered',
  'Tidak Aktif': 'Inactive',
  'Baru (7 hari)': 'New (7 days)',
  'Aktif = masuk atau mencatat dalam 30 hari terakhir.': 'Active = signed in or recorded within the last 30 days.',
  'Analitik Pengunjung': 'Visitor Analytics',
  '7 Hari Terakhir': 'Last 7 Days',
  '30 Hari Terakhir': 'Last 30 Days',
  'Total Kunjungan': 'Total Visits',
  'Pengunjung Unik': 'Unique Visitors',
  'Hari Ini (Kunjungan)': 'Today (Visits)',
  'Hari Ini (Unik)': 'Today (Unique)',
  '📈 Tren Kunjungan Harian': '📈 Daily Visit Trend',
  '📱 Perangkat Pengunjung': '📱 Visitor Devices',
  '📄 Halaman Populer': '📄 Popular Pages',
  'Rentang waktu data': 'Data time range',
};

/* Aturan untuk teks dinamis (mengandung angka/nama). Dijalankan sebagai replace pada
   teks yang tidak ada persis di kamus. Urutan penting. */
const I18N_RULES = [
  [/^([\d.,]+)% dari total pengeluaran$/, '$1% of total spending'],
  [/^\((\d+) transaksi\)$/, (m, n) => `(${n} ${n === '1' ? 'transaction' : 'transactions'})`],
  [/^Total (\d+) transaksi pada (.+)$/, (m, n, d) => `Total ${n} ${n === '1' ? 'transaction' : 'transactions'} on ${d}`],
  [/^(\d+) belum lunas \(dari (\d+) utang\)$/, '$1 unpaid (of $2 debts)'],
  [/^(\d+) belum lunas \(dari (\d+) piutang\)$/, '$1 unpaid (of $2 receivables)'],
  [/^\[Belum Lunas\]$/, '[Unpaid]'],
  [/^\[Lunas\]$/, '[Settled]'],
  [/^Halo, (.+)$/, 'Hello, $1'],
  [/^(\d+) transaksi$/, (m, n) => `${n} ${n === '1' ? 'transaction' : 'transactions'}`],
  [/^(\d+) belum lunas$/, '$1 unpaid'],
  [/^(\d+) hari$/, (m, n) => `${n} ${n === '1' ? 'day' : 'days'}`],
  [/^≈ (\d+) hari$/, '≈ $1 days'],
  [/^(\d+) transaksi · ([\d.,]+)% dari total pengeluaran$/, (m, n, p) => `${n} ${n === '1' ? 'transaction' : 'transactions'} · ${p}% of total spending`],
  [/^Akumulasi: (.+)$/, 'Accumulated: $1'],
  [/^Cair: (.+) · Tetap: (.+)$/, 'Liquid: $1 · Fixed: $2'],
  [/^(\d+) hari lalu$/, '$1 days ago'],
  [/^(\d+) bulan lalu$/, '$1 months ago'],
  [/^(\d+) tahun lalu$/, '$1 years ago'],
  [/^kemarin$/, 'yesterday'],
  [/^Terakhir aktif (.+)$/, 'Last active $1'],
  [/^Daftar (.+) · baru$/, 'Registered $1 · new'],
  [/^Daftar (.+)$/, 'Registered $1'],
  [/^Menyinkronkan (\d+) perubahan data offline\.\.\.$/, 'Syncing $1 offline changes...'],
  [/^Hapus kategori "(.+)"\? Transaksi yang memakai kategori ini tidak akan terhapus, namun tidak akan ada lagi di daftar pilihan\.$/,
    'Delete category "$1"? Transactions using this category will not be deleted, but it will no longer appear in the list.'],
  [/^Buka tutup transaksi tanggal (.+)$/, 'Toggle transactions on $1'],
  [/^Belum ada catatan transaksi untuk kategori (.+)$/, 'No transaction records for the category $1'],
  [/^Total Pengeluaran Harian: (.+)$/, 'Daily spending total: $1'],
];

function i18nNorm(s) { return s.replace(/\s+/g, ' ').trim(); }

/* Terjemahkan satu string. Mengembalikan string asli bila bahasa Indonesia atau tidak ada padanan. */
function t(s) {
  if (currentLang !== 'en' || typeof s !== 'string') return s;
  const key = i18nNorm(s);
  if (!key) return s;
  if (Object.prototype.hasOwnProperty.call(I18N_EN, key)) return I18N_EN[key];
  let out = key;
  for (const [re, rep] of I18N_RULES) {
    if (re.test(key)) { out = key.replace(re, rep); break; }
  }
  // "Rp 8 jt" (juta) -> "Rp 8 M"
  out = out.replace(/\bjt\b/g, 'M');
  return out === key ? s : out;
}

function translateTextNode(n) {
  const raw = n.nodeValue;
  const trimmed = raw.trim();
  if (!trimmed) return;
  const out = t(trimmed);
  if (out === trimmed) return;
  const start = raw.indexOf(trimmed);
  n.nodeValue = raw.slice(0, start) + out + raw.slice(start + trimmed.length);
}

const I18N_ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];

function translateAttrs(el) {
  I18N_ATTRS.forEach(attr => {
    if (!el.hasAttribute || !el.hasAttribute(attr)) return;
    const v = el.getAttribute(attr);
    const out = t(v);
    if (out !== v) el.setAttribute(attr, out);
  });
}

function translateStaticDOM(root) {
  if (!root) return;
  if (root.nodeType === 3) { translateTextNode(root); return; }
  if (root.nodeType !== 1) return;
  const tag = root.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE') return;
  translateAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if (node.nodeType === 1 && (node.tagName === 'SCRIPT' || node.tagName === 'STYLE')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  nodes.forEach(n => (n.nodeType === 3 ? translateTextNode(n) : translateAttrs(n)));
}

/* Dialog bawaan browser (confirm/prompt/alert) ikut diterjemahkan. */
if (currentLang === 'en') {
  ['confirm', 'prompt', 'alert'].forEach(fn => {
    const native = window[fn].bind(window);
    window[fn] = (msg, ...rest) => native(t(String(msg)), ...rest);
  });
}

function applyLanguageToDocument() {
  document.documentElement.lang = currentLang;
  if (currentLang !== 'en') return;
  document.title = t(document.title);
  translateStaticDOM(document.body);
  // Konten yang dirender JS sesudah load (daftar, ringkasan, dialog) diterjemahkan saat muncul.
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.type === 'characterData') {
        translateTextNode(m.target);
      } else if (m.type === 'attributes') {
        translateAttrs(m.target);
      } else {
        m.addedNodes.forEach(n => translateStaticDOM(n));
      }
    }
  });
  observer.observe(document.body, {
    childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: I18N_ATTRS
  });
}

/* Sorot tombol bahasa di layar login dan di panel Pengaturan. */
function highlightLanguageButtons() {
  [['auth-lang-id', 'id'], ['auth-lang-en', 'en'], ['lang-btn-id', 'id'], ['lang-btn-en', 'en']].forEach(([id, lang]) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', currentLang === lang);
  });
}

/* Ganti bahasa lalu muat ulang: cara paling aman agar seluruh halaman konsisten satu bahasa. */
function setLanguage(lang) {
  try { localStorage.setItem('cd_lang', lang === 'en' ? 'en' : 'id'); } catch (e) {}
  location.reload();
}

(function initI18n() {
  const run = () => { applyLanguageToDocument(); highlightLanguageButtons(); };
  if (document.body) run(); else document.addEventListener('DOMContentLoaded', run);
})();
