import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/admin';
import { issueBulk, remainingDays } from '@/lib/license';
import { listPush } from '@/lib/store';
import { planOf } from '@/lib/plans';
import { rateLimit, rateHeaders } from '@/lib/ratelimit';
import { newRequestId } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/**
 * Mode GENERATOR — terbitkan 1–5 lisensi sekaligus.
 * Dibatasi khusus admin karena menghasilkan lisensi tanpa alur verifikasi email.
 * POST { email, plan, count, prefix? } + header x-admin-key
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Body harus JSON.' }, { status: 400 });
  }

  const auth = checkAdmin(req, body.adminKey);
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });

  const email = String(body.email ?? '').trim().toLowerCase();
  const count = Number(body.count ?? 1);
  const prefix = String(body.prefix ?? '').trim();
  const plan = planOf(body.plan);

  if (!email) return NextResponse.json({ success: false, message: 'Email wajib diisi.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ success: false, message: 'Email tidak valid.' }, { status: 400 });
  }
  if (!Number.isFinite(count) || count < 1 || count > 5) {
    return NextResponse.json({ success: false, message: 'Jumlah harus antara 1 sampai 5.' }, { status: 400 });
  }

  const results = await rateLimit([
    { bucket: 'generate:run', id: 'global', limit: 40, windowSeconds: 3600 },
  ]);
  const blocked = results.find((r) => !r.ok);
  if (blocked) {
    const res = NextResponse.json(
      {
        success: false,
        message: `Batas ${blocked.limit} pembangkitan per jam tercapai. Coba lagi dalam ${Math.ceil(blocked.resetInSeconds / 60)} menit.`,
        retryInSeconds: blocked.resetInSeconds,
      },
      { status: 429 }
    );
    Object.entries(rateHeaders(results)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }

  const requestId = newRequestId();
  const licenses = await issueBulk({ email, plan: plan.id, count: Math.floor(count), prefix, requestId });

  await Promise.all(
    licenses.map((l) =>
      listPush(
        'orders',
        {
          orderId: l.orderId,
          plan: l.plan,
          planName: l.planName,
          emailMasked: l.emailMasked,
          issuedAt: l.issuedAt,
          keyTail: l.licenseKey.slice(-4),
          licenseKey: l.licenseKey,
          status: l.status,
        },
        200,
        86_400 * 30
      )
    )
  );

  const res = NextResponse.json({
    success: true,
    ok: true,
    mode: 'generator',
    message: `${licenses.length} lisensi ${plan.name} diterbitkan untuk ${licenses[0].emailMasked}.`,
    requestId,
    plan: plan.id,
    planName: plan.name,
    count: licenses.length,
    emailMasked: licenses[0].emailMasked,
    licenses: licenses.map((l) => ({
      orderId: l.orderId,
      licenseKey: l.licenseKey,
      plan: l.plan,
      planName: l.planName,
      durationDays: l.durationDays,
      remainingDays: remainingDays(l),
      issuedAt: l.issuedAt,
      expiresAt: l.expiresAt,
      checksum: l.checksum,
      status: l.status,
    })),
  });
  Object.entries(rateHeaders(results)).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function GET() {
  return NextResponse.json(
    { success: false, message: 'Gunakan POST untuk endpoint ini (butuh x-admin-key).' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
