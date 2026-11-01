# AM Prem.ID

**All-in-One Activation Toolkit** — alur tiga langkah (kirim magic link → verifikasi → lisensi terbit) dengan UI brutalist premium.

- **Nama web:** AM Prem.ID
- **Developer:** Van313 | Official
- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS
- **Deploy:** Vercel

---

## Halaman

| Rute | Isi |
|---|---|
| `/` | Beranda: hero, konsol aktivasi 3 langkah, status real-time, plan, cek lisensi, FAQ |
| `/verify` | Tujuan magic link — menampilkan token **dan** cookie sesi siap salin |
| `/docs` | Dokumentasi API lengkap (endpoint, body, respons, kode error, contoh curl) |
| `/admin` | Panel admin: tab **ORDER** (tabel, cari, cabut), **GENERATOR** (batch lisensi), **EMAIL** (diagnostik Resend) |
| `/hero-lab` | Pembanding 3 varian hero (split / headline / banner) |
| `/invoice` | Invoice lisensi siap cetak + unduh PDF (`?key=` atau `?order=`) |

---

## Alur sistem

| Langkah | Endpoint | Yang terjadi |
|---|---|---|
| **01 Kirim Link** | `POST /api/send-link` | Token HMAC 15 menit ditandatangani, cookie sesi `amp_sess` diset, lalu link dikirim via Resend, **atau** masuk ke **kotak masuk internal**, **atau** dikembalikan (outbox) |
| **02 Verifikasi** | `POST /api/verify-link` | `email` + `cookie` + `magicLink` + `customOrderId` dikirim. Tanda tangan diperiksa, email harus cocok, token sekali pakai |
| **03 Lisensi** | — | `licenseKey`, `orderId`, `checksum`, `expiresAt` terbit dan tampil di UI |
| Cek mandiri | `GET /api/license?key=` | Verifikasi kunci/order kapan saja |
| Status | `GET /api/stats` | Dashboard real-time (polling 15 detik) + feed aktivasi |
| Admin | `GET /api/admin/orders` | Daftar order + pencarian (butuh `x-admin-key`) |
| Cabut | `POST /api/license` `{key, action:'revoke'}` | Mencabut lisensi (butuh `x-admin-key`) |
| Invoice | `GET /api/invoice?key=\|order=` | PDF A4 (`&inline=1` untuk pratinjau di tab) |
| Generator | `POST /api/generate` | Terbitkan 1–5 lisensi sekaligus (admin) |
| Kotak masuk | `GET\|POST /api/inbox` | Alamat internal + daftar notifikasi (per cookie) |
| Stream kotak masuk | `GET /api/inbox/stream` | Server-Sent Events notifikasi real-time |
| Email test | `GET\|POST /api/mail-test` | Diagnostik Resend + kirim email uji (admin) |
| Pratinjau email | `GET /api/mail-preview` | HTML template magic link |

Bentuk respons JSON sengaja dipertahankan sama seperti yang sudah kamu pakai: `{ success, ok, authenticated, premiumActive, message, orderId, licenseKey, ... }`.

---

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local      # isi AUTH_SECRET (dan ADMIN_KEY bila ingin /admin)
npm run dev                     # http://localhost:3000
```

Generate secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Build produksi:

```bash
npm run build && npm run start
```

---

## Variabel environment

> 📘 Cara mengisi tiap variabel langkah demi langkah (termasuk cara membuat `AUTH_SECRET`,
> memasang di Vercel, dan solusi tiap error): **[`docs/PANDUAN-ENV.md`](docs/PANDUAN-ENV.md)**

| Variabel | Wajib | Keterangan |
|---|---|---|
| `AUTH_SECRET` | **Ya** | Kunci HMAC penanda tangan. Tanpa ini dipakai secret dev yang tidak aman |
| `NEXT_PUBLIC_BASE_URL` | Disarankan | URL publik, dipakai membentuk magic link |
| `RESEND_API_KEY` | Tidak | Jika diisi → email benar-benar terkirim. Kosong → outbox mode |
| `MAIL_FROM` | Tidak | Pengirim, mis. `AM Prem.ID <no-reply@domainmu.com>` |
| `UPSTASH_REDIS_REST_URL` + `..._TOKEN` | Tidak | Penyimpanan persisten (Redis REST) |
| `ADMIN_KEY` | Tidak | Kunci panel admin & pencabutan lisensi. Kosong → `/admin` 503 |
| `NEXT_PUBLIC_BRAND_NAME` | Tidak | Ganti nama web tanpa ubah kode |
| `NEXT_PUBLIC_BRAND_DEV` | Tidak | Ganti nama developer |
| `NEXT_PUBLIC_HERO_VARIANT` | Tidak | `split` (default) \| `headline` \| `banner` |
| `ALLOWED_ORIGIN` | Tidak | Batasi origin API (default `*`) |

> ⚠️ **Penyimpanan di Vercel.** Memori proses tidak bertahan antar cold start dan tidak dibagi antar instance. Untuk produksi, isi Upstash Redis (ada tier gratis) agar lisensi & order tetap bisa dicek setelah restart.

---

## Menyiapkan email (Resend)

> 📘 **Panduan utama (dari nol sampai email benar-benar terkirim + semua fitur siap pakai):
> [`docs/PANDUAN-EMAIL-LENGKAP.md`](docs/PANDUAN-EMAIL-LENGKAP.md)**
>
> 📗 Panduan Resend khusus (detail dashboard & template): [`docs/PANDUAN-RESEND.md`](docs/PANDUAN-RESEND.md)
>
> 🔍 Cek kesehatan hasil deploy sekali jalan:
> `sh scripts/cek-email.sh https://domainmu.vercel.app ADMIN_KEY emailkamu@gmail.com`

### Langkah

1. Daftar di [resend.com](https://resend.com) → menu **API Keys** → **Create API Key**, izin **Sending access**. Salin key (`re_...`, hanya tampil sekali).
2. Isi environment: `RESEND_API_KEY=re_...` dan `MAIL_FROM=AM Prem.ID <no-reply@domainmu.com>` → **Redeploy**.
3. (Untuk kirim ke siapa pun) **Domains → Add Domain**, tambahkan record SPF/DKIM, tunggu status **verified**.
4. Buka **`/admin` → tab EMAIL** untuk memeriksa konfigurasi dan mengirim email uji.

### Penting soal pengirim

| MAIL_FROM | Bisa dikirim ke | Kapan dipakai |
|---|---|---|
| `onboarding@resend.dev` | **Hanya email pemilik akun Resend** | Uji cepat sebelum punya domain |
| `no-reply@domainmu.com` | Siapa pun | Produksi (domain harus **verified**) |

### Batas akun gratis

- **100 email/hari**, **3.000 email/bulan**
- **2 permintaan/detik**
- Retry tidak menggandakan kiriman: setiap permintaan memakai header `Idempotency-Key`

### Jika pengiriman gagal

Sistem **tidak pernah memutus alur**: kegagalan Resend otomatis dialihkan ke **outbox mode** (link ditampilkan di UI) dan alasannya diterjemahkan menjadi pesan yang bisa ditindaklanjuti, mis.:

- *"API key ditolak. Periksa RESEND_API_KEY (harus diawali `re_`)…"*
- *"Domain pengirim belum terverifikasi di Resend…"*
- *"Resend mengizinkan `onboarding@resend.dev` hanya ke email pemilik akun…"*
- *"Rate limit Resend (2 permintaan/detik). Coba lagi sesaat lagi."*

Alasan ini muncul di response `send-link` (`mailReason`, `mailConfigIssue`) dan di tab EMAIL panel admin.

### Tab EMAIL di panel admin

- **Status**: API key terpasang/valid, `MAIL_FROM`, mode aktif, daftar domain + status verifikasi (dibaca langsung dari `GET /api/domains` Resend).
- **Kirim email uji**: mengirim template magic link asli ke alamat yang kamu masukkan, menampilkan `messageId` atau alasan gagal.
- **Pratinjau template**: iframe berisi HTML yang benar-benar dipakai (`/api/mail-preview`), jadi selalu sinkron dengan kode.

Endpoint terkait: `GET|POST /api/mail-test` (khusus admin, butuh `x-admin-key`), `GET /api/mail-preview`.

---

## Panel admin

1. Isi `ADMIN_KEY` di environment (string acak panjang).
2. Buka `/admin` → masukkan kunci → tabel order terbuka.
3. Kunci disimpan di `sessionStorage` browser (hilang saat tab ditutup), tidak pernah masuk URL.

Fitur: total order, jumlah hari ini, breakdown per plan, pencarian instan (order/email/plan), tombol **SALIN** kunci lisensi, dan **CABUT** dengan konfirmasi.

---

## Invoice PDF

`GET /api/invoice?key=AMP-XXXX-XXXX-XXXX-XXXX` → PDF A4 (1 halaman, ~2.6 KB).
Alternatif: `?order=AM-YYYYMMDD-XXXXXX`. Tambahkan `&inline=1` untuk membuka di tab, bukan mengunduh.

- Dibuat di server dengan **pdf-lib** + font standar PDF, tanpa aset eksternal → jalan di Vercel tanpa konfigurasi.
- Isi: nomor invoice, strip status, kunci lisensi, rincian (plan, pemilik, diterbitkan, kadaluarsa, sisa hari, checksum), blok total, catatan verifikasi, footer.
- Halaman `/invoice` menampilkan pratinjau HTML-nya lebih dulu; tombol **UNDUH PDF** dan **PRATINJAU DI TAB BARU** mengarah ke endpoint ini.
- Tautan invoice otomatis dipasang di Langkah 03 konsol dan di hasil **Cek Lisensi**.

---

## Kotak masuk internal

Pengguna tidak perlu memasukkan email pribadi. Sistem membuat alamat internal seperti
`AMP-C9UR-9XU9@premid.internal`, lalu notifikasi aktivasi muncul di panel **Kotak Masuk** dalam web.

**Cara kerja**

1. Klik **+ BUAT ALAMAT KOTAK MASUK** → server membuat alamat acak dan cookie `amp_inbox` (bertanda tangan HMAC, `httpOnly`).
2. Klik **Kirim Magic Link** → `POST /api/send-link` dengan `delivery: 'inbox'` → notifikasi disimpan, **tidak ada email keluar**.
3. Panel kotak masuk menampilkan pesan **real-time lewat SSE** (`/api/inbox/stream`), lengkap dengan hitungan berlaku link.
4. Klik **PAKAI LINK INI** → link otomatis terisi di Langkah 02.
5. Verifikasi → lisensi terbit.

**Notifikasi real-time**

| Komponen | Perilaku |
|---|---|
| Kanal | `GET /api/inbox/stream` — Server-Sent Events, server membandingkan isi kotak tiap **1,5 detik** dan hanya mengirim saat ada perubahan |
| Event | `ready` · `inbox` (snapshot penuh) · `message` (per pesan baru) · ping keep-alive tiap 15 dtk |
| Bunyi | Nada 3 not Web Audio (tanpa berkas audio), bisa dimatikan tombol **🔔 nada / 🔇 bisu** — pilihan tersimpan di perangkat |
| Toast | Notifikasi melayang "PESAN BARU MASUK" di pojok, hilang otomatis 6 dtk |
| Badge | Penghitung pesan belum dibaca di header panel |
| Kedip | Baris pesan baru disorot kuning selama 2,4 dtk |
| Cadangan | Bila SSE diblokir/gagal → otomatis beralih ke polling 4 dtk (status berubah jadi "mode cadangan") |
| Batas | Koneksi ditutup server setelah 10 menit; `EventSource` menyambung ulang sendiri |
| Nyalakan ulang | Klik **ganti** → koneksi dibuka lagi dengan cookie baru |

Tanpa Upstash Redis, stream hanya membaca memori proses yang sama. **Untuk produksi di Vercel,
isi `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`** agar pesan terlihat oleh instance mana pun.

**Keamanan**

- Alamat hanya bisa dibaca oleh pemilik cookie `amp_inbox` yang sah; tanpa cookie → `address: null, messages: []`.
- Setiap alamat punya kotak terpisah — pembeli lain tidak bisa melihat isinya.
- `delivery: 'inbox'` tanpa cookie ditolak `409 NO_INBOX`.
- Alamat & pesan kedaluwarsa **24 jam** (maks. 20 pesan).
- Alamat memakai `@premid.internal` — **bukan domain yang bisa menerima email**, sehingga tidak mungkin disalahgunakan untuk menerima surat dari luar.

**Kapan pakai yang mana**

| Mode | Kapan |
|---|---|
| **Kotak masuk internal** | Demo, distribusi cepat, pembeli tanpa email |
| **Email asli (Resend)** | Produksi — pembeli menerima email sungguhan |
| **Outbox** | Tanpa `RESEND_API_KEY` — link ditampilkan langsung di UI |

---

## Mode Generator (batch 1–5 lisensi)

`POST /api/generate` + header `x-admin-key` — menerbitkan beberapa lisensi sekaligus tanpa alur verifikasi email.

```bash
curl -X POST https://domainmu.com/api/generate \
  -H 'Content-Type: application/json' \
  -H 'x-admin-key: <ADMIN_KEY>' \
  -d '{"email":"pembeli@email.com","plan":"pro","count":5,"prefix":"VAN313"}'
```

- `count` dibatasi **1–5**; di luar itu ditolak `400`.
- `prefix` opsional (A-Z, 0-9, `-`), menghasilkan order ID `VAN313-AM-20261001-AB12CD-01`.
- Rate limit **40 pembangkitan/jam** agar tidak jadi mesin produksi massal.
- Lisensi hasil generator tetap bisa dicek di `/api/license`, punya **invoice PDF**, dan muncul di tab ORDER.
- Di UI: **`/admin` → tab GENERATOR** — pilih email, jumlah (tombol 1–5), plan, prefiks; hasilnya bisa **disalin semua** atau diunduh sebagai **CSV**.

> ⚠️ Mode ini **khusus admin** dan sengaja diberi peringatan di UI, karena melewati alur "email → verifikasi → lisensi". Pakai hanya untuk lisensi yang kamu terbitkan sendiri.

---

## Rate limit tahan serverless

`lib/ratelimit.ts` memakai **fixed window** dengan header standar:

| Header | Arti |
|---|---|
| `X-RateLimit-Limit` | Batas pada bucket terketat |
| `X-RateLimit-Remaining` | Sisa kuota |
| `X-RateLimit-Reset` | Detik sampai window direset |
| `Retry-After` | Hanya muncul saat `429` |

- **Dengan Redis:** `INCR` + `EXPIRE` dijalankan lewat **satu pipeline** (`/pipeline`) → atomik dan konsisten antar instance function. Kunci berbentuk `ampremid:rl:<bucket>:<id>:<window>`.
- **Tanpa Redis:** fallback ke memori proses (per-instance). Cukup untuk dev, **tidak akurat** di produksi serverless — karena itu `/api/stats` melaporkan `storage` aktif.
- IP di-hash SHA-256 (16 char) sebelum dipakai sebagai kunci, jadi IP mentah tidak tersimpan.
- Jika Redis error, limiter **tidak memblokir** pengguna — otomatis jatuh ke memori.

Batas bawaan: kirim link **8/jam per email** & **30/jam per IP**, verifikasi **20/jam per email** & **60/jam per IP**.
Mengubahnya: konstanta `LIMIT_PER_*` di `app/api/send-link/route.ts` dan `app/api/verify-link/route.ts`.

---

## Deploy ke Vercel

> 🚀 **Mulai dari sini — runbook deploy satu halaman (10 menit, termasuk verifikasi): [`docs/RUNBOOK-DEPLOY.md`](docs/RUNBOOK-DEPLOY.md)**
>
> 📋 Nilai environment lengkap + catatan rotasi: **[`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md)**

**Via GitHub**

1. Push folder ini ke repository.
2. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**.
3. Framework terdeteksi otomatis: **Next.js**. Biarkan default.
4. **Environment Variables** — minimal:
   - `AUTH_SECRET`
   - `NEXT_PUBLIC_BASE_URL` = `https://<project>.vercel.app`
   - disarankan: `ADMIN_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY`, `MAIL_FROM`
5. **Deploy** → setelah selesai, sesuaikan `NEXT_PUBLIC_BASE_URL` dengan domain final → **Redeploy**.

**Via CLI**

```bash
npm i -g vercel
vercel login
vercel
vercel env add AUTH_SECRET production
vercel env add ADMIN_KEY production
vercel env add NEXT_PUBLIC_BASE_URL production
vercel --prod
```

**Domain kustom:** Vercel → Settings → Domains → tambahkan domain → ikuti instruksi DNS → perbarui `NEXT_PUBLIC_BASE_URL` → redeploy.

---

## Struktur proyek

```
app/
  page.tsx                beranda
  verify/page.tsx         tujuan magic link (token + cookie sesi)
  docs/page.tsx           dokumentasi API
  admin/page.tsx          panel admin
  hero-lab/page.tsx       pembanding varian hero
  invoice/page.tsx        invoice lisensi + unduh PDF
  api/
    send-link/route.ts    langkah 01 (token + cookie sesi + email)
    verify-link/route.ts  langkah 02 (verifikasi + terbit lisensi)
    license/route.ts      cek & cabut lisensi
    stats/route.ts        status real-time + feed
    admin/orders/route.ts daftar order untuk admin
    invoice/route.ts      generasi PDF invoice
components/
  Hero.tsx                3 varian hero (split/headline/banner)
  Mascot.tsx              maskot topeng brutalist (SVG inline)
  ActivationWizard.tsx    konsol 3 langkah
  Terminal.tsx            log terminal live
  AdminPanel.tsx          login + tab ORDER / GENERATOR / EMAIL
  Generator.tsx           batch 1–5 lisensi + ekspor CSV
  EmailSettings.tsx       diagnostik Resend + kirim uji + pratinjau
  LiveStats.tsx  LicenseChecker.tsx  Pricing.tsx  Steps.tsx
  chrome.tsx (nav/marquee/faq/footer)  ui.tsx  icons.tsx
lib/
  auth.ts                 HMAC token, cookie sesi, kunci lisensi, masking
  store.ts                Redis / memori + list (LPUSH/LRANGE)
  license.ts              terbit, cari, cabut, daftar order
  mailer.ts               Resend + template email brutalist
  ratelimit.ts            fixed-window limiter (Redis pipeline / memori)
  invoice.ts              renderer PDF dengan pdf-lib
scripts/setup-env.mjs     pembuat AUTH_SECRET & ADMIN_KEY + pemasang env Vercel
  admin.ts                otorisasi admin (timingSafeEqual)
  plans.ts                plan + branding terpusat (BRAND)
```

---

## Keamanan yang diterapkan

- Magic link **HMAC-SHA256**, diverifikasi `timingSafeEqual`.
- Token **sekali pakai** (`409 TOKEN_USED`), terikat email (`409 EMAIL_MISMATCH`), kedaluwarsa 15 menit (`410`).
- **Cookie sesi** `amp_sess` ditandatangani; bila browser mengirimnya, nilainya wajib cocok (`409 COOKIE_MISMATCH`).
- Kunci lisensi dibuat **CSPRNG** (`crypto.randomInt`), bukan `Math.random`.
- Rate limit per email & jaringan (`429`) + header `Retry-After`, atomik lewat Redis pipeline bila tersedia.
- Cookie/token **tidak pernah** dilog; email selalu disamarkan (`ka**@domain.com`).
- Panel admin: header `x-admin-key`, perbandingan waktu-konstan, `robots: noindex`.
- `timeout` pada semua request (klien & server) — tidak ada request menggantung.
- Tidak ada `Origin`/`Referer` palsu dan tidak ada panggilan ke layanan pihak ketiga.

---

## Perintah

```bash
node scripts/setup-env.mjs          # buat AUTH_SECRET + ADMIN_KEY, tulis ke .env.local
node scripts/setup-env.mjs --print  # hanya cetak nilainya
node scripts/setup-env.mjs --vercel # sekaligus pasang ke Vercel (butuh `vercel login`)
npm run dev         # development
npm run build       # build produksi
npm run start       # jalankan hasil build
npm run typecheck   # tsc --noEmit
```

---

## Catatan

Sistem ini **mandiri**: seluruh penerbitan lisensi terjadi di dalam aplikasi ini memakai secret milikmu. Tidak memanggil, memverifikasi, atau memodifikasi layanan pihak ketiga, dan tidak melakukan pemalsuan identitas perangkat maupun bukti pembelian.

Gunakan untuk produk dan aset digital milikmu sendiri.

---

© 2026 AM Prem.ID — **Van313 | Official**
