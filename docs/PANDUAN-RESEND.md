# Panduan Mendapatkan API Key Resend

Panduan langkah demi langkah untuk mengaktifkan pengiriman email sungguhan di **AM Prem.ID**.

---

## Ringkasan cepat

| # | Langkah | Hasil |
|---|---|---|
| 1 | Daftar akun Resend | Akun gratis, 100 email/hari |
| 2 | Buat API Key (Sending access) | String `re_...` — tampil **sekali saja** |
| 3 | Tempel ke `RESEND_API_KEY` | Di Vercel atau `.env.local` |
| 4 | Uji dari `/admin` → tab EMAIL | Badge hijau + email masuk |
| 5 | (Untuk kirim ke siapa pun) verifikasi domain | Ganti `MAIL_FROM` ke domain sendiri |

---

## Langkah 1 — Daftar akun

1. Buka **https://resend.com/signup**
2. Daftar pakai email atau akun GitHub/Google.
3. Verifikasi email pendaftaran (cek inbox/spam).
4. Login ke dashboard: **https://resend.com**

Gratis, **tidak perlu kartu kredit**. Kuota: 100 email/hari, 3.000/bulan, 2 permintaan/detik.

---

## Langkah 2 — Buat API Key

1. Di sidebar dashboard, klik **API Keys** (atau langsung: **https://resend.com/api-keys**)
2. Klik tombol **Create API Key**
3. Isi:
   - **Name**: `am-prem-id-production`
   - **Permission**: pilih **Sending access** ← penting, jangan `Full access`
     - `Sending access` = hanya boleh kirim email. Kalau key ini bocor, kerusakan terbatas.
     - `Full access` = boleh buat/hapus domain, key lain, dll. Tidak perlu untuk aplikasi ini.
   - **Domain**: kalau kamu belum punya domain terverifikasi, biarkan kosong/`All domains`.
     Kalau sudah ada, pilih domainmu supaya key hanya bisa kirim dari domain itu.
4. Klik **Add**
5. Muncul modal berisi key: **`re_`** diikuti ±36 karakter.

> ### ⚠️ Salin sekarang
> Key **hanya ditampilkan sekali**. Kalau modal ditutup tanpa disalin, kamu tidak bisa melihatnya
> lagi — harus **Create API Key** baru. (Bisa di-*Edit* nama/permission, tapi **nilai key tidak bisa dilihat ulang**.)

Simpan sementara di catatan aman (bukan di chat, bukan di repo publik, bukan di screenshot yang dibagikan).

---

## Langkah 3 — Tempel ke aplikasi

### Kalau deploy di Vercel (produksi)

1. Buka project di **https://vercel.com/dashboard**
2. Tab **Settings** → **Environment Variables**
3. Tambahkan:

| Key | Value | Environment |
|---|---|---|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxxxx` | Production (dan Preview bila perlu) |
| `MAIL_FROM` | `AM Prem.ID <onboarding@resend.dev>` | Production |

4. Klik **Save**
5. **PENTING:** buka tab **Deployments** → titik tiga pada deployment terakhir → **Redeploy**.
   Environment variable baru **tidak** terbaca tanpa redeploy.

### Kalau jalan di lokal

Edit `.env.local`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
MAIL_FROM=AM Prem.ID <onboarding@resend.dev>
```

Lalu restart `npm run dev` (env dibaca saat server start).

---

## Langkah 4 — Uji

1. Buka **`/admin`** → masukkan `ADMIN_KEY` → klik **BUKA PANEL**
2. Klik tab **EMAIL**
3. Badge harus jadi:
   - `✓ API KEY TERPASANG`
   - `✓ KEY VALID`
   - `⚠ PENGIRIM UJI` (normal selama masih `onboarding@resend.dev`)
4. Di kotak **KIRIM EMAIL UJI**, masukkan alamat emailmu → **KIRIM UJI**
5. Hasil yang benar: kotak putih **`✓ TERKIRIM`** dengan `messageId` (contoh `a1b2c3d4-...`)
6. Cek inbox (juga folder **Spam**). Email berisi tombol **AKTIFKAN SEKARANG**.

Kalau muncul **`✕ GAGAL`**, alasannya sudah ditulis spesifik:

| Pesan | Artinya | Solusi |
|---|---|---|
| *API key ditolak…* | Key salah/terpotong | Salin ulang, pastikan diawali `re_`, redeploy |
| *Domain pengirim belum terverifikasi…* | `MAIL_FROM` pakai domain yang belum verified | Verifikasi domain, atau pakai `onboarding@resend.dev` |
| *Resend mengizinkan onboarding@resend.dev hanya ke email pemilik akun…* | Kirim ke alamat orang lain | Verifikasi domain dulu |
| *Rate limit Resend (2 permintaan/detik)…* | Terlalu cepat | Tunggu sebentar |

---

## Langkah 5 — Kirim ke siapa pun (verifikasi domain)

Selama memakai `onboarding@resend.dev`, email **hanya bisa masuk ke alamat pemilik akun Resend**.
Supaya bisa mengirim ke email user lain:

1. Dashboard Resend → **Domains** → **Add Domain** (https://resend.com/domains)
2. Masukkan domainmu, mis. `premid.my.id`, pilih region terdekat (mis. `ap-southeast-1` / Singapore)
3. Resend menampilkan beberapa record DNS:
   - **MX** (return-path)
   - **TXT** untuk **SPF**
   - **TXT** untuk **DKIM** (2 record, selector `resend._domainkey`)
   - (opsional, disarankan) **TXT** untuk **DMARC** di `_dmarc.domainmu.com`
4. Buka panel DNS provider domainmu (Cloudflare, Namecheap, Niagahoster, IDCloudHost, dll) → tambahkan record tersebut **persis** seperti yang ditampilkan
5. Kembali ke Resend → klik **Verify DNS Records** → tunggu status jadi **`Verified`**
   (biasanya 5–30 menit, bisa sampai beberapa jam tergantung propagasi DNS)
6. Ubah environment:

```bash
MAIL_FROM=AM Prem.ID <no-reply@domainmu.com>
```

7. **Redeploy**, lalu uji lagi di `/admin` → tab EMAIL. Badge berubah jadi `✓ DOMAIN VERIFIED`.

### Belum punya domain?

| Opsi | Perkiraan biaya | Catatan |
|---|---|---|
| Domain murah `.my.id` / `.xyz` | ±Rp 15.000–25.000 / tahun | Paling murah, cukup untuk kirim email |
| Subdomain dari domain yang sudah ada | Gratis | Kalau kamu sudah punya domain lain |
| Tetap `onboarding@resend.dev` | Gratis | Hanya untuk uji ke email sendiri |

Untuk mengirim email ke user, domain sendiri **wajib**. Tidak ada jalan lain — ini aturan anti-spam Resend, bukan pengaturan aplikasi.

---

## Keamanan key

- **Jangan** commit `.env.local` (sudah ada di `.gitignore`).
- **Jangan** taruh key di kode frontend / `NEXT_PUBLIC_*`. Key hanya dipakai di server (`lib/mailer.ts`).
- Buat **key terpisah** untuk lokal vs produksi, agar bisa dicabut sendiri-sendiri.
- Kalau key bocor: Resend → API Keys → **More options** → **Remove API key**, lalu buat baru.
- Key yang tidak dipakai 30 hari sebaiknya dihapus.
- Pantau pemakaian: klik angka *requests* pada key untuk melihat log per key.

---

## Referensi resmi

- Buat API key: https://resend.com/api-keys
- Dokumentasi API key: https://resend.com/docs/dashboard/api-keys/introduction
- Menambah domain: https://resend.com/domains
- Referensi endpoint kirim: https://resend.com/docs/api-reference/emails/send-email

---

© 2026 AM Prem.ID — **Van313 | Official**

---

## Auto-push ke GitHub

Repo: `github.com/lucuk094-crypto/ampremv2`

```bash
GH_TOKEN=<token-kamu> sh scripts/autopush.sh
GH_TOKEN=<token-kamu> sh scripts/autopush.sh "feat: tambah fitur X"
```

- Token **tidak** disimpan di repo — dibaca dari environment saat dijalankan.
- `.env`, `.env.local`, `.env.*.local` selalu di-reset keluar dari staging, jadi tidak mungkin ikut terkirim.
- Jika tidak ada perubahan, script berhenti tanpa commit kosong.
