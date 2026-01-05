'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [code, setCode] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    router.push(`/transaction/${code.trim()}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Transaction Tracker
        </h1>

        <p className="text-sm text-zinc-400 mb-6">
          Enter your transaction tracking ID
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="e.g. RWC-TEST-001"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />

          <button
            type="submit"
            className="w-full rounded-md bg-yellow-500 py-2 font-medium text-black hover:bg-yellow-400 transition"
          >
            Track Transaction
          </button>
        </form>
      </div>
    </main>
  );
}
