import { notFound } from "next/navigation";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

export default async function TransactionPage({
  params,
}: {
  params: { publicId: string };
}) {
  const tx = await prisma.transaction.findUnique({
    where: { publicId: params.publicId },
    include: {
      events: { orderBy: { occurredAt: "asc" } },
      documents: true,
    },
  });

  if (!tx) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-neutral-900 rounded-xl border border-neutral-800 p-8">
        <h1 className="text-2xl font-semibold mb-1">
          {tx.status === "COMPLETED"
            ? "Ya está todo listo"
            : "Tu transferencia está en proceso"}
        </h1>

        <p className="text-neutral-400 text-sm mb-6">
          {tx.businessName}
        </p>

        <div className="mb-6 border border-neutral-800 rounded-lg p-4 text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-neutral-400">Monto</span>
            <span>
              {tx.amount} {tx.currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">ID</span>
            <span className="font-mono text-xs">{tx.publicId}</span>
          </div>
        </div>

        <ol className="relative border-l border-yellow-500 ml-2">
          {tx.events.map((e, i) => (
            <li key={i} className="mb-6 ml-6">
              <span className="absolute -left-1.5 w-3 h-3 bg-yellow-500 rounded-full" />
              <p className="text-xs text-neutral-400">
                {new Date(e.occurredAt).toLocaleString()}
              </p>
              <p className="text-sm">{e.label}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 text-xs text-neutral-500 text-center">
          RW Capital Holding · Transaction Tracker
        </div>
      </div>
    </div>
  );
}
