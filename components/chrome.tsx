'use client';

import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { Maskot } from './Mascot';
import { BRAND } from '@/lib/plans';

/* ─────────────────────────── NAV ─────────────────────────── */
const LINKS = [
  { href: '#toolkit', label: 'Toolkit' },
  { href: '#status', label: 'Status' },
  { href: '#plans', label: 'Plan' },
  { href: '#cek', label: 'Cek Lisensi' },
  { href: '#faq', label: 'FAQ' },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b-[3px] border-ink transition-shadow ${
        solid ? 'bg-paper/95 shadow-[0_4px_0_0_rgba(10,10,10,.12)] backdrop-blur-sm' : 'bg-paper'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="#top" className="group flex items-center gap-2.5" aria-label="AM Prem.ID — beranda">
          <span className="flex h-9 w-9 items-center justify-center border-[3px] border-ink bg-white transition-transform group-hover:-rotate-6">
            <Maskot size={26} />
          </span>
          <span className="display text-lg leading-none sm:text-xl">
            {BRAND.shortName.split('.').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className={i === 0 ? 'text-ink/30' : 'text-lime-dark'}>.</span>}
              </span>
            ))}
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="border-2 border-transparent px-3 py-2 font-mono text-[11px] font-black uppercase tracking-widest transition-all hover:border-ink hover:bg-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href="#toolkit" className="btn-lime hidden px-4 py-2.5 text-[11px] sm:inline-flex">
            MULAI
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            className="press flex h-10 w-10 items-center justify-center border-[3px] border-ink bg-white lg:hidden"
            style={{ boxShadow: '3px 3px 0 0 #0A0A0A' }}
          >
            {open ? <Icon.x className="h-4 w-4" /> : <span className="space-y-[3px]"><span className="block h-[3px] w-5 bg-ink" /><span className="block h-[3px] w-5 bg-ink" /><span className="block h-[3px] w-5 bg-ink" /></span>}
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-slideDown border-t-[3px] border-ink bg-white lg:hidden">
          <nav className="mx-auto max-w-7xl px-4 py-3" aria-label="Navigasi mobile">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b-2 border-ink/10 py-3 font-mono text-xs font-black uppercase tracking-widest"
              >
                {l.label} <Icon.arrow className="h-3.5 w-3.5" />
              </a>
            ))}
            <a href="#toolkit" onClick={() => setOpen(false)} className="btn-lime mt-3 w-full py-3">
              MULAI AKTIVASI
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ─────────────────────────── MARQUEE ─────────────────────────── */
export function Marquee({
  items,
  tone = 'sun',
}: {
  items: string[];
  tone?: 'sun' | 'ink' | 'lime';
}) {
  const bg = tone === 'sun' ? 'bg-sun' : tone === 'lime' ? 'bg-lime' : 'bg-ink';
  const fg = tone === 'ink' ? 'text-paper' : 'text-ink';
  return (
    <div className={`marquee-wrap overflow-hidden border-y-[3px] border-ink ${bg} ${fg}`} aria-hidden>
      <div className="marquee-track py-2.5">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex shrink-0 items-center">
            {items.map((t, i) => (
              <span key={`${dup}-${i}`} className="flex items-center">
                <span className="whitespace-nowrap px-4 font-mono text-[11px] font-black uppercase tracking-[0.2em]">
                  {t}
                </span>
                <span className={tone === 'ink' ? 'text-lime' : 'text-ink'}>✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── FAQ ─────────────────────────── */
const QA = [
  {
    q: 'Berapa lama masa berlaku magic link?',
    a: 'Magic link bertanda tangan HMAC dan berlaku 15 menit sejak diterbitkan. Setelah dipakai sekali, link otomatis hangus. Jika kadaluarsa, klik "Minta Link Baru" di Langkah 02.',
  },
  {
    q: 'Apakah kunci lisensi bisa dipalsukan?',
    a: 'Tidak. Setiap kunci dibuat dengan CSPRNG (crypto.randomInt) dan dipasangkan dengan checksum serta catatan server. Validasi hanya lewat /api/license — kunci buatan sendiri tidak akan ditemukan.',
  },
  {
    q: 'Kenapa cookie wajib diisi?',
    a: 'Alur verifikasi memerlukan penanda sesi agar email dan magic link terikat ke satu permintaan. Cookie diperlakukan sebagai kredensial: tidak pernah dicatat ke log dan tidak pernah ditampilkan kembali di UI.',
  },
  {
    q: 'Apa itu custom order ID?',
    a: 'Label pesanan milikmu sendiri agar mudah dicari. Kosongkan untuk dibuat otomatis dengan format AM-YYYYMMDD-XXXXXX. Panjang maksimal 40 karakter dan hanya dipakai sebagai identifier internal.',
  },
  {
    q: 'Berapa batas pemakaian?',
    a: '8 permintaan magic link per jam per email, 30 per jam per jaringan, dan 20 verifikasi per jam per email. Melewati batas akan mendapat respons HTTP 429.',
  },
  {
    q: 'Di mana data disimpan?',
    a: 'Bila UPSTASH_REDIS_REST_URL diisi, data tersimpan di Redis dan tahan cold start. Tanpa itu, data disimpan di memori proses dan bersifat sementara — cukup untuk demo dan pengembangan.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y-[3px] divide-ink border-[3px] border-ink bg-white">
      {QA.map((item, i) => {
        const on = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(on ? null : i)}
              aria-expanded={on}
              className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors ${on ? 'bg-lime-soft' : 'hover:bg-paper'}`}
            >
              <span className="shrink-0 font-mono text-[10px] font-black text-ink/40">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 font-mono text-[12px] font-black uppercase leading-snug tracking-wide">
                {item.q}
              </span>
              <span className={`shrink-0 text-lg leading-none transition-transform ${on ? 'rotate-45' : ''}`}>+</span>
            </button>
            {on && (
              <p className="animate-slideDown border-t-2 border-dashed border-ink/20 px-4 py-4 text-[13px] leading-relaxed text-ink/75">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── FOOTER ─────────────────────────── */
export function Footer() {
  return (
    <footer className="border-t-[3px] border-ink bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center border-[3px] border-lime bg-white">
                <Maskot size={28} />
              </span>
              <span className="display text-2xl text-paper">
                {BRAND.shortName.replace(/\.ID$/, '')}
                <span className="text-lime">.ID</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/55">
              All-in-One Activation Toolkit. Alur tiga langkah, penerbitan lisensi instan, dan status server
              real-time dalam satu konsol.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip border-lime/40 bg-ink text-lime">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime" /> semua sistem normal
              </span>
              <span className="chip border-white/25 bg-ink text-paper/60">v1.0.0</span>
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-sun">Navigasi</p>
            <ul className="space-y-2">
              {[...LINKS, { href: '/docs', label: 'Dokumentasi' }, { href: '/admin', label: 'Admin' }].map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="font-mono text-[11px] uppercase tracking-widest text-paper/60 transition-colors hover:text-lime"
                  >
                    → {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-sun">Developer</p>
            <p className="display text-xl leading-tight">{BRAND.dev.split('|')[0].trim().toUpperCase()}</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-paper/50">
              {BRAND.dev.includes('|') ? `| ${BRAND.dev.split('|')[1].trim()}` : ''}
            </p>
            <p className="mt-4 font-mono text-[10px] leading-relaxed text-paper/40">
              Dibangun dengan Next.js. Deploy di Vercel.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t-[3px] border-paper/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40">
            © {new Date().getFullYear()} {BRAND.name} — {BRAND.dev}. Semua hak dilindungi.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-paper/40">
            Layanan internal · gunakan hanya untuk aset yang kamu miliki
          </p>
        </div>
      </div>
    </footer>
  );
}
