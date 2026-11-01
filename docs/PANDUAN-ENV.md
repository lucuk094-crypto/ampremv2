# Panduan Mengisi Environment Variables

Empat variabel ini dibutuhkan agar AM Prem.ID berjalan penuh. Ada dua tempat mengisinya:
**lokal** (`.env.local`) dan **produksi** (Vercel → Settings → Environment Variables).

| Variabel | Dari mana | Kalau kosong |
|---|---|---|
| `AUTH_SECRET` | **Dibuat sendiri** (acak) | Magic link pakai secret dev yang tidak aman (`secretConfigured: false`) |
| `ADMIN_KEY` | **Dibuat sendiri** (acak) | `/admin` tidak bisa dibuka (`503`) |
| `RESEND_API_KEY` | **Dashboard Resend** | Outbox mode — email tidak dikirim, link tampil di UI |
| `MAIL_FROM` | **Ditulis sendiri** (alamat pengirim) | Otomatis `AM Prem.ID <onboarding@resend.dev>` |

---

## 1. `AUTH_SECRET` dan `ADMIN_KEY` — dibuat sendiri

Keduanya string acak. Jangan dikarang manual seperti `rahasia123` — harus benar-benar acak.

### Cara A — pakai script (paling gampang, sudah ada di repo)

```bash
node scripts/setup-env.mjs
```

Script ini:
- membuat `AUTH_SECRET` (64 karakter hex)
- membuat `ADMIN_KEY` (format `adm_...`)
- menuliskannya ke `.env.local` (hanya jika belum ada — tidak menimpa)
- menampilkan nilainya di terminal

Kalau hanya ingin melihat nilainya tanpa menulis file:

```bash
node scripts/setup-env.mjs --print
```

### Cara B — manual

```bash
# AUTH_SECRET: 32 byte acak dalam bentuk hex
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ADMIN_KEY: bebas asal panjang dan acak
node -e "console.log('adm_' + require('crypto').randomBytes(24).toString('base64url'))"
```

Contoh bentuk yang benar:

```
AUTH_SECRET=8f3a... (64 karakter hex)
ADMIN_KEY=adm_Xk29fQ...
```

> **Jangan pernah mengganti `AUTH_SECRET` setelah sistem dipakai.**
> Semua token dan cookie sesi yang sedang aktif akan langsung tidak valid.

---

## 2. `RESEND_API_KEY` — dari dashboard Resend

1. Buka **https://resend.com/api-keys** (daftar dulu di https://resend.com/signup kalau belum)
2. Klik **Create API Key**
3. Isi:
   - **Name**: `am-prem-id-production`
   - **Permission**: **Sending access** (jangan `Full access`)
   - **Domain**: kosongkan, atau pilih domainmu kalau sudah terverifikasi
4. Klik **Add** → muncul key **`re_...`**
5. **Salin saat itu juga** — key hanya ditampilkan sekali

Nilai yang ditempel ke environment adalah string `re_...` saja, tanpa tanda kutip.

Detail lengkap: [`PANDUAN-RESEND.md`](PANDUAN-RESEND.md)

---

## 3. `MAIL_FROM` — alamat pengirim

Formatnya: `Nama Tampilan <alamat@domain>`

| Situasi | Nilai yang dipakai | Bisa kirim ke |
|---|---|---|
| Belum punya domain (uji coba) | `AM Prem.ID <onboarding@resend.dev>` | **Hanya email pemilik akun Resend** |
| Sudah verifikasi domain | `AM Prem.ID <no-reply@domainmu.com>` | Siapa pun |

Aturan penulisan:

```
✅ AM Prem.ID <no-reply@domainmu.com>
✅ "AM Prem.ID" <no-reply@domainmu.com>
❌ no-reply@domainmu.com          (tanpa nama — masih jalan, tapi kurang rapi)
❌ AM Prem.ID no-reply@domainmu.com  (tanpa < >)
```

Kalau `MAIL_FROM` dikosongkan, sistem otomatis memakai `AM Prem.ID <onboarding@resend.dev>`.

---

## 4. Mengisi di Vercel (produksi)

1. Buka **https://vercel.com/dashboard** → pilih project kamu
2. Tab **Settings** → menu **Environment Variables**
3. Isi satu per satu:

| Key | Value | Environments |
|---|---|---|
| `AUTH_SECRET` | hasil generate | Production, Preview |
| `ADMIN_KEY` | hasil generate | Production |
| `RESEND_API_KEY` | `re_...` | Production |
| `MAIL_FROM` | `AM Prem.ID <no-reply@domainmu.com>` | Production |
| `NEXT_PUBLIC_BASE_URL` | `https://domainmu.com` | Production |

4. Klik **Save** untuk tiap baris
5. **PENTING — Redeploy:** tab **Deployments** → titik tiga pada deployment terakhir → **Redeploy**
   Environment variable baru **tidak terbaca** tanpa redeploy.

### Lewat CLI (alternatif)

```bash
npm i -g vercel
vercel login
vercel link

printf '%s' 'NILAI_AUTH_SECRET' | vercel env add AUTH_SECRET production
printf '%s' 'NILAI_ADMIN_KEY'    | vercel env add ADMIN_KEY production
printf '%s' 're_xxxxxxxx'        | vercel env add RESEND_API_KEY production
printf '%s' 'AM Prem.ID <no-reply@domainmu.com>' | vercel env add MAIL_FROM production
printf '%s' 'https://domainmu.com' | vercel env add NEXT_PUBLIC_BASE_URL production

vercel --prod
```

Atau otomatis untuk dua variabel pertama:

```bash
node scripts/setup-env.mjs --vercel
```

Melihat variabel yang sudah terpasang:

```bash
vercel env ls
```

---

## 5. Mengisi di lokal

Edit `.env.local` di root project (file ini **tidak** ikut ter-commit — sudah ada di `.gitignore`):

```bash
# ── wajib ──
AUTH_SECRET=<hasil generate>
ADMIN_KEY=<hasil generate>

# ── email (opsional; tanpa ini jalan di outbox mode) ──
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
MAIL_FROM=AM Prem.ID <onboarding@resend.dev>

# ── alamat lokal ──
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Setelah mengubah `.env.local`, **restart** server (`Ctrl+C` lalu `npm run dev`), karena env dibaca saat start.

---

## 6. Cara memastikan sudah benar

### Cek cepat lewat API

```bash
curl -s https://domainmu.com/api/stats
```

Perhatikan dua field:

- `"secretConfigured": true` → `AUTH_SECRET` terbaca
- `"storage": "redis"` atau `"memory"` → status penyimpanan

### Cek lewat panel admin

1. Buka `/admin` → masukkan **ADMIN_KEY**
   - Berhasil masuk = `ADMIN_KEY` benar
   - `503` = `ADMIN_KEY` belum diisi di server
   - `401` = key salah
2. Klik tab **EMAIL**:
   - `✓ API KEY TERPASANG` → `RESEND_API_KEY` terbaca
   - `✓ KEY VALID` → key diterima Resend
   - `⚠ PENGIRIM UJI` → `MAIL_FROM` masih `onboarding@resend.dev`
   - `✓ DOMAIN VERIFIED` → domain sudah siap kirim ke siapa pun
3. Klik **KIRIM UJI** → cek inbox dan folder Spam

---

## 7. Kesalahan yang sering terjadi

| Gejala | Penyebab | Solusi |
|---|---|---|
| `/admin` balas `503` | `ADMIN_KEY` kosong di server | Isi env → redeploy |
| `/admin` balas `401` | Key salah ketik / ada spasi | Salin ulang tanpa spasi |
| Tab EMAIL: *API key ditolak* | `RESEND_API_KEY` salah/terpotong | Buat key baru, pastikan diawali `re_` |
| Email tidak sampai padahal *✓ TERKIRIM* | Masih `onboarding@resend.dev`, tujuan bukan email pemilik akun | Verifikasi domain, ganti `MAIL_FROM` |
| Env sudah diisi tapi tidak berubah | Belum redeploy | **Redeploy** di Vercel |
| Magic link lama jadi invalid | `AUTH_SECRET` diganti | Minta magic link baru |
| `.env.local` tidak terbaca | Server belum di-restart | Restart `npm run dev` |

---

© 2026 AM Prem.ID — **Van313 | Official**
