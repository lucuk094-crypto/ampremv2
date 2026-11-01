# Runbook Deploy — AM Prem.ID ke Vercel

Satu halaman. Ikuti berurutan, ±10 menit. Tidak perlu install apa pun.

---

## 0. Yang perlu disiapkan

- Akun GitHub yang punya repo `lucuk094-crypto/ampremv2` ✅ (sudah ada)
- Akun Vercel (gratis) — daftar di **vercel.com** pakai **"Continue with GitHub"** agar repo langsung terlihat

---

## 1. Import repo

1. Buka **https://vercel.com/new**
2. Cari `ampremv2` → klik **Import**
3. **JANGAN ubah apa pun**:
   - Framework Preset: **Next.js** (otomatis)
   - Build Command: `next build` (otomatis)
   - Output Directory: `.next` (otomatis)
   - Install Command: `npm install` (otomatis)
   - Root Directory: **kosong** (repo sudah berisi app di akar)

> Kalau Root Directory terisi otomatis, kosongkan. App ada di akar repo.

---

## 2. Isi Environment Variables (sebelum klik Deploy)

Buka bagian **Environment Variables**, lalu tambahkan satu per satu.
Centang **Production**, **Preview**, dan **Development** untuk keduanya.

| Name | Value |
|---|---|
| `AUTH_SECRET` | `1256f8037b5389f7dfaf9af8e612f45e4c3a74ba6be309471d724a21cbc91c0d` |
| `ADMIN_KEY` | `adm_SHa9EIf2wR6b7Hgvouu3ra8g7AiO9tzj` |

Lalu klik **Deploy**. Tunggu 1–2 menit.

---

## 3. Setelah deploy pertama

Catat domain dari halaman deployment, misal `https://ampremv2.vercel.app`.

Tambahkan variabel ketiga:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_BASE_URL` | `https://<domain-kamu>` — **tanpa** garis miring di akhir |

Lalu: **Deployments → baris paling atas → ⋯ → Redeploy** (tanpa centang "Use existing build cache").

Tanpa variabel ini magic link bisa mengarah ke host yang salah.

---

## 4. Verifikasi (3 perintah)

Ganti `DOMAIN` dan `ADMIN` dengan punyamu.

```bash
# 1. Secret terbaca?
curl -s https://DOMAIN/api/stats
#    harapan: "secretConfigured": true

# 2. Panel admin hidup?
curl -s https://DOMAIN/api/mail-test -H "x-admin-key: ADMIN"
#    harapan: HTTP 200 dengan "configured"
```

3. Buka `https://DOMAIN/admin` → masukkan `ADMIN_KEY` → panel terbuka.

Atau sekali jalan:

```bash
sh scripts/cek-email.sh https://DOMAIN ADMIN emailkamu@gmail.com
```

---

## 5. Uji alur lengkap di produksi

1. Buka `https://DOMAIN`
2. Langkah 01 → pilih **KOTAK MASUK** → **+ BUAT ALAMAT KOTAK MASUK**
3. Klik **KIRIM MAGIC LINK** → notifikasi muncul **< 2 detik** tanpa reload, toast + nada berbunyi
4. Klik **PAKAI LINK INI** → Langkah 02 terisi
5. **VERIFIKASI & TERBITKAN** → kunci lisensi keluar
6. Buka `/invoice` → PDF terunduh

Kalau langkah 3 tidak memunculkan apa pun dalam 5 detik, lihat bagian 7.

---

## 6. Variabel opsional (disarankan)

### Upstash Redis — WAJIB untuk pemakaian nyata

Tanpa ini, lisensi & pesan kotak masuk **hilang saat Vercel mematikan instance**. Ini juga
yang membuat notifikasi real-time bisa gagal muncul (pesan tersimpan di instance lain).

1. **https://upstash.com** → Sign up (gratis, tanpa kartu)
2. **Create Database** → nama `ampremid` → **Region: ap-southeast-1 (Singapore)**
3. Salin dari bagian **REST API**:

| Name | Value |
|---|---|
| `UPSTASH_REDIS_REST_URL` | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | token panjang |
Isi keduanya, lalu **Redeploy**. Cek `curl -s https://DOMAIN/api/stats` → `"storage": "redis"`.

### Email sungguhan (Resend)

Ikuti `docs/PANDUAN-EMAIL-LENGKAP.md`. Ringkas: buat key `re_...` di resend.com/api-keys,
isi `RESEND_API_KEY` + `MAIL_FROM`, Redeploy.

Tanpa ini sistem tetap jalan — magic link tampil di kotak masuk internal.

---

## 7. Kalau ada masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| Build gagal: `Type error` | versi Node terlalu tua | Settings → General → **Node.js Version: 22.x** → Redeploy |
| `"secretConfigured": false` | env belum terbaca | Isi `AUTH_SECRET` → **Redeploy** (env baru hanya aktif setelah redeploy) |
| `/admin` balas 503 | `ADMIN_KEY` kosong | Isi lalu Redeploy |
| Magic link mengarah ke `localhost` | `NEXT_PUBLIC_BASE_URL` belum diisi | Isi + Redeploy |
| Notifikasi kotak masuk tidak muncul | tanpa Redis / beda instance | Isi Upstash, Redeploy |
| Halaman 404 setelah deploy | Root Directory salah | Settings → Root Directory → kosongkan |
| `ERR_EMPTY_RESPONSE` pada `/api/inbox/stream` | normal saat belum ada cookie | Buat alamat dulu di Langkah 01 |

---

## 8. Yang tidak boleh dilakukan

- **Jangan mengganti `AUTH_SECRET`** setelah ada lisensi beredar — semua link & cookie lama langsung tidak valid.
- **Jangan commit `.env.local`** — sudah otomatis diabaikan `.gitignore`.
- `ADMIN_KEY` boleh diganti kapan saja (cukup Redeploy) kalau bocor.

---

## 9. Setiap kali ada perubahan kode

```bash
GH_TOKEN=<token-github> sh scripts/autopush.sh "pesan perubahan"
```

Vercel otomatis build & deploy ulang dari `main` dalam ±1 menit. Tidak perlu klik apa pun.
