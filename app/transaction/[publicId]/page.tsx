import Image from "next/image";
import { prisma } from "@/lib/prisma";

/* ⚠️ IMPORTANTE: evitar cache en producción */
export const dynamic = "force-dynamic";

/* ──────────────────────────────
   CONFIGURACIÓN Y HELPERS
────────────────────────────── */

const WISE_TIMELINE_STEPS = [
  "El remitente ha creado tu transferencia",
  "Hemos recibido los fondos",
  "Tu dinero está en camino",
  "El dinero se mueve",
  "Tu dinero debería haber llegado",
];

const normalize = (str: string) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/* ──────────────────────────────
   TIPOS UI
────────────────────────────── */
type TimelineEvent = {
  date: string;
  label: string;
};

/* ──────────────────────────────
   PAGE
────────────────────────────── */
export default async function TransactionPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  /* ──────────────────────────────
     1️⃣ LEER DESDE PRISMA (PROD SAFE)
  ────────────────────────────── */
  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [{ publicId }, { wiseTransferId: publicId }],
    },
    include: {
      events: {
        orderBy: { occurredAt: "asc" },
      },
    },
  });

  /* ──────────────────────────────
     2️⃣ ESTADO DE ESPERA (NO notFound)
  ────────────────────────────── */
  if (!tx) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="bg-white border border-[#E6E8EB] rounded-xl p-8 shadow-lg max-w-md text-center">
          <h1 className="text-xl font-semibold text-[#0A0A0A] mb-2">
            Procesando transferencia
          </h1>
          <p className="text-gray-500 text-sm">
            Estamos verificando el estado de la operación.
            <br />
            Vuelve a intentar en unos minutos.
          </p>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────
     3️⃣ DERIVAR TIMELINE DESDE EVENTS
  ────────────────────────────── */
  const timeline: TimelineEvent[] = tx.events.map((e) => ({
    date: e.occurredAt.toISOString(),
    label: e.label,
  }));

  /* ──────────────────────────────
     4️⃣ NOMBRE DEL BENEFICIARIO
  ────────────────────────────── */
  const displayName =
    tx.recipientName && tx.recipientName.trim() !== ""
      ? tx.recipientName
      : "Cuenta Wise";

  /* ──────────────────────────────
     5️⃣ ESTADO GLOBAL
  ────────────────────────────── */
  const statusUpper = tx.status.toUpperCase();

  const COMPLETED_STATUSES = [
    "COMPLETED",
    "SUCCESS",
    "SENT",
    "FUNDS_SENT",
    "OUTGOING_PAYMENT_SENT",
  ];

  const hasFinalEvent = timeline.some(
    (e) =>
      normalize(e.label).includes("llegado") ||
      normalize(e.label).includes("completado")
  );

  const isGlobalCompleted =
    COMPLETED_STATUSES.includes(statusUpper) || hasFinalEvent;

  /* ──────────────────────────────
     6️⃣ CONSTRUIR TIMELINE VISUAL
  ────────────────────────────── */
  let lastCompletedIndex = -1;

  if (isGlobalCompleted) {
    lastCompletedIndex = WISE_TIMELINE_STEPS.length - 1;
  } else {
    WISE_TIMELINE_STEPS.forEach((stepLabel, index) => {
      const exists = timeline.some(
        (e) =>
          normalize(e.label).includes(normalize(stepLabel)) ||
          normalize(stepLabel).includes(normalize(e.label))
      );
      if (exists) lastCompletedIndex = index;
    });
  }

  const fallbackDate = tx.createdAt.toISOString();

  const enrichedTimeline = WISE_TIMELINE_STEPS.map((label, index) => {
    const realEvent = timeline.find(
      (e) =>
        normalize(e.label).includes(normalize(label)) ||
        normalize(label).includes(normalize(e.label))
    );

    const isStepCompleted = index <= lastCompletedIndex;

    return {
      label,
      completed: isStepCompleted,
      isCurrent: index === lastCompletedIndex && !isGlobalCompleted,
      date: isStepCompleted ? realEvent?.date ?? fallbackDate : null,
    };
  });

  /* ──────────────────────────────
     7️⃣ RENDER
  ────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-white rounded-xl border border-[#E6E8EB] p-8 shadow-xl">

        {/* HEADER */}
        <div className="text-center mb-10">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
              isGlobalCompleted
                ? "bg-blue-100 text-blue-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {isGlobalCompleted
              ? "Transferencia completada"
              : "En Progreso"}
          </span>

          <h1 className="text-3xl font-bold text-[#0A0A0A] mb-2">
            {isGlobalCompleted ? "Enviado a" : "Enviando a"}
            <br />
            <span className="text-[#3B5BDB]">{displayName}</span>
          </h1>

          <p className="text-gray-500 text-sm">
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
        <ol className="relative ml-4 border-l-2 border-[#E6E8EB]">
          {enrichedTimeline.map((e, i) => (
            <li key={i} className="pl-8 pb-8">
              <span
                className={`absolute -left-[9px] mt-1 h-4 w-4 rounded-full ${
                  e.completed ? "bg-[#3B5BDB]" : "bg-[#E6E8EB]"
                }`}
              />
              <div>
                <div className="text-sm font-medium">{e.label}</div>
                {e.date && (
                  <div className="text-xs text-gray-400">
                    {new Date(e.date).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* RESUMEN */}
        <div className="mt-10 bg-[#F9FAFB] border border-[#E6E8EB] rounded-lg p-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Beneficiario</span>
            <span className="font-semibold">{displayName}</span>
          </div>

          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-500">Monto enviado</span>
            <span className="font-semibold">
              {Number(tx.amount).toLocaleString("es-ES", {
                minimumFractionDigits: 2,
              })}{" "}
              {tx.currency}
            </span>
          </div>

          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-500">Referencia</span>
            <span>{tx.reference || "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
