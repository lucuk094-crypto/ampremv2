'use client';

import { useState } from 'react';
import { CopyButton } from './ui';
import { Icon } from './icons';

type Rec = {
  licenseKey: string;
  orderId: string;
  planName: string;
  status: string;
  active: boolean;
  issuedAt: number;
  expiresAt: number;
  remainingDays: number;
  emailMasked: string;
  checksum: string;
};

export function LicenseChecker({ compact = false }: { compact?: boolean }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<Rec | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const check = async () => {
    const val = q.trim();
    setErr(null);
    setRec(null);
    if (!val) return setErr('Masukkan kunci lisensi atau order ID.');
    setBusy(true);
    try {
      const param = /^AMP-/i.test(val) ? `key=${encodeURIComponent(val)}` : `order=${encodeURIComponent(val)}`;
      const res = await fetch(`/api/license?${param}`, { cache: 'no-store', signal: AbortSignal.timeout(12_000) });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErr(data.message || `Gagal memeriksa (HTTP ${res.status}).`);
        return;
      }
      setRec(data);
    } catch {
      setErr('Tidak dapat menghubungi server.');
    } finally {
      setBusy(false);
    }
  };

  const pct = rec
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round((1 - (rec.expiresAt - Date.now()) / Math.max(1, rec.expiresAt - rec.issuedAt)) * 100)
        )
      )
    : 0;

  return (
    <div className={compact ? '' : 'brutal bg-white p-5 sm:p-7'}>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center border-[3px] border-ink bg-sun">
          <Icon.key className="h-4 w-4" />
        </span>
        <div>
          <h3 className="display text-lg leading-none">CEK LISENSI</h3>
          <p className="font-mono text-[9px] uppercase tracking-widest text-ink/50">kunci atau order id</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && !busy && check()}
          placeholder="AMP-XXXX-XXXX-XXXX-XXXX"
          className="field flex-1 uppercase tracking-wider"
          spellCheck={false}
          aria-label="Kunci lisensi atau order ID"
        />
        <button type="button" onClick={check} disabled={busy} className="btn-ink shrink-0 px-6">
          {busy ? 'CEK…' : 'CEK'}
        </button>
      </div>

      {err && (
        <p role="alert" className="animate-slideDown mt-3 border-[3px] border-ink bg-[#FFE1E1] px-3 py-2 font-mono text-[11px] text-[#C40000]">
          ✕ {err}
        </p>
      )}

      {rec && (
        <div className="animate-riseIn mt-4 border-[3px] border-ink">
          <div className={`flex items-center justify-between px-3 py-2 ${rec.active ? 'bg-lime' : 'bg-[#FFE1E1]'}`}>
            <span className="font-mono text-[10px] font-black uppercase tracking-widest">
              {rec.active ? '✓ LISENSI AKTIF' : '✕ TIDAK AKTIF'}
            </span>
            <CopyButton value={rec.licenseKey} label="SALIN" className="bg-white" />
          </div>
          <div className="bg-white px-3 py-3">
            <p className="select-all break-all font-mono text-sm font-black tracking-wider">{rec.licenseKey}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {[
                ['Plan', rec.planName],
                ['Order', rec.orderId],
                ['Sisa hari', `${rec.remainingDays}`],
                ['Kadaluarsa', new Date(rec.expiresAt).toLocaleDateString('id-ID')],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/45">{k}</dt>
                  <dd className="truncate font-mono text-[11px] font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <a
              href={`/invoice?key=${encodeURIComponent(rec.licenseKey)}`}
              className="btn-sun mt-3 w-full py-2.5 text-[10px]"
            >
              <Icon.down className="h-3.5 w-3.5" /> LIHAT INVOICE
            </a>
            <div className="mt-3">
              <div className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-widest text-ink/45">
                <span>masa aktif terpakai</span>
                <span>{pct}%</span>
              </div>
              <div className="h-3 border-[3px] border-ink bg-white">
                <div className="h-full bg-lime transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
