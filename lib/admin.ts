import crypto from 'node:crypto';

/**
 * Otorisasi panel admin memakai ADMIN_KEY (header atau body).
 * Perbandingan memakai timingSafeEqual agar tidak bisa di-timing-attack.
 */
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_KEY?.trim());
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function checkAdmin(req: Request, bodyKey?: unknown): { ok: true } | { ok: false; message: string; status: number } {
  const expected = process.env.ADMIN_KEY?.trim();
  if (!expected) {
    return { ok: false, status: 503, message: 'ADMIN_KEY belum dikonfigurasi di server.' };
  }
  const header = req.headers.get('x-admin-key')?.trim() || '';
  const fromBody = typeof bodyKey === 'string' ? bodyKey.trim() : '';
  const provided = header || fromBody;
  if (!provided) return { ok: false, status: 401, message: 'Kunci admin diperlukan.' };
  if (!safeEqual(provided, expected)) return { ok: false, status: 401, message: 'Kunci admin salah.' };
  return { ok: true };
}
