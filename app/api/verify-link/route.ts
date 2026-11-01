import { NextResponse } from 'next/server';
import { get, put, listPush } from '@/lib/store';
import { extractToken, verifyToken, emailHash, maskEmail } from '@/lib/auth';
import { issueLicense, remainingDays } from '@/lib/license';
import { planOf } from '@/lib/plans';
import { rateLimit, rateHeaders, clientIp, ipHash } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const LIMIT_PER_EMAIL = 20; // per jam
const LIMIT_PER_IP = 60; // per jam
const SESSION_COOKIE = 'amp_sess';

function cookies(req: Request): Record<string, string> {
  const raw = req.headers.get('cookie') || '';
  const out: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    { success: false, ok: false, authenticated: false, premiumActive: false, message, ...extra },
    { status }
  );
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('Body harus JSON yang valid.', 400);
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const cookieInput = String(body.cookie ?? '').trim();
  const magicLink = String(body.magicLink ?? '').trim();
  const customOrderId = String(body.customOrderId ?? '').trim();
  const plan = planOf(body.plan);

  // ── Urutan validasi dipertahankan seperti sistem lama ──
  if (!email) return fail('Email wajib diisi.');
  if (!EMAIL_RE.test(email)) return fail('Email tidak valid.');
  if (!magicLink) return fail('Link dari email wajib diisi.');
  if (!cookieInput) return fail('Cookie wajib diisi.');

  const results = await rateLimit([
    { bucket: 'verify:email', id: email, limit: LIMIT_PER_EMAIL, windowSeconds: 3600 },
    { bucket: 'verify:ip', id: ipHash(clientIp(req)), limit: LIMIT_PER_IP, windowSeconds: 3600 },
  ]);
  const blocked = results.find((r) => !r.ok);
  if (blocked) {
    const res = fail(
      `Batas ${blocked.limit} verifikasi per jam tercapai. Coba lagi dalam ${Math.ceil(blocked.resetInSeconds / 60)} menit.`,
      429,
      { retryInSeconds: blocked.resetInSeconds }
    );
    Object.entries(rateHeaders(results)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  // ── Token magic link ──
  const token = extractToken(magicLink);
  if (!token) {
    return fail('Format magic link tidak dikenali. Pastikan menempel seluruh URL dari email.', 422);
  }

  const verdict = verifyToken(token);
  if (!verdict.ok) {
    return fail(verdict.message, verdict.code === 'EXPIRED' ? 410 : 422, { reason: verdict.code });
  }

  if (verdict.payload.eml !== email) {
    return fail('Email tidak cocok dengan magic link yang ditempel.', 409, { reason: 'EMAIL_MISMATCH' });
  }

  // ── Cookie sesi: bila browser punya cookie dari Langkah 01, nilainya harus cocok ──
  const browserSession = cookies(req)[SESSION_COOKIE];
  const submitted = cookieInput;

  if (browserSession) {
    const sess = verifyToken(submitted);
    if (!sess.ok || sess.payload.sub !== verdict.payload.sub) {
      // toleransi: user boleh menempel requestId mentah
      if (submitted !== verdict.payload.sub) {
        return fail('Cookie sesi tidak cocok dengan permintaan ini. Ambil ulang dari Langkah 01.', 409, {
          reason: 'COOKIE_MISMATCH',
        });
      }
    }
  }

  // ── Sekali pakai ──
  const already = await get('used', verdict.payload.sub);
  if (already) return fail('Magic link ini sudah dipakai. Minta link baru.', 409, { reason: 'TOKEN_USED' });
  await put('used', verdict.payload.sub, { at: Date.now() }, 86_400);

  // ── Terbitkan lisensi ──
  const license = await issueLicense({ email, plan: plan.id, requestId: verdict.payload.sub, customOrderId });

  // feed publik: TANPA kunci lisensi
  const publicSummary = {
    orderId: license.orderId,
    plan: license.plan,
    planName: license.planName,
    emailMasked: license.emailMasked,
    issuedAt: license.issuedAt,
    keyTail: license.licenseKey.slice(-4),
  };
  // daftar admin: lengkap dengan kunci + status agar bisa dicabut
  const adminRow = {
    ...publicSummary,
    licenseKey: license.licenseKey,
    status: license.status,
  };

  await Promise.all([
    listPush('recent', publicSummary, 12, 86_400),
    listPush('orders', adminRow, 200, 86_400 * 30),
  ]);

  const okRes = NextResponse.json({
    success: true,
    ok: true,
    authenticated: true,
    premiumActive: true,
    step: 2,
    message: `Aktivasi berhasil. Lisensi ${license.planName} aktif.`,
    orderId: license.orderId,
    licenseKey: license.licenseKey,
    plan: license.plan,
    planName: license.planName,
    durationDays: license.durationDays,
    remainingDays: remainingDays(license),
    issuedAt: license.issuedAt,
    expiresAt: license.expiresAt,
    status: license.status,
    checksum: license.checksum,
    emailMasked: maskEmail(email),
    requestId: verdict.payload.sub,
    verifiedFrom: clientIp(req).slice(0, 7),
    emailFingerprint: emailHash(email),
  });
  Object.entries(rateHeaders(results)).forEach(([k, v]) => okRes.headers.set(k, v));
  return okRes;
}

export async function GET() {
  return NextResponse.json(
    { success: false, message: 'Gunakan POST untuk endpoint ini.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
