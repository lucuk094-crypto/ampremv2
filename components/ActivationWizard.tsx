'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal, type LogLine, type LogKind } from './Terminal';
import { CopyButton } from './ui';
import { Inbox } from './Inbox';
import { Icon } from './icons';
import { PLAN_LIST, type Plan, type PlanId } from '@/lib/plans';

type Step = 1 | 2 | 3;

type SendResult = {
  success: boolean;
  message: string;
  requestId?: string;
  emailMasked?: string;
  planName?: string;
  expiresIn?: number;
  delivery?: 'email' | 'outbox' | 'inbox';
  mailConfigured?: boolean;
  inboxAddress?: string;
  magicLink?: string;
};

type VerifyResult = {
  success: boolean;
  message: string;
  orderId?: string;
  licenseKey?: string;
  planName?: string;
  durationDays?: number;
  remainingDays?: number;
  expiresAt?: number;
  issuedAt?: number;
  checksum?: string;
  emailMasked?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

let seq = 0;
const clock = () =>
  new Date().toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function ActivationWizard() {
  const [plan, setPlan] = useState<PlanId>('pro');
  const [step, setStep] = useState<Step>(1);

  const [email, setEmail] = useState('');
  const [cookie, setCookie] = useState('');
  const [magicLink, setMagicLink] = useState('');
  const [customOrderId, setCustomOrderId] = useState('');

  const [busy, setBusy] = useState<null | 'send' | 'verify'>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [send, setSend] = useState<SendResult | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [inboxAddress, setInboxAddress] = useState<string | null>(null);
  const [mode, setMode] = useState<'email' | 'inbox'>('inbox');

  const timer = useRef<ReturnType<typeof setInterval>>();

  const log = useCallback((kind: LogKind, msg: string) => {
    setLogs((prev) => [...prev.slice(-120), { id: ++seq, t: clock(), kind, msg }]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  /* boot log */
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    log('sys', 'AM Prem.ID core v1.0 siap digunakan.');
    log('info', 'Pilih plan, lalu kirim magic link ke email kamu (Langkah 01).');
  }, [log]);

  /* countdown magic link */
  useEffect(() => {
    clearInterval(timer.current);
    if (!send?.success || !send.expiresIn) {
      setSecondsLeft(0);
      return;
    }
    const deadline = Date.now() + send.expiresIn * 1000;
    setSecondsLeft(send.expiresIn);
    timer.current = setInterval(() => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) clearInterval(timer.current);
    }, 1000);
    return () => clearInterval(timer.current);
  }, [send]);

  const mmss = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  /* ─────────────── STEP 1 ─────────────── */
  const handleSend = async () => {
    setError(null);
    const addr = email.trim().toLowerCase();
    if (mode === 'email') {
      if (!addr) return setError('Email wajib diisi.');
      if (!EMAIL_RE.test(addr)) return setError('Format email tidak valid.');
    } else if (!inboxAddress) {
      return setError('Buat alamat kotak masuk dulu di panel kanan.');
    }

    setBusy('send');
    setSend(null);
    setResult(null);
    log('step', mode === 'inbox' ? `STEP 01 — meminta magic link ke kotak masuk internal` : `STEP 01 — meminta magic link untuk ${addr}`);
    log('wait', 'POST /api/send-link …');

    const t0 = performance.now();
    try {
      const res = await fetch('/api/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'inbox' ? { plan, delivery: 'inbox' } : { email: addr, plan }
        ),
        signal: AbortSignal.timeout(20_000),
      });
      const data: SendResult = await res.json();
      const ms = Math.round(performance.now() - t0);

      if (!res.ok || !data.success) {
        setError(data.message || `Permintaan gagal (HTTP ${res.status}).`);
        log('err', `HTTP ${res.status} — ${data.message || 'gagal'}`);
        return;
      }

      setSend(data);
      log('ok', `HTTP ${res.status} dalam ${ms}ms`);
      log('data', `requestId=${data.requestId} · plan=${data.planName}`);
      log('info', data.message);

      // cookie sesi: ambil dari set-cookie browser, fallback ke requestId
      const sess = document.cookie
        .split('; ')
        .find((c) => c.startsWith('amp_sess='))
        ?.split('=')[1];
      const cookieValue = sess ? decodeURIComponent(sess) : (data.requestId ?? '');
      setCookie(cookieValue);

      if (data.delivery === 'inbox') {
        log('ok', 'Notifikasi tersimpan di kotak masuk internal — buka panel Kotak Masuk.');
        if (data.emailMasked) setEmail(data.emailMasked);
        setStep(2);
        return;
      }
      if (data.delivery === 'email') {
        log('ok', 'Email terkirim — buka inbox, salin seluruh URL magic link.');
      } else if (data.magicLink) {
        log('ok', 'Magic link diterbitkan (outbox mode) — tersalin ke Langkah 02.');
      }
      setMagicLink(data.magicLink ?? '');
      setStep(2);
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === 'TimeoutError';
      setError(aborted ? 'Server tidak merespons dalam 20 detik.' : 'Tidak dapat menghubungi server.');
      log('err', aborted ? 'timeout 20s' : 'network error');
    } finally {
      setBusy(null);
    }
  };

  /* ─────────────── STEP 2 ─────────────── */
  const handleVerify = async () => {
    setError(null);
    const addr = email.trim().toLowerCase();
    if (!addr) return setError('Email wajib diisi.');
    if (!EMAIL_RE.test(addr)) return setError('Format email tidak valid.');
    if (!magicLink.trim()) return setError('Magic link wajib diisi.');
    if (!cookie.trim()) return setError('Cookie wajib diisi (ambil dari Langkah 01).');

    setBusy('verify');
    setResult(null);
    log('step', 'STEP 02 — verifikasi magic link');
    log('wait', 'POST /api/verify-link …');

    const t0 = performance.now();
    try {
      const res = await fetch('/api/verify-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addr,
          cookie: cookie.trim(),
          magicLink: magicLink.trim(),
          customOrderId: customOrderId.trim(),
          plan,
        }),
        signal: AbortSignal.timeout(25_000),
      });
      const data: VerifyResult = await res.json();
      const ms = Math.round(performance.now() - t0);

      if (!res.ok || !data.success) {
        setError(data.message || `Verifikasi gagal (HTTP ${res.status}).`);
        log('err', `HTTP ${res.status} — ${data.message || 'gagal'}`);
        return;
      }

      setResult(data);
      log('ok', `HTTP ${res.status} dalam ${ms}ms`);
      log('data', `order=${data.orderId} · expires=${new Date(data.expiresAt ?? 0).toLocaleDateString('id-ID')}`);
      log('ok', `Lisensi ${data.planName} AKTIF — kunci diterbitkan.`);
      setStep(3);
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === 'TimeoutError';
      setError(aborted ? 'Server tidak merespons dalam 25 detik.' : 'Tidak dapat menghubungi server.');
      log('err', aborted ? 'timeout 25s' : 'network error');
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    setStep(1);
    setSend(null);
    setResult(null);
    setError(null);
    setCookie('');
    setMagicLink('');
    setCustomOrderId('');
    log('sys', 'Sesi direset. Siap untuk aktivasi baru.');
  };

  const downloadLicense = () => {
    if (!result?.licenseKey) return;
    const txt = [
      '════════════════════════════════════════',
      '  AM PREM.ID — SERTIFIKAT LISENSI',
      '  Developer: Van313 | Official',
      '════════════════════════════════════════',
      `KUNCI LISENSI : ${result.licenseKey}`,
      `ORDER ID      : ${result.orderId}`,
      `PLAN          : ${result.planName} (${result.durationDays} hari)`,
      `STATUS        : AKTIF`,
      `DITERBITKAN   : ${new Date(result.issuedAt ?? 0).toLocaleString('id-ID')}`,
      `KADALUARSA    : ${new Date(result.expiresAt ?? 0).toLocaleString('id-ID')}`,
      `SISA HARI     : ${result.remainingDays}`,
      `CHECKSUM      : ${result.checksum}`,
      `PEMILIK       : ${result.emailMasked}`,
      '────────────────────────────────────────',
      'Simpan berkas ini. Verifikasi kapan saja di /cek',
      '════════════════════════════════════════',
    ].join('\n');
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AM-PremID-${result.orderId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    log('info', 'Sertifikat lisensi diunduh sebagai berkas teks.');
  };

  const activePlan = PLAN_LIST.find((p) => p.id === plan) as Plan;

  return (
    <div id="toolkit" className="scroll-mt-24">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr] lg:gap-6">
        {/* ───────── KIRI: form ───────── */}
        <div className="brutal noise relative overflow-hidden bg-white">
          {/* header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-ink px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon.bolt className="h-4 w-4 text-sun" />
              <h2 className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-paper">
                Activation Console
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="chip border-lime/40 bg-ink text-lime">
                <span className="h-1.5 w-1.5 animate-blink rounded-full bg-lime" /> online
              </span>
              <span className="chip border-white/25 bg-ink text-paper/70">v1.0</span>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* plan picker */}
            <fieldset className="mb-6">
              <legend className="label">01 · Pilih plan</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {PLAN_LIST.map((p) => {
                  const on = p.id === plan;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPlan(p.id);
                        log('info', `Plan dipilih: ${p.name} (${p.durationDays} hari).`);
                      }}
                      aria-pressed={on}
                      disabled={busy !== null}
                      className={`press border-[3px] border-ink p-3 text-left ${
                        on
                          ? p.accent === 'lime'
                            ? 'bg-lime'
                            : p.accent === 'sun'
                              ? 'bg-sun'
                              : 'bg-paper'
                          : 'bg-white hover:bg-paper'
                      }`}
                      style={{ boxShadow: on ? '4px 4px 0 0 #0A0A0A' : '2px 2px 0 0 #0A0A0A' }}
                    >
                      <span className="block font-mono text-[9px] font-black uppercase tracking-widest opacity-60">
                        {p.badge}
                      </span>
                      <span className="display block text-lg">{p.name}</span>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider opacity-70">
                        {p.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* step indicator */}
            <div className="mb-5 flex items-stretch gap-0 border-[3px] border-ink">
              {(
                [
                  { n: 1, label: 'Email' },
                  { n: 2, label: 'Magic Link' },
                  { n: 3, label: 'Lisensi' },
                ] as const
              ).map((s, i) => {
                const done = step > s.n;
                const now = step === s.n;
                return (
                  <div
                    key={s.n}
                    className={`flex flex-1 items-center gap-2 px-2 py-2 ${i > 0 ? 'border-l-[3px] border-ink' : ''} ${
                      now ? 'bg-ink text-paper' : done ? 'bg-lime text-ink' : 'bg-white text-ink/45'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 font-mono text-[10px] font-black ${
                        now ? 'border-paper' : 'border-ink'
                      }`}
                    >
                      {done ? '✓' : `0${s.n}`}
                    </span>
                    <span className="truncate font-mono text-[10px] font-black uppercase tracking-wider">
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* error */}
            {error && (
              <div
                role="alert"
                className="animate-slideDown mb-4 flex items-start gap-2 border-[3px] border-ink bg-[#FFE1E1] p-3"
              >
                <Icon.x className="mt-0.5 h-4 w-4 shrink-0 text-[#C40000]" />
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-black uppercase tracking-wider text-[#C40000]">
                    Gagal
                  </p>
                  <p className="break-words text-xs text-ink/80">{error}</p>
                </div>
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <div className="animate-riseIn">
                {/* pemilih mode */}
                <div className="mb-4 grid grid-cols-2 gap-[3px] border-[3px] border-ink bg-ink">
                  {(
                    [
                      { id: 'inbox' as const, label: 'KOTAK MASUK', note: 'tanpa email asli' },
                      { id: 'email' as const, label: 'EMAIL ASLI', note: 'kirim ke inbox' },
                    ]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMode(m.id);
                        setError(null);
                        log('info', m.id === 'inbox' ? 'Mode kotak masuk internal dipilih.' : 'Mode email asli dipilih.');
                      }}
                      disabled={busy !== null}
                      aria-pressed={mode === m.id}
                      className={`px-2 py-2 text-left ${mode === m.id ? 'bg-lime' : 'bg-white hover:bg-paper'}`}
                    >
                      <span className="block font-mono text-[10px] font-black uppercase tracking-widest">
                        {m.label}
                      </span>
                      <span className="block font-mono text-[9px] uppercase tracking-wider text-ink/50">{m.note}</span>
                    </button>
                  ))}
                </div>

                {mode === 'email' ? (
                  <>
                    <label htmlFor="email" className="label">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon.mail className="h-3.5 w-3.5" /> Alamat email tujuan *
                      </span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="kamu@domain.com"
                      className="field text-base sm:text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !busy && handleSend()}
                      disabled={busy !== null}
                      aria-describedby="email-help"
                    />
                    <p id="email-help" className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink/50">
                      Magic link berlaku 15 menit · maks. 8 permintaan/jam
                    </p>
                  </>
                ) : (
                  <div className="border-[3px] border-ink bg-lime-soft px-3 py-2.5">
                    <p className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/50">
                      alamat kotak masuk
                    </p>
                    <p className="mt-1 break-all font-mono text-[11px] font-bold">
                      {inboxAddress ?? 'belum dibuat — buat di panel Kotak Masuk'}
                    </p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-ink/65">
                      Notifikasi aktivasi muncul di kotak masuk dalam web. Tidak perlu email pribadi.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={busy !== null || (mode === 'inbox' && !inboxAddress)}
                  className="btn-lime mt-4 w-full py-4 text-sm sm:text-base"
                >
                  {busy === 'send' ? (
                    <span className="animate-blink">MENGIRIM…</span>
                  ) : (
                    <>
                      Kirim Magic Link <Icon.arrow className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="animate-riseIn space-y-4">
                {send?.success && (
                  <div className={`border-[3px] border-ink p-3 ${send.delivery === 'email' ? 'bg-lime' : 'bg-lime-soft'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-[10px] font-black uppercase tracking-wider text-ink">
                        {send.delivery === 'email'
                          ? `✓ Email terkirim ke ${send.emailMasked}`
                          : `✓ Link siap · ${send.emailMasked}`}
                      </p>
                      <span className="chip bg-white">
                        <Icon.clock className="h-3 w-3" /> {mmss(secondsLeft)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-[11px] text-ink/70">{send.message}</p>
                    {send.delivery === 'email' && (
                      <p className="mt-1.5 text-[11px] font-bold text-ink/80">
                        Buka inbox, salin seluruh URL dari email, lalu tempel di kolom Magic link.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-end justify-between gap-2">
                    <label htmlFor="cookie" className="label mb-0">
                      Cookie sesi *
                    </label>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-ink/45">dari langkah 01</span>
                  </div>
                  <input
                    id="cookie"
                    type="text"
                    placeholder="tempel nilai cookie di sini"
                    className="field mt-2"
                    value={cookie}
                    onChange={(e) => setCookie(e.target.value)}
                    disabled={busy !== null}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {cookie && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <CopyButton value={cookie} label="SALIN COOKIE" />
                      <span className="font-mono text-[9px] uppercase tracking-wider text-ink/45">
                        sesi terisi otomatis dari langkah 01
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="magic" className="label">
                    Magic link (URL lengkap) *
                  </label>
                  <textarea
                    id="magic"
                    rows={3}
                    placeholder="https://…/verify?token=…"
                    className="field resize-none break-all"
                    value={magicLink}
                    onChange={(e) => setMagicLink(e.target.value)}
                    disabled={busy !== null}
                    spellCheck={false}
                  />
                  {magicLink && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <CopyButton value={magicLink} label="SALIN LINK" />
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={busy !== null}
                        className="chip press bg-white hover:bg-sun"
                      >
                        ↻ MINTA LINK BARU
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="orderid" className="label">
                    Custom order ID <span className="opacity-40">(opsional)</span>
                  </label>
                  <input
                    id="orderid"
                    type="text"
                    placeholder="kosongkan untuk otomatis — ex: VAN313-001"
                    className="field"
                    value={customOrderId}
                    onChange={(e) => setCustomOrderId(e.target.value)}
                    disabled={busy !== null}
                    maxLength={40}
                    spellCheck={false}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={busy !== null}
                    className="btn-lime flex-1 py-4 text-sm sm:text-base"
                  >
                    {busy === 'verify' ? (
                      <span className="animate-blink">MEMVERIFIKASI…</span>
                    ) : (
                      <>
                        <Icon.shield className="h-4 w-4" /> Verifikasi &amp; Terbitkan
                      </>
                    )}
                  </button>
                  <button type="button" onClick={reset} disabled={busy !== null} className="btn-ghost px-4 py-4">
                    ↺
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && result?.success && (
              <div className="animate-riseIn">
                <div className="flex items-center gap-3 border-[3px] border-ink bg-lime p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border-[3px] border-ink bg-ink text-lime">
                    <Icon.check className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/70">
                      Aktivasi berhasil
                    </p>
                    <p className="display truncate text-xl">{result.planName}</p>
                  </div>
                </div>

                <div className="mt-4 border-[3px] border-ink">
                  <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-3 py-2">
                    <span className="font-mono text-[10px] font-black uppercase tracking-widest text-paper/60">
                      Kunci lisensi
                    </span>
                    <CopyButton value={result.licenseKey ?? ''} label="SALIN" />
                  </div>
                  <p className="select-all break-all bg-sun px-3 py-4 text-center font-mono text-lg font-black tracking-[0.08em] sm:text-xl">
                    {result.licenseKey}
                  </p>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-[3px] border-[3px] border-ink bg-ink">
                  {[
                    ['Order ID', result.orderId],
                    ['Status', 'AKTIF'],
                    ['Sisa hari', `${result.remainingDays} hari`],
                    ['Durasi', `${result.durationDays} hari`],
                    ['Diterbitkan', new Date(result.issuedAt ?? 0).toLocaleDateString('id-ID')],
                    ['Kadaluarsa', new Date(result.expiresAt ?? 0).toLocaleDateString('id-ID')],
                    ['Pemilik', result.emailMasked],
                    ['Checksum', result.checksum],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="bg-white px-3 py-2">
                      <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/45">{k}</dt>
                      <dd className="truncate font-mono text-xs font-bold" title={String(v)}>
                        {String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <a
                    href={result.licenseKey ? `/invoice?key=${encodeURIComponent(result.licenseKey)}` : '#'}
                    className="btn-sun py-3 text-[11px]"
                  >
                    <Icon.down className="h-4 w-4" /> INVOICE &amp; PDF
                  </a>
                  <button type="button" onClick={downloadLicense} className="btn-ghost py-3 text-[11px]">
                    <Icon.down className="h-4 w-4" /> SERTIFIKAT .TXT
                  </button>
                  <button type="button" onClick={reset} className="btn-ink py-3 text-[11px] sm:col-span-2">
                    + AKTIVASI BARU
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ───────── KANAN: terminal + summary ───────── */}
        <div className="flex flex-col gap-5">
          <Inbox
            address={inboxAddress}
            onAddress={setInboxAddress}
            onUseLink={(link) => {
              setMagicLink(link);
              setStep(2);
              log('ok', 'Link dari kotak masuk ditempel ke Langkah 02.');
            }}
          />
          <Terminal lines={logs} busy={busy !== null} onClear={clearLogs} />

          <div className="brutal bg-ink p-4 text-paper">
            <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-lime">Ringkasan</p>
            <dl className="space-y-2 font-mono text-[11px]">
              {[
                ['PLAN', activePlan.name],
                ['DURASI', `${activePlan.durationDays} hari`],
                ['KUOTA', `${activePlan.quotaPerDay} / hari`],
                ['EMAIL', send?.emailMasked || '—'],
                ['REQUEST', send?.requestId ? `${send.requestId.slice(0, 12)}…` : '—'],
                ['STATUS', result?.success ? 'AKTIF' : busy ? 'PROSES' : 'MENUNGGU'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                  <dt className="text-paper/45">{k}</dt>
                  <dd className="truncate font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
