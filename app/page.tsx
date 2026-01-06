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
    <div className="flex justify-center px-4 py-24">
      <div className="w-full max-w-md card-fintech animate-fade-up">

        {/* LOGO */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="RW Capital Holding"
            width={180}
            height={70}
            priority
          />
        </div>

        <h1 className="text-title-lg text-center mb-2">
          Seguimiento de transferencia
        </h1>

        <p className="text-body text-center text-neutral-600 mb-6">
          Ingresa el código de seguimiento proporcionado por RW Capital
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Ej: 1607940321"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="
              w-full rounded-lg border border-neutral-300
              px-4 py-3 text-sm
              focus:outline-none focus:ring-2 focus:ring-[#3B5BDB]
            "
          />

          <button
            type="submit"
            className="
              w-full bg-[#3B5BDB] hover:bg-[#2F4AC6]
              text-white font-medium py-3 rounded-lg transition
            "
          >
            Consultar estado
          </button>
        </form>

        <p className="mt-6 text-small text-center">
          RW Capital Holding · Secure transfer tracking
        </p>
      </div>
    </div>
  );
}
