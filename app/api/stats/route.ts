import { NextResponse } from 'next/server';
import { getRecent, storageMode } from '@/lib/store';
import { isSecretConfigured } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const created = Date.UTC(2024, 0, 1);
  const uptimeDays = Math.floor((Date.now() - created) / 86_400_000);
  const recent = await getRecent();

  return NextResponse.json({
    success: true,
    service: 'AM Prem.ID',
    version: '1.0.0',
    developer: 'Van313 | Official',
    status: 'OPERATIONAL',
    uptimeDays,
    storage: storageMode(),
    secretConfigured: isSecretConfigured(),
    engines: 4,
    serverTime: new Date().toISOString(),
    recent: recent.slice(0, 8),
  });
}
