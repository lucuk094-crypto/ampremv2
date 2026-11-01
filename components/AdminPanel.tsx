'use client';

import { useCallback, useEffect, useState } from 'react';
import { CopyButton } from './ui';
import { Icon } from './icons';
import { EmailSettings } from './EmailSettings';
import { Generator } from './Generator';

type Order = {
  orderId: string;
  plan: string;
  planName: string;
  emailMasked: string;
  issuedAt: number;
  keyTail: string;
  status?: 'ACTIVE' | 'REVOKED';
  licenseKey?: string;
};

type Payload = {
  success: boolean;
  message?: string;
  storage: 'redis' | 'memory';
  total: number;
  today: number;
  planBreakdown: { plan: string; name: string; count: number }[];
  orders: Order[];
};

const STORAGE_KEY = 'ampremid_admin_key';

export function AdminPanel() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<'orders' | 'generate' | 'email'>('orders');

  const load = useCallback(
    async (adminKey: string) => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch('/api/admin/orders?limit=200', {
          headers: { 'x-admin-key': adminKey },
          cache: 'no-store',
          signal: AbortSignal.timeout(15_000),
        });
        const json: Payload = await res.json();
        if (!res.ok || !json.success) {
          setErr(json.message || `Gagal memuat (HTTP ${res.status}).`);
          setAuthed(false);
          setData(null);
          return false;
        }
        setData(json);
        setAuthed(true);
        sessionStorage.setItem(STORAGE_KEY, adminKey);
        return true;
      } catch {
        setErr('Tidak dapat menghubungi server.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    []
  );

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      setKey(saved);
      load(saved);
    }
  }, [load]);

  const revoke = async (licenseKey?: string) => {
    if (!licenseKey) return;
    if (!window.confirm(`Cabut lisensi ${licenseKey}? Tindakan ini permanen.`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify({ key: licenseKey, action: 'revoke' }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErr(json.message || 'Gagal mencabut lisensi.');
      } else {
        setFlash(`Lisensi ${licenseKey} dicabut.`);
        setTimeout(() => setFlash(null), 3000);
        await load(key);
      }
    } catch {
      setErr('Tidak dapat menghubungi server.');
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setKey('');
    setAuthed(false);
    setData(null);
  };

  const fmt = (ts: number) => new Date(ts).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  const shown = (data?.orders ?? []).filter((o) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      o.orderId.toLowerCase().includes(q) ||
      o.emailMasked.toLowerCase().includes(q) ||
      o.planName.toLowerCase().includes(q)
    );
  });

  /* ── layar login ── */
  if (!authed) {
    return (
      <div className="brutal mx-auto max-w-md bg-white p-5 sm:p-7">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center border-[3px] border-ink bg-sun">
            <Icon.shield className="h-4 w-4" />
          </span>
          <div>
            <h2 className="display text-xl leading-none">AKSES ADMIN</h2>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/50">butuh admin key</p>
          </div>
        </div>

        <label htmlFor="adminkey" className="label">
          Admin key
        </label>
        <input
          id="adminkey"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && load(key)}
          className="field"
          placeholder="ADMIN_KEY dari environment"
          autoComplete="off"
        />
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-ink/45">
          Diambil dari variabel environment <b>ADMIN_KEY</b>. Jika belum diisi di server, endpoint mengembalikan 503.
        </p>

        {err && (
          <p role="alert" className="animate-slideDown mt-3 border-[3px] border-ink bg-[#FFE1E1] px-3 py-2 font-mono text-[11px] text-[#C40000]">
            ✕ {err}
          </p>
        )}

        <button type="button" onClick={() => load(key)} disabled={busy || !key.trim()} className="btn-ink mt-4 w-full py-3">
          {busy ? 'MEMBUKA…' : 'BUKA PANEL'}
        </button>
      </div>
    );
  }

  /* ── panel ── */
  return (
    <div className="space-y-5">
      {/* tab */}
      <div className="flex border-[3px] border-ink">
        {(
          [
            { id: 'orders' as const, label: 'ORDER' },
            { id: 'generate' as const, label: 'GENERATOR' },
            { id: 'email' as const, label: 'EMAIL' },
          ]
        ).map((t, i) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`flex-1 px-4 py-2.5 font-mono text-[11px] font-black uppercase tracking-widest transition-colors ${
              i > 0 ? 'border-l-[3px] border-ink' : ''
            } ${tab === t.id ? 'bg-ink text-paper' : 'bg-white hover:bg-paper'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'generate' && <Generator adminKey={key} />}
      {tab === 'email' && <EmailSettings adminKey={key} />}

      {tab === 'orders' && (
        <>
      {/* ringkasan */}
      <div className="grid gap-[3px] border-[3px] border-ink bg-ink sm:grid-cols-4">
        {[
          ['TOTAL ORDER', String(data?.total ?? 0)],
          ['HARI INI', String(data?.today ?? 0)],
          ['STORAGE', data?.storage === 'redis' ? 'REDIS' : 'MEMORI'],
          ['MODE', 'ADMIN'],
        ].map(([k, v]) => (
          <div key={k} className="bg-white px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/45">{k}</p>
            <p className="display text-xl">{v}</p>
          </div>
        ))}
      </div>

      {flash && (
        <p className="animate-slideDown border-[3px] border-ink bg-lime px-3 py-2 font-mono text-[11px] font-bold">
          ✓ {flash}
        </p>
      )}
      {err && (
        <p role="alert" className="animate-slideDown border-[3px] border-ink bg-[#FFE1E1] px-3 py-2 font-mono text-[11px] text-[#C40000]">
          ✕ {err}
        </p>
      )}

      {/* toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Cari order / email / plan…"
          className="field flex-1"
          aria-label="Cari order"
        />
        <button type="button" onClick={() => load(key)} disabled={busy} className="btn-lime px-5 py-3 text-[11px]">
          {busy ? 'MUAT…' : '↻ MUAT ULANG'}
        </button>
        <button type="button" onClick={logout} className="btn-ghost px-5 py-3 text-[11px]">
          KELUAR
        </button>
      </div>

      {/* tabel */}
      <div className="brutal overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b-[3px] border-ink bg-ink text-paper">
                {['Order ID', 'Email', 'Plan', 'Diterbitkan', 'Status', 'Aksi'].map((h) => (
                  <th key={h} className="px-3 py-2 font-mono text-[9px] font-black uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-ink/40">
                    belum ada order
                  </td>
                </tr>
              )}
              {shown.map((o) => {
                const revoked = o.status === 'REVOKED';
                return (
                  <tr key={`${o.orderId}-${o.issuedAt}`} className="border-b-2 border-ink/10 last:border-0 hover:bg-paper">
                    <td className="px-3 py-2 font-mono text-[11px] font-bold">{o.orderId}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{o.emailMasked}</td>
                    <td className="px-3 py-2">
                      <span className="chip bg-paper">{o.planName}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[10px] text-ink/60">{fmt(o.issuedAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`chip ${revoked ? 'bg-[#FFE1E1] text-[#C40000]' : 'bg-lime'}`}>
                        {revoked ? 'REVOKED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {o.licenseKey && <CopyButton value={o.licenseKey} label="SALIN" />}
                        <button
                          type="button"
                          onClick={() => revoke(o.licenseKey)}
                          disabled={busy || !o.licenseKey || revoked}
                          className="chip press bg-white hover:bg-[#FFE1E1] disabled:opacity-30"
                        >
                          CABUT
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
        Menampilkan {shown.length} order · data {data?.storage === 'redis' ? 'persisten (Redis)' : 'sementara (memori proses)'}
      </p>
        </>
      )}
    </div>
  );
}
