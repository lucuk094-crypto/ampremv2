'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from './icons';

type Diag = {
  success: boolean;
  configured: boolean;
  from: string;
  domain: string;
  usingTestSender: boolean;
  keyValid?: boolean;
  keyError?: string;
  domains: { name: string; status: string; region?: string }[];
  domainVerified?: boolean;
  message?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/* ── langkah-langkah yang ditampilkan sebagai panduan ── */
const STEPS: { n: string; title: string; body: React.ReactNode }[] = [
  {
    n: '01',
    title: 'BUAT API KEY',
    body: (
      <>
        Daftar di <b>resend.com</b> → menu <b>API Keys</b> → <b>Create API Key</b>. Pilih izin{' '}
        <b>Sending access</b>. Salin key yang diawali <code className="font-mono">re_</code> (hanya tampil sekali).
      </>
    ),
  },
  {
    n: '02',
    title: 'PASANG DI VERCEL',
    body: (
      <>
        Project → <b>Settings → Environment Variables</b>. Tambahkan{' '}
        <code className="font-mono">RESEND_API_KEY</code> dan <code className="font-mono">MAIL_FROM</code>, lalu{' '}
        <b>Redeploy</b> agar terbaca.
      </>
    ),
  },
  {
    n: '03',
    title: 'VERIFIKASI DOMAIN',
    body: (
      <>
        Menu <b>Domains → Add Domain</b>, tambahkan record DNS (SPF/DKIM) yang diberikan. Setelah status{' '}
        <b>verified</b>, kamu bisa mengirim ke alamat siapa pun dengan{' '}
        <code className="font-mono">no-reply@domainmu.com</code>.
      </>
    ),
  },
];

export function EmailSettings({ adminKey }: { adminKey: string }) {
  const [diag, setDiag] = useState<Diag | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    note: string;
    reason?: string;
    messageId?: string;
    configIssue?: boolean;
    magicLink?: string;
  } | null>(null);

  const [preview, setPreview] = useState(false);

  const loadDiag = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/mail-test', {
        headers: { 'x-admin-key': adminKey },
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErr(json.message || `Gagal memeriksa konfigurasi (HTTP ${res.status}).`);
        return;
      }
      setDiag(json);
    } catch {
      setErr('Tidak dapat menghubungi server.');
    } finally {
      setBusy(false);
    }
  }, [adminKey]);

  useEffect(() => {
    loadDiag();
  }, [loadDiag]);

  const sendTest = async () => {
    const addr = to.trim().toLowerCase();
    setResult(null);
    if (!EMAIL_RE.test(addr)) {
      setResult({ ok: false, note: 'Alamat email tidak valid.' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/mail-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ to: addr }),
      });
      const json = await res.json();
      setResult({
        ok: Boolean(json.success),
        note: json.note ?? json.message ?? 'Tidak ada respons.',
        reason: json.reason,
        messageId: json.messageId,
        configIssue: json.configIssue,
        magicLink: json.magicLink,
      });
      if (json.success) loadDiag();
    } catch {
      setResult({ ok: false, note: 'Tidak dapat menghubungi server.' });
    } finally {
      setSending(false);
    }
  };

  const badge = (ok: boolean, text: string) => (
    <span className={`chip ${ok ? 'bg-lime' : 'bg-[#FFE1E1] text-[#C40000]'}`}>
      {ok ? '✓' : '✕'} {text}
    </span>
  );

  return (
    <div className="space-y-5">
      {/* status konfigurasi */}
      <div className="brutal bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-ink px-4 py-2.5">
          <p className="font-mono text-[10px] font-black uppercase tracking-widest text-lime">status pengiriman email</p>
          <button
            type="button"
            onClick={loadDiag}
            disabled={busy}
            className="chip press border-lime/40 bg-ink text-lime"
          >
            {busy ? 'MEMERIKSA…' : '↻ PERIKSA ULANG'}
          </button>
        </div>

        <div className="p-4">
          {err && (
            <p className="mb-3 border-[3px] border-ink bg-[#FFE1E1] px-3 py-2 font-mono text-[11px] text-[#C40000]">
              ✕ {err}
            </p>
          )}

          {!diag && !err && <p className="animate-blink font-mono text-[11px] text-ink/50">memeriksa…</p>}

          {diag && (
            <>
              <div className="flex flex-wrap gap-2">
                {badge(diag.configured, diag.configured ? 'API KEY TERPASANG' : 'API KEY KOSONG')}
                {diag.configured && badge(Boolean(diag.keyValid), diag.keyValid ? 'KEY VALID' : 'KEY DITOLAK')}
                {diag.keyValid &&
                  (diag.usingTestSender
                    ? badge(false, 'PENGIRIM UJI')
                    : badge(Boolean(diag.domainVerified), diag.domainVerified ? 'DOMAIN VERIFIED' : 'DOMAIN BELUM VERIFIED'))}
              </div>

              <dl className="mt-4 grid gap-[3px] border-[3px] border-ink bg-ink sm:grid-cols-2">
                <div className="bg-white px-3 py-2">
                  <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/45">MAIL_FROM</dt>
                  <dd className="truncate font-mono text-[11px] font-bold">{diag.from || '—'}</dd>
                </div>
                <div className="bg-white px-3 py-2">
                  <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/45">MODE</dt>
                  <dd className="truncate font-mono text-[11px] font-bold">
                    {diag.configured ? 'EMAIL SUNGGUHAN' : 'OUTBOX (TIDAK DIKIRIM)'}
                  </dd>
                </div>
              </dl>

              {diag.keyError && (
                <p className="mt-3 border-[3px] border-ink bg-sun px-3 py-2 text-[12px] leading-relaxed">
                  <b>Key bermasalah:</b> {diag.keyError}
                </p>
              )}

              {diag.usingTestSender && (
                <p className="mt-3 border-[3px] border-ink bg-sun px-3 py-2 text-[12px] leading-relaxed">
                  Kamu memakai <code className="font-mono">onboarding@resend.dev</code>. Alamat ini{' '}
                  <b>hanya bisa mengirim ke email pemilik akun Resend</b>. Untuk mengirim ke alamat lain (termasuk
                  pengguna), verifikasi domain dulu lalu ubah <code className="font-mono">MAIL_FROM</code>.
                </p>
              )}

              {diag.domains?.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-ink/45">domain terdaftar</p>
                  <ul className="divide-y-2 divide-ink/10 border-2 border-ink">
                    {diag.domains.map((d) => (
                      <li key={d.name} className="flex items-center justify-between gap-2 px-3 py-1.5">
                        <span className="truncate font-mono text-[11px] font-bold">{d.name}</span>
                        <span
                          className={`chip shrink-0 ${d.status === 'verified' ? 'bg-lime' : 'bg-sun'}`}
                        >
                          {d.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* kirim email uji */}
      <div className="brutal bg-lime p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border-[3px] border-ink bg-ink text-lime">
            <Icon.mail className="h-4 w-4" />
          </span>
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-widest">kirim email uji</p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-ink/55">
              memakai template magic link asli
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            inputMode="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !sending && sendTest()}
            placeholder="alamat@emailkamu.com"
            className="field flex-1"
            aria-label="Email tujuan uji"
          />
          <button type="button" onClick={sendTest} disabled={sending} className="btn-ink shrink-0 px-5 py-3 text-[11px]">
            {sending ? 'MENGIRIM…' : 'KIRIM UJI'}
          </button>
        </div>

        {result && (
          <div
            className={`animate-slideDown mt-3 border-[3px] border-ink px-3 py-2.5 ${
              result.ok ? 'bg-white' : 'bg-[#FFE1E1]'
            }`}
          >
            <p className="font-mono text-[10px] font-black uppercase tracking-widest">
              {result.ok ? '✓ TERKIRIM' : '✕ GAGAL'}
            </p>
            <p className="mt-1 break-words text-[12px] leading-relaxed text-ink/80">{result.note}</p>
            {result.reason && !result.note.includes(result.reason) && (
              <p className="mt-1 break-words text-[11px] text-ink/60">{result.reason}</p>
            )}
            {result.messageId && (
              <p className="mt-1 break-all font-mono text-[10px] text-ink/50">id: {result.messageId}</p>
            )}
            {result.magicLink && (
              <p className="mt-2 break-all border-2 border-ink/20 bg-white px-2 py-1.5 font-mono text-[9px] leading-relaxed text-ink/60">
                {result.magicLink}
              </p>
            )}
          </div>
        )}
      </div>

      {/* pratinjau template */}
      <div className="brutal overflow-hidden bg-white">
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          aria-expanded={preview}
          className="flex w-full items-center justify-between gap-2 border-b-[3px] border-ink bg-sun px-4 py-2.5 text-left"
        >
          <span className="font-mono text-[10px] font-black uppercase tracking-widest">
            pratinjau template email
          </span>
          <span className={`text-lg leading-none transition-transform ${preview ? 'rotate-45' : ''}`}>+</span>
        </button>
        {preview && <PreviewFrame />}
      </div>

      {/* panduan */}
      <div className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="brutal-flat bg-white p-4">
            <p className="font-mono text-2xl font-black text-ink/15">{s.n}</p>
            <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-widest">{s.title}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink/70">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="border-[3px] border-ink bg-paper p-4">
        <p className="font-mono text-[9px] font-black uppercase tracking-widest text-ink/50">batas resend (akun gratis)</p>
        <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-ink/70">
          <li>• <b>100 email/hari</b> dan <b>3.000 email/bulan</b></li>
          <li>• <b>2 permintaan/detik</b></li>
          <li>• Pengirim <code className="font-mono">onboarding@resend.dev</code> hanya ke email pemilik akun</li>
        </ul>
      </div>
    </div>
  );
}

/* Pratinjau memakai respons nyata dari server agar template selalu sinkron. */
function PreviewFrame() {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    // bangun pratinjau dari endpoint uji (tanpa mengirim) dengan data contoh
    fetch('/api/mail-preview', { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : ''))
      .then((t) => setHtml(t))
      .catch(() => setHtml(''));
  }, []);

  if (!html) {
    return <p className="animate-blink p-4 font-mono text-[11px] text-ink/50">memuat pratinjau…</p>;
  }

  return (
    <iframe
      title="Pratinjau template email"
      srcDoc={html}
      className="h-[560px] w-full border-0 bg-paper"
      sandbox=""
    />
  );
}
