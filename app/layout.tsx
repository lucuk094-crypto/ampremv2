import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AM Prem.ID — All-in-One Activation Toolkit',
  description:
    'AM Prem.ID: toolkit aktivasi lisensi all-in-one. Verifikasi mandiri, penerbitan lisensi instan, dan dashboard status real-time. Dikembangkan oleh Van313 | Official.',
  keywords: ['AM Prem.ID', 'Van313', 'activation toolkit', 'lisensi', 'brutalist'],
  authors: [{ name: 'Van313 | Official' }],
  openGraph: {
    title: 'AM Prem.ID — All-in-One Activation Toolkit',
    description: 'Aktivasi lisensi instan. Verifikasi mandiri. Status real-time.',
    type: 'website',
    locale: 'id_ID',
    siteName: 'AM Prem.ID',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0A0A0A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
