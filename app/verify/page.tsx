import Link from 'next/link';
import { cookies } from 'next/headers';
import { Nav, Footer } from '@/components/chrome';
import { extractToken } from '@/lib/auth';
import { CopyButton } from '@/components/ui';
import { Icon } from '@/components/icons';

export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'amp_sess';

export default async function VerifyLanding({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; t?: string }>;
}) {
  const sp = await searchParams;
  const raw = sp.token || sp.t || '';
  const token = extractToken(raw) || '';
  const looksValid = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);

  const jar = await cookies();
  const session = jar.get(SESSION_COOKIE)?.value || '';
  const hasSession = Boolean(session);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <span className="chip mb-4 bg-sun">langkah 02 · magic link</span>

        <h1 className="display text-4xl leading-[0.9] sm:text-5xl">
          LINK KAMU
          <br />
          SIAP DIPAKAI<span className="text-lime-dark">.</span>
        </h1>

        <p className="mt-4 text-[14px] leading-relaxed text-ink/70">
          Salin token di bawah, lalu tempel ke kolom <b>Magic link</b> di konsol aktivasi. Token hanya berlaku sekali
          dan kedaluwarsa dalam 15 menit.
        </p>

        {!looksValid ? (
          <div className="brutal mt-8 bg-[#FFE1E1] p-5">
            <p className="font-mono text-[11px] font-black uppercase tracking-widest text-[#C40000]">
              ✕ token tidak terbaca
            </p>
            <p className="mt-2 text-[13px] text-ink/75">
              URL ini tidak memuat token yang sah. Minta magic link baru dari konsol aktivasi.
            </p>
            <Link href="/#toolkit" className="btn-ink mt-4 px-5 py-3 text-[11px]">
              Minta link baru <Icon.arrow className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <>
            {/* token */}
            <div className="brutal mt-8 bg-white">
              <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-4 py-2.5">
                <span className="font-mono text-[10px] font-black uppercase tracking-widest text-paper/60">
                  token bertanda tangan
                </span>
                <CopyButton value={raw} label="SALIN URL" className="bg-sun" />
              </div>
              <p className="select-all break-all bg-lime-soft px-4 py-5 font-mono text-[11px] leading-relaxed">
                {token}
              </p>
            </div>

            {/* cookie sesi */}
            {hasSession ? (
              <div className="brutal mt-5 bg-white">
                <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-4 py-2.5">
                  <span className="font-mono text-[10px] font-black uppercase tracking-widest text-lime">
                    ✓ cookie sesi terdeteksi
                  </span>
                  <CopyButton value={session} label="SALIN COOKIE" className="bg-lime" />
                </div>
                <p className="select-all break-all bg-paper px-4 py-4 font-mono text-[10px] leading-relaxed text-ink/80">
                  {session}
                </p>
                <p className="border-t-2 border-dashed border-ink/20 px-4 py-3 text-[12px] text-ink/60">
                  Tempel nilai ini ke kolom <b>Cookie sesi</b> di Langkah 02.
                </p>
              </div>
            ) : (
              <div className="mt-5 border-[3px] border-ink bg-sun px-4 py-3">
                <p className="font-mono text-[10px] font-black uppercase tracking-widest">cookie tidak terdeteksi</p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink/75">
                  Buka link ini dari browser yang sama saat kamu meminta link. Jika tetap kosong, kembali ke konsol —
                  cookie sesi ditampilkan otomatis di Langkah 02.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/#toolkit" className="btn-lime flex-1 px-6 py-4 text-sm">
                <Icon.bolt className="h-4 w-4" /> Buka konsol aktivasi
              </Link>
              <CopyButton value={token} label="SALIN TOKEN" className="justify-center px-6 py-4 text-[11px]" />
            </div>

            <div className="mt-10 border-[3px] border-ink bg-paper p-4">
              <p className="font-mono text-[10px] font-black uppercase tracking-widest text-ink/50">selanjutnya</p>
              <ol className="mt-2 space-y-1.5 text-[13px] text-ink/70">
                <li>1. Buka konsol aktivasi di tab yang sama.</li>
                <li>2. Isi email yang sama, tempel cookie sesi dan magic link.</li>
                <li>3. Klik Verifikasi — kunci lisensi langsung terbit.</li>
              </ol>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
