# HiddenBite (versi JavaScript) – Panduan Deploy

Situs ini **statis** (HTML + JavaScript, tanpa PHP/MySQL). Data, login admin, dan foto disimpan di **Supabase** (gratis).
Bisa di-deploy ke **Netlify**, **Vercel**, GitHub Pages, atau hosting statis apa pun.

## Isi folder
| File | Fungsi |
|---|---|
| `index.html`, `app.js`, `ds.js`, `style.css` | Aplikasi (semua halaman, Trie & AVL ada di `ds.js`) |
| `config.js` | **Wajib diisi** (URL & anon key Supabase) |
| `supabase_schema.sql` | Struktur database KOSONG + aturan keamanan (RLS) + bucket foto |

## Langkah 1 – Siapkan Supabase
1. Daftar di https://supabase.com → **New project** (catat password database, pilih region terdekat, mis. Singapore).
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase_schema.sql`, klik **Run**.
3. Buka **Project Settings → API**. Salin **Project URL** (bentuknya `https://xxxx.supabase.co`, **tanpa** `/rest/v1/`) dan **anon public key**.
4. Buka `config.js`, ganti `ISI_SUPABASE_URL` dan `ISI_SUPABASE_ANON_KEY`.
   - `SUPABASE_URL` hanya origin proyek, contoh: `https://abcdxyz.supabase.co`.
   - Hanya pakai kunci **anon / publishable**. Jangan pernah menaruh `service_role` / secret key di situs.

## Langkah 2 – Buat akun admin
1. **Authentication → Users → Add user → Create new user**: isi email & kata sandi kuat, centang **Auto Confirm User**.
2. Kembali ke **SQL Editor**, jalankan (ganti emailnya):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'EMAIL_ADMIN_ANDA';
   ```
   Hanya akun yang ada di tabel `admins` yang bisa menyetujui/mengedit data. Akun lain otomatis ditolak oleh database.
3. **Authentication → Sign In / Providers → Email**: matikan **Allow new users to sign up** (agar tidak ada yang mendaftar sendiri).

## Langkah 3 – Deploy

### Netlify (paling mudah)
1. Masuk https://app.netlify.com → **Add new site → Deploy manually**.
2. Drag & drop **folder ini** (yang berisi `index.html`) ke kotak upload.
3. Selesai. Netlify memberi alamat `https://nama-acak.netlify.app` (bisa diganti di *Site configuration → Change site name*).

### Vercel
1. https://vercel.com → **Add New → Project**. Impor dari GitHub, atau jalankan `npx vercel` di folder ini.
2. *Framework Preset*: **Other**. Build command: kosongkan. Output directory: kosongkan (root).

### Lewat GitHub (otomatis tiap push)
Upload semua file ke repo, lalu hubungkan repo di Netlify/Vercel. `config.js` boleh ikut di-commit karena hanya berisi anon key (publik).

## Langkah 4 – Tes
1. Buka situs → **Tambah Tempat** → kirim satu tempat.
2. Klik **🔒 Login Admin** → masuk dengan email admin → **Setujui** tempat tadi.
3. Tempat muncul di Beranda dan Peta.

## Catatan penting
- Pengirim tempat/ulasan tidak perlu login; semuanya masuk antrean dan baru tampil setelah admin menyetujui.
- Pembatasan 1 ulasan per tempat per hari hanya di browser (localStorage), bukan penjaga spam yang kuat. Moderasi admin tetap garis pertahanan utama.
- Upload foto terbuka untuk pengunjung (JPG/PNG, maks 5 MB, dibatasi bucket). Pantau penggunaan storage di dashboard Supabase.
- Gratis Supabase: project bisa **dijeda** bila tidak aktif lama; buka dashboard lalu *Restore* bila itu terjadi.
- Peta memakai OpenStreetMap (Leaflet), tanpa API key. Koordinat diambil dari tautan Google Maps berformat `.../@-5.14,119.43,...` atau dari kolom lat/lng.
- Rate limit login bawaan Supabase aktif; pembatas 5x salah di halaman login hanyalah tambahan di sisi browser.
