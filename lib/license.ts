import { put, get, patch, listPush, listRange } from './store';
import { generateLicenseKey, orderCode, emailHash, maskEmail } from './auth';
import { planOf, type PlanId } from './plans';

const ACTIVATION_TTL = 60 * 60 * 24 * 30; // 30 hari

export type LicenseRecord = {
  licenseKey: string;
  emailHash: string;
  emailMasked: string;
  plan: PlanId;
  planName: string;
  durationDays: number;
  orderId: string;
  issuedAt: number;
  expiresAt: number;
  status: 'ACTIVE' | 'REVOKED';
  fingerprint: string;
  checksum: string;
};

export type OrderRow = {
  orderId: string;
  plan: PlanId;
  planName: string;
  emailMasked: string;
  issuedAt: number;
  keyTail: string;
  status?: 'ACTIVE' | 'REVOKED';
  licenseKey?: string;
};

function checksumFor(key: string, expiresAt: number): string {
  const seed = `${key}:${expiresAt}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, '0');
}

export async function issueLicense(opts: {
  email: string;
  plan: PlanId;
  requestId: string;
  customOrderId?: string;
}): Promise<LicenseRecord> {
  const plan = planOf(opts.plan);
  const now = Date.now();
  const licenseKey = generateLicenseKey();
  const expiresAt = now + plan.durationDays * 86_400_000;
  const orderId = (opts.customOrderId || '').trim() || orderCode();

  const rec: LicenseRecord = {
    licenseKey,
    emailHash: emailHash(opts.email),
    emailMasked: maskEmail(opts.email),
    plan: plan.id,
    planName: plan.name,
    durationDays: plan.durationDays,
    orderId,
    issuedAt: now,
    expiresAt,
    status: 'ACTIVE',
    fingerprint: opts.requestId,
    checksum: checksumFor(licenseKey, expiresAt),
  };

  await put('license', licenseKey, rec as unknown as Record<string, unknown>, (expiresAt - now) / 1000 + 86_400);
  await put(
    'order',
    orderId,
    { ...rec, requestId: opts.requestId } as unknown as Record<string, unknown>,
    ACTIVATION_TTL
  );
  return rec;
}

/** Terbitkan beberapa lisensi sekaligus (mode Generator 1–5). */
export async function issueBulk(opts: {
  email: string;
  plan: PlanId;
  count: number;
  prefix?: string;
  requestId: string;
}): Promise<LicenseRecord[]> {
  const plan = planOf(opts.plan);
  const n = Math.max(1, Math.min(5, Math.floor(opts.count)));
  const now = Date.now();
  const prefix = (opts.prefix || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const out: LicenseRecord[] = [];

  for (let i = 0; i < n; i++) {
    const licenseKey = generateLicenseKey();
    const expiresAt = now + plan.durationDays * 86_400_000;
    const orderId = `${prefix ? `${prefix}-` : ''}${orderCode()}-${String(i + 1).padStart(2, '0')}`;
    const rec: LicenseRecord = {
      licenseKey,
      emailHash: emailHash(opts.email),
      emailMasked: maskEmail(opts.email),
      plan: plan.id,
      planName: plan.name,
      durationDays: plan.durationDays,
      orderId,
      issuedAt: now + i, // urutan stabil saat diurutkan
      expiresAt,
      status: 'ACTIVE',
      fingerprint: `${opts.requestId}:${i + 1}`,
      checksum: checksumFor(licenseKey, expiresAt),
    };

    await put('license', licenseKey, rec as unknown as Record<string, unknown>, (expiresAt - now) / 1000 + 86_400);
    await put(
      'order',
      orderId,
      { ...rec, requestId: opts.requestId, generated: true } as unknown as Record<string, unknown>,
      ACTIVATION_TTL
    );
    out.push(rec);
  }
  return out;
}

export async function findLicense(key: string): Promise<LicenseRecord | null> {
  const k = String(key || '').trim().toUpperCase();
  if (!/^AMP(-[A-Z2-9]{4}){4}$/.test(k)) return null;
  return get<LicenseRecord>('license', k);
}

export async function findOrder(orderId: string): Promise<LicenseRecord | null> {
  const id = String(orderId || '').trim().toUpperCase();
  if (!id) return null;
  return get<LicenseRecord & { requestId?: string }>('order', id);
}

export async function revokeLicense(key: string): Promise<LicenseRecord | null> {
  const rec = await findLicense(key);
  if (!rec) return null;
  const next = { ...rec, status: 'REVOKED' as const };
  await patch('license', rec.licenseKey, next as unknown as Record<string, unknown>, ACTIVATION_TTL);
  return next;
}

/** Daftar order terbaru untuk panel admin. */
export async function listOrders(start = 0, stop = 49): Promise<OrderRow[]> {
  const rows = await listRange<OrderRow>('orders', start, stop);
  // lengkapi status terkini dari record lisensi (kalau masih ada)
  return Promise.all(
    rows.map(async (r) => {
      if (!r.licenseKey) return r;
      const live = await get<LicenseRecord>('license', r.licenseKey);
      return live ? { ...r, status: live.status } : r;
    })
  );
}

export async function countOrders(): Promise<{ total: number; today: number }> {
  const rows = await listRange<OrderRow>('orders', 0, 199);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return {
    total: rows.length,
    today: rows.filter((r) => r.issuedAt >= startOfDay.getTime()).length,
  };
}

export function remainingDays(rec: LicenseRecord): number {
  return Math.max(0, Math.ceil((rec.expiresAt - Date.now()) / 86_400_000));
}

export { ACTIVATION_TTL, listPush };
