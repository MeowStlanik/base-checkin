'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export const config = createConfig({
  chains: [base], // ✅ только Base mainnet
  connectors: [
    injected(),
    metaMask(),
    coinbaseWallet({ appName: 'Base Check-In App' }),
  ],
  transports: {
    [base.id]: http('https://mainnet.base.org'), // ✅ транспорт именно Base
  },
  ssr: true,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
}
