"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function HomePage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const value = code.trim().toUpperCase();
    if (!value) return;

    router.push(`/transaction/${value}`);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center px-4 py-10">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-xl p-8 animate-fade-up">

        {/* LOGO */}
        <div className="flex justify-center mb-8 animate-fade-in-slow">
          <Image
            src="/logo.png"
            alt="RW Capital Holding"
            width={220}
            height={90}
            priority
          />
        </div>

        {/* TITLE */}
        <h1 className="text-xl font-semibold text-center mb-2">
          Seguimiento de transferencia
        </h1>

        <p className="text-sm text-neutral-400 text-center mb-6">
          Ingresa tu código de seguimiento proporcionado por RW Capital
        </p>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Ej: RWC-1767607940321"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="
              w-full rounded-lg bg-neutral-950 border border-neutral-800
              px-4 py-3 text-sm text-white
              placeholder-neutral-500
              focus:outline-none focus:ring-2 focus:ring-yellow-500
            "
          />

          <button
            type="submit"
            className="
              w-full bg-yellow-500 hover:bg-yellow-400 text-black
              font-medium py-3 rounded-lg transition
            "
          >
            Consultar estado
          </button>
        </form>

        {/* FOOTER */}
        <p className="mt-6 text-xs text-neutral-500 text-center">
          RW Capital Holding · Secure transfer tracking
        </p>
      </div>
    </div>
  );
}
