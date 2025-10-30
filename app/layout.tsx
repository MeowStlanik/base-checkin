import './globals.css';
import Providers from './providers';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Base Check-In',
  description: 'Daily on-chain check-ins on Base',
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
