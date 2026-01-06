import Image from "next/image";
import { notFound } from "next/navigation";

/* ──────────────────────────────
   TIPOS (SIN CAMBIOS)
────────────────────────────── */
type TimelineEvent = {
  date: string;
  label: string;
};

type Transaction = {
  publicId: string;
  businessName: string;
  recipientName: string;
  amount: string;
  currency: string;
  status: string;
  reference?: string | null;
  createdAt?: string;
  timeline: TimelineEvent[];
};

/* ──────────────────────────────
   TIMELINE BASE (SIN CAMBIOS)
────────────────────────────── */
const WISE_TIMELINE = [
  "El remitente ha creado tu transferencia",
  "Hemos recibido el dinero",
  "Tu dinero está en camino",
  "El dinero se mueve a través de la red bancaria",
  "Tu dinero debería haber llegado a tu banco",
  "Transferencia completada",
];

/* ──────────────────────────────
   FETCH (SIN CAMBIOS)
────────────────────────────── */
async function getTransaction(publicId: string): Promise<Transaction | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transaction/${publicId}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;
  return res.json();
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
  const tx = await getTransaction(publicId);

  if (!tx) notFound();

  const isCompleted = tx.status?.toUpperCase() === "COMPLETED";

  /* ──────────────────────────────
     ÚLTIMA FECHA REAL (SIN CAMBIOS)
  ────────────────────────────── */
  const lastRealEvent = [...tx.timeline]
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    )
    .at(-1);

  const fallbackDate =
    lastRealEvent?.date ?? tx.createdAt ?? null;

  /* ──────────────────────────────
     ÍNDICE ÚLTIMO PASO COMPLETADO
  ────────────────────────────── */
  const lastCompletedIndex = WISE_TIMELINE.reduce(
    (acc, label, index) => {
      const exists = tx.timeline.some(
        e => e.label === label
      );
      return exists ? index : acc;
    },
    -1
  );

  /* ──────────────────────────────
     TIMELINE ENRIQUECIDO (SIN CAMBIOS)
  ────────────────────────────── */
  const enrichedTimeline = WISE_TIMELINE.map(
    (label, index) => {
      const realEvent = tx.timeline.find(
        e => e.label === label
      );

      const completed = index <= lastCompletedIndex;

      return {
        label,
        completed,
        isCurrent: index === lastCompletedIndex,
        date: completed
          ? realEvent?.date ?? fallbackDate
          : null,
      };
    }
  );

  return (
    <div className="min-h-screen bg-fintech flex justify-center px-4 py-16 relative overflow-hidden">

      {/* ───── CARD PRINCIPAL ───── */}
      <div className="relative z-10 w-full max-w-xl card-fintech animate-fade-in">

        {/* LOGO */}
        <div className="flex justify-center mb-8 animate-fade-in-slow">
          <Image
            src="/logo.png"
            alt="RW Capital Holding"
            width={200}
            height={80}
            priority
          />
        </div>

        {/* HEADER */}
        <h1 className="text-title-lg mb-2">
          {isCompleted
            ? "Transferencia completada"
            : "Estamos procesando tu transferencia"}
        </h1>

        <p className="text-body text-[var(--color-text-secondary)] mb-6">
          Destinatario:{" "}
          <span className="font-medium text-[var(--color-text-primary)]">
            {tx.recipientName}
          </span>
        </p>

        {tx.createdAt && (
          <p className="text-small mb-8">
            Última actualización:{" "}
            {new Date(tx.createdAt).toLocaleString("es-ES", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}

        {/* ───── TIMELINE (ANIMADO LENTO, STAGGER RESTAURADO) ───── */}
        <ol className="relative ml-2 mb-10">
          {enrichedTimeline.map((e, i) => (
            <li
              key={i}
              className="relative pl-8 pb-8 timeline-item animate-fade-up"
              style={{ animationDelay: `${i * 180}ms` }}
            >
              {/* Línea */}
              {i !== enrichedTimeline.length - 1 && (
                <span
                  className="absolute left-[6px] top-4 h-full w-px bg-[var(--color-border-subtle)]"
                />
              )}

              {/* Punto */}
              <span
                className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 ${
                  e.completed
                    ? "bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)]"
                    : "bg-white border-[var(--color-border-subtle)]"
                } ${
                  e.isCurrent ? "timeline-dot current" : ""
                }`}
              />

              <p className="text-small">
                {e.date
                  ? new Date(e.date).toLocaleString("es-ES", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Pendiente"}
              </p>

              <p className="text-body">
                {e.label}
              </p>
            </li>
          ))}
        </ol>

        {/* ───── TRANSFER DETAILS (MISMA SECCIÓN) ───── */}
        <div className="border-t border-[var(--color-border-subtle)] pt-6 mb-6 space-y-4">

          <div>
            <p className="text-small">Desde</p>
            <p className="text-body">{tx.businessName}</p>
          </div>

          <div>
            <p className="text-small">Monto</p>
            <p className="text-title-lg">
              {Number(tx.amount).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}{" "}
              {tx.currency}
            </p>
          </div>

          <div>
            <p className="text-small">Referencia</p>
            <p className="text-body">
              {tx.reference && tx.reference.trim() !== ""
                ? tx.reference
                : "—"}
            </p>
          </div>
        </div>

        {/* ───── DOCUMENTO (MISMO FLOW) ───── */}
        <div className="border border-[var(--color-border-subtle)] rounded-lg p-4 flex items-center justify-between mb-6">

          <span className="text-body">
            Comprobante de transferencia
          </span>

          <a
            href={`/api/receipt/${tx.publicId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="
              bg-[var(--color-brand-primary)]
              hover:bg-[var(--color-brand-primary-hover)]
              text-white text-sm font-medium
              px-4 py-2 rounded-md transition
            "
          >
            Descargar
          </a>
        </div>

        {/* FOOTER */}
        <div className="text-small text-center">
          RW Capital Holding · Transaction Tracker
        </div>
      </div>
    </div>
  );
}
