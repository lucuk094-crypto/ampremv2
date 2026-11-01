import { NextResponse } from 'next/server';
import { put } from '@/lib/store';
import { signToken, newRequestId, maskEmail, isSecretConfigured } from '@/lib/auth';
import { planOf } from '@/lib/plans';
import { sendMagicLink, mailConfigured } from '@/lib/mailer';
import { rateLimit, rateHeaders, clientIp, ipHash } from '@/lib/ratelimit';
import {
  INBOX_COOKIE,
  addressFromCookie,
  addMessage,
  newMessageId,
  INBOX_DOMAIN,
} from '@/lib/inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const TOKEN_TTL = 15 * 60; // magic link: 15 menit
const LIMIT_PER_EMAIL = 8; // per jam
const LIMIT_PER_IP = 30; // per jam

const SESSION_COOKIE = 'amp_sess';

function baseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (env) return env;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function fail(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('Body harus JSON yang valid.', 400);
  }

  const plan = planOf(body.plan);

  // ── Mode kotak masuk internal: alamat dibuat sistem, hanya pemilik cookie ──
  const cookieHeader = req.headers.get('cookie') || '';
  const inboxCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${INBOX_COOKIE}=`))
    ?.slice(INBOX_COOKIE.length + 1);
  const inboxAddress = addressFromCookie(inboxCookie ? decodeURIComponent(inboxCookie) : undefined);
  const useInbox = Boolean(inboxAddress) || body.delivery === 'inbox';
  const email = useInbox && inboxAddress ? inboxAddress.toLowerCase() : String(body.email ?? '').trim().toLowerCase();

  if (!email) {
    if (body.delivery === 'inbox') {
      return fail('Kotak masuk internal belum dibuat. Klik "Buat alamat" lebih dulu.', 409, { reason: 'NO_INBOX' });
    }
    return fail('Email wajib diisi.');
  }
  if (useInbox && !inboxAddress) {
    return fail('Kotak masuk internal belum dibuat. Klik "Buat alamat" lebih dulu.', 409, { reason: 'NO_INBOX' });
  }
  if (email.length > 160) return fail('Email terlalu panjang.');
  if (!useInbox) {
    if (!EMAIL_RE.test(email)) return fail('Email tidak valid.');
    if (email.endsWith('@example.com') || email.endsWith('@test.com')) {
      return fail('Domain email uji tidak diizinkan. Gunakan email aktif.');
    }
  }

  const ip = clientIp(req);
  const results = await rateLimit([
    { bucket: 'send:email', id: email, limit: LIMIT_PER_EMAIL, windowSeconds: 3600 },
    { bucket: 'send:ip', id: ipHash(ip), limit: LIMIT_PER_IP, windowSeconds: 3600 },
  ]);
  const blocked = results.find((r) => !r.ok);
  if (blocked) {
    const res = fail(
      `Batas ${blocked.limit} permintaan per jam tercapai. Coba lagi dalam ${Math.ceil(blocked.resetInSeconds / 60)} menit.`,
      429,
      { retryInSeconds: blocked.resetInSeconds, scope: blocked.limit === LIMIT_PER_IP ? 'ip' : 'email' }
    );
    Object.entries(rateHeaders(results)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  const requestId = newRequestId();
  const masked = maskEmail(email);

  // Token untuk magic link (sekali pakai, 15 menit)
  const token = signToken({ sub: requestId, eml: email, stp: 'magic', ttlSeconds: TOKEN_TTL });
  // Token untuk cookie sesi (menyandikan requestId yang sama)
  const sessionToken = signToken({ sub: requestId, eml: email, stp: 'sess', ttlSeconds: TOKEN_TTL });

  const magicLink = `${baseUrl(req)}/verify?token=${encodeURIComponent(token)}`;
  const issuedAt = Date.now();

  await put(
    'request',
    requestId,
    { requestId, emailMasked: masked, plan: plan.id, issuedAt },
    TOKEN_TTL
  );

  if (useInbox) {
    // Notifikasi disimpan ke kotak masuk internal — tidak ada email keluar.
    await addMessage(email, {
      id: newMessageId(),
      to: email,
      from: `AM Prem.ID <no-reply@${INBOX_DOMAIN}>`,
      subject: `Magic link aktivasi ${plan.name} — AM Prem.ID`,
      plan: plan.id,
      planName: plan.name,
      preview: 'Klik tombol AKTIFKAN SEKARANG untuk menyelesaikan aktivasi.',
      receivedAt: issuedAt,
      expiresAt: issuedAt + TOKEN_TTL * 1000,
      token,
      magicLink,
    });

    return NextResponse.json({
      success: true,
      ok: true,
      step: 1,
      message: `Notifikasi dikirim ke kotak masuk ${email} — buka tab Kotak Masuk untuk mengambil link.`,
      requestId,
      emailMasked: email,
      plan: plan.id,
      planName: plan.name,
      expiresIn: TOKEN_TTL,
      delivery: 'inbox',
      inboxAddress: email,
      secretConfigured: isSecretConfigured(),
      issuedAt,
    });
  }

  const mail = await sendMagicLink({
    to: email,
    maskedEmail: masked,
    magicLink,
    planName: plan.name,
    minutes: TOKEN_TTL / 60,
    requestId,
  });

  const res = NextResponse.json({
    success: true,
    ok: true,
    step: 1,
    message: mail.note,
    requestId,
    emailMasked: masked,
    plan: plan.id,
    planName: plan.name,
    expiresIn: TOKEN_TTL,
    delivery: mail.delivery,
    mailConfigured: mailConfigured(),
    mailMessageId: mail.messageId,
    mailReason: mail.reason,
    mailConfigIssue: mail.configIssue,
    mailFrom: process.env.MAIL_FROM?.trim() || 'AM Prem.ID <onboarding@resend.dev>',
    secretConfigured: isSecretConfigured(),
    sessionCookieName: SESSION_COOKIE,
    // outbox: link dikembalikan agar bisa ditempel di Langkah 02
    ...(mail.delivery === 'outbox' ? { magicLink } : {}),
    issuedAt,
  });

  Object.entries(rateHeaders(results)).forEach(([k, v]) => res.headers.set(k, v));

  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: false, // sengaja agar bisa disalin manual di Langkah 02
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TOKEN_TTL,
  });

  return res;
}

export async function GET() {
  return NextResponse.json(
    { success: false, message: 'Gunakan POST untuk endpoint ini.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
