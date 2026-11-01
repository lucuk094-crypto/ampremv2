import { Icon } from './icons';
import { Maskot } from './Mascot';
import { BRAND } from '@/lib/plans';

type Variant = 'headline' | 'split' | 'banner';

export function resolveVariant(forced?: string): Variant {
  const v = (forced || process.env.NEXT_PUBLIC_HERO_VARIANT || 'split').toLowerCase();
  return v === 'headline' || v === 'banner' || v === 'split' ? (v as Variant) : 'split';
}

/* ───────────────────────── blueprint: cert card ───────────────────────── */
function CertCard() {
  return (
    <div className="relative">
      <div className="absolute inset-0 translate-x-2 translate-y-2 border-[3px] border-ink bg-sun" aria-hidden />
      <div className="relative border-[3px] border-ink bg-ink p-1">
        <div className="border-[3px] border-lime/30 bg-ink p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] font-black uppercase tracking-[0.25em] text-lime">lisensi vip pro</p>
              <p className="display mt-1 text-3xl text-paper sm:text-4xl">365 HARI</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center border-[3px] border-lime bg-lime">
              <Icon.shield className="h-5 w-5 text-ink" />
            </span>
          </div>

          <div className="mt-5 space-y-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-paper/35">kunci lisensi</p>
            <p className="break-all border-[3px] border-lime/40 bg-lime/10 px-3 py-3 text-center font-mono text-sm font-black tracking-[0.12em] text-lime sm:text-base">
              AMP-9K2M-7XQ4-WB3N-TR8Y
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-[3px] bg-paper/10">
            {[
              ['STATUS', 'AKTIF'],
              ['ORDER', 'AM-20260101-A1B2C3'],
              ['DITERBITKAN', '01/01/2026'],
              ['KADALUARSA', '01/01/2027'],
            ].map(([k, v]) => (
              <div key={k} className="bg-ink px-3 py-2">
                <dt className="font-mono text-[8px] uppercase tracking-widest text-paper/35">{k}</dt>
                <dd className="truncate font-mono text-[10px] font-bold text-paper/85">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex items-center justify-between border-t-2 border-dashed border-paper/15 pt-3">
            <span className="font-mono text-[9px] uppercase tracking-widest text-paper/35">{BRAND.dev.toLowerCase()}</span>
            <span className="flex items-center gap-1 font-mono text-[9px] font-black uppercase tracking-widest text-lime">
              <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime" /> verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chips() {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="chip bg-lime">
        <span className="h-1.5 w-1.5 animate-blink rounded-full bg-ink" /> server aktif
      </span>
      <span className="chip bg-white">4-tier engine</span>
      <span className="chip bg-sun">real-time</span>
    </div>
  );
}

function Cta({ center = false }: { center?: boolean }) {
  return (
    <div className={`mt-8 flex flex-col gap-3 sm:flex-row ${center ? 'sm:justify-center' : ''}`}>
      <a href="#toolkit" className="btn-lime px-7 py-4 text-sm">
        <Icon.bolt className="h-4 w-4" /> MULAI AKTIVASI
      </a>
      <a href="#cek" className="btn-ghost px-7 py-4 text-sm">
        <Icon.key className="h-4 w-4" /> CEK LISENSI
      </a>
    </div>
  );
}

/* ───────────────────────── HERO ───────────────────────── */
export function Hero({ forceVariant }: { forceVariant?: Variant } = {}) {
  const v = resolveVariant(forceVariant);

  if (v === 'banner') {
    return (
      <section id="top" className="relative overflow-hidden border-b-[3px] border-ink">
        <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
          <div className="absolute -right-24 top-1/2 hidden h-72 w-72 -translate-y-1/2 rotate-12 border-[3px] border-ink/15 bg-lime/20 sm:block" />
          <div className="absolute -left-10 bottom-0 hidden h-32 w-32 border-[3px] border-ink/15 bg-sun/40 lg:block" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-20">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 translate-x-2 translate-y-2 border-[3px] border-ink bg-sun" aria-hidden />
              <div className="relative flex items-center gap-3 border-[3px] border-ink bg-white px-4 py-3">
                <Maskot size={44} animated />
                <div className="text-left">
                  <p className="display text-lg leading-none">{BRAND.shortName}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink/50">{BRAND.dev}</p>
                </div>
              </div>
            </div>
          </div>

          <h1 className="display mx-auto mt-8 max-w-4xl text-[14vw] leading-[0.85] sm:text-7xl lg:text-8xl">
            AKTIVASI
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">TANPA</span>
              <span className="absolute bottom-1 left-0 z-0 h-[30%] w-full bg-sun" aria-hidden />
            </span>{' '}
            RIBET<span className="text-lime-dark">.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-ink/70">{BRAND.subline}</p>
          <div className="flex justify-center">
            <Cta center />
          </div>

          <dl className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-[3px] border-[3px] border-ink bg-ink">
            {[
              ['03', 'LANGKAH'],
              ['15', 'MENIT LINK'],
              ['365', 'HARI VIP'],
            ].map(([n, k]) => (
              <div key={k} className="bg-white px-3 py-3">
                <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/45">{k}</dt>
                <dd className="display text-2xl leading-none">{n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    );
  }

  if (v === 'headline') {
    return (
      <section id="top" className="relative overflow-hidden border-b-[3px] border-ink">
        <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
          <div className="absolute -right-20 -top-20 hidden h-64 w-64 rotate-12 border-[3px] border-ink/15 bg-lime/25 sm:block" />
          <div className="absolute bottom-8 right-1/4 hidden h-24 w-24 border-[3px] border-ink/15 bg-sun/40 lg:block" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
          <Chips />
          <h1 className="display text-[15vw] leading-[0.82] sm:text-7xl lg:text-8xl xl:text-9xl">
            AKTIVASI
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">TANPA</span>
              <span className="absolute bottom-1 left-0 z-0 h-[30%] w-full bg-sun" aria-hidden />
            </span>
            <br />
            <span className="flex items-center gap-3">
              <span>
                RIBET<span className="text-lime-dark">.</span>
              </span>
              <span className="flex h-[0.62em] w-[0.62em] shrink-0 items-center justify-center border-[3px] border-ink bg-white">
                <Maskot size={40} className="h-[78%] w-[78%]" animated />
              </span>
            </span>
          </h1>

          <div className="mt-8 grid gap-6 sm:grid-cols-[1.2fr_.8fr] sm:items-end">
            <p className="max-w-md text-[15px] leading-relaxed text-ink/70">
              <b className="font-black text-ink">{BRAND.name}</b> {BRAND.subline}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="#toolkit" className="btn-lime flex-1 px-6 py-4 text-sm">
                <Icon.bolt className="h-4 w-4" /> MULAI
              </a>
              <a href="#cek" className="btn-ghost flex-1 px-6 py-4 text-sm">
                <Icon.key className="h-4 w-4" /> CEK
              </a>
            </div>
          </div>

          <dl className="mt-10 grid w-full max-w-lg grid-cols-3 gap-[3px] border-[3px] border-ink bg-ink">
            {[
              ['03', 'LANGKAH'],
              ['15', 'MENIT LINK'],
              ['365', 'HARI VIP'],
            ].map(([n, k]) => (
              <div key={k} className="bg-white px-3 py-3">
                <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/45">{k}</dt>
                <dd className="display text-2xl leading-none">{n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    );
  }

  /* split (default) */
  return (
    <section id="top" className="relative overflow-hidden border-b-[3px] border-ink">
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
        <div className="absolute -right-16 -top-16 hidden h-56 w-56 rotate-12 border-[3px] border-ink/15 bg-lime/25 sm:block" />
        <div className="absolute bottom-10 right-1/3 hidden h-24 w-24 border-[3px] border-ink/15 bg-sun/40 lg:block" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <div className="animate-riseIn">
            <Chips />
            <h1 className="display text-[13vw] leading-[0.85] sm:text-6xl lg:text-7xl xl:text-8xl">
              AKTIVASI
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">TANPA</span>
                <span className="absolute bottom-1 left-0 z-0 h-[30%] w-full bg-sun" aria-hidden />
              </span>
              <br />
              RIBET<span className="text-lime-dark">.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink/70 sm:text-base">
              <b className="font-black text-ink">{BRAND.name}</b> {BRAND.subline}
            </p>

            <Cta />

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-[3px] border-[3px] border-ink bg-ink">
              {[
                ['03', 'LANGKAH'],
                ['15', 'MENIT LINK'],
                ['365', 'HARI VIP'],
              ].map(([n, k]) => (
                <div key={k} className="bg-white px-3 py-3">
                  <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/45">{k}</dt>
                  <dd className="display text-2xl leading-none">{n}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative animate-riseIn [animation-delay:120ms]">
            <div className="mb-3 hidden justify-end sm:flex">
              <div className="flex items-center gap-2 border-[3px] border-ink bg-white px-3 py-2 shadow-[4px_4px_0_0_#0A0A0A]">
                <Maskot size={26} animated />
                <span className="font-mono text-[9px] font-black uppercase leading-tight tracking-widest">
                  {BRAND.dev}
                </span>
              </div>
            </div>
            <CertCard />
          </div>
        </div>
      </div>
    </section>
  );
}
