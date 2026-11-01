#!/bin/sh
# Cek kesehatan email + konfigurasi deployment.
#
# Pemakaian:
#   sh scripts/cek-email.sh https://domainmu.vercel.app ADMIN_KEY [email-uji]
#
# Contoh:
#   sh scripts/cek-email.sh https://ampremid.vercel.app adm_xxx saya@gmail.com

set -u

BASE="${1:-}"
KEY="${2:-}"
TO="${3:-}"

if [ -z "$BASE" ] || [ -z "$KEY" ]; then
  echo "Pemakaian: sh scripts/cek-email.sh https://domainmu ADMIN_KEY [email-uji]" >&2
  exit 1
fi

BASE=$(echo "$BASE" | sed 's:/*$::')

line() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

line "1/3  Statistik & environment"
curl -s "$BASE/api/stats" || echo "  (tidak dapat menghubungi $BASE)"
echo

line "2/3  Diagnostik Resend (key + domain)"
curl -s "$BASE/api/mail-test" -H "x-admin-key: $KEY" || echo "  (gagal)"
echo

if [ -n "$TO" ]; then
  line "3/3  Kirim email uji ke $TO"
  curl -s -X POST "$BASE/api/mail-test" \
    -H "x-admin-key: $KEY" \
    -H "content-type: application/json" \
    -d "{\"to\":\"$TO\"}"
  echo
  echo "  Cek inbox/spam $TO. Harus ada email bertema brutalist dari AM Prem.ID."
else
  line "3/3  Dilewati"
  echo "  Tambahkan alamat email sebagai argumen ke-3 untuk uji kirim."
fi

echo
echo "Selesai. Panduan lengkap: docs/PANDUAN-EMAIL-LENGKAP.md"
