'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Nav, Footer } from '@/components/chrome';
import { CopyButton } from '@/components/ui';
import { Icon } from '@/components/icons';

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

function InvoiceBody() {
  const params = useSearchParams();
  const key = params.get('key') ?? '';
  const order = params.get('order') ?? '';

  const [rec, setRec] = useState<Rec | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    if (!key && !order) {
      setErr('Sertakan parameter ?key= atau ?order= pada URL.');
      setBusy(false);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const q = key ? `key=${encodeURIComponent(key)}` : `order=${encodeURIComponent(order)}`;
      const res = await fetch(`/api/license?${q}`, { cache: 'no-store', signal: AbortSignal.timeout(12_000) });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErr(json.message || `Gagal memuat invoice (HTTP ${res.status}).`);
        return;
      }
      setRec(json);
    } catch {
      setErr('Tidak dapat menghubungi server.');
    } finally {
      setBusy(false);
    }
  }, [key, order]);

  useEffect(() => {
    load();
  }, [load]);

  const pdfUrl = rec
    ? `/api/invoice?${key ? `key=${encodeURIComponent(rec.licenseKey)}` : `order=${encodeURIComponent(rec.orderId)}`}`
    : '';

  const fmt = (ts: number) => new Date(ts).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <>
      <div className="mb-8">
        <span className="chip mb-3 bg-sun">bukti pembelian</span>
        <h1 className="display text-4xl leading-[0.9] sm:text-5xl">
          INVOICE<span className="text-lime-dark">.</span>
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ink/70">
          Rincian lisensi siap cetak. Unduh sebagai PDF untuk arsip, atau buka pratinjaunya di tab baru.
        </p>
      </div>

      {err && (
        <div className="brutal max-w-xl bg-[#FFE1E1] p-5">
          <p className="font-mono text-[11px] font-black uppercase tracking-widest text-[#C40000]">✕ {err}</p>
          <p className="mt-2 text-[13px] text-ink/75">
            Contoh URL: <code className="font-mono text-[11px]">/invoice?key=AMP-XXXX-XXXX-XXXX-XXXX</code>
          </p>
          <Link href="/#cek" className="btn-ink mt-4 px-5 py-3 text-[11px]">
            Buka Cek Lisensi <Icon.arrow className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {busy && !err && (
        <p className="animate-blink font-mono text-[11px] uppercase tracking-widest text-ink/50">
          memuat invoice…
        </p>
      )}

      {rec && (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          {/* pratinjau dokumen */}
          <div className="brutal overflow-hidden bg-white">
            <div className="border-b-[3px] border-ink bg-ink px-4 py-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-lime">
                  AM.PREM.ID
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-paper/50">invoice</span>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink/45">nomor invoice</p>
                  <p className="font-mono text-lg font-black">{rec.orderId}</p>
                </div>
                <span
                  className={`chip ${rec.status === 'ACTIVE' ? 'bg-lime' : 'bg-[#FFE1E1] text-[#C40000]'}`}
                >
                  {rec.status === 'ACTIVE' ? 'AKTIF' : 'DICABUT'}
                </span>
              </div>

              <div className="mt-5 border-[3px] border-ink bg-sun px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink/60">kunci lisensi</p>
                <p className="select-all break-all font-mono text-base font-black tracking-wider sm:text-lg">
                  {rec.licenseKey}
                </p>
              </div>

              <dl className="mt-4 divide-y-2 divide-ink/10 border-y-2 border-ink/10">
                {[
                  ['Plan', `${rec.planName}`],
                  ['Pemilik', rec.emailMasked],
                  ['Diterbitkan', fmt(rec.issuedAt)],
                  ['Kadaluarsa', fmt(rec.expiresAt)],
                  ['Sisa hari', `${rec.remainingDays} hari`],
                  ['Checksum', rec.checksum],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 py-2">
                    <dt className="font-mono text-[9px] uppercase tracking-widest text-ink/45">{k}</dt>
                    <dd className="truncate text-right font-mono text-[11px] font-bold">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 flex items-center justify-between border-[3px] border-ink bg-ink px-4 py-3">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-paper">total</span>
                <span className="display text-xl text-lime">IDR 0</span>
              </div>
            </div>
          </div>

          {/* aksi */}
          <div className="space-y-4">
            <div className="brutal bg-lime p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-widest">unduh</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink/75">
                PDF A4 dengan rincian lengkap, checksum, dan catatan verifikasi.
              </p>
              <div className="mt-4 space-y-2">
                <a href={pdfUrl} className="btn-ink w-full py-3 text-[11px]">
                  <Icon.down className="h-4 w-4" /> UNDUH PDF
                </a>
                <a
                  href={`${pdfUrl}&inline=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost w-full py-3 text-[11px]"
                >
                  PRATINJAU DI TAB BARU
                </a>
              </div>
            </div>

            <div className="brutal bg-white p-5">
              <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-widest text-ink/50">
                bagikan / arsipkan
              </p>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={rec.licenseKey} label="SALIN KUNCI" />
                <CopyButton value={rec.orderId} label="SALIN ORDER" />
              </div>
              <p className="mt-4 font-mono text-[10px] leading-relaxed text-ink/45">
                Tautan invoice dapat dibuka ulang kapan saja selama data lisensi tersimpan (gunakan Redis agar
                persisten antar cold start).
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function InvoicePage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <Suspense
          fallback={
            <p className="animate-blink font-mono text-[11px] uppercase tracking-widest text-ink/50">memuat…</p>
          }
        >
          <InvoiceBody />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
