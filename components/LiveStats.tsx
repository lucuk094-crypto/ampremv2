'use client';

import { useEffect, useState } from 'react';
import { Icon } from './icons';

type Stats = {
  status: string;
  uptimeDays: number;
  storage: 'redis' | 'memory';
  engines: number;
  serverTime: string;
  recent: {
    orderId: string;
    plan: string;
    planName: string;
    emailMasked: string;
    issuedAt: number;
    keyTail: string;
  }[];
};

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pulse, setPulse] = useState(false);
  const [fail, setFail] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(String(res.status));
        const data: Stats = await res.json();
        if (!alive) return;
        setStats(data);
        setFail(false);
        setPulse(true);
        setTimeout(() => setPulse(false), 700);
      } catch {
        if (alive) setFail(true);
      }
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const fmt = (ts: number) =>
    new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr] [&>*]:min-w-0">
      {/* status panel */}
      <div className="brutal min-w-0 overflow-hidden bg-ink p-5 text-paper">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-lime">Status server</p>
          <span
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              fail ? 'bg-[#FF5C5C]' : pulse ? 'animate-ping bg-lime' : 'bg-lime'
            }`}
          />
        </div>

        <p className={`display mt-3 break-words text-[26px] leading-none sm:text-4xl ${fail ? 'text-[#FF9A9A]' : 'text-lime'}`}>
          {fail ? 'TERPUTUS' : stats ? 'OPERASIONAL' : 'MEMUAT…'}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-[3px] bg-white/15">
          {[
            ['UPTIME', stats ? `${stats.uptimeDays} hari` : '—'],
            ['ENGINE', stats ? `${stats.engines} tier` : '—'],
            ['STORAGE', stats ? (stats.storage === 'redis' ? 'REDIS' : 'MEMORI') : '—'],
            ['SERVER TIME', stats ? fmt(Date.parse(stats.serverTime)) : '—'],
          ].map(([k, v]) => (
            <div key={k} className="bg-ink px-3 py-2.5">
              <dt className="font-mono text-[9px] uppercase tracking-widest text-paper/40">{k}</dt>
              <dd className="truncate font-mono text-sm font-black">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 font-mono text-[10px] leading-relaxed text-paper/40">
          Polling otomatis tiap 15 detik. Endpoint: <span className="text-paper/70">/api/stats</span>
        </p>
      </div>

      {/* recent feed */}
      <div className="brutal min-w-0 overflow-hidden bg-white">
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-sun px-4 py-2.5">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em]">Aktivasi terakhir</p>
          <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-ink" /> live
          </span>
        </div>

        <ul className="divide-y-[3px] divide-ink/10">
          {!stats?.recent?.length && (
            <li className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-widest text-ink/40">
              belum ada aktivasi
            </li>
          )}
          {stats?.recent?.map((r) => (
            <li key={`${r.orderId}-${r.issuedAt}`} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink bg-lime">
                <Icon.check className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] font-bold">
                  {r.emailMasked} <span className="text-ink/40">·</span> {r.orderId}
                </p>
                <p className="truncate font-mono text-[9px] uppercase tracking-widest text-ink/45">
                  {r.planName} · kunci ••••{r.keyTail}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-bold text-ink/50">{fmt(r.issuedAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
