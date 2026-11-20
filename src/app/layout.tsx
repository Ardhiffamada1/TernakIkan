import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@fortawesome/fontawesome-svg-core/styles.css';
import { config } from '@fortawesome/fontawesome-svg-core';
import { Navigation } from '@/components/Navigation';

// Prevent FontAwesome from adding its CSS since we imported it above
config.autoAddCss = false;

export const metadata: Metadata = {
  title: 'TernakIkan — Manajemen Kolam & Budidaya Ikan',
  description: 'Aplikasi pencatatan kolam, umur ikan, pakan harian, dan kalkulator dosis vitamin untuk peternak ikan kecil.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TernakIkan',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1E40AF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased font-sans">
        <Navigation>{children}</Navigation>
      </body>
    </html>
  );
}
