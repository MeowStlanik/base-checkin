'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  BaseError,
  ContractFunctionRevertedError,
} from 'viem';
import { base } from 'viem/chains';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { toast } from 'react-hot-toast';

const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const BASE_CHAIN_ID_DEC = 8453;
const BASE_CHAIN_ID_HEX = '0x2105';

const ABI = [
  { type: 'function', name: 'checkIn', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  {
    type: 'function',
    name: 'getMyData',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'bool' }],
  },
] as const;

export default function CheckIn() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const publicClient = useMemo(() => createPublicClient({ chain: base, transport: http() }), []);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [streak, setStreak] = useState<number | null>(null);
  const [checkedToday, setCheckedToday] = useState(false);

  const wrongNetwork = isConnected && chainId !== BASE_CHAIN_ID_DEC;

  const connectSingle = async () => {
    const injected =
      connectors.find(c => c.id === 'injected') ||
      connectors.find(c => /meta|coinbase|rabby/i.test(c.name)) ||
      connectors[0];
    if (!injected) return toast.error('No wallet connector found');
    await connect({ connector: injected });
  };

  // ✅ Ждём пока chainId реально обновится
  const waitForChainId = async (targetChainId: number, maxAttempts = 15): Promise<boolean> => {
    const eth = (window as any)?.ethereum;
    if (!eth) return false;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const currentChainId = await eth.request({ method: 'eth_chainId' });
        const chainIdDec = parseInt(currentChainId, 16);
        console.log(`Attempt ${i + 1}: chainId = ${chainIdDec}`);
        if (chainIdDec === targetChainId) {
          console.log('✅ Chain switched successfully!');
          return true;
        }
      } catch (e) {
        console.error('Error checking chainId:', e);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
  };

  // ✅ ПЕРЕКЛЮЧЕНИЕ СЕТИ
  const switchToBase = async (): Promise<boolean> => {
    const eth = (window as any)?.ethereum;
    if (!eth) {
      toast.error('Wallet not found');
      return false;
    }

    try {
      console.log('Starting network switch to Base...');
      
      // Метод 1: Через wagmi
      if (switchChainAsync) {
        try {
          console.log('Trying wagmi switchChain...');
          await switchChainAsync({ chainId: BASE_CHAIN_ID_DEC });
          const success = await waitForChainId(BASE_CHAIN_ID_DEC);
          if (success) return true;
        } catch (wagmiError: any) {
          console.log('Wagmi switch failed:', wagmiError.message);
        }
      }

      // Метод 2: Напрямую через window.ethereum
      console.log('Trying direct ethereum switch...');
      try {
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID_HEX }],
        });
        const success = await waitForChainId(BASE_CHAIN_ID_DEC);
        if (success) return true;
      } catch (switchError: any) {
        // Если сеть не добавлена - добавляем
        if (switchError.code === 4902) {
          console.log('Adding Base network...');
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID_HEX,
              chainName: 'Base',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
          const success = await waitForChainId(BASE_CHAIN_ID_DEC);
          return success;
        }
        throw switchError;
      }

      return false;
    } catch (error: any) {
      console.error('Switch network error:', error);
      if (error.code === 4001) {
        toast.error('You rejected the network switch');
      } else {
        toast.error('Failed to switch network');
      }
      return false;
    }
  };

  // локальная блокировка до полуночи UTC
  const utcDay = (tsMs = Date.now()) => Math.floor(tsMs / 86400000);
  const keyForToday = (addr: string) =>
    `checkin:${CONTRACT}:${BASE_CHAIN_ID_DEC}:${addr.toLowerCase()}:${utcDay()}`;

  useEffect(() => {
    if (!address) { setCheckedToday(false); return; }
    const localLocked = !!localStorage.getItem(keyForToday(address));
    if (localLocked) setCheckedToday(true);

    const now = Date.now();
    const nextMidnightUtc = (utcDay(now) + 1) * 86400000;
    const t = setTimeout(() => {
      if (address) localStorage.removeItem(keyForToday(address));
      setCheckedToday(false);
    }, nextMidnightUtc - now);
    return () => clearTimeout(t);
  }, [address]);

  // чтение данных
  const refresh = async () => {
    if (!address) { setStreak(null); setCheckedToday(false); return; }
    setMsg('');
    try {
      const [_, streakBn, today] = (await publicClient.readContract({
        address: CONTRACT,
        abi: ABI,
        functionName: 'getMyData',
        args: [address],
      })) as [bigint, bigint, boolean];

      setStreak(Number(streakBn));
      if (today && address) localStorage.setItem(keyForToday(address), '1');
      setCheckedToday(today || !!localStorage.getItem(keyForToday(address)));
    } catch (e: any) {
      setMsg(e?.shortMessage || e?.message || 'Read failed');
    }
  };

  useEffect(() => { 
    if (isConnected && !wrongNetwork) refresh(); 
  }, [isConnected, address, wrongNetwork]);

  // ✅ ГЛАВНАЯ ФУНКЦИЯ
  const onCheckIn = async () => {
    if (!isConnected || !address) {
      toast.error('Connect wallet first');
      return;
    }

    if (!window.ethereum) {
      toast.error('No wallet found');
      return;
    }

    setLoading(true);
    setMsg('');

    try {
      // ШАГ 1: Проверяем текущий chainId
      const currentChainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(currentChainIdHex, 16);
      
      console.log('Current chainId:', currentChainId);

      // ШАГ 2: Переключаем сеть если нужно
      if (currentChainId !== BASE_CHAIN_ID_DEC) {
        toast.loading('Switching to Base network...', { id: 'switch' });
        const switched = await switchToBase();
        
        if (!switched) {
          throw new Error('Failed to switch to Base network. Please switch manually.');
        }
        
        toast.success('Switched to Base!', { id: 'switch' });
      }

      // ШАГ 3: Ещё раз проверяем chainId перед транзакцией
      const finalChainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
      const finalChainId = parseInt(finalChainIdHex, 16);
      
      console.log('Final chainId before transaction:', finalChainId);
      
      if (finalChainId !== BASE_CHAIN_ID_DEC) {
        throw new Error(`Chain ID mismatch: expected ${BASE_CHAIN_ID_DEC}, got ${finalChainId}`);
      }

      // ШАГ 4: Создаём wallet БЕЗ жёсткой привязки к chain
      const wallet = createWalletClient({ 
        transport: custom(window.ethereum),
        account: address,
      });

      toast.loading('Preparing transaction...', { id: 'tx' });

      // Simulate на Base
      const { request } = await publicClient.simulateContract({
        address: CONTRACT,
        abi: ABI,
        functionName: 'checkIn',
        account: address,
      });

      console.log('Sending transaction...');
      const hash = await wallet.writeContract({
        ...request,
        chain: base, // ← Явно указываем Base для транзакции
      });
      
      console.log('Transaction hash:', hash);
      
      toast.loading('Waiting for confirmation...', { id: 'tx' });
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        if (address) localStorage.setItem(keyForToday(address), '1');
        setCheckedToday(true);
        toast.success('✅ Checked in successfully!', { id: 'tx' });
        await refresh();
      } else {
        throw new Error('Transaction failed');
      }

    } catch (err: any) {
      console.error('CheckIn error:', err);
      
      let reason = 'Transaction failed';
      
      if (err?.message?.includes('rejected') || err?.code === 4001) {
        reason = 'You rejected the request';
      } else if (err?.message?.includes('switch') || err?.message?.includes('Chain ID')) {
        reason = err.message;
      } else if (err instanceof BaseError) {
        const rev = err.walk(e => e instanceof ContractFunctionRevertedError);
        if (rev) {
          const name = (rev as ContractFunctionRevertedError).name;
          const args = ((rev as ContractFunctionRevertedError).args ?? []).map(String).join(', ');
          reason = name ? `${name}${args ? ` (${args})` : ''}` : 'Contract reverted';
        } else {
          reason = err.shortMessage || err.message;
        }
      } else {
        reason = err?.shortMessage || err?.message || reason;
      }
      
      setMsg(reason);
      toast.error(reason, { id: 'tx' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Daily Check-In</h2>
        {isConnected && (
          <span className={`px-3 py-1 rounded-full text-xs border ${
            wrongNetwork 
              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
              : 'bg-green-500/20 text-green-400 border-green-500/30'
          }`}>
            {wrongNetwork ? `⚠️ Chain ${chainId}` : '✓ Base (8453)'}
          </span>
        )}
      </div>

      {!isConnected ? (
        <button 
          onClick={connectSingle} 
          disabled={isConnecting}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium disabled:opacity-50"
        >
          {isConnecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            Connected: <span className="font-mono">{address?.slice(0,6)}...{address?.slice(-4)}</span>
          </div>
          <button 
            onClick={() => disconnect()} 
            className="text-xs text-gray-400 hover:text-gray-300"
          >
            Disconnect
          </button>
        </div>
      )}

      {isConnected && (
        <>
          <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/10 rounded-lg p-6">
            <div className="text-sm text-gray-400 mb-2">Current Streak</div>
            <div className="text-5xl font-bold">{streak ?? 0}</div>
          </div>

          <button
            onClick={onCheckIn}
            disabled={loading || checkedToday}
            className={`w-full py-4 rounded-lg font-medium transition-all
              ${checkedToday 
                ? 'bg-gray-700 cursor-not-allowed' 
                : loading 
                ? 'bg-blue-700 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-500'}
              disabled:opacity-50`}
          >
            {loading
              ? 'Processing...'
              : checkedToday
              ? '✓ Already checked in today'
              : wrongNetwork
              ? '🔄 Switch to Base & Check In'
              : 'Check In Today'}
          </button>
        </>
      )}

      {msg && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
          {msg}
        </div>
      )}

      <details className="pt-2 border-t border-white/10 text-xs text-gray-500">
        <summary className="cursor-pointer hover:text-gray-400">Contract Info</summary>
        <div className="mt-2 font-mono space-y-1">
          <div>Address: {CONTRACT}</div>
          <div>Network: Base (8453)</div>
        </div>
      </details>
    </div>
  );
}