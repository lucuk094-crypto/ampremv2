import Link from 'next/link';
import { Nav, Footer } from '@/components/chrome';
import { Icon } from '@/components/icons';

export const metadata = {
  title: 'Dokumentasi API — AM Prem.ID',
  description: 'Referensi endpoint aktivasi AM Prem.ID: send-link, verify-link, license, stats.',
};

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/send-link',
    desc: 'Menandatangani magic link berumur 15 menit untuk email tujuan.',
    body: `{
  "email": "kamu@domain.com",
  "plan": "pro"          // trial | pro | studio
}`,
    res: `{
  "success": true,
  "ok": true,
  "step": 1,
  "requestId": "req_9f2c…",
  "emailMasked": "ka**@domain.com",
  "planName": "VIP PRO",
  "expiresIn": 900,
  "delivery": "outbox",
  "magicLink": "https://…/verify?token=…"
}`,
    tone: 'bg-lime',
  },
  {
    method: 'POST',
    path: '/api/verify-link',
    desc: 'Memvalidasi tanda tangan token, memastikan belum terpakai, lalu menerbitkan lisensi.',
    body: `{
  "email": "kamu@domain.com",
  "cookie": "sesi-dari-langkah-01",
  "magicLink": "https://…/verify?token=…",
  "customOrderId": "",   // opsional
  "plan": "pro"
}`,
    res: `{
  "success": true,
  "ok": true,
  "authenticated": true,
  "premiumActive": true,
  "orderId": "AM-20261101-A1B2C3",
  "licenseKey": "AMP-9K2M-7XQ4-WB3N-TR8Y",
  "planName": "VIP PRO",
  "durationDays": 365,
  "remainingDays": 365,
  "expiresAt": 1793…,
  "checksum": "A1B2C3D4"
}`,
    tone: 'bg-sun',
  },
  {
    method: 'GET',
    path: '/api/license?key=AMP-…',
    desc: 'Memeriksa lisensi lewat kunci atau order ID. Mengembalikan status dan sisa hari.',
    body: null,
    res: `{
  "success": true,
  "licenseKey": "AMP-…",
  "status": "ACTIVE",
  "active": true,
  "remainingDays": 365,
  "checksum": "A1B2C3D4"
}`,
    tone: 'bg-white',
  },
  {
    method: 'GET',
    path: '/api/stats',
    desc: 'Statistik server dan feed aktivasi terakhir untuk dashboard real-time.',
    body: null,
    res: `{
  "status": "OPERATIONAL",
  "uptimeDays": 0,
  "storage": "memory",
  "engines": 4,
  "recent": [ … ]
}`,
    tone: 'bg-white',
  },
];

const ERRORS: [string, string][] = [
  ['400', 'Body bukan JSON valid, atau field wajib kosong.'],
  ['409', 'Email tidak cocok dengan token, atau token sudah dipakai.'],
  ['410', 'Magic link kedaluwarsa (lebih dari 15 menit).'],
  ['422', 'Format magic link tidak dikenali / tanda tangan tidak cocok.'],
  ['429', 'Rate limit tercapai — coba lagi nanti.'],
  ['503', 'ADMIN_KEY belum dikonfigurasi di server.'],
];

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto border-[3px] border-ink bg-ink px-4 py-3 font-mono text-[11px] leading-relaxed text-paper/90">
      <code>{children}</code>
    </pre>
  );
}

export default function Docs() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <span className="chip mb-4 bg-ink text-paper">referensi</span>
        <h1 className="display text-4xl leading-[0.9] sm:text-6xl">
          DOKUMENTASI
          <br />
          API<span className="text-lime-dark">.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-ink/70">
          Empat endpoint, semua menerima dan mengembalikan JSON. Tidak ada autentikasi untuk endpoint publik — batasnya
          dijaga oleh rate limit per email dan per jaringan.
        </p>

        <div className="mt-10 space-y-6">
          {ENDPOINTS.map((e) => (
            <article key={e.path} className={`border-[3px] border-ink ${e.tone}`} style={{ boxShadow: '6px 6px 0 0 #0A0A0A' }}>
              <div className="flex flex-wrap items-center gap-2 border-b-[3px] border-ink bg-ink px-4 py-2.5">
                <span className="chip bg-lime text-ink">{e.method}</span>
                <code className="font-mono text-[12px] font-bold text-paper">{e.path}</code>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-[13px] leading-relaxed text-ink/75">{e.desc}</p>
                {e.body && (
                  <>
                    <p className="mb-2 mt-4 font-mono text-[9px] font-black uppercase tracking-widest text-ink/50">
                      request body
                    </p>
                    <Code>{e.body}</Code>
                  </>
                )}
                <p className="mb-2 mt-4 font-mono text-[9px] font-black uppercase tracking-widest text-ink/50">
                  response 200
                </p>
                <Code>{e.res}</Code>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="display text-2xl">KODE ERROR</h2>
          <dl className="mt-4 divide-y-[3px] divide-ink border-[3px] border-ink bg-white">
            {ERRORS.map(([code, desc]) => (
              <div key={code} className="flex items-start gap-4 px-4 py-3">
                <dt className="w-12 shrink-0 font-mono text-sm font-black text-[#C40000]">{code}</dt>
                <dd className="text-[13px] text-ink/75">{desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12">
          <h2 className="display text-2xl">CONTOH CURL</h2>
          <div className="mt-4">
            <Code>{`curl -X POST https://am-prem-id.vercel.app/api/send-link \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"kamu@domain.com","plan":"pro"}'`}</Code>
          </div>
        </section>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link href="/#toolkit" className="btn-lime px-6 py-3 text-[11px]">
            <Icon.bolt className="h-4 w-4" /> Buka konsol
          </Link>
          <Link href="/#cek" className="btn-ghost px-6 py-3 text-[11px]">
            <Icon.key className="h-4 w-4" /> Cek lisensi
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
