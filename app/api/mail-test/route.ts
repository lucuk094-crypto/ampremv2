import { NextResponse } from 'next/server';
import { mailConfigured, sendMagicLink, listDomains } from '@/lib/mailer';
import { checkAdmin } from '@/lib/admin';
import { signToken, newRequestId, maskEmail } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function baseUrl(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
    `${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host') || 'localhost:3000'}`
  );
}

/**
 * Diagnostik email (khusus admin).
 * GET  → status konfigurasi + daftar domain Resend (sekaligus memvalidasi API key)
 * POST → kirim email uji sungguhan ke alamat yang diberikan
 */
export async function GET(req: Request) {
  const auth = checkAdmin(req);
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });

  const configured = mailConfigured();
  const from = process.env.MAIL_FROM?.trim() || 'AM Prem.ID <onboarding@resend.dev>';
  const domain = from.match(/@([^>\s]+)/)?.[1] ?? '';

  if (!configured) {
    return NextResponse.json({
      success: true,
      configured: false,
      from,
      domain,
      usingTestSender: domain === 'resend.dev',
      message: 'RESEND_API_KEY belum diisi — sistem berjalan di outbox mode.',
      domains: [],
    });
  }

  const res = await listDomains();
  return NextResponse.json({
    success: true,
    configured: true,
    from,
    domain,
    usingTestSender: domain === 'resend.dev',
    keyValid: res.ok,
    keyError: res.ok ? undefined : res.reason,
    domains: res.ok ? res.domains : [],
    domainVerified: res.ok ? res.domains.some((d) => d.name === domain && d.status === 'verified') : false,
  });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Body harus JSON.' }, { status: 400 });
  }

  const auth = checkAdmin(req, body.adminKey);
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });

  const to = String(body.to ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(to)) {
    return NextResponse.json({ success: false, message: 'Alamat email tujuan tidak valid.' }, { status: 400 });
  }

  const requestId = newRequestId();
  const token = signToken({ sub: requestId, eml: to, stp: 'magic', ttlSeconds: 900 });
  const magicLink = `${baseUrl(req)}/verify?token=${encodeURIComponent(token)}`;

  const mail = await sendMagicLink({
    to,
    maskedEmail: maskEmail(to),
    magicLink,
    planName: 'EMAIL UJI',
    minutes: 15,
    requestId,
  });

  return NextResponse.json(
    {
      success: mail.delivery === 'email',
      delivery: mail.delivery,
      messageId: mail.messageId,
      note: mail.note,
      reason: mail.reason,
      configIssue: mail.configIssue,
      providerStatus: mail.providerStatus,
      to: maskEmail(to),
      ...(mail.delivery === 'outbox' ? { magicLink } : {}),
    },
    { status: mail.delivery === 'email' ? 200 : 502 }
  );
}
