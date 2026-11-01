export type PlanId = 'trial' | 'pro' | 'studio';

export type Plan = {
  id: PlanId;
  name: string;
  badge: string;
  durationDays: number;
  price: string;
  accent: 'lime' | 'sun' | 'white';
  quotaPerDay: number;
  features: string[];
};

/**
 * Branding terpusat — ubah di sini untuk mengganti nama, tagline, dan identitas.
 * Variabel env NEXT_PUBLIC_BRAND_NAME / NEXT_PUBLIC_BRAND_DEV menimpanya saat build.
 */
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'AM Prem.ID',
  shortName: 'AM.PREM.ID',
  dev: process.env.NEXT_PUBLIC_BRAND_DEV || 'Van313 | Official',
  tagline: 'Aktivasi tanpa ribet.',
  subline:
    'Generator dan verifikator dalam satu konsol tiga langkah: kirim magic link, tempel balik, lisensi terbit seketika.',
  year: 2026,
  licensePrefix: 'AMP',
} as const;

export const PLANS: Record<PlanId, Plan> = {
  trial: {
    id: 'trial',
    name: 'STARTER',
    badge: '07 HARI',
    durationDays: 7,
    price: 'GRATIS',
    accent: 'white',
    quotaPerDay: 3,
    features: ['Aktivasi 7 hari', '3 aktivasi / hari', '1 perangkat', 'Dukungan komunitas'],
  },
  pro: {
    id: 'pro',
    name: 'VIP PRO',
    badge: '1 TAHUN',
    durationDays: 365,
    price: 'IDR 0',
    accent: 'lime',
    quotaPerDay: 10,
    features: [
      'Aktivasi 365 hari',
      '10 aktivasi / hari',
      'Semua preset & template',
      'Ekspor tanpa watermark',
      'Prioritas antrean',
    ],
  },
  studio: {
    id: 'studio',
    name: 'STUDIO',
    badge: '2 TAHUN',
    durationDays: 730,
    price: 'IDR 0',
    accent: 'sun',
    quotaPerDay: 25,
    features: [
      'Aktivasi 730 hari',
      '25 aktivasi / hari',
      'Multi-perangkat',
      'Lisensi tim (5 seat)',
      'Akses API privat',
    ],
  },
};

export const PLAN_LIST: Plan[] = [PLANS.trial, PLANS.pro, PLANS.studio];

export function planOf(id: unknown): Plan {
  return (typeof id === 'string' && id in PLANS ? PLANS[id as PlanId] : PLANS.pro);
}
