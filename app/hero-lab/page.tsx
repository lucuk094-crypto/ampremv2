import { Hero } from '@/components/Hero';
import { Nav } from '@/components/chrome';

export const metadata = {
  title: 'Hero Lab — AM Prem.ID',
  robots: { index: false, follow: false },
};

const VARIANTS = [
  { id: 'split' as const, label: 'SPLIT', note: 'Headline kiri, kartu sertifikat kanan. Default, paling informatif.' },
  { id: 'headline' as const, label: 'HEADLINE', note: 'Tipografi raksasa satu kolom, maskot menyatu dengan judul.' },
  { id: 'banner' as const, label: 'BANNER', note: 'Tengah simetris, maskot sebagai lencana. Paling bersih di mobile.' },
];

export default function HeroLab() {
  return (
    <>
      <Nav />
      <div className="border-b-[3px] border-ink bg-sun px-4 py-3 text-center">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em]">
          hero lab · pilih varian lalu pasang lewat env NEXT_PUBLIC_HERO_VARIANT
        </p>
      </div>
      {VARIANTS.map((v) => (
        <section key={v.id}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-ink px-4 py-2.5 sm:px-6">
            <p className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-lime">
              varian · {v.label}
            </p>
            <p className="font-mono text-[10px] text-paper/50">
              {v.note} — <span className="text-sun">NEXT_PUBLIC_HERO_VARIANT={v.id}</span>
            </p>
          </div>
          <Hero forceVariant={v.id} />
        </section>
      ))}
    </>
  );
}
