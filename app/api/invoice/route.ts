import { NextResponse } from 'next/server';
import { findLicense, findOrder } from '@/lib/license';
import { renderInvoicePdf } from '@/lib/invoice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/invoice?key=AMP-...  atau  ?order=AM-...  → PDF */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = (url.searchParams.get('key') || '').trim();
  const order = (url.searchParams.get('order') || '').trim();
  const inline = url.searchParams.get('inline') === '1';

  if (!key && !order) {
    return NextResponse.json({ success: false, message: 'Sertakan ?key= atau ?order=.' }, { status: 400 });
  }

  const rec = key ? await findLicense(key) : await findOrder(order);
  if (!rec) {
    return NextResponse.json(
      { success: false, message: 'Lisensi atau order tidak ditemukan.' },
      { status: 404 }
    );
  }

  try {
    const pdf = await renderInvoicePdf({
      orderId: rec.orderId,
      licenseKey: rec.licenseKey,
      planName: rec.planName,
      durationDays: rec.durationDays,
      issuedAt: rec.issuedAt,
      expiresAt: rec.expiresAt,
      status: rec.status,
      emailMasked: rec.emailMasked,
      checksum: rec.checksum,
    });

    const filename = `AM-PremID-Invoice-${rec.orderId}.pdf`;
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Gagal membuat invoice.' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Gunakan GET untuk endpoint ini.' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}
