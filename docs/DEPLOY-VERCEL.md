# Deploy ke Vercel — Nilai Environment Siap Pakai

Semua nilai di bawah sudah dibuatkan. Tinggal salin-tempel.

---

## 1. Nilai yang harus diisi (SEKARANG)

Ini **wajib**. Tanpa dua baris pertama, aplikasi tetap jalan tapi tidak aman (`/admin` mati dan magic link pakai secret dev).

| Key | Value | Environments |
|---|---|---|
| `AUTH_SECRET` | `1256f8037b5389f7dfaf9af8e612f45e4c3a74ba6be309471d724a21cbc91c0d` | Production, Preview, Development |
| `ADMIN_KEY` | `adm_SHa9EIf2wR6b7Hgvouu3ra8g7AiO9tzj` | Production |

**Simpan `ADMIN_KEY` di tempat aman** — itu kunci masuk `/admin`. Kalau hilang, buat baru (lihat bagian 5).

---

## 2. Nilai yang diisi SETELAH tahu URL Vercel

Deploy pertama akan memberi Anda domain, contoh `ampremv2.vercel.app` atau `ampremv2-xxx.vercel.app`.

| Key | Value | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_BASE_URL` | `https://<domain-vercel-kamu>` | Dipakai membentuk magic link. Tanpa ini, link mengikuti host request (biasanya tetap benar) |

Cara memastikan domainnya: Vercel → project → tab **Domains**, atau lihat di halaman deployment.

Setelah mengisi, **Redeploy** agar terbaca.

---

## 3. Nilai OPSIONAL (boleh dilewati dulu)

| Key | Value | Kalau dikosongkan |
|---|---|---|
| `RESEND_API_KEY` | `re_...` dari https://resend.com/api-keys | Email tidak dikirim; sistem otomatis pakai **outbox**/kotak masuk internal |
| `MAIL_FROM` | `AM Prem.ID <onboarding@resend.dev>` | Otomatis memakai nilai itu |
| `UPSTASH_REDIS_REST_URL` | dari dashboard Upstash | Data disimpan di memori — **hilang saat cold start** |
| `UPSTASH_REDIS_REST_TOKEN` | dari dashboard Upstash | sama |

> **Penting soal data.** Di Vercel (serverless), memori proses tidak bertahan. Tanpa Upstash Redis:
> lisensi tetap bisa diverifikasi selama instance masih hidup, tapi **hilang setelah idle/restart**.
> Untuk pemakaian serius, isi Upstash (ada tier gratis). `/api/stats` melaporkan mode aktif.

---

## 4. Langkah deploy

### A. Connect repo ke Vercel

1. Buka **https://vercel.com/new**
2. Login pakai akun GitHub kamu
3. Pilih repository **`lucuk094-crypto/ampremv2`** → **Import**
4. Framework otomatis terdeteksi **Next.js** — jangan ubah apa pun (build command & output default)
5. Sebelum klik Deploy, buka **Environment Variables** dan isi bagian 1 di atas
6. Klik **Deploy** → tunggu ±1–2 menit

### B. Setelah deploy pertama

1. Catat domain yang diberikan Vercel
2. Tambahkan `NEXT_PUBLIC_BASE_URL` = `https://domain-tersebut`
3. **Deployments** → titik tiga pada deployment terakhir → **Redeploy**

### C. Uji

| Uji | Cara | Hasil yang benar |
|---|---|---|
| Aplikasi hidup | buka `https://domainmu` | halaman AM PREM.ID muncul |
| Secret terpasang | `curl https://domainmu/api/stats` | `"secretConfigured": true` |
| Admin | buka `/admin`, masukkan `ADMIN_KEY` | panel terbuka |
| Alur lengkap | buat alamat kotak masuk → kirim link → pakai link → verifikasi | kunci lisensi terbit |

---

## 5. Kalau `ADMIN_KEY` hilang atau bocor

Buat yang baru:

```bash
node -e "console.log('adm_'+require('crypto').randomBytes(24).toString('base64url'))"
```

Ganti nilainya di Vercel → **Redeploy**.

> ⚠️ **Jangan pernah mengganti `AUTH_SECRET`** setelah sistem dipakai — semua magic link dan
> cookie sesi yang aktif akan langsung tidak valid. Ganti hanya kalau memang dicurigai bocor,
> dan terima konsekuensinya (semua pengguna harus minta link baru).

---

## 6. Ringkasan: isi di mana

```
Vercel → project → Settings → Environment Variables

  AUTH_SECRET            = 1256f803...c91c0d        [wajib]
  ADMIN_KEY              = adm_SHa9EIf...AiO9tzj    [wajib]
  NEXT_PUBLIC_BASE_URL   = https://<domain>.vercel.app   [setelah deploy]
  ── opsional ──
  RESEND_API_KEY         = re_...
  MAIL_FROM              = AM Prem.ID <onboarding@resend.dev>
  UPSTASH_REDIS_REST_URL = https://...
  UPSTASH_REDIS_REST_TOKEN = ...
```

Setiap kali mengubah environment → **Redeploy** (env tidak terbaca tanpa deployment baru).

---

© 2026 AM Prem.ID — **Van313 | Official**
