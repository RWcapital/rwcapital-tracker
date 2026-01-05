import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-neutral-900 border border-neutral-800 rounded-xl p-8 animate-fade-up">

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="RW Capital Holding"
            width={180}
            height={60}
            priority
          />
        </div>

        {/* ERROR CODE */}
        <h1 className="text-5xl font-bold text-yellow-500 mb-2">
          404
        </h1>

        <p className="text-lg font-medium mb-2">
          Esta página no existe
        </p>

        <p className="text-sm text-neutral-400 mb-6">
          El enlace que estás buscando no es válido o la transacción no fue encontrada.
        </p>

        {/* CTA */}
        <Link
          href="/"
          className="inline-block w-full bg-yellow-500 hover:bg-yellow-400 text-black font-medium py-2 rounded-lg transition"
        >
          Volver al inicio
        </Link>

        {/* FOOTER */}
        <div className="mt-6 text-xs text-neutral-500">
          RW Capital Holding · Transaction Tracker
        </div>
      </div>
    </div>
  );
}
