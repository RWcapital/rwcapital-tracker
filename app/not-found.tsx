import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-white border border-[#E6E8EB] rounded-2xl p-10 animate-fade-up shadow-sm">

        {/* LOGO */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="RW Capital Holding"
            width={180}
            height={60}
            priority
          />
        </div>

        {/* LÍNEA DECORATIVA */}
        <div className="w-12 h-1 bg-[#3B5BDB] rounded-full mx-auto mb-6"></div>

        {/* ERROR CODE */}
        <h1 className="text-6xl font-bold text-[#3B5BDB] mb-3">
          404
        </h1>

        <p className="text-xl font-semibold text-[#0A0A0A] mb-3">
          Página no encontrada
        </p>

        <p className="text-sm text-[#6B7280] mb-8">
          El enlace que estás buscando no es válido o la transacción no fue encontrada. Verifica el código de seguimiento e intenta nuevamente.
        </p>

        {/* CTA */}
        <Link
          href="/"
          className="inline-block w-full bg-[#3B5BDB] hover:bg-[#2F4AC6] text-white font-semibold py-3 rounded-lg transition duration-200"
        >
          Volver al inicio
        </Link>

        {/* FOOTER */}
        <div className="mt-8 text-xs text-[#9CA3AF]">
          RW Capital Holding · Transaction Tracker
        </div>
      </div>
    </div>
  );
}
