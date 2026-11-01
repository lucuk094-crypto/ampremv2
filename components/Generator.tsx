'use client';

import { useState } from 'react';
import { PLAN_LIST, type PlanId } from '@/lib/plans';
import { CopyButton } from './ui';
import { Icon } from './icons';

type Issued = {
  orderId: string;
  licenseKey: string;
  planName: string;
  durationDays: number;
  expiresAt: number;
  checksum: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function Generator({ adminKey }: { adminKey: string }) {
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<PlanId>('pro');
  const [count, setCount] = useState(1);
  const [prefix, setPrefix] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<Issued[] | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setIssued(null);
    const addr = email.trim().toLowerCase();
    if (!EMAIL_RE.test(addr)) {
      setError('Email tidak valid.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ email: addr, plan, count, prefix }),
        signal: AbortSignal.timeout(25_000),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || `Gagal (HTTP ${res.status}).`);
        return;
      }
      setIssued(json.licenses);
      setFlash(json.message);
      setTimeout(() => setFlash(null), 5000);
    } catch {
      setError('Tidak dapat menghubungi server.');
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = () => {
    if (!issued?.length) return;
    const head = 'order_id,license_key,plan,duration_days,expires_at,checksum';
    const rows = issued.map((l) =>
      [l.orderId, l.licenseKey, l.planName, l.durationDays, new Date(l.expiresAt).toISOString(), l.checksum].join(',')
    );
    const blob = new Blob([[head, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AM-PremID-batch-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAll = () => {
    if (!issued?.length) return;
    navigator.clipboard?.writeText(issued.map((l) => `${l.orderId}\t${l.licenseKey}`).join('\n'));
  };

  return (
    <div className="space-y-5">
      <div className="border-[3px] border-ink bg-sun px-4 py-2.5">
        <p className="font-mono text-[10px] font-black uppercase tracking-widest">
          ⚠ mode generator · khusus admin
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink/75">
          Menerbitkan lisensi <b>tanpa alur verifikasi email</b>. Pakai hanya untuk lisensi yang kamu terbitkan
          sendiri (distribusi manual, hadiah, atau pengganti lisensi rusak).
        </p>
      </div>

      {/* form */}
      <div className="brutal bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="gen-email" className="label">
              <span className="inline-flex items-center gap-1.5">
                <Icon.mail className="h-3.5 w-3.5" /> Email pemilik lisensi *
              </span>
            </label>
            <input
              id="gen-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pembeli@email.com"
              className="field"
              disabled={busy}
            />
          </div>

          <div>
            <label htmlFor="gen-count" className="label">
              Jumlah (1–5)
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  disabled={busy}
                  aria-pressed={count === n}
                  className={`press flex-1 border-[3px] border-ink py-2.5 font-mono text-sm font-black ${
                    count === n ? 'bg-lime' : 'bg-white hover:bg-paper'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="gen-prefix" className="label">
              Prefiks order <span className="opacity-40">(opsional)</span>
            </label>
            <input
              id="gen-prefix"
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="VAN313"
              maxLength={12}
              className="field uppercase"
              disabled={busy}
              spellCheck={false}
            />
          </div>

          <div className="sm:col-span-2">
            <span className="label">Plan</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {PLAN_LIST.map((p) => {
                const on = p.id === plan;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    disabled={busy}
                    aria-pressed={on}
                    className={`press border-[3px] border-ink p-2.5 text-left ${
                      on ? (p.accent === 'lime' ? 'bg-lime' : p.accent === 'sun' ? 'bg-sun' : 'bg-paper') : 'bg-white hover:bg-paper'
                    }`}
                  >
                    <span className="block font-mono text-[9px] font-black uppercase tracking-widest opacity-60">
                      {p.badge}
                    </span>
                    <span className="display block text-base">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="animate-slideDown mt-4 border-[3px] border-ink bg-[#FFE1E1] px-3 py-2 font-mono text-[11px] text-[#C40000]">
            ✕ {error}
          </p>
        )}
        {flash && (
          <p className="animate-slideDown mt-4 border-[3px] border-ink bg-lime px-3 py-2 font-mono text-[11px] font-bold">
            ✓ {flash}
          </p>
        )}

        <button type="button" onClick={run} disabled={busy} className="btn-ink mt-4 w-full py-3.5 text-sm">
          {busy ? <span className="animate-blink">MENERBITKAN…</span> : <><Icon.bolt className="h-4 w-4" /> TERBITKAN {count} LISENSI</>}
        </button>
      </div>

      {/* hasil */}
      {issued?.length ? (
        <div className="brutal overflow-hidden bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-ink px-4 py-2.5">
            <p className="font-mono text-[10px] font-black uppercase tracking-widest text-lime">
              hasil · {issued.length} lisensi
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyAll} className="chip press bg-lime">
                ⧉ SALIN SEMUA
              </button>
              <button type="button" onClick={downloadCsv} className="chip press bg-sun">
                ↓ CSV
              </button>
            </div>
          </div>

          <ul className="divide-y-[3px] divide-ink/10">
            {issued.map((l, i) => (
              <li key={l.licenseKey} className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/40">
                    #{String(i + 1).padStart(2, '0')} · {l.planName}
                  </span>
                  <CopyButton value={l.licenseKey} label="SALIN" />
                </div>
                <p className="mt-1 select-all break-all font-mono text-sm font-black tracking-wider">
                  {l.licenseKey}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-ink/50">
                  <span>{l.orderId}</span>
                  <span>· s.d. {new Date(l.expiresAt).toLocaleDateString('id-ID')}</span>
                  <span>· {l.durationDays} hari</span>
                  <a
                    href={`/invoice?key=${encodeURIComponent(l.licenseKey)}`}
                    className="font-black text-ink underline decoration-2 underline-offset-2 hover:text-lime-dark"
                  >
                    invoice →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
