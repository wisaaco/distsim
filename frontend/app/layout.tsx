import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/ui/Navigation';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'DistSim — Learn Distributed Systems by Building Them',
    template: '%s | DistSim',
  },
  description:
    'No VPS needed. No cloud bills. Build, break, and debug real distributed infrastructure — all on your machine. Learn the 6 layers every company uses, from single server to Netflix-scale.',
  keywords: [
    'distributed systems',
    'learning platform',
    'infrastructure simulation',
    'kubernetes',
    'microservices',
    'devops',
    'system design',
    'load balancing',
    'nginx',
    'postgresql',
    'redis',
    'kafka',
    'chaos engineering',
    'observability',
  ],
  authors: [{ name: 'DistSim' }],
  creator: 'DistSim',
  metadataBase: new URL('https://distsim.dev'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://distsim.dev',
    siteName: 'DistSim',
    title: 'DistSim — Learn Distributed Systems by Building Them',
    description:
      'Simulate real distributed infrastructure. Install services, configure networking, inject chaos, and debug failures — no cloud bills.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DistSim — Learn Distributed Systems by Building Them',
    description:
      'Build, break, and debug real distributed infrastructure on your machine. Free and open source.',
    creator: '@distsim',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="flex h-full flex-col overflow-hidden bg-[#0a0a0a] font-sans text-[#fafafa]">
        <Navigation />
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
