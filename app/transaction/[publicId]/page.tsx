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
   TIMELINE BASE (WISE)
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
     ÚLTIMA FECHA REAL
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
     TIMELINE ENRIQUECIDO (VIVO)
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
    <div className="min-h-screen bg-fintech flex justify-center px-4 py-10 relative overflow-hidden">
      {/* Glow ambiental */}
      <div className="absolute inset-0 flex justify-center pointer-events-none">
        <div className="w-[520px] h-[520px] mt-40 bg-yellow-500/10 blur-[160px] animate-pulse" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-xl bg-neutral-900/80 backdrop-blur-xl rounded-2xl border border-neutral-700/50 shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-8 animate-fade-in">
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
        <h1 className="text-2xl md:text-3xl font-semibold leading-tight mb-2 text-white">
          {isCompleted
            ? "Ya está todo listo,"
            : "Estamos procesando tu transferencia,"}
          <br />
          <span className="font-bold uppercase">
            {tx.recipientName}
          </span>
        </h1>

        {tx.createdAt && (
          <p className="text-sm text-neutral-400 mb-6">
            {new Date(tx.createdAt).toLocaleString("es-ES", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
        )}

        {/* TIMELINE */}
        <ol className="relative ml-2 mb-8">
          {enrichedTimeline.map((e, i) => (
            <li
              key={i}
              className="relative pl-8 pb-8 timeline-item"
              style={{ animationDelay: `${i * 180}ms` }}
            >
              {/* Línea */}
              {i !== enrichedTimeline.length - 1 && (
                <span
                  className={`absolute left-[6px] top-4 h-full w-px ${
                    e.completed
                      ? "bg-yellow-500"
                      : "bg-neutral-700"
                  }`}
                />
              )}

              {/* Punto */}
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
                      dateStyle: "full",
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

        {/* FOOTER */}
        <div className="mt-6 text-xs text-neutral-500 text-center">
          RW Capital Holding · Transaction Tracker
        </div>
      </div>
    </div>
  );
}
