/**
 * Penyimpanan persistent + daftar (list) untuk feed & tabel admin.
 * - Jika UPSTASH_REDIS_REST_URL + TOKEN diisi → Redis (tahan cold start).
 * - Jika tidak → memori proses (cukup untuk demo/dev).
 */

const NS = 'ampremid';
const MEM = new Map<string, { value: unknown; exp: number }>();
const LISTS = new Map<string, { items: unknown[]; exp: number }>();

export type Stored = Record<string, unknown>;

function redisCfg() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export function storageMode(): 'redis' | 'memory' {
  return redisCfg() ? 'redis' : 'memory';
}

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const cfg = redisCfg();
  if (!cfg) throw new Error('NO_REDIS');
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result;
}

/** Jalankan beberapa perintah Redis sekaligus (satu round-trip). */
export async function redisPipeline(cmds: (string | number)[][]): Promise<unknown[]> {
  const cfg = redisCfg();
  if (!cfg) throw new Error('NO_REDIS');
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: string }[];
  return json.map((r) => (r.error ? null : r.result));
}

const key = (kind: string, id: string) => `${NS}:${kind}:${id}`;
const listKey = (kind: string) => `${NS}:list:${kind}`;

/* ───────────────────────── key/value ───────────────────────── */

export async function put(kind: string, id: string, value: Stored, ttlSeconds: number): Promise<void> {
  if (redisCfg()) {
    await redis(['SET', key(kind, id), JSON.stringify(value), 'EX', Math.max(60, Math.floor(ttlSeconds))]);
    return;
  }
  evict();
  MEM.set(key(kind, id), { value, exp: Date.now() / 1000 + ttlSeconds });
}

export async function get<T = Stored>(kind: string, id: string): Promise<T | null> {
  if (redisCfg()) {
    const raw = await redis(['GET', key(kind, id)]);
    if (typeof raw !== 'string') return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  const hit = MEM.get(key(kind, id));
  if (!hit) return null;
  if (hit.exp < Date.now() / 1000) {
    MEM.delete(key(kind, id));
    return null;
  }
  return hit.value as T;
}

export async function patch(kind: string, id: string, partial: Stored, ttlSeconds: number): Promise<Stored | null> {
  const cur = await get(kind, id);
  if (!cur) return null;
  const next = { ...cur, ...partial };
  await put(kind, id, next, ttlSeconds);
  return next;
}

/* ───────────────────────── counter ───────────────────────── */

export async function bumpCounter(bucket: string, id: string, ttlSeconds: number): Promise<number> {
  if (redisCfg()) {
    const k = `${NS}:ctr:${bucket}:${id}`;
    const n = Number(await redis(['INCR', k]));
    if (n === 1) await redis(['EXPIRE', k, Math.max(60, Math.floor(ttlSeconds))]);
    return n;
  }
  evict();
  const k = `ctr:${bucket}:${id}`;
  const cur = MEM.get(k);
  const now = Date.now() / 1000;
  if (!cur || cur.exp < now) {
    MEM.set(k, { value: { n: 1 }, exp: now + ttlSeconds });
    return 1;
  }
  const n = Number((cur.value as { n?: number }).n || 0) + 1;
  MEM.set(k, { value: { n }, exp: cur.exp });
  return n;
}

/* ───────────────────────── list (LPUSH + LRANGE) ───────────────────────── */

/** Dorong item ke depan daftar, batasi panjangnya. */
export async function listPush(kind: string, item: Stored, max = 200, ttlSeconds = 86_400 * 30): Promise<void> {
  if (redisCfg()) {
    const k = listKey(kind);
    await redis(['LPUSH', k, JSON.stringify(item)]);
    await redis(['LTRIM', k, 0, Math.max(0, max - 1)]);
    await redis(['EXPIRE', k, Math.max(60, Math.floor(ttlSeconds))]);
    return;
  }
  evict();
  const cur = LISTS.get(kind);
  const items = cur ? cur.items : [];
  LISTS.set(kind, { items: [item, ...items].slice(0, max), exp: Date.now() / 1000 + ttlSeconds });
}

/** Ambil sebagian daftar (0 = terbaru). */
export async function listRange<T = Stored>(kind: string, start = 0, stop = 49): Promise<T[]> {
  if (redisCfg()) {
    const raw = await redis(['LRANGE', listKey(kind), start, stop]);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((r) => {
        try {
          return JSON.parse(String(r)) as T;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as T[];
  }
  const cur = LISTS.get(kind);
  if (!cur) return [];
  if (cur.exp < Date.now() / 1000) {
    LISTS.delete(kind);
    return [];
  }
  return cur.items.slice(start, stop + 1) as T[];
}

/* ───────────────────────── feed beranda ───────────────────────── */

export async function pushRecent(entry: Stored): Promise<void> {
  await listPush('recent', entry, 12, 86_400);
}

export async function getRecent(): Promise<Stored[]> {
  return listRange('recent', 0, 11);
}

/* ───────────────────────── housekeeping ───────────────────────── */

function evict() {
  const now = Date.now() / 1000;
  if (MEM.size > 4000) {
    for (const [k, v] of MEM) if (v.exp < now) MEM.delete(k);
  }
  if (LISTS.size > 40) {
    for (const [k, v] of LISTS) if (v.exp < now) LISTS.delete(k);
  }
}
