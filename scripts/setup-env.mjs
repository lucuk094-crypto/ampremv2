#!/usr/bin/env node
/**
 * Membuat nilai environment yang dibutuhkan AM Prem.ID, lalu membantu
 * memasangnya ke Vercel lewat CLI.
 *
 *   node scripts/setup-env.mjs
 *   node scripts/setup-env.mjs --print          (hanya cetak, tidak menyimpan)
 *   node scripts/setup-env.mjs --vercel         (langsung `vercel env add`)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const printOnly = args.has('--print');
const pushVercel = args.has('--vercel');
const root = process.cwd();
const envPath = path.join(root, '.env.local');

const hex = (bytes) => crypto.randomBytes(bytes).toString('hex');
const adminKey = `adm_${crypto.randomBytes(18).toString('base64url')}`;

const values = {
  AUTH_SECRET: hex(32),
  ADMIN_KEY: adminKey,
};

console.log('\n════════ NILAI ENVIRONMENT ════════\n');
for (const [k, v] of Object.entries(values)) {
  console.log(`${k}=${v}`);
}
console.log('\nSimpan ADMIN_KEY ini — dipakai untuk membuka /admin.');
console.log('RESEND_API_KEY dan MAIL_FROM diisi manual (dari dashboard Resend).\n');

if (!printOnly) {
  let current = '';
  if (fs.existsSync(envPath)) current = fs.readFileSync(envPath, 'utf8');
  const lines = current.split(/\r?\n/);
  const has = (key) => lines.some((l) => l.startsWith(`${key}=`));

  const additions = [];
  for (const [k, v] of Object.entries(values)) {
    if (!has(k)) additions.push(`${k}=${v}`);
  }
  if (!has('NEXT_PUBLIC_BASE_URL')) {
    additions.push('NEXT_PUBLIC_BASE_URL=http://localhost:3000');
  }

  if (additions.length) {
    const next = `${current.replace(/\s*$/, '')}${current ? '\n' : ''}${additions.join('\n')}\n`;
    fs.writeFileSync(envPath, next, { mode: 0o600 });
    console.log(`✓ Ditulis ke .env.local (${additions.length} variabel baru)`);
  } else {
    console.log('• .env.local sudah memuat semua variabel — tidak ada perubahan');
  }
}

if (pushVercel) {
  console.log('\n════════ PASANG KE VERCEL ════════\n');
  for (const [k, v] of Object.entries(values)) {
    try {
      // echo nilai | vercel env add <key> production
      execFileSync('sh', ['-c', `printf '%s' '${v}' | vercel env add ${k} production`], {
        stdio: 'inherit',
        cwd: root,
      });
      console.log(`✓ ${k} terpasang di Vercel (production)`);
    } catch {
      console.error(`✗ Gagal memasang ${k}. Jalankan manual: vercel env add ${k} production`);
    }
  }
  console.log('\nJangan lupa: vercel --prod  (agar env baru terbaca)\n');
}
