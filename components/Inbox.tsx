'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CopyButton } from './ui';
import { Icon } from './icons';
import { playChime } from '@/lib/chime';

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

type ConnState = 'idle' | 'connecting' | 'live' | 'fallback' | 'empty';

const SOUND_KEY = 'amp_inbox_sound';
/** Jeda polling cadangan bila SSE tidak tersedia/diblokir. */
const FALLBACK_MS = 4000;

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 5) return 'baru saja';
  if (s < 60) return `${s} dtk lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  return `${Math.floor(m / 60)} jam lalu`;
}

export function Inbox({
  onUseLink,
  onAddress,
  onNewMessage,
}: {
  onUseLink?: (link: string) => void;
  address: string | null;
  onAddress: (a: string | null) => void;
  /** dipanggil sekali per pesan baru — dipakai wizard untuk toast */
  onNewMessage?: (m: Msg) => void;
}) {
  const [address, setAddress] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [conn, setConn] = useState<ConnState>('idle');
  const [sound, setSound] = useState(true);
  const [unread, setUnread] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0); // bump → sambung ulang stream
  const [, setTick] = useState(0);

  const sourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const seenRef = useRef<Set<string>>(new Set());
  /** true = snapshot berikutnya dianggap riwayat lama (jangan dibunyikan). */
  const suppressRef = useRef(true);
  const soundRef = useRef(true);
  const onAddressRef = useRef(onAddress);
  onAddressRef.current = onAddress;
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  /* ── preferensi suara (tersimpan di perangkat) ── */
  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_KEY) === 'off') {
        setSound(false);
        soundRef.current = false;
      }
    } catch {
      /* localStorage diblokir */
    }
  }, []);

  const toggleSound = () => {
    setSound((prev) => {
      const next = !prev;
      soundRef.current = next;
      try {
        localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
      } catch {
        /* abaikan */
      }
      if (next) playChime();
      return next;
    });
  };

  /** Bunyikan nada hanya untuk pesan yang benar-benar baru. */
  const applyMessages = useCallback((addressValue: string | null, rows: Msg[]) => {
    onAddressRef.current(addressValue);
    setAddress(addressValue);
    setMessages(rows);

    const fresh = rows.filter((m) => !seenRef.current.has(m.id));
    rows.forEach((m) => seenRef.current.add(m.id));

    const suppress = suppressRef.current;
    suppressRef.current = false;
    if (!fresh.length || suppress) return;

    setUnread((n) => n + fresh.length);
    setFlash(fresh[0].id);
    window.setTimeout(() => setFlash(null), 2600);
    if (soundRef.current) playChime();
    onNewMessageRef.current?.(fresh[0]);
  }, []);

  /* ── cadangan: polling biasa bila SSE gagal ── */
  const pollOnce = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      const json = await res.json();
      if (!json.success) return;
      applyMessages(json.address ?? null, json.messages ?? []);
    } catch {
      /* diamkan; percobaan berikutnya */
    }
  }, [applyMessages]);

  const startFallback = useCallback(() => {
    setConn('fallback');
    void pollOnce();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(pollOnce, FALLBACK_MS);
  }, [pollOnce]);

  /* ── satu jalur koneksi: bootstrap → SSE (atau polling) ── */
  useEffect(() => {
    let disposed = false;
    clearInterval(pollRef.current);

    const openStream = () => {
      if (disposed) return;
      setConn('connecting');
      let es: EventSource;
      try {
        es = new EventSource('/api/inbox/stream');
      } catch {
        startFallback();
        return;
      }
      sourceRef.current = es;

      es.addEventListener('ready', (ev) => {
        const data = JSON.parse((ev as MessageEvent).data) as { connected: boolean };
        if (!data.connected) {
          setConn('empty');
          es.close();
          return;
        }
        setConn('live');
      });

      es.addEventListener('inbox', (ev) => {
        const data = JSON.parse((ev as MessageEvent).data) as {
          address: string | null;
          messages: Msg[];
        };
        applyMessages(data.address ?? null, data.messages ?? []);
        setConn('live');
      });

      es.onerror = () => {
        if (disposed) return;
        // EventSource mencoba sendiri; pasang cadangan hanya bila benar-benar tertutup.
        if (es.readyState === EventSource.CLOSED) startFallback();
      };
    };

    (async () => {
      try {
        const res = await fetch('/api/inbox', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
        const json = await res.json();
        if (disposed) return;
        const addr: string | null = json.success ? (json.address ?? null) : null;
        onAddressRef.current(addr);
        setAddress(addr);
        if (Array.isArray(json.messages)) setMessages(json.messages);
        (json.messages ?? []).forEach((m: Msg) => seenRef.current.add(m.id));
        if (!addr) {
          setConn('empty');
          return;
        }
        openStream();
      } catch {
        if (!disposed) startFallback();
      }
    })();

    return () => {
      disposed = true;
      sourceRef.current?.close();
      sourceRef.current = null;
      clearInterval(pollRef.current);
    };
  }, [epoch, applyMessages, startFallback]);

  /* ── tick 1 detik: hitung ulang "baru saja" & sisa waktu ── */
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

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
      seenRef.current.clear();
      suppressRef.current = false; // pesan pertama untuk alamat ini harus berbunyi
      setUnread(0);
      setMessages([]);
      setCreated(true);
      onAddress(json.address);
      setAddress(json.address);
      setEpoch((n) => n + 1); // buka stream baru dengan cookie baru
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
      seenRef.current.clear();
      suppressRef.current = true;
      onAddress(null);
      setAddress(null);
      setMessages([]);
      setCreated(false);
      setUnread(0);
      setEpoch((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  const sisa = (exp: number) => {
    const s = Math.max(0, Math.round((exp - Date.now()) / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  const connLabel: Record<ConnState, string> = {
    idle: 'menyiapkan',
    connecting: 'menyambung',
    live: 'live',
    fallback: 'mode cadangan',
    empty: 'belum aktif',
  };

  return (
    <div className="brutal overflow-hidden bg-white">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-ink px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon.mail className="h-4 w-4 text-lime" />
          <span className="font-mono text-[10px] font-black uppercase tracking-widest text-paper">
            kotak masuk
          </span>
          {unread > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center border-2 border-black bg-sun px-1 font-mono text-[9px] font-black text-ink">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-lime"
            title="Status koneksi real-time"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                conn === 'live' ? 'animate-blink bg-lime' : conn === 'fallback' ? 'bg-sun' : 'bg-paper/40'
              }`}
            />
            {connLabel[conn]}
          </span>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            title={sound ? 'Matikan nada notifikasi' : 'Nyalakan nada notifikasi'}
            className={`border-2 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest transition-colors ${
              sound
                ? 'border-lime text-lime'
                : 'border-white/25 text-paper/50 hover:border-paper/60 hover:text-paper'
            }`}
          >
            {sound ? '🔔 nada' : '🔇 bisu'}
          </button>
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
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/50">
                alamat kamu
              </span>
              <CopyButton value={address} label="SALIN" />
            </div>
            <p className="mt-1 select-all break-all font-mono text-[12px] font-black">{address}</p>
          </div>

          {created && !messages.length && (
            <p className="border-b-2 border-ink/10 bg-sun px-3 py-2 text-[11px] leading-relaxed">
              Alamat siap. Sekarang klik <b>Kirim Magic Link</b> di konsol aktivasi — notifikasinya akan
              muncul di sini secara otomatis.
            </p>
          )}

          {/* daftar pesan */}
          {!messages.length ? (
            <div className="px-3 py-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
                belum ada notifikasi
              </p>
              <p className="mt-1 text-[11px] text-ink/50">
                {conn === 'live'
                  ? 'Terhubung — menunggu pesan masuk…'
                  : conn === 'fallback'
                    ? 'Mode cadangan — memeriksa tiap 4 detik…'
                    : 'Menyambungkan ke kotak masuk…'}
              </p>
            </div>
          ) : (
            <ul className="divide-y-[3px] divide-ink/10">
              {messages.map((m) => {
                const isOpen = open === m.id;
                const isNew = flash === m.id;
                return (
                  <li key={m.id} className={isNew ? 'animate-flashIn' : undefined}>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : m.id)}
                      aria-expanded={isOpen}
                      className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors ${
                        isOpen ? 'bg-paper' : 'hover:bg-paper'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-2 border-ink ${
                          isNew ? 'bg-sun' : 'bg-lime'
                        }`}
                      >
                        <Icon.mail className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[11px] font-black">{m.subject}</span>
                        <span className="block truncate font-mono text-[9px] uppercase tracking-wider text-ink/45">
                          {m.from.replace(/<.*>/, '').trim()} · {timeAgo(m.receivedAt)}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[9px] font-bold text-ink/40">
                        {sisa(m.expiresAt)}
                      </span>
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
