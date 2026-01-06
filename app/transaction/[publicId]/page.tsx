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
   TIMELINE BASE WISE
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
     🔑 ÚLTIMA FECHA REAL (CLAVE)
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
     TIMELINE ESTILO CBPAY
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
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-neutral-900 rounded-xl border border-neutral-800 p-8">

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
        <h1 className="text-2xl md:text-3xl font-semibold leading-tight mb-2">
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
            {new Date(tx.createdAt).toLocaleString("es-ES")}
          </p>
        )}

        {/* TIMELINE */}
        <ol className="relative ml-2 mb-8">
          {enrichedTimeline.map((e, i) => (
            <li key={i} className="relative pl-8 pb-8">
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
                  ? new Date(e.date).toLocaleString("es-ES")
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
                {/* DOCUMENTO PDF */}
        <div className="border border-yellow-500/30 rounded-xl p-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 text-xl">📄</span>
            <span className="font-medium">
              Receipt RW Capital
            </span>
          </div>

          <a
            href={`/api/receipt/${tx.publicId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-medium px-4 py-2 rounded-lg transition"
          >
            Download
          </a>
        </div>


        {/* FOOTER */}
        <div className="mt-6 text-xs text-neutral-500 text-center">
          RW Capital Holding · Transaction Tracker
        </div>
      </div>
    </div>
  );
}
