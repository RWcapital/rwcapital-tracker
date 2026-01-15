import Image from "next/image";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

/* ──────────────────────────────
   METADATA
────────────────────────────── */

// Función agregada para limpiar el ID
function extractPublicId(slug: string) {
  return slug.split("-")[0];
}

export async function generateMetadata(
  { params }: { params: { publicId: string } }
): Promise<Metadata> {
  // Limpiamos el ID para la consulta
  const cleanId = extractPublicId(params.publicId);

  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { publicId: cleanId },
        { wiseTransferId: cleanId },
      ],
    },
    select: {
      amount: true,
      currency: true,
      businessName: true,
      recipientName: true, 
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
          url: `/track/${params.publicId}/og`,
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
  const { publicId: rawPublicId } = await params;
  
  // Limpiamos el ID para que funcione con los nuevos links
  const publicId = extractPublicId(rawPublicId);

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
      // silencioso
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
    const relatedEvent = tx?.events.find((e) =>
      normalize(e.label).includes(normalize(step.label))
    );

    return {
      label: step.label,
      completed: index <= currentStepIndex,
      isCurrent: index === currentStepIndex,
      date:
        relatedEvent?.occurredAt?.toISOString() ??
        (index <= currentStepIndex ? tx?.updatedAt?.toISOString() : null),
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

      {/* CARD PRINCIPAL (Animación mantenida) */}
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

          {/* TIMELINE (Animaciones mantenidas) */}
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

{/* Compartir por WhatsApp (Lógica agregada manteniendo tus estilos) */}
{(() => {
  const randomHash = Math.random().toString(36).substring(2, 7);
  const shareSlug = `${tx.publicId}-${randomHash}`;
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
      className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#1EBE5D] transition shadow-md"
    >
      {/* Tu icono SVG original */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path d="M19.11 17.2c-.3-.15-1.77-.87-2.05-.97-2.02-.71-1.65-.51-2.01-.15-.36.36-1.54 1.93-1.89 2.33-.35.4-.7.44-1.28.15s-2.45-1.21-3.41-2.07c-.74-.66-1.25-1.48-1.4-1.74-.15-.26-.02-.4.13-.54.13-.13.3-.35.45-.53.15-.17.2-.29.3-.49s.05-.37-.02-.52c-.07-.15-.65-1.58-.89-2.17-.23-.58-.47-.5-.65-.51-.17-.01-.36-.01-.55-.01s-.5.07-.77.37c-.26.3-1.01 1.01-1.01 2.45s1.04 2.82 1.18 3.02c.15.2 2.04 3.12 4.94 4.38.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.11.56-.08 1.71-.7 1.95-1.38.24-.68.24-1.26.17-1.38-.07-.12-.26-.2-.55-.34z" />
        <path d="M16 0c-8.84 0-16 7.16-16 16 0 2.82.73 5.48 2.01 7.78l-2.01 7.34 7.51-1.97c2.2.98 4.64 1.53 7.19 1.53 8.84 0 16-7.16 16-16s-7.16-16-16-16zM16 29.33c-2.34 0-4.52-.6-6.42-1.64l-.46-.25-4.46 1.17 1.19-4.35-.28-.44c-1.14-1.81-1.81-3.95-1.81-6.25 0-6.44 5.23-11.67 11.67-11.67s11.67 5.23 11.67 11.67-5.23 11.67-11.67 11.67z" />
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