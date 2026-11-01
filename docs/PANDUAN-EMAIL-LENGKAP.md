# Cara Mendapatkan API Email (Resend) + Semua Fitur Jalan Tanpa Error

Panduan ini mengantar dari **nol** sampai **email sungguhan terkirim** ke Gmail/Outlook pembeli,
dan memastikan seluruh fitur (wizard, kotak masuk, lisensi, invoice, admin, generator) siap dipakai.

> Penyedia email yang dipakai: **Resend** (`https://api.resend.com/emails`).
> Kode sudah terpasang di `lib/mailer.ts` — tidak perlu install apa pun lagi.

---

## Ringkasan 4 langkah

| # | Langkah | Butuh domain? | Waktu |
|---|---------|---------------|-------|
| 1 | Daftar Resend + buat API key (`re_...`) | tidak | 5 menit |
| 2 | Uji kirim ke email sendiri (`onboarding@resend.dev`) | tidak | 2 menit |
| 3 | Verifikasi domain sendiri → bisa kirim ke siapa saja | ya | 15 menit + propagasi DNS |
| 4 | Pasang 7 environment variable di Vercel → Redeploy | — | 10 menit |

---

## Langkah 1 — Ambil API key Resend (gratis)

1. Buka **https://resend.com** → **Sign up**.
   Bisa daftar dengan **email** atau **GitHub/Google**. Tidak perlu kartu kredit.
2. Verifikasi email pendaftaran (klik link di inbox kamu).
3. Masuk dashboard → menu kiri **API Keys** → tombol **Create API Key**.
4. Isi:
   - **Name**: `AM Prem.ID Production`
   - **Permission**: `Full access` (paling aman untuk semua fitur; atau `Sending access` kalau ingin dibatasi)
   - **Domain**: `All Domains` (kalau memilih Sending access)
5. Klik **Add** → key muncul **satu kali saja**, bentuknya:

   ```
   re_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

6. **Langsung salin** ke Notepad / password manager.

> ⚠️ Key tidak bisa dilihat lagi setelah halaman ditutup. Kalau hilang: hapus key lama,
> buat baru. Ini tidak merusak apa pun — cukup ganti `RESEND_API_KEY` di Vercel lalu Redeploy.
>
> ⚠️ Jangan pernah kirim key ini ke chat, screenshot yang bisa dibaca, atau commit ke GitHub.
> `.gitignore` sudah mengecualikan `.env*`, tapi kebiasaan aman tetap penting.

### Batas paket gratis (per Oktober 2026)

| Item | Gratis |
|---|---|
| Email per bulan | 3.000 |
| Email per hari | **100** (batas yang paling sering kena) |
| Domain terverifikasi | 3 |
| Retensi log | 30 hari |
| Kartu kredit | tidak perlu |

Untuk skala kecil (puluhan aktivasi/hari) paket gratis sudah cukup. Kalau lewat 100/hari,
sistem **tidak error** — otomatis pindah ke **outbox mode** dan magic link tetap tampil di UI.

---

## Langkah 2 — Uji cepat tanpa domain (5 menit, hasil nyata)

Dengan pengirim default `onboarding@resend.dev`, Resend **hanya mengizinkan kirim ke email
pemilik akun Resend**. Ini cukup untuk membuktikan API key benar.

Isi dulu di Vercel (Settings → Environment Variables → Production):

```
RESEND_API_KEY = re_...              (key dari Langkah 1)
MAIL_FROM      = AM Prem.ID <onboarding@resend.dev>
```

Lalu **Deployments → ⋯ → Redeploy** (env baru hanya terbaca setelah redeploy).

Buka `https://domainmu/#admin` (atau `/admin`) → masuk `ADMIN_KEY` → tab **EMAIL**:

- Baris **API key**: harus `VALID`
- Baris **Pengirim**: `AM Prem.ID <onboarding@resend.dev>`
- Kotak **Email uji**: isi **email pemilik akun Resend** → klik **KIRIM EMAIL UJI**

Hasil nyata yang benar: email bertema brutalist (header hitam, tombol hijau "AKTIFKAN SEKARANG",
footer `VAN313 | OFFICIAL`) masuk ke inbox dalam 1–10 detik.
Kalau tidak ada di Inbox, cek folder **Spam/Promotions**.

---

## Langkah 3 — Verifikasi domain supaya bisa kirim ke siapa saja (produksi)

Tanpa langkah ini, magic link ke email pembeli akan **ditolak Resend** (error: *"You can only send
testing emails to your own email address"*). Jadi untuk produk yang benar-benar dipakai orang,
domain wajib.

### 3a. Beli domain murah (opsional kalau sudah punya)

Domain tidak harus `.com`. Untuk Indonesia, `.my.id` paling murah:

| Registrar | Harga `.my.id`/tahun |
|---|---|
| Rumahweb | mulai ± Rp 9.900 – 13.000 |
| IDCloudHost | ± Rp 11.000 – 30.000 |
| Domainesia | ± Rp 14.000 |

Beli 1 tahun, Rp 10–15 ribu. Contoh yang cocok: `ampremid.my.id`.
Kalau sudah punya domain apa pun (`.com`, `.id`, `.xyz`), langsung pakai itu.

### 3b. Tambahkan domain di Resend

1. Dashboard Resend → menu **Domains** → **Add Domain**.
2. Isi nama domain, misal `ampremid.my.id`.
3. Pilih **Region**: `us-east-1` (default, paling murah/cepat) atau `ap-northeast-1` (Tokyo,
   lebih dekat ke Indonesia).
4. Resend menampilkan **3–4 baris DNS record**. Biarkan tab ini terbuka.

### 3c. Pasang DNS record di registrar

Buka panel DNS domain kamu (Rumahweb/IDCloudHost/Cloudflare), lalu salin **persis** nilai dari
Resend. Bentuknya seperti ini (nama & nilai **berbeda per akun** — selalu pakai yang tampil di dashboard):

| Tipe | Nama/Host | Nilai |
|---|---|---|
| `MX` | `send` | `feedback-smtp.us-east-1.amazonses.com` (priority `10`) |
| `TXT` | `send` | `v=spf1 include:amazonses.com ~all` |
| `TXT` | `resend._domainkey` | `p=MIGfMA0GCSq...` (panjang, DKIM) |
| `TXT` *(opsional)* | `_dmarc` | `v=DMARC1; p=none;` |

Catatan:
- Di beberapa panel, kolom "Nama" harus ditulis **tanpa** nama domain (cukup `send`,
  bukan `send.ampremid.my.id`).
- Jangan mengubah nilai TXT sedikit pun — satu karakter salah, DKIM gagal.

### 3d. Verifikasi

Kembali ke tab Resend → **Verify DNS Records**. Propagasi biasanya 5–30 menit
(maksimal 72 jam). Status berubah menjadi **Verified** per baris.

Cek cepat dari terminal:

```bash
dig +short TXT resend._domainkey.ampremid.my.id
dig +short MX send.ampremid.my.id
```

### 3e. Ubah pengirim

```
MAIL_FROM = AM Prem.ID <aktivasi@ampremid.my.id>
```

Alamat depan bebas (`aktivasi@`, `noreply@`, `admin@`) — tidak perlu membuat mailbox sungguhan.
Domain-nya yang harus sudah **Verified**.

---

## Langkah 4 — Environment variable lengkap di Vercel

**Settings → Environment Variables**, semuanya dicentang **Production** (boleh + Preview):

```
AUTH_SECRET=1256f8037b5389f7dfaf9af8e612f45e4c3a74ba6be309471d724a21cbc91c0d
ADMIN_KEY=adm_SHa9EIf2wR6b7Hgvouu3ra8g7AiO9tzj
NEXT_PUBLIC_BASE_URL=https://domainmu.vercel.app
RESEND_API_KEY=re_...dari_langkah_1
MAIL_FROM=AM Prem.ID <aktivasi@ampremid.my.id>
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

Wajib vs opsional:

| Variabel | Wajib? | Kalau kosong |
|---|---|---|
| `AUTH_SECRET` | **wajib** | HMAC lisensi tidak stabil antar-instance |
| `ADMIN_KEY` | **wajib** | panel `/admin` tidak bisa dibuka |
| `NEXT_PUBLIC_BASE_URL` | **wajib untuk produksi** | magic link menunjuk ke host yang salah |
| `RESEND_API_KEY` | untuk email sungguhan | outbox mode (link tampil di UI) |
| `MAIL_FROM` | disarankan | default `onboarding@resend.dev` |
| `UPSTASH_REDIS_REST_URL/TOKEN` | sangat disarankan | data lisensi hilang saat server idle |

### Kenapa Upstash penting (5 menit, gratis)

Vercel menjalankan kode tanpa server permanen. Tanpa Redis, lisensi/order yang disimpan di memori
**hilang** begitu instance di-recycle → pembeli yang cek lisensi bisa dapat "tidak ditemukan".

1. **https://upstash.com** → Sign up (gratis, tanpa kartu).
2. **Create Database** → nama `ampremid` → **Region: `ap-southeast-1` (Singapore)** → Create.
3. Di halaman database, bagian **REST API** → **UPSTASH_REDIS_REST_URL** dan
   **UPSTASH_REDIS_REST_TOKEN** → salin keduanya ke Vercel.
4. Redeploy. Cek: `/api/stats` menampilkan `"storage":"redis"`.

---

## Verifikasi "hasil nyata" (checklist 6 titik)

Jalankan setelah Redeploy. Ganti `DOMAIN` dan `ADMIN` sesuai punyamu.

```bash
# 1. Environment terbaca
curl -s https://DOMAIN/api/stats
#    → "secretConfigured": true, "storage": "redis"

# 2. Resend key valid + domain status
curl -s https://DOMAIN/api/mail-test -H "x-admin-key: ADMIN"
#    → "configured": true, "keyValid": true, "domainVerified": true

# 3. Kirim email sungguhan
curl -s -X POST https://DOMAIN/api/mail-test \
  -H "x-admin-key: ADMIN" -H "content-type: application/json" \
  -d '{"to":"emailkamu@gmail.com"}'
#    → "delivery": "email", ada "messageId"
```

4. **Buka Gmail** → email brutalist masuk, tombol hijau berfungsi.
5. Buka situs → Langkah 01 → pilih **EMAIL ASLI** → isi email → kirim → cek inbox email.
6. Klik magic link di email → Langkah 02 terisi → **Aktivasi** → kunci `AMP-XXXX-...` keluar →
   `/invoice` menghasilkan PDF.

Atau pakai skrip yang sudah disiapkan: `sh scripts/cek-email.sh https://DOMAIN ADMIN_KEY`.

---

## Kalau ada error — penyebab & solusi

| Gejala | Penyebab | Solusi |
|---|---|---|
| `configured: false` | `RESEND_API_KEY` kosong / belum Redeploy | Isi di Vercel → Redeploy |
| `API key is invalid` (HTTP 400/401) | key salah salin / sudah dihapus | Buat key baru, ganti, Redeploy |
| `domain is not verified` | DNS belum propagasi | Tunggu, klik Verify lagi di Resend |
| `You can only send testing emails to your own email address` | masih pakai `onboarding@resend.dev` | Verifikasi domain (Langkah 3) |
| Email masuk Spam | SPF/DKIM/DMARC belum lengkap | Pasang ke-3 record, tambahkan DMARC |
| Rate limit (429) | >2 kirim/detik atau >100/hari | Tunggu; sistem otomatis outbox |
| Magic link mengarah ke `localhost` | `NEXT_PUBLIC_BASE_URL` belum diisi | Isi + Redeploy |
| Lisensi hilang setelah beberapa jam | tanpa Redis | Isi Upstash |
| Tombol aktivasi 404 | `NEXT_PUBLIC_BASE_URL` beda dengan domain asli | Samakan persis (https, tanpa garis miring akhir) |

Semua kondisi di atas **tidak membuat situs error**: `lib/mailer.ts` menurunkan kegagalan kirim
menjadi outbox + pesan alasan yang bisa dibaca di UI.

---

## Aturan aman produksi

- **Jangan pernah mengganti `AUTH_SECRET`** setelah ada lisensi beredar — semua link & cookie lama
  langsung tidak valid. Buat sekali, simpan baik-baik.
- `ADMIN_KEY` boleh diganti kapan saja (cukup Redeploy), lakukan kalau bocor.
- Simpan `re_...` hanya di Vercel + password manager.
- Pantau pemakaian di dashboard Resend → **Emails** (log per email + status delivered/bounced).
