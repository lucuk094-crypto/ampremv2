import crypto from 'node:crypto';
import { redisPipeline, storageMode } from './store';

/**
 * Fixed-window rate limiter yang tahan di serverless.
 *
 * - Redis (Upstash): INCR + EXPIRE dijalankan dalam SATU pipeline → atomik dan
 *   konsisten meski beberapa instance function berjalan bersamaan.
 * - Tanpa Redis: fallback ke memori proses (per-instance). Cukup untuk dev,
 *   TIDAK akurat di produksi serverless — endpoint /api/stats melaporkan mode ini.
 *
 * Catatan: di balik proxy seperti Vercel, IP klien asli dibaca dari
 * x-forwarded-for (entri pertama) dengan x-real-ip sebagai cadangan.
 */

export type RateRule = {
  /** Nama bucket, mis. 'send:email' */
  bucket: string;
  /** Kunci pembeda, mis. email atau IP */
  id: string;
  /** Batas jumlah dalam satu window */
  limit: number;
  /** Panjang window dalam detik */
  windowSeconds: number;
};

export type RateResult = {
  ok: boolean;
  remaining: number;
  limit: number;
  resetInSeconds: number;
  mode: 'redis' | 'memory';
};

/* ───────────────────────── memory fallback ───────────────────────── */

type Bucket = { count: number; resetAt: number };
const MEM = new Map<string, Bucket>();

function memHit(rule: RateRule): { count: number; resetInSeconds: number } {
  const k = `${rule.bucket}|${rule.id}`;
  const now = Date.now();
  const cur = MEM.get(k);

  if (!cur || cur.resetAt <= now) {
    const resetAt = now + rule.windowSeconds * 1000;
    MEM.set(k, { count: 1, resetAt });
    return { count: 1, resetInSeconds: rule.windowSeconds };
  }

  cur.count += 1;
  if (MEM.size > 5000) {
    for (const [key, b] of MEM) if (b.resetAt <= now) MEM.delete(key);
  }
  return { count: cur.count, resetInSeconds: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) };
}

/* ───────────────────────── redis (pipeline) ───────────────────────── */

const NS = 'ampremid';

async function redisHits(rules: RateRule[]) {
  const now = Math.floor(Date.now() / 1000);
  const keys = rules.map((r) => `${NS}:rl:${r.bucket}:${r.id}:${Math.floor(now / r.windowSeconds)}`);

  // INCR semua kunci, lalu set EXPIRE untuk yang baru dibuat (TTL = window + buffer)
  const cmds: (string | number)[][] = [];
  for (let i = 0; i < keys.length; i++) {
    cmds.push(['INCR', keys[i]]);
    cmds.push(['EXPIRE', keys[i], rules[i].windowSeconds + 5]);
  }

  const out = await redisPipeline(cmds);
  const counts = keys.map((_, i) => Number(out[i * 2] ?? 1));

  return rules.map((r, i) => ({
    count: counts[i],
    resetInSeconds: r.windowSeconds - (now % r.windowSeconds),
  }));
}

/* ───────────────────────── API utama ───────────────────────── */

/**
 * Cek & naikkan hitungan untuk satu atau beberapa aturan sekaligus.
 * Mengembalikan hasil untuk aturan pertama yang terlampaui (jika ada).
 */
export async function rateLimit(rules: RateRule[]): Promise<RateResult[]> {
  if (!rules.length) return [];

  if (storageMode() === 'redis') {
    try {
      const hits = await redisHits(rules);
      return rules.map((r, i) => {
        const { count, resetInSeconds } = hits[i];
        return {
          ok: count <= r.limit,
          remaining: Math.max(0, r.limit - count),
          limit: r.limit,
          resetInSeconds,
          mode: 'redis' as const,
        };
      });
    } catch {
      // Redis bermasalah → jangan blokir pengguna, pakai fallback memori
    }
  }

  return rules.map((r) => {
    const { count, resetInSeconds } = memHit(r);
    return {
      ok: count <= r.limit,
      remaining: Math.max(0, r.limit - count),
      limit: r.limit,
      resetInSeconds,
      mode: 'memory' as const,
    };
  });
}

/** Header standar rate limit untuk disertakan pada respons. */
export function rateHeaders(results: RateResult[]): Record<string, string> {
  if (!results.length) return {};
  const strictest = results.reduce((a, b) => (a.remaining <= b.remaining ? a : b));
  const blocked = results.find((r) => !r.ok);
  const r = blocked ?? strictest;
  return {
    'X-RateLimit-Limit': String(r.limit),
    'X-RateLimit-Remaining': String(r.remaining),
    'X-RateLimit-Reset': String(r.resetInSeconds),
    ...(blocked ? { 'Retry-After': String(blocked.resetInSeconds) } : {}),
  };
}

/** Ambil IP klien dari header proxy. */
export function clientIp(req: Request): string {
  const h = req.headers;
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '0.0.0.0';
}

/** Hash pendek untuk IP (agar tidak menyimpan IP mentah pada log/record). */
export function ipHash(ipAddress: string): string {
  return crypto.createHash('sha256').update(ipAddress).digest('hex').slice(0, 16);
}
