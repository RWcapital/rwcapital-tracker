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
      recipientName: true, // ✅ IMPORTANTE
    },
  });

  if (!tx) {
    return {
      title: "Transfer in progress",
      description: "Transfer tracking",
      openGraph: {
        title: "Transfer in progress",
        description: "Transfer tracking",
      },
    };
  }

  const amount = Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });

  // ✅ DESTINATARIO CORRECTO
  const recipient = tx.recipientName || tx.businessName;

  const title = `${amount} ${tx.currency}`;
  const description = `Arriving from ${recipient}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/transaction/${params.publicId}/og`,
          width: 1200,
          height: 630,
        },
      ],
    },
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
  <div className="min-h-screen bg-[#F7F8FA] flex justify-center px-4 py-12">
    <div className="w-full max-w-2xl">

      {/* CARD PRINCIPAL */}
      <div className="bg-white rounded-2xl border border-[#E6E8EB] shadow-sm overflow-hidden animate-fade-up">

        {/* HEADER */}
        <div className="px-8 py-6 border-b border-[#E6E8EB] flex justify-center">
          <Image
            src="/logo.png"
            alt="RW Capital"
            width={160}
            height={48}
            priority
          />
        </div>

        {/* BODY */}
        <div className="px-8 py-8">

          {/* STATUS */}
          <div className="text-center mb-10">
            <span
              className={`inline-flex px-4 py-1.5 rounded-full text-xs font-semibold mb-4 ${
                isCompleted
                  ? "bg-green-50 text-green-700"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {isCompleted ? "Transferencia completada" : "Transferencia en progreso"}
            </span>

            <h1 className="text-3xl font-semibold text-[#0A0A0A] mb-2">
              {isCompleted ? "Enviado a" : "Enviando a"}
            </h1>

            <p className="text-xl font-medium text-[#3B5BDB]">
              {displayName}
            </p>

            <p className="text-sm text-[#6B7280] mt-3">
              Iniciado el{" "}
              {new Date(tx.createdAt).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* TIMELINE */}
          <div className="mb-10">
            <ol className="relative ml-4">
              {enrichedTimeline.map((e, i) => (
                <li
                  key={i}
                  className="relative pl-8 pb-8 timeline-item"
                  style={{ animationDelay: `${i * 160}ms` }}
                >
                  {i !== enrichedTimeline.length - 1 && (
                    <span
                      className={`absolute left-[6px] top-4 h-full w-px ${
                        e.completed ? "bg-[#3B5BDB]" : "bg-[#E6E8EB]"
                      }`}
                    />
                  )}

                  <span
                    className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                      e.completed
                        ? "bg-[#3B5BDB] border-[#3B5BDB]"
                        : "bg-white border-[#CBD5E1]"
                    } ${
                      e.isCurrent ? "ring-4 ring-[#3B5BDB]/20" : ""
                    }`}
                  />

                  <p className="text-xs text-[#8A8F98]">
                    {e.date
                      ? new Date(e.date).toLocaleString("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "Pendiente"}
                  </p>

                  <p
                    className={`text-sm ${
                      e.completed
                        ? "text-[#0A0A0A]"
                        : "text-[#6B7280]"
                    }`}
                  >
                    {e.label}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* DETALLES */}
          <div className="bg-[#F9FAFB] border border-[#E6E8EB] rounded-xl p-6 text-sm space-y-3">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Beneficiario</span>
              <span className="font-medium text-[#0A0A0A]">{displayName}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#6B7280]">Monto enviado</span>
              <span className="font-medium text-[#0A0A0A]">
                {Number(tx.amount).toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                })}{" "}
                {tx.currency}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#6B7280]">Referencia</span>
              <span className="text-[#0A0A0A]">{tx.reference || "—"}</span>
            </div>
          </div>

        {/* CTA */}
<div className="mt-8 flex flex-col items-center gap-4 text-center">
  {/* Descargar PDF */}
  <a
    href={`/api/receipt/${tx.publicId}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm font-medium text-[#3B5BDB] hover:text-[#2F4AC6] transition"
  >
    Descargar comprobante en PDF
  </a>

  {/* Compartir por WhatsApp */}
  <a
    href={`https://wa.me/?text=${encodeURIComponent(
      `${process.env.NEXT_PUBLIC_BASE_URL}/transaction/${tx.publicId}/share`
    )}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#1EBE5D] transition shadow-md"
  >
    {/* Icono WhatsApp */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="currentColor"
      className="h-5 w-5"
    >
      <path d="M19.11 17.2c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.47-1.74-1.64-2.03-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.08 2.9 1.23 3.1.15.2 2.12 3.23 5.15 4.53.72.31 1.28.5 1.72.64.72.23 1.37.2 1.88.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
      <path d="M16.04 2.67c-7.33 0-13.3 5.97-13.3 13.3 0 2.35.62 4.65 1.8 6.67L2.5 29.33l6.86-1.99c1.96 1.07 4.16 1.63 6.4 1.63 7.33 0 13.3-5.97 13.3-13.3 0-7.33-5.97-13.3-13.3-13.3zm0 23.91c-2.07 0-4.1-.55-5.86-1.6l-.42-.25-4.07 1.18 1.19-3.96-.27-.41a10.6 10.6 0 01-1.66-5.66c0-5.88 4.78-10.66 10.66-10.66 5.88 0 10.66 4.78 10.66 10.66 0 5.88-4.78 10.66-10.66 10.66z" />
    </svg>

    Compartir por WhatsApp
  </a>
</div>



        </div>
      </div>
    </div>
  </div>
);



}
