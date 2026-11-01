import { PLAN_LIST } from '@/lib/plans';
import { Icon } from './icons';

export function Pricing() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_LIST.map((p) => {
        const hot = p.id === 'pro';
        const bg = p.accent === 'lime' ? 'bg-lime' : p.accent === 'sun' ? 'bg-sun' : 'bg-white';
        return (
          <article
            key={p.id}
            className={`relative flex flex-col border-[3px] border-ink ${bg} ${
              hot ? 'md:-translate-y-3' : ''
            }`}
            style={{ boxShadow: hot ? '8px 8px 0 0 #0A0A0A' : '5px 5px 0 0 #0A0A0A' }}
          >
            {hot && (
              <span className="absolute -top-3 left-4 border-[3px] border-ink bg-ink px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-sun">
                paling populer
              </span>
            )}
            <div className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="display text-2xl">{p.name}</h3>
                <span className="chip bg-white">{p.badge}</span>
              </div>
              <p className="mt-3 flex items-end gap-1">
                <span className="display text-3xl">{p.price}</span>
                <span className="pb-1 font-mono text-[10px] uppercase tracking-widest opacity-60">/ aktivasi</span>
              </p>
            </div>

            <ul className="flex-1 space-y-2 border-t-[3px] border-ink p-5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12px] leading-snug">
                  <Icon.check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <a href="#toolkit" className="btn-ink m-5 mt-0 justify-center py-3 text-[11px]">
              PILIH {p.name} <Icon.arrow className="h-3.5 w-3.5" />
            </a>
          </article>
        );
      })}
    </div>
  );
}
