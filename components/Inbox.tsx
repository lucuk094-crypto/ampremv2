'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CopyButton } from './ui';
import { Icon } from './icons';

type Msg = {
  id: string;
  from: string;
  subject: string;
  planName: string;
  preview: string;
  receivedAt: number;
  expiresAt: number;
  magicLink: string;
};

export function Inbox({
  onUseLink,
  address,
  onAddress,
}: {
  onUseLink?: (link: string) => void;
  address: string | null;
  onAddress: (a: string | null) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      const json = await res.json();
      if (!json.success) return;
      onAddress(json.address ?? null);
      setMessages(json.messages ?? []);
    } catch {
      /* diamkan; polling akan mencoba lagi */
    }
  }, [onAddress]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 4000);
    return () => clearInterval(timer.current);
  }, [load]);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });
      const json = await res.json();
      if (!json.success) {
        setErr('Gagal membuat alamat.');
        return;
      }
      onAddress(json.address);
      setMessages([]);
      setCreated(true);
      await load();
    } catch {
      setErr('Tidak dapat menghubungi server.');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      onAddress(null);
      setMessages([]);
      setCreated(false);
    } finally {
      setBusy(false);
    }
  };

  const sisa = (exp: number) => {
    const s = Math.max(0, Math.round((exp - Date.now()) / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div className="brutal overflow-hidden bg-white">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-ink px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon.mail className="h-4 w-4 text-lime" />
          <span className="font-mono text-[10px] font-black uppercase tracking-widest text-paper">kotak masuk</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-lime">
            <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime" /> live
          </span>
          {address && (
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="border-2 border-white/25 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-paper/60 transition-colors hover:border-lime hover:text-lime"
            >
              ganti
            </button>
          )}
        </div>
      </div>

      {/* alamat / pembuat */}
      {!address ? (
        <div className="p-4">
          <p className="text-[13px] leading-relaxed text-ink/70">
            Buat alamat kotak masuk internal. Notifikasi aktivasi akan muncul di sini — kamu tidak perlu
            memasukkan email pribadi.
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-ink/45">
            alamat dibuat sistem · hanya aktif di dalam AM Prem.ID · bukan email sungguhan
          </p>
          {err && <p className="mt-2 font-mono text-[11px] text-[#C40000]">✕ {err}</p>}
          <button type="button" onClick={create} disabled={busy} className="btn-lime mt-3 w-full py-3 text-[11px]">
            {busy ? 'MEMBUAT…' : '+ BUAT ALAMAT KOTAK MASUK'}
          </button>
        </div>
      ) : (
        <>
          <div className="border-b-[3px] border-ink bg-lime-soft px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/50">alamat kamu</span>
              <CopyButton value={address} label="SALIN" />
            </div>
            <p className="mt-1 select-all break-all font-mono text-[12px] font-black">{address}</p>
          </div>

          {created && !messages.length && (
            <p className="border-b-2 border-ink/10 bg-sun px-3 py-2 text-[11px] leading-relaxed">
              Alamat siap. Sekarang klik <b>Kirim Magic Link</b> di konsol aktivasi — notifikasinya akan muncul di sini.
            </p>
          )}

          {/* daftar pesan */}
          {!messages.length ? (
            <div className="px-3 py-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40">belum ada notifikasi</p>
              <p className="mt-1 text-[11px] text-ink/50">Menunggu email masuk… (cek tiap 4 detik)</p>
            </div>
          ) : (
            <ul className="divide-y-[3px] divide-ink/10">
              {messages.map((m) => {
                const isOpen = open === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : m.id)}
                      aria-expanded={isOpen}
                      className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors ${
                        isOpen ? 'bg-paper' : 'hover:bg-paper'
                      }`}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink bg-lime">
                        <Icon.mail className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[11px] font-black">{m.subject}</span>
                        <span className="block truncate font-mono text-[9px] uppercase tracking-wider text-ink/45">
                          {m.from.replace(/<.*>/, '').trim()} · {new Date(m.receivedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[9px] font-bold text-ink/40">{sisa(m.expiresAt)}</span>
                    </button>

                    {isOpen && (
                      <div className="animate-slideDown border-t-2 border-dashed border-ink/20 bg-white px-3 py-3">
                        <p className="text-[12px] leading-relaxed text-ink/75">{m.preview}</p>
                        <p className="mt-2 break-all border-2 border-ink bg-paper px-2 py-1.5 font-mono text-[9px] leading-relaxed text-ink/60">
                          {m.magicLink}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onUseLink?.(m.magicLink)}
                            className="chip press bg-lime"
                          >
                            <Icon.bolt className="h-3 w-3" /> PAKAI LINK INI
                          </button>
                          <CopyButton value={m.magicLink} label="SALIN LINK" />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
