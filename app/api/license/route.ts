import { NextResponse } from 'next/server';
import { findLicense, findOrder, remainingDays, revokeLicense } from '@/lib/license';
import { checkAdmin } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

const isKey = (s: string) => /^AMP(-[A-Z2-9]{4}){4}$/i.test(s);

/** GET /api/license?key=AMP-...  atau  ?order=AM-YYYYMMDD-XXXXXX */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = (url.searchParams.get('key') || '').trim();
  const order = (url.searchParams.get('order') || '').trim();

  if (!key && !order) return fail('Sertakan ?key= atau ?order=.');

  const rec = key ? await findLicense(key) : await findOrder(order);
  if (!rec) return fail('Lisensi atau order tidak ditemukan. Periksa kembali kodenya.', 404);

  return NextResponse.json({
    success: true,
    licenseKey: rec.licenseKey,
    orderId: rec.orderId,
    plan: rec.plan,
    planName: rec.planName,
    status: rec.status,
    active: rec.status === 'ACTIVE' && rec.expiresAt > Date.now(),
    issuedAt: rec.issuedAt,
    expiresAt: rec.expiresAt,
    remainingDays: remainingDays(rec),
    emailMasked: rec.emailMasked,
    checksum: rec.checksum,
  });
}

/** POST /api/license  { key, action: 'revoke' } + header x-admin-key */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('Body harus JSON yang valid.');
  }

  const auth = checkAdmin(req, body.adminKey);
  if (!auth.ok) return fail(auth.message, auth.status);

  const key = String(body.key ?? '').trim().toUpperCase();
  if (!isKey(key)) return fail('Format kunci lisensi tidak valid.');
  if (String(body.action) !== 'revoke') return fail('Aksi tidak dikenal. Gunakan "revoke".');

  const rec = await revokeLicense(key);
  if (!rec) return fail('Lisensi tidak ditemukan.', 404);
  return NextResponse.json({
    success: true,
    message: 'Lisensi dicabut.',
    licenseKey: rec.licenseKey,
    status: rec.status,
  });
}
