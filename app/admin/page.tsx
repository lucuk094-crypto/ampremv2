import { Nav, Footer } from '@/components/chrome';
import { AdminPanel } from '@/components/AdminPanel';

export const metadata = {
  title: 'Panel Admin — AM Prem.ID',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <span className="chip mb-4 bg-ink text-paper">internal</span>
        <h1 className="display text-4xl leading-[0.9] sm:text-5xl">
          PANEL
          <br />
          ADMIN<span className="text-lime-dark">.</span>
        </h1>
        <p className="mt-4 mb-8 max-w-xl text-[14px] leading-relaxed text-ink/70">
          Daftar seluruh order yang terbit, pencarian cepat, dan pencabutan lisensi. Halaman ini tidak diindeks mesin
          pencari dan dilindungi <code className="font-mono text-[12px]">ADMIN_KEY</code>.
        </p>
        <AdminPanel />
      </main>
      <Footer />
    </>
  );
}
