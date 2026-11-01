/**
 * Pengiriman email.
 * - RESEND_API_KEY terisi  → magic link dikirim ke inbox sungguhan.
 * - Kosong                 → OUTBOX MODE: link dikembalikan ke UI (tidak dikirim).
 *
 * Tidak pernah melempar error ke pemanggil: kegagalan pengiriman diturunkan
 * menjadi fallback outbox agar alur aktivasi tetap berjalan.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export type MailOutcome = {
  delivery: 'email' | 'outbox';
  note: string;
  providerStatus?: number;
  /** id pesan dari Resend bila berhasil */
  messageId?: string;
  /** penjelasan ramah dari Resend bila gagal */
  reason?: string;
  /** true bila kegagalan berasal dari konfigurasi (domain belum verifikasi, key salah, dsb) */
  configIssue?: boolean;
};

export type ResendDomain = { name: string; status: string; region?: string };

/** Terjemahkan respons error Resend menjadi penjelasan yang bisa ditindaklanjuti. */
export function explainResendError(status: number, body: unknown): { reason: string; configIssue: boolean } {
  const raw = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const msg = String(raw.message ?? raw.error ?? '').toLowerCase();
  const name = String(raw.name ?? '').toLowerCase();

  const keyProblem =
    msg.includes('api key') || msg.includes('unauthorized') || msg.includes('invalid api') || name.includes('auth');
  if (keyProblem || status === 401 || status === 403) {
    return {
      reason: 'API key ditolak. Periksa RESEND_API_KEY (harus diawali "re_") dan pastikan punya izin "Sending access".',
      configIssue: true,
    };
  }
  if (msg.includes('not verified') || msg.includes('domain') || msg.includes('verify')) {
    return {
      reason:
        'Domain pengirim belum terverifikasi di Resend. Verifikasi domain di dashboard Resend, atau pakai onboarding@resend.dev untuk uji ke email pemilik akun.',
      configIssue: true,
    };
  }
  if (msg.includes('only send') || msg.includes('own email') || msg.includes('testing emails')) {
    return {
      reason:
        'Resend mengizinkan onboarding@resend.dev hanya ke email pemilik akun Resend. Verifikasi domain dulu untuk mengirim ke alamat lain.',
      configIssue: true,
    };
  }
  if (status === 429 || name.includes('rate')) {
    return { reason: 'Rate limit Resend (2 permintaan/detik). Coba lagi sesaat lagi.', configIssue: false };
  }
  if (status === 422) {
    return { reason: `Data email ditolak Resend: ${String(raw.message ?? 'tidak valid')}. Periksa alamat pengirim/tujuan.`, configIssue: true };
  }
  return {
    reason: `Resend menolak pengiriman (HTTP ${status})${raw.message ? `: ${String(raw.message)}` : ''}.`,
    configIssue: status >= 400 && status < 500,
  };
}

/** Ambil daftar domain + status verifikasi (sekaligus memvalidasi API key). */
export async function listDomains(): Promise<
  { ok: true; domains: ResendDomain[] } | { ok: false; status: number; reason: string }
> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, status: 503, reason: 'RESEND_API_KEY belum diisi.' };
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as { data?: ResendDomain[] } & Record<string, unknown>;
    if (!res.ok) return { ok: false, status: res.status, reason: explainResendError(res.status, json).reason };
    const domains = Array.isArray(json.data) ? json.data : [];
    return { ok: true, domains: domains.map((d) => ({ name: d.name, status: d.status, region: d.region })) };
  } catch {
    return { ok: false, status: 0, reason: 'Tidak dapat menghubungi api.resend.com (jaringan/timeout).' };
  }
}

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Template email bergaya brutalist — tabel + border tebal, aman di klien email. */
export function magicLinkHtml(opts: { magicLink: string; planName: string; minutes: number; maskedEmail: string }): string {
  const { magicLink, planName, minutes } = opts;
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aktivasi ${esc(planName)}</title></head>
<body style="margin:0;padding:24px 12px;background:#F7F7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:3px solid #0A0A0A;">
    <tr><td style="background:#0A0A0A;padding:16px 20px;">
      <span style="color:#00E676;font-size:18px;font-weight:900;letter-spacing:-0.5px;">AM.PREM.ID</span>
      <span style="color:#888;font-size:11px;letter-spacing:2px;text-transform:uppercase;">&nbsp;activation toolkit</span>
    </td></tr>
    <tr><td style="padding:28px 24px 8px;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;font-weight:700;">langkah 02 · verifikasi</p>
      <h1 style="margin:0 0 14px;font-size:30px;line-height:1.05;letter-spacing:-1px;color:#0A0A0A;">MAGIC LINK KAMU</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#333;">
        Klik tombol di bawah untuk menyelesaikan aktivasi <b>${esc(planName)}</b>.
        Link hanya berlaku <b>${minutes} menit</b> dan bisa dipakai satu kali.
      </p>
    </td></tr>
    <tr><td style="padding:0 24px;">
      <a href="${esc(magicLink)}" style="display:block;text-align:center;background:#00E676;color:#0A0A0A;border:3px solid #0A0A0A;padding:16px 20px;font-size:15px;font-weight:900;letter-spacing:0.5px;text-decoration:none;">
        AKTIFKAN SEKARANG →
      </a>
    </td></tr>
    <tr><td style="padding:20px 24px 0;">
      <p style="margin:0 0 6px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#888;font-weight:700;">atau tempel manual</p>
      <div style="border:2px solid #0A0A0A;background:#F7F7F2;padding:12px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;line-height:1.5;color:#333;word-break:break-all;">${esc(magicLink)}</div>
    </td></tr>
    <tr><td style="padding:20px 24px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFE500;border:3px solid #0A0A0A;">
        <tr><td style="padding:10px 12px;font-size:11px;font-weight:700;color:#0A0A0A;">
          Butuh cookie sesi? Buka konsol aktivasi di AM Prem.ID — nilai cookie ditampilkan di Langkah 01.
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="border-top:3px solid #0A0A0A;padding:16px 24px;background:#0A0A0A;">
      <p style="margin:0 0 4px;font-size:10px;color:#888;line-height:1.6;">
        Email ini dikirim ke ${esc(opts.maskedEmail)}. Abaikan jika kamu tidak meminta aktivasi.
      </p>
      <p style="margin:0;font-size:10px;color:#00E676;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">
        van313 | official
      </p>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendMagicLink(opts: {
  to: string;
  maskedEmail: string;
  magicLink: string;
  planName: string;
  minutes: number;
  /** dipakai sebagai Idempotency-Key agar retry tidak mengirim dobel */
  requestId?: string;
}): Promise<MailOutcome> {
  if (!mailConfigured()) {
    return {
      delivery: 'outbox',
      note: 'Tidak ada penyedia email terkonfigurasi — magic link ditampilkan langsung (outbox mode).',
    };
  }

  const from = process.env.MAIL_FROM?.trim() || 'AM Prem.ID <onboarding@resend.dev>';

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        ...(opts.requestId ? { 'Idempotency-Key': `amp-${opts.requestId}` } : {}),
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: `Magic link aktivasi ${opts.planName} — AM Prem.ID`,
        html: magicLinkHtml({
          magicLink: opts.magicLink,
          planName: opts.planName,
          minutes: opts.minutes,
          maskedEmail: opts.maskedEmail,
        }),
        text:
          `AM PREM.ID — Aktivasi ${opts.planName}\n\n` +
          `Buka link berikut dalam ${opts.minutes} menit (sekali pakai):\n${opts.magicLink}\n\n` +
          `Jika kamu tidak meminta aktivasi, abaikan email ini.\n— Van313 | Official`,
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        /* body bukan JSON */
      }
      const { reason, configIssue } = explainResendError(res.status, body);
      return {
        delivery: 'outbox',
        note: `Email gagal dikirim — ${reason} Sementara ini memakai outbox mode.`,
        providerStatus: res.status,
        reason,
        configIssue,
      };
    }

    let messageId: string | undefined;
    try {
      const body = (await res.json()) as { id?: string };
      messageId = body?.id;
    } catch {
      /* abaikan */
    }
    return {
      delivery: 'email',
      note: `Magic link dikirim ke ${opts.maskedEmail}.`,
      messageId,
      providerStatus: res.status,
    };
  } catch {
    return {
      delivery: 'outbox',
      note: 'Penyedia email tidak merespons — beralih ke outbox mode.',
      reason: 'Timeout/jaringan ke api.resend.com.',
    };
  }
}
