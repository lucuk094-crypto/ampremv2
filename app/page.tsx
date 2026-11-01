import { Nav, Marquee, Faq, Footer } from '@/components/chrome';
import { Hero } from '@/components/Hero';
import { Steps, Features, SectionHead } from '@/components/Steps';
import { ActivationWizard } from '@/components/ActivationWizard';
import { LiveStats } from '@/components/LiveStats';
import { LicenseChecker } from '@/components/LicenseChecker';
import { Pricing } from '@/components/Pricing';
import { Reveal } from '@/components/ui';

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />

        <Marquee
          tone="sun"
          items={[
            'ACTIVATION TOOLKIT',
            'MAGIC LINK 15 MENIT',
            'REAL-TIME STATUS',
            '3 LANGKAH SELESAI',
            'VAN313 | OFFICIAL',
          ]}
        />

        {/* TOOLKIT */}
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <Reveal>
            <SectionHead
              kicker="konsol aktivasi"
              title={
                <>
                  SATU KONSOL.
                  <br />
                  TIGA LANGKAH<span className="text-lime-dark">.</span>
                </>
              }
              desc="Alur yang sama seperti spesifikasi awal, sekarang berjalan di sistem milikmu sendiri: kirim link, tempel balik cookie dan magic link, lalu lisensi terbit. Setiap respons tampil real-time di terminal."
            />
          </Reveal>
          <Reveal delay={80}>
            <ActivationWizard />
          </Reveal>
        </section>

        <Marquee
          tone="ink"
          items={['SEND LINK', 'VERIFY', 'ISSUE LICENSE', 'CHECK STATUS', 'DONE']}
        />

        {/* STATUS */}
        <section id="status" className="scroll-mt-24 border-b-[3px] border-ink bg-paper">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
            <Reveal>
              <SectionHead
                kicker="status real-time"
                title={
                  <>
                    SERVER TIDAK
                    <br />
                    PERNAH DIAM<span className="text-lime-dark">.</span>
                  </>
                }
                desc="Panel status menarik /api/stats setiap 15 detik. Feed aktivasi di bawahnya menampilkan lisensi yang baru saja terbit — email selalu disamarkan."
              />
            </Reveal>
            <Reveal delay={80}>
              <LiveStats />
            </Reveal>
          </div>
        </section>

        {/* CARA KERJA */}
        <section className="border-b-[3px] border-ink bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
            <Reveal>
              <SectionHead
                kicker="alur kerja"
                title={
                  <>
                    DARI EMAIL
                    <br />
                    KE LISENSI<span className="text-lime-dark">.</span>
                  </>
                }
                desc="Tidak ada langkah tersembunyi. Setiap tahap punya endpoint sendiri yang bisa kamu panggil langsung lewat curl."
              />
            </Reveal>
            <Reveal delay={80}>
              <Steps />
            </Reveal>

            <div className="mt-14">
              <Reveal>
                <SectionHead kicker="kenapa berbeda" title="DETAIL YANG BIKIN AMAN." />
              </Reveal>
              <Reveal delay={60}>
                <Features />
              </Reveal>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="plans" className="scroll-mt-24 border-b-[3px] border-ink">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
            <Reveal>
              <SectionHead
                kicker="pilihan plan"
                title={
                  <>
                    TIGA TINGKAT.
                    <br />
                    SATU HARGA<span className="text-lime-dark">.</span>
                  </>
                }
                desc="Starter untuk mencoba, VIP Pro untuk pemakaian harian, Studio untuk tim. Semua plan memakai alur aktivasi yang identik."
              />
            </Reveal>
            <Reveal delay={80}>
              <Pricing />
            </Reveal>
          </div>
        </section>

        {/* CEK LISENSI */}
        <section id="cek" className="scroll-mt-24 border-b-[3px] border-ink bg-lime">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="grid items-start gap-8 lg:grid-cols-[1fr_1fr]">
              <Reveal>
                <div>
                  <span className="chip mb-3 bg-ink text-paper">verifikasi mandiri</span>
                  <h2 className="display text-4xl leading-[0.9] sm:text-5xl">
                    CEK LISENSI
                    <br />
                    KAPAN SAJA<span className="text-white">.</span>
                  </h2>
                  <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ink/75">
                    Tempel kunci lisensi atau order ID. Sistem akan mencocokkan catatan server dan menampilkan sisa
                    masa aktif beserta checksum-nya.
                  </p>
                  <ul className="mt-6 space-y-2">
                    {['Tanpa login', 'Hasil instan', 'Email tetap disamarkan'].map((t) => (
                      <li key={t} className="flex items-center gap-2 font-mono text-[11px] font-black uppercase tracking-wider">
                        <span className="flex h-5 w-5 items-center justify-center border-2 border-ink bg-white">
                          ✓
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={80}>
                <LicenseChecker />
              </Reveal>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 border-b-[3px] border-ink bg-white">
          <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
            <Reveal>
              <SectionHead
                kicker="pusat bantuan"
                align="center"
                title="PERTANYAAN SERING DIAJUKAN"
                desc="Enam hal yang paling sering ditanyakan soal alur, keamanan, dan penyimpanan data."
              />
            </Reveal>
            <Reveal delay={60}>
              <Faq />
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
