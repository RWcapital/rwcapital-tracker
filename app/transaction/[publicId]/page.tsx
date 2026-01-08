import Image from "next/image";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

/* ──────────────────────────────
   METADATA
────────────────────────────── */
export async function generateMetadata(
  { params }: { params: { publicId: string } }
): Promise<Metadata> {
  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { publicId: params.publicId },
        { wiseTransferId: params.publicId },
      ],
    },
    select: {
      amount: true,
      currency: true,
      businessName: true,
      status: true,
    },
  });

  if (!tx) {
    return {
      title: "Transfer in progress",
      description: "Transfer tracking",
    };
  }

  const amount = Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });

  const isCompleted = mapStatusToStep(tx.status) === "COMPLETED";

  const title = `${amount} ${tx.currency} · ${
    isCompleted ? "Transfer completed" : "Transfer in progress"
  }`;

  return {
    title,
    description: `Arriving from ${tx.businessName}`,
  };
}

export const dynamic = "force-dynamic";

/* ──────────────────────────────
   HELPERS
────────────────────────────── */
const normalize = (str: string) =>
  str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const CBPAY_STEPS = [
  { key: "CREATED", label: "Creaste tu transferencia" },
  { key: "FUNDS_TAKEN", label: "Hemos tomado los fondos" },
  { key: "SENT", label: "Hemos enviado tus USD" },
  {
    key: "PROCESSING_BY_BANK",
    label: "El banco está procesando la transferencia",
  },
  { key: "COMPLETED", label: "Transferencia completada" },
];

function mapStatusToStep(status: string) {
  const s = status.toUpperCase();

  if (["CREATED", "PENDING"].includes(s)) return "CREATED";
  if (["FUNDS_RECEIVED", "FUNDS_TAKEN"].includes(s)) return "FUNDS_TAKEN";
  if (["SENT", "FUNDS_SENT", "OUTGOING_PAYMENT_SENT"].includes(s)) return "SENT";
  if (["PROCESSING", "PROCESSING_BY_BANK"].includes(s))
    return "PROCESSING_BY_BANK";
  if (["COMPLETED", "SUCCESS"].includes(s)) return "COMPLETED";

  return "PROCESSING_BY_BANK";
}

/* ──────────────────────────────
   PAGE
────────────────────────────── */
export default async function TransactionPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  // 1️⃣ Primer intento normal
  let tx = await prisma.transaction.findFirst({
    where: {
      OR: [{ publicId }, { wiseTransferId: publicId }],
    },
    include: {
      events: {
        orderBy: { occurredAt: "asc" },
      },
    },
  });

  // 2️⃣ Fallback: fetch on-demand desde Wise
  if (!tx) {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/transaction/fetch-wise/${publicId}`,
        { cache: "no-store" }
      );
    } catch {
      // silencioso: si Wise no la tiene, no rompemos la página
    }

    // 3️⃣ Reintento después del fetch
    tx = await prisma.transaction.findFirst({
      where: {
        OR: [{ publicId }, { wiseTransferId: publicId }],
      },
      include: {
        events: {
          orderBy: { occurredAt: "asc" },
        },
      },
    });
  }

  // 4️⃣ Si aún no existe → fallback visual
  if (!tx) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="bg-white border rounded-xl p-8 text-center">
          <h1 className="text-lg font-semibold">Transferencia en progreso</h1>
          <p className="text-sm text-gray-500 mt-2">
            Estamos obteniendo el estado más reciente.
          </p>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────
     TIMELINE
  ────────────────────────────── */
  const currentStepKey = mapStatusToStep(tx.status);
  const currentStepIndex = CBPAY_STEPS.findIndex(
    (s) => s.key === currentStepKey
  );

  const enrichedTimeline = CBPAY_STEPS.map((step, index) => {
    const relatedEvent = tx.events.find((e) =>
      normalize(e.label).includes(normalize(step.label))
    );

    return {
      label: step.label,
      completed: index <= currentStepIndex,
      isCurrent: index === currentStepIndex,
      date:
        relatedEvent?.occurredAt?.toISOString() ??
        (index <= currentStepIndex ? tx.updatedAt?.toISOString() : null),
    };
  });

  const displayName =
    tx.recipientName && tx.recipientName.trim() !== ""
      ? tx.recipientName
      : "Cuenta Wise";

  const isCompleted = currentStepKey === "COMPLETED";

  /* ──────────────────────────────
     RENDER
  ────────────────────────────── */
  return (
  <div className="min-h-screen bg-[#F7F8FA] flex justify-center px-4 py-10">
    <div className="w-full max-w-xl bg-white rounded-xl border p-8 shadow-xl animate-fade-up">
      <div className="flex justify-center mb-8">
        <Image src="/logo.png" alt="RW Capital" width={160} height={48} />
      </div>

      <div className="text-center mb-10">
        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mb-4 transition-opacity duration-700 ease-out">
          {isCompleted ? "Transferencia completada" : "En progreso"}
        </span>

        <h1 className="text-3xl font-bold mb-2">
          {isCompleted ? "Enviado a" : "Enviando a"}
          <br />
          <span className="text-blue-600">{displayName}</span>
        </h1>

        <p className="text-sm text-gray-500">
          Iniciado el{" "}
          {new Date(tx.createdAt).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Timeline — estilo Wise */}
      <ol className="relative ml-4 border-l-2 border-gray-200 transition-colors duration-700 ease-out">
        {enrichedTimeline.map((e, i) => (
         <li
            key={i}
             className={`pl-8 pb-8 transition-opacity duration-700 ease-out ${
              e.completed ? "opacity-100" : "opacity-50"
               } ${e.isCurrent ? "animate-[wisePulse_2.8s_ease-in-out_infinite]" : ""}`}
                >


            <span
              className={`absolute -left-[9px] mt-1 h-4 w-4 rounded-full transition-colors duration-700 ease-out ${
                e.completed ? "bg-blue-600" : "bg-gray-300"
              }`}
            />

            <div
              className={`text-sm font-medium transition-colors duration-700 ease-out ${
                e.isCurrent ? "text-gray-900" : "text-gray-700"
              }`}
            >
              {e.label}
            </div>

            {e.date && (
              <div className="text-xs text-gray-400 mt-0.5">
                {new Date(e.date).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                })}
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-8 bg-gray-50 border rounded-lg p-6 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Beneficiario</span>
          <span className="font-semibold">{displayName}</span>
        </div>

        <div className="flex justify-between mt-2">
          <span className="text-gray-500">Monto enviado</span>
          <span className="font-semibold">
            {Number(tx.amount).toLocaleString("es-ES", {
              minimumFractionDigits: 2,
            })}{" "}
            {tx.currency}
          </span>
        </div>

        <div className="flex justify-between mt-2">
          <span className="text-gray-500">Referencia</span>
          <span>{tx.reference || "—"}</span>
        </div>
      </div>

      <div className="mt-6 text-center">
        <a
          href={`/api/receipt/${tx.publicId}`}
          target="_blank"
          className="text-blue-600 text-sm font-medium transition-colors duration-300 hover:text-blue-700"
        >
          Descargar comprobante en PDF
        </a>
      </div>
    </div>
  </div>
);


}
