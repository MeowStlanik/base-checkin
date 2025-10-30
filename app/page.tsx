'use client';
import dynamic from 'next/dynamic';
const CheckIn = dynamic(() => import('./components/CheckIn'), { ssr: false });

export default function Page() {
  return (
    <main className="min-h-screen bg-[#0f111a] text-white p-8">
      <h1 className="text-3xl font-bold text-center mb-2">Base Check-In</h1>
      <p className="text-center opacity-70 mb-8">
        Daily on-chain check-ins on Base • Track your streak
      </p>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-800/70 rounded-xl p-6 text-center">
          <div className="text-4xl font-semibold">#1</div>
          <div className="opacity-80">Your Rank (demo)</div>
        </div>
        <CheckIn />
      </div>
    </main>
  );
}
