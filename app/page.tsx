"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/* =========================
   VALIDACIÓN TRACKING CODE
   ========================= */
function isValidTrackingCode(value: string) {
  return /^RWC-\d+$/.test(value.trim());
}

export default function HomePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

 async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!code.trim()) return;

  const res = await fetch("/api/resolve-transaction", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      wiseId: code.trim(),
    }),
  });

  if (!res.ok) {
    alert("No encontramos una transferencia con ese código");
    return;
  }

  const data = await res.json();

  router.push(`/transaction/${data.transactionId}`);
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
          Ingresa tu código de seguimiento para ver el estado de tu operación
        </p>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Ej: RWC-1767607940321"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            className={`
              w-full rounded-lg bg-neutral-950 border
              px-4 py-3 text-sm text-white
              placeholder-neutral-500
              focus:outline-none focus:ring-2
              ${
                error
                  ? "border-red-500 focus:ring-red-500"
                  : "border-neutral-800 focus:ring-yellow-500"
              }
            `}
          />

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            className="
              w-full bg-yellow-500 hover:bg-yellow-400
              text-black font-medium py-3 rounded-lg
              transition
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
