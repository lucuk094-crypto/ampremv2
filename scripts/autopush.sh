#!/usr/bin/env sh
# Auto-push AM Prem.ID ke GitHub.
# Token TIDAK disimpan di file ini — dibaca dari environment GH_TOKEN saat dijalankan.
#
#   GH_TOKEN=ghp_xxx sh scripts/autopush.sh
#   GH_TOKEN=ghp_xxx sh scripts/autopush.sh "pesan commit khusus"
#
# Aman dipakai berulang: jika tidak ada perubahan, script tidak melakukan apa pun.

set -eu

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

if [ -z "${GH_TOKEN:-}" ]; then
  echo "✗ GH_TOKEN belum diset." >&2
  echo "  Jalankan: GH_TOKEN=ghp_xxx sh scripts/autopush.sh" >&2
  exit 1
fi

if [ ! -d .git ]; then
  echo "✗ Bukan repository git." >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)"
MSG="${1:-chore: update otomatis $(date '+%Y-%m-%d %H:%M:%S')}"

# jangan pernah mengirim berkas rahasia
git add -A
git reset -q -- .env .env.local .env.*.local 2>/dev/null || true

if git diff --cached --quiet; then
  # Tidak ada perubahan baru. Tetap cek apakah ada commit lokal yang belum terkirim.
  if git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1 && \
     [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$BRANCH")" ]; then
    echo "• Tidak ada perubahan dan tidak ada commit tertunda."
    exit 0
  fi
  echo "• Tidak ada perubahan baru — mengirim commit lokal yang tertunda."
else
  git -c user.name="${GIT_AUTHOR_NAME:-Van313}" \
      -c user.email="${GIT_AUTHOR_EMAIL:-van313@users.noreply.github.com}" \
      commit -q -m "$MSG"
fi

git -c credential.helper='!f() { echo "username=x-access-token"; echo "password=$GH_TOKEN"; }; f' \
    push origin "$BRANCH" 2>&1 | tail -3

echo "✓ Terkirim ke origin/$BRANCH — $(git rev-parse --short HEAD) $MSG"
