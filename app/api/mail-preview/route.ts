import { magicLinkHtml } from '@/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Pratinjau template email dengan data contoh.
 * Hanya HTML statis — tidak menyentuh data lisensi dan tidak mengirim email.
 */
export async function GET(req: Request) {
  const origin = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || new URL(req.url).origin;
  const html = magicLinkHtml({
    magicLink: `${origin}/verify?token=CONTOH.TOKEN_TANDA_TANGAN`,
    planName: 'VIP PRO',
    minutes: 15,
    maskedEmail: 'ka**@domainmu.com',
  });
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
