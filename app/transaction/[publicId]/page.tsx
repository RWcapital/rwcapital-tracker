import { notFound } from "next/navigation";

type TimelineEvent = {
  date: string;
  label: string;
};

type Transaction = {
  publicId: string;
  businessName: string;
  amount: string; // 👈 ya viene como string desde la API
  currency: string;
  status: string;
  events: TimelineEvent[];
};

async function getTransaction(publicId: string): Promise<Transaction | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transaction/${publicId}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;
  return res.json();
}

export default async function TransactionPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  const tx = await getTransaction(publicId);

  if (!tx) notFound();

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-neutral-900 rounded-xl border border-neutral-800 p-8">

        {/* HEADER */}
        <h1 className="text-2xl font-semibold mb-1">
          {tx.status === "COMPLETED"
            ? "Transferencia completada"
            : "Transferencia en proceso"}
        </h1>

        <p className="text-neutral-400 text-sm mb-6">
          {tx.businessName}
        </p>

        {/* INFO */}
        <div className="mb-6 border border-neutral-800 rounded-lg p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-neutral-400">Monto</span>
            <span className="font-medium">
              {tx.amount} {tx.currency}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-neutral-400">ID de seguimiento</span>
            <span className="font-mono text-xs">
              {tx.publicId}
            </span>
          </div>
        </div>

        {/* TIMELINE */}
        {tx.events.length > 0 && (
          <ol className="relative border-l border-yellow-500 ml-2">
            {tx.events.map((e, i) => (
              <li key={i} className="mb-6 ml-6">
                <span className="absolute -left-1.5 w-3 h-3 bg-yellow-500 rounded-full" />
                <p className="text-xs text-neutral-400">
                  {new Date(e.date).toLocaleString()}
                </p>
                <p className="text-sm">{e.label}</p>
              </li>
            ))}
          </ol>
        )}

        {/* FOOTER */}
        <div className="mt-8 text-xs text-neutral-500 text-center">
          RW Capital Holding · Transaction Tracker
        </div>

      </div>
    </div>
  );
}
