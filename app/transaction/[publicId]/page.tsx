import Image from "next/image";
import { notFound } from "next/navigation";

/* ──────────────────────────────
   TIPOS
────────────────────────────── */
type TimelineEvent = {
  date: string;
  label: string;
};

type Transaction = {
  publicId: string;
  businessName: string;      // QUIÉN ENVÍA (RW Capital)
  recipientName: string;     // QUIÉN RECIBE
  amount: string;
  currency: string;
  status: string;
  reference?: string | null;
  createdAt?: string;
  timeline: TimelineEvent[];
};

/* ──────────────────────────────
   TIMELINE BASE (WISE / CBPAY)
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
   FETCH
────────────────────────────── */
async function getTransaction(
  publicId: string
): Promise<Transaction | null> {
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
  params: { publicId: string };
}) {
  const tx = await getTransaction(params.publicId);
  if (!tx) notFound();

  const isCompleted = tx.status?.toUpperCase() === "COMPLETED";

  /* ──────────────────────────────
     ÚLTIMO EVENTO REAL
  ────────────────────────────── */
  const sortedTimeline = [...tx.timeline].sort(
    (a, b) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime()
  );

  const lastRealEvent = sortedTimeline.at(-1);
  const fallbackDate =
    lastRealEvent?.date ?? tx.createdAt ?? null;

  /* ──────────────────────────────
     ÍNDICE DEL PASO ACTUAL
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
    <div className="min-h-screen bg-animated-dark flex justify-center px-4 py-12">
      {/* Glow de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-xl bg-neutral-900/95 backdrop-blur rounded-2xl border border-neutral-800 p-8 shadow-2xl">

        {/* LOGO */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="RW Capital Holding"
            width={220}
            height={80}
            priority
          />
        </div>

        {/* HEADER */}
        <h1 className="text-2xl md:text-3xl font-semibold leading-tight mb-3">
          {isCompleted
            ? "Transferencia completada,"
            : "Estamos procesando tu transferencia,"}
        </h1>

        {/* FROM / TO */}
        <div className="mb-6 space-y-1 text-sm">
          <div className="text-neutral-400">
            De:{" "}
            <span className="text-white font-medium">
              {tx.businessName}
            </span>
          </div>

          <div className="text-neutral-400">
            Para:{" "}
            <span className="text-white font-semibold uppercase">
              {tx.recipientName || "—"}
            </span>
          </div>
        </div>

        {/* FECHA */}
        {tx.createdAt && (
          <p className="text-xs text-neutral-500 mb-6">
            {new Date(tx.createdAt).toLocaleString("es-ES", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
        )}

        {/* TIMELINE */}
        <ol className="relative ml-2 mb-10">
          {enrichedTimeline.map((e, i) => (
            <li
              key={i}
              className="relative pl-8 pb-8 timeline-item"
              style={{ animationDelay: `${i * 160}ms` }}
            >
              {i !== enrichedTimeline.length - 1 && (
                <span
                  className={`absolute left-[6px] top-4 h-full w-px ${
                    e.completed
                      ? "bg-yellow-500"
                      : "bg-neutral-700"
                  }`}
                />
              )}

              <span
                className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 ${
                  e.completed
                    ? "bg-yellow-500 border-yellow-500"
                    : "bg-neutral-900 border-neutral-600"
                } ${
                  e.isCurrent
                    ? "ring-4 ring-yellow-500/30"
                    : ""
                }`}
              />

              <p className="text-xs text-neutral-400">
                {e.date
                  ? new Date(e.date).toLocaleString("es-ES", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "Pendiente"}
              </p>

              <p
                className={`text-sm ${
                  e.completed
                    ? "text-white"
                    : "text-neutral-500"
                }`}
              >
                {e.label}
              </p>
            </li>
          ))}
        </ol>

        {/* DETAILS */}
        <div className="border border-yellow-500/30 rounded-xl p-5 mb-6">
          <h3 className="text-yellow-400 font-semibold mb-4">
            Detalles de la transferencia
          </h3>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-neutral-400 block">Monto</span>
              <span className="text-lg font-semibold">
                {Number(tx.amount).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}{" "}
                {tx.currency}
              </span>
            </div>

            <div>
              <span className="text-neutral-400 block">
                Referencia
              </span>
              <span>
                {tx.reference && tx.reference.trim() !== ""
                  ? tx.reference
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* PDF */}
        <a
          href={`/api/receipt/${tx.publicId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-yellow-500 hover:bg-yellow-400 text-black font-medium py-2 rounded-lg transition"
        >
          Descargar comprobante (PDF)
        </a>

        {/* FOOTER */}
        <div className="mt-8 text-xs text-neutral-500 text-center">
          RW Capital Holding · Secure Transaction Tracker
        </div>
      </div>
    </div>
  );
}
