import './globals.css';
import Providers from './providers';
import { Toaster } from 'react-hot-toast';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://checkin-base.vercel.app'),
  title: 'Base Check-In',
  description: 'Daily on-chain check-ins on Base',
  openGraph: {
    title: 'Base Check-In',
    description: 'Daily on-chain check-ins on Base',
    url: 'https://checkin-base.vercel.app',
    images: ['/blue-hero.png'], // стандартное превью для OG
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageURL: 'https://checkin-base.vercel.app/blue-hero.png', // ключ строго imageURL!
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
