import crypto from 'node:crypto';

/**
 * Token = base64url(JSON payload) + '.' + HMAC-SHA256
 * Ditandatangani server dengan AUTH_SECRET. Tanpa secret, token tidak bisa
 * dipalsukan — ini pengganti mekanisme "magic link" milik layanan pihak ketiga.
 */

const DEFAULT_SECRET = 'dev-only-insecure-secret-change-me';

function secret(): string {
  return process.env.AUTH_SECRET?.trim() || DEFAULT_SECRET;
}

export function isSecretConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET?.trim());
}

const b64u = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const unb64u = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export type TokenPayload = {
  sub: string; // request id
  eml: string; // email (lowercased)
  stp: string; // step marker
  iat: number;
  exp: number;
};

export function signToken(payload: Omit<TokenPayload, 'iat' | 'exp'> & { ttlSeconds: number }): string {
  const now = Math.floor(Date.now() / 1000);
  const body: TokenPayload = {
    sub: payload.sub,
    eml: payload.eml,
    stp: payload.stp,
    iat: now,
    exp: now + payload.ttlSeconds,
  };
  const data = b64u(JSON.stringify(body));
  const sig = b64u(crypto.createHmac('sha256', secret()).update(data).digest());
  return `${data}.${sig}`;
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; code: 'MALFORMED' | 'BAD_SIGNATURE' | 'EXPIRED'; message: string };

export function verifyToken(token: string): VerifyResult {
  const parts = String(token || '').trim().split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, code: 'MALFORMED', message: 'Token tidak valid atau rusak.' };
  }
  const [data, sig] = parts;
  const expected = b64u(crypto.createHmac('sha256', secret()).update(data).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, code: 'BAD_SIGNATURE', message: 'Tanda tangan token tidak cocok.' };
  }
  let payload: TokenPayload;
  try {
    payload = JSON.parse(unb64u(data).toString('utf8'));
  } catch {
    return { ok: false, code: 'MALFORMED', message: 'Isi token tidak dapat dibaca.' };
  }
  if (!payload?.sub || !payload?.eml || typeof payload.exp !== 'number') {
    return { ok: false, code: 'MALFORMED', message: 'Isi token tidak lengkap.' };
  }
  if (Math.floor(Date.now() / 1000) > payload.exp) {
    return { ok: false, code: 'EXPIRED', message: 'Magic link sudah kadaluarsa. Minta link baru.' };
  }
  return { ok: true, payload };
}

/** Ambil token dari URL magic link mana pun (?token=... / #token=... / path terakhir). */
export function extractToken(input: string): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(raw)) return raw; // token mentah
  try {
    const url = new URL(raw);
    const q = url.searchParams.get('token') || url.searchParams.get('t') || url.searchParams.get('k');
    if (q) return q;
    if (url.hash) {
      const h = new URLSearchParams(url.hash.replace(/^#/, ''));
      const ht = h.get('token') || h.get('t');
      if (ht) return ht;
    }
    const segs = url.pathname.split('/').filter(Boolean);
    const last = segs[segs.length - 1];
    if (last && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(last)) return last;
    return null;
  } catch {
    return null;
  }
}

/** Kunci lisensi: AMP-XXXX-XXXX-XXXX-XXXX (alfabet bebas ambigu). */
export function generateLicenseKey(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join('');
  return `AMP-${block()}-${block()}-${block()}-${block()}`;
}

export function newRequestId(): string {
  return `req_${crypto.randomBytes(9).toString('hex')}`;
}

export function orderCode(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `AM-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export function emailHash(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);
}

export function maskEmail(email: string): string {
  const [name, domain] = String(email).split('@');
  if (!domain) return '***';
  const head = name.slice(0, Math.min(2, name.length));
  return `${head}${'*'.repeat(Math.max(1, name.length - head.length))}@${domain}`;
}
