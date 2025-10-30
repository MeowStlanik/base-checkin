import './globals.css';
import Providers from './providers';
import { Toaster } from 'react-hot-toast';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://checkin-base.vercel.app'), // твой прод-домен
  title: 'Base Check-In',
  description: 'Daily on-chain check-ins on Base',
  openGraph: {
    title: 'Base Check-In',
    description: 'Daily on-chain check-ins on Base',
    url: 'https://checkin-base.vercel.app',
    images: ['/blue-hero.png'], // OG для превью вне Farcaster
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: 'https://checkin-base.vercel.app/blue-hero.png',
      button: {
        title: 'Open App',
        action: {
          type: 'launch_frame',
          url: 'https://checkin-base.vercel.app',
        },
      },
    }),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
