import {
  INBOX_COOKIE,
  addressFromCookie,
  listMessages,
  publicMessage,
} from '@/lib/inbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Jeda antar-polling server saat membandingkan isi kotak masuk. */
const TICK_MS = 1500;
/** Komentar keep-alive agar proxy/Vercel tidak memutus koneksi yang menganggur. */
const HEARTBEAT_MS = 15_000;
/** Batas keras: koneksi ditutup setelah 10 menit, browser akan menyambung ulang. */
const MAX_STREAM_MS = 10 * 60 * 1000;

function cookieValue(req: Request, name: string): string | undefined {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

/**
 * GET /api/inbox/stream
 *
 * Server-Sent Events untuk kotak masuk internal.
 * Event: ready (sekali) · inbox (snapshot saat connect & tiap perubahan)
 *        · message (satu pesan baru) · ping (keep-alive).
 *
 * Token tidak pernah keluar dari server — hanya magicLink yang memang
 * ditampilkan di panel kotak masuk kepada pemilik cookie.
 */
export async function GET(req: Request) {
  const address = addressFromCookie(cookieValue(req, INBOX_COOKIE));
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      // Deklarasi lebih dulu supaya close() aman dipanggil kapan pun (hindari TDZ).
      let tick: ReturnType<typeof setInterval> | undefined;
      let beat: ReturnType<typeof setInterval> | undefined;
      let lifespan: ReturnType<typeof setTimeout> | undefined;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const comment = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ${text}\n\n`));
        } catch {
          closed = true;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (tick) clearInterval(tick);
        if (beat) clearInterval(beat);
        if (lifespan) clearTimeout(lifespan);
        try {
          controller.close();
        } catch {
          /* sudah tertutup */
        }
      };

      // Tanpa alamat: beri tahu sekali, lalu tutup.
      if (!address) {
        send('ready', { address: null, connected: false });
        send('inbox', { address: null, messages: [] });
        close();
        return;
      }

      send('ready', { address, connected: true });

      let lastSignature = '';

      const snapshot = async () => {
        if (closed) return;
        let rows;
        try {
          rows = (await listMessages(address)).map(publicMessage);
        } catch {
          return; // lewati tick ini; tick berikutnya mencoba lagi
        }
        const signature = rows.map((m) => m.id).join(',');
        if (signature === lastSignature) return;

        const previous = new Set(lastSignature ? lastSignature.split(',') : []);
        const fresh = rows.filter((m) => !previous.has(m.id));
        lastSignature = signature;

        send('inbox', { address, messages: rows, count: rows.length });
        for (const m of fresh) send('message', m);
      };

      tick = setInterval(() => {
        void snapshot();
      }, TICK_MS);

      beat = setInterval(() => comment('keep-alive'), HEARTBEAT_MS);
      lifespan = setTimeout(close, MAX_STREAM_MS);
      req.signal?.addEventListener('abort', close);

      // Snapshot pertama setelah interval siap.
      void snapshot();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Matikan buffering pada reverse proxy (nginx dsb).
      'X-Accel-Buffering': 'no',
    },
  });
}
