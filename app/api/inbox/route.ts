import { NextResponse } from 'next/server';
import {
  INBOX_COOKIE,
  INBOX_TTL,
  newInboxAddress,
  signInbox,
  addressFromCookie,
  listMessages,
  inboxExists,
} from '@/lib/inbox';
import { storageMode } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

/** GET → alamat kotak masuk saat ini + daftar pesan (hanya pemilik cookie). */
export async function GET(req: Request) {
  const address = addressFromCookie(cookies(req)[INBOX_COOKIE]);
  if (!address) {
    return NextResponse.json({ success: true, address: null, messages: [], storage: storageMode() });
  }
  const messages = (await listMessages(address)).map((m) => ({
    id: m.id,
    from: m.from,
    subject: m.subject,
    planName: m.planName,
    preview: m.preview,
    receivedAt: m.receivedAt,
    expiresAt: m.expiresAt,
    magicLink: m.magicLink,
  }));
  return NextResponse.json({
    success: true,
    address,
    messages,
    storage: storageMode(),
    exists: await inboxExists(address),
  });
}

/** POST { action: 'create' | 'reset' } → alamat baru (atau kosongkan). */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* body opsional */
  }
  const action = String(body.action ?? 'create');

  if (action === 'reset') {
    const res = NextResponse.json({ success: true, address: null, messages: [] });
    res.cookies.set(INBOX_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  }

  const address = newInboxAddress();
  const res = NextResponse.json({
    success: true,
    address,
    messages: [],
    note: 'Alamat ini dibuat sistem dan hanya aktif di dalam AM Prem.ID. Bukan email sungguhan.',
  });
  res.cookies.set(INBOX_COOKIE, signInbox(address), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: INBOX_TTL,
  });
  return res;
}
