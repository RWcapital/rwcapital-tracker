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
  `${process.env.NEXT_BASE_URL ?? ""}/api/transaction/${publicId}`,
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
    <div className="min-h-screen bg-fintech-light flex justify-center px-4 py-12 relative overflow-hidden">
      {/* Fondo suave estilo Mercury */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-500/10 blur-[180px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-400/10 blur-[160px]" />
      </div>

      <div className="relative w-full max-w-xl bg-white rounded-xl border border-[#E6E8EB] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        {/* LOGO */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="RW Capital Holding"
            width={200}
            height={60}
            priority
          />
        </div>

        {/* HEADER */}
        <h1 className="text-[22px] font-semibold leading-tight mb-3 text-[#0A0A0A]">
          {isCompleted
            ? "Transfer completed"
            : "Transfer in progress"}
        </h1>

        {/* FROM / TO */}
        <div className="mb-6 space-y-1 text-[14px]">
          <div className="text-[#5F6368]">
            From:{" "}
            <span className="text-[#0A0A0A] font-medium">
              {tx.businessName}
            </span>
          </div>

          <div className="text-[#5F6368]">
            To:{" "}
            <span className="text-[#0A0A0A] font-semibold uppercase">
              {tx.recipientName || "—"}
            </span>
          </div>
        </div>

        {/* FECHA */}
        {tx.createdAt && (
          <p className="text-[13px] text-[#8A8F98] mb-6">
            {new Date(tx.createdAt).toLocaleString("en-US", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
        )}

        {/* TIMELINE (MISMA LÓGICA) */}
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
                      ? "bg-[#3B5BDB]"
                      : "bg-[#E6E8EB]"
                  }`}
                />
              )}

              <span
                className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 ${
                  e.completed
                    ? "bg-[#3B5BDB] border-[#3B5BDB]"
                    : "bg-white border-[#CBD5E1]"
                } ${
                  e.isCurrent
                    ? "ring-4 ring-[#3B5BDB]/20"
                    : ""
                }`}
              />

              <p className="text-[12px] text-[#8A8F98]">
                {e.date
                  ? new Date(e.date).toLocaleString("en-US", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "Pending"}
              </p>

              <p
                className={`text-[14px] ${
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

        {/* DETAILS (MISMO CONTENIDO) */}
        <div className="border border-[#E6E8EB] rounded-lg p-5 mb-6 bg-[#F7F8FA]">
          <h3 className="text-[#3B5BDB] font-semibold mb-4">
            Transfer details
          </h3>

          <div className="space-y-3 text-[14px]">
            <div>
              <span className="text-[#5F6368] block">Amount</span>
              <span className="text-[18px] font-semibold text-[#0A0A0A]">
                {Number(tx.amount).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}{" "}
                {tx.currency}
              </span>
            </div>

            <div>
              <span className="text-[#5F6368] block">
                Reference
              </span>
              <span className="text-[#0A0A0A]">
                {tx.reference && tx.reference.trim() !== ""
                  ? tx.reference
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* PDF (MISMO BOTÓN) */}
        <a
          href={`/api/receipt/${tx.publicId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-[#3B5BDB] hover:bg-[#2F4AC6] text-white font-medium py-2 rounded-md transition"
        >
          Download receipt (PDF)
        </a>

        {/* FOOTER */}
        <div className="mt-8 text-[12px] text-[#8A8F98] text-center">
          RW Capital Holding · Secure Transaction Tracker
        </div>
      </div>
    </div>
  );
}
