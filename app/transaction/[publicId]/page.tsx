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

  /* ───────── Última fecha real ───────── */
  const lastRealEvent = [...tx.timeline]
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    )
    .at(-1);

  const fallbackDate =
    lastRealEvent?.date ?? tx.createdAt ?? null;

  /* ───────── Último paso completado ───────── */
  const lastCompletedIndex = WISE_TIMELINE.reduce(
    (acc, label, index) => {
      const exists = tx.timeline.some(
        e => e.label === label
      );
      return exists ? index : acc;
    },
    -1
  );

  /* ───────── Timeline vivo (NO TOCAR) ───────── */
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
      {/* Fondo suave */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-500/10 blur-[180px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-400/10 blur-[160px]" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-xl border border-[#E6E8EB] shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-8 animate-fade-in-slow">
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
        <h1 className="text-[22px] font-semibold text-[#0A0A0A] leading-tight mb-2">
          {isCompleted
            ? "Transfer completed"
            : "Transfer in progress"}
          <br />
          <span className="font-medium text-[#3B5BDB]">
            {tx.recipientName}
          </span>
        </h1>

        {tx.createdAt && (
          <p className="text-[13px] text-[#5F6368] mb-6">
            {new Date(tx.createdAt).toLocaleString("en-US", {
              dateStyle: "long",
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
                      dateStyle: "long",
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

        {/* TRANSFER DETAILS (RESTAURADO) */}
        <div className="border border-[#E6E8EB] rounded-lg p-5 mb-6 bg-[#F7F8FA]">
          <h3 className="text-[#3B5BDB] font-semibold mb-4">
            Transfer details
          </h3>

          <div className="space-y-3 text-[14px]">
            <div>
              <span className="block text-[#5F6368]">From</span>
              <span>{tx.businessName}</span>
            </div>

            <div>
              <span className="block text-[#5F6368]">Amount</span>
              <span className="text-[18px] font-semibold">
                {Number(tx.amount).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}{" "}
                {tx.currency}
              </span>
            </div>

            <div>
              <span className="block text-[#5F6368]">Reference</span>
              <span>
                {tx.reference && tx.reference.trim() !== ""
                  ? tx.reference
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* DOWNLOAD PDF (RESTAURADO) */}
        <div className="border border-[#E6E8EB] rounded-lg p-5 flex items-center justify-between bg-[#F7F8FA]">
          <div className="flex items-center gap-3">
            <span className="text-[#3B5BDB] text-lg">📄</span>
            <span className="font-medium">
              Transfer receipt (PDF)
            </span>
          </div>

          <a
            href={`/api/receipt/${tx.publicId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#3B5BDB] hover:bg-[#2F4AC6] text-white font-medium px-4 py-2 rounded-md transition"
          >
            Download
          </a>
        </div>

        {/* FOOTER */}
        <div className="mt-6 text-[12px] text-[#8A8F98] text-center">
          RW Capital Holding · Transaction tracker
        </div>
      </div>
    </div>
  );
}
