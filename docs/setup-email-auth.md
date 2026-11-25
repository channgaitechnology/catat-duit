# Setup Email Auth Lacak Duit (Supabase SMTP)

**Kenapa penting:** bawaan Supabase hanya mengirim ±2 email/jam untuk seluruh proyek. Begitu ada beberapa pendaftar baru, email konfirmasi dan reset password tidak sampai. Sebelum promosi, pasang SMTP sendiri.

> Kredensial (App Password / API key) **jangan** ditempel di chat atau repo. Isi langsung di dashboard Supabase.

## Pilih jalur

| Jalur | Batas gratis | Kelebihan | Kekurangan |
|---|---|---|---|
| A. Gmail SMTP | 500 email/hari | Cepat, tanpa domain | Bisa masuk spam; pakai Gmail khusus |
| B. Resend + domain lacakduit.asia | 100/hari, 3000/bulan | Deliverability bagus, pengirim `noreply@lacakduit.asia` | Perlu verifikasi DNS |
| C. Matikan konfirmasi email | tak terbatas | Tanpa SMTP | Rawan akun palsu / farming masa coba; reset password tetap butuh email |

Rekomendasi: **A sekarang (15 menit), pindah ke B saat pengguna mulai banyak.**

## Jalur A: Gmail
1. Buat Gmail khusus, mis. `lacakduit.app@gmail.com`. Aktifkan verifikasi 2 langkah.
2. Google Account > Keamanan > Sandi aplikasi > buat satu (16 karakter).
3. Supabase Dashboard > Project Settings > Authentication > **SMTP Settings** > Enable custom SMTP:
   - Host `smtp.gmail.com`, Port `587`
   - Username: alamat Gmail, Password: sandi aplikasi tadi
   - Sender email: alamat Gmail yang sama, Sender name: `Lacak Duit`
4. Simpan, lalu daftar dengan email lain untuk uji.

## Jalur B: Resend
Ikuti `docs/setup-resend.md` untuk verifikasi domain. Lalu di Supabase SMTP Settings: Host `smtp.resend.com`, Port `465`, Username `resend`, Password = API key Resend, Sender `noreply@lacakduit.asia`.

## URL (wajib)
Authentication > URL Configuration:
- Site URL: `https://lacakduit.asia`
- Redirect URLs: `https://lacakduit.asia`, `https://lacakduit.asia/**`

## Template email (Authentication > Email Templates)
**Confirm signup**
- Subject: `Konfirmasi akun Lacak Duit`
- Body:
```html
<h2>Selamat datang di Lacak Duit</h2>
<p>Klik tombol di bawah untuk mengonfirmasi emailmu dan mulai masa coba Pro 30 hari.</p>
<p><a href="{{ .ConfirmationURL }}">Konfirmasi email</a></p>
<p>Jika kamu tidak mendaftar, abaikan email ini.</p>
```
**Reset password**
- Subject: `Atur ulang password Lacak Duit`
```html
<h2>Atur ulang password</h2>
<p>Klik tautan berikut untuk membuat password baru.</p>
<p><a href="{{ .ConfirmationURL }}">Atur password baru</a></p>
<p>Jika bukan kamu yang meminta, abaikan email ini.</p>
```
**Change email address**
- Subject: `Konfirmasi perubahan email Lacak Duit`
```html
<p>Klik untuk mengonfirmasi email baru akunmu:</p>
<p><a href="{{ .ConfirmationURL }}">Konfirmasi email baru</a></p>
```

## Uji
1. Daftar dengan email baru > email konfirmasi tiba < 1 menit (cek spam).
2. "Lupa password" > email tiba, tautan membuka lacakduit.asia.
3. Jika masuk spam: tandai "Bukan spam", dan pertimbangkan pindah ke Jalur B.
