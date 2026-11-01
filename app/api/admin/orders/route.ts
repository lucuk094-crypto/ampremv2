import { NextResponse } from 'next/server';
import { checkAdmin, adminConfigured } from '@/lib/admin';
import { listOrders, countOrders } from '@/lib/license';
import { storageMode } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = checkAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
  }

  const url = new URL(req.url);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 50));

  const [orders, counts] = await Promise.all([listOrders(0, take - 1), countOrders()]);
  const revenuePlan = await import('@/lib/plans');

  return NextResponse.json({
    success: true,
    storage: storageMode(),
    total: counts.total,
    today: counts.today,
    planBreakdown: revenuePlan.PLAN_LIST.map((p) => ({
      plan: p.id,
      name: p.name,
      count: orders.filter((o) => o.plan === p.id).length,
    })),
    orders,
  });
}

export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Endpoint hanya menerima GET.', adminConfigured: adminConfigured() },
    { status: 405, headers: { Allow: 'GET' } }
  );
}
