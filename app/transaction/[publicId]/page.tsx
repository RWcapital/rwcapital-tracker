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
{(() => {
  // 1. Generamos un hash aleatorio de 5 caracteres para romper el caché (ej: 1912280005-x8k2j)
  const randomHash = Math.random().toString(36).substring(2, 7);
  const shareSlug = `${tx.publicId}-${randomHash}`;
  
  // 2. Apuntamos a la ruta /track/ que es la que tiene la lógica de la imagen azul
  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/track/${shareSlug}`;

  const whatsappMessage = encodeURIComponent(
`💸 *Transferencia enviada*

*Monto:* ${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${tx.currency}
*Destino:* ${tx.recipientName || tx.businessName}

*Seguimiento:*
${shareUrl}`
  );

  return (
    <a
      href={`https://wa.me/?text=${whatsappMessage}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1EBE5D] transition shadow-md"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      Compartir por WhatsApp
    </a>
  );
})()}




</div>



        </div>
      </div>
    </div>
  </div>
);



}
