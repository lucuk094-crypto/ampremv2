import { Icon } from './icons';

const STEPS = [
  {
    n: '01',
    title: 'KIRIM LINK',
    icon: Icon.mail,
    body: 'Masukkan email tujuan. Server menandatangani token HMAC berumur 15 menit dan mengirimkannya — atau menampilkannya langsung dalam outbox mode.',
    meta: 'POST /api/send-link',
    tone: 'bg-white',
  },
  {
    n: '02',
    title: 'VERIFIKASI',
    icon: Icon.shield,
    body: 'Tempel cookie sesi dan magic link yang kamu terima. Server mengunci email, memeriksa tanda tangan, dan memastikan token belum pernah dipakai.',
    meta: 'POST /api/verify-link',
    tone: 'bg-lime',
  },
  {
    n: '03',
    title: 'LISENSI TERBIT',
    icon: Icon.key,
    body: 'Kunci lisensi, order ID, checksum, dan tanggal kadaluarsa langsung muncul. Unduh sertifikatnya, lalu cek kapan saja di halaman Cek Lisensi.',
    meta: 'GET /api/license',
    tone: 'bg-sun',
  },
];

export function Steps() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {STEPS.map((s) => {
        const IconCmp = s.icon;
        return (
          <article
            key={s.n}
            className={`brutal press group relative overflow-hidden ${s.tone}`}
          >
            <span
              className="pointer-events-none absolute -right-3 -top-6 select-none font-mono text-8xl font-black text-ink/10"
              aria-hidden
            >
              {s.n}
            </span>
            <div className="relative p-5">
              <span className="flex h-11 w-11 items-center justify-center border-[3px] border-ink bg-ink text-paper transition-transform group-hover:-rotate-6">
                <IconCmp className="h-5 w-5" />
              </span>
              <h3 className="display mt-4 text-xl">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink/70">{s.body}</p>
              <p className="mt-4 inline-block border-2 border-ink bg-white px-2 py-1 font-mono text-[9px] font-black uppercase tracking-widest">
                {s.meta}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

const FEATURES = [
  {
    icon: Icon.bolt,
    title: 'TANPA RELOAD',
    body: 'Seluruh alur berjalan dalam satu halaman. Status, terminal, dan hasil terbit tanpa memuat ulang.',
  },
  {
    icon: Icon.shield,
    title: 'TOKEN TERTANDATANGAN',
    body: 'HMAC-SHA256 dengan perbandingan waktu-konstan. Token sekali pakai, kedaluwarsa 15 menit.',
  },
  {
    icon: Icon.key,
    title: 'KUNCI ACAK AMAN',
    body: 'Dibuat dengan CSPRNG, dilengkapi checksum dan catatan server. Tidak bisa ditebak atau dipalsukan.',
  },
  {
    icon: Icon.clock,
    title: 'RATE LIMIT',
    body: 'Batas per email dan per jaringan mencegah penyalahgunaan, dengan respons HTTP 429 yang jelas.',
  },
];

export function Features() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((f) => {
        const IconCmp = f.icon;
        return (
          <div key={f.title} className="brutal press bg-white p-5">
            <IconCmp className="h-6 w-6" />
            <h3 className="mt-3 font-mono text-[11px] font-black uppercase tracking-[0.15em]">{f.title}</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-ink/65">{f.body}</p>
          </div>
        );
      })}
    </div>
  );
}

export function SectionHead({
  kicker,
  title,
  desc,
  align = 'left',
}: {
  kicker: string;
  title: React.ReactNode;
  desc?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={`mb-8 ${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}`}>
      <span className="chip mb-3 bg-ink text-paper">{kicker}</span>
      <h2 className="display text-4xl leading-[0.9] sm:text-5xl">{title}</h2>
      {desc && <p className="mt-4 text-[14px] leading-relaxed text-ink/65 sm:text-[15px]">{desc}</p>}
    </div>
  );
}
