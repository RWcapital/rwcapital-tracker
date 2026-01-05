import { notFound } from 'next/navigation';


/* =========================
   MAPAS DE TRADUCCIÓN (UI)
   ========================= */

const STATUS_LABELS: Record<string, string> = {
  PROCESSING: 'En proceso',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
  CANCELLED: 'Cancelado',
};

const STATUS_MESSAGES: Record<string, string> = {
  PROCESSING: 'La transferencia está siendo procesada. Este proceso puede tardar unos minutos.',
  COMPLETED: 'La transferencia fue completada exitosamente.',
  FAILED: 'La transferencia no pudo completarse.',
  CANCELLED: 'La transferencia fue cancelada.',
};


const EVENT_LABELS: Record<string, string> = {
  'Transfer created': 'Transferencia creada',
  'Funds received': 'Fondos recibidos',
  'Funds sent to recipient': 'Fondos enviados al destinatario',
  'Funds delivered to recipient': 'Fondos entregados al destinatario',
  'Processing transfer': 'Procesando transferencia',
};

/* ───────────────── TYPES ───────────────── */

type TimelineEvent = {
  date: string;
  label: string;
};

type Transaction = {
  publicId: string;
  businessName: string;
  amount: string;
  currency: string;
  status: string;
  reference?: string;
  timeline?: TimelineEvent[];
};

/* ───────────────── DATA ───────────────── */

async function getTransaction(publicId: string): Promise<Transaction | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/transaction/${publicId}`,
    { cache: 'no-store' }
  );

  if (!res.ok) return null;
  return res.json();
}

/* ───────────────── PAGE ───────────────── */

export default async function TransactionPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  const data = await getTransaction(publicId);
  if (!data) notFound();

  return (
    <main className="min-h-screen bg-gray-50 flex justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-xl shadow p-6
                animate-in fade-in slide-in-from-bottom-2 duration-500">


        <h1 className="text-xl font-semibold mb-1">
          Transfer status
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          Tracking ID: <span className="font-mono">{data.publicId}</span>
        </p>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-2xl font-bold">
              {data.amount} {data.currency}
            </p>
            <p className="text-sm text-gray-500">
              {data.businessName}
            </p>
            {data.reference && (
              <p className="text-sm text-gray-400">
                Reference: {data.reference}
              </p>
            )}
          </div>

          <StatusBadge
  status={data.status}
  className="animate-fade-in"
/>

        </div>
        {/* Mensaje contextual por estado */}
<div className="mb-6 rounded-lg border p-4 bg-gray-50
                animate-in fade-in duration-500 delay-200">
  <p className="text-sm text-gray-700">
    {STATUS_MESSAGES?.[data.status] ?? 'Estado de la transferencia'}
  </p>
</div>

{/* Cierre visual cuando está completado */}
{data.status === 'COMPLETED' && (
  <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
    <p className="text-sm text-green-800 font-medium">
      ✔️ Transferencia completada
    </p>
    <p className="text-xs text-green-700 mt-1">
      Los fondos fueron entregados correctamente al destinatario.
    </p>
  </div>
)}


        {data.timeline && data.timeline.length > 0 && (
          <Timeline events={data.timeline} />
        )}

        <p className="mt-8 text-xs text-gray-400 text-center">
          RW Capital · Secure transfer tracking
        </p>
      </div>
    </main>
  );
}

/* ───────────────── COMPONENTS ───────────────── */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PROCESSING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-200 text-gray-700',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium
                  transition-all duration-300 ease-out
                  animate-in fade-in zoom-in-95
                  ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}


function Timeline({ events }: { events: TimelineEvent[] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <ol className="relative border-l border-gray-200 pl-4 mt-6">
      {sorted.map((e, i) => (
        <li
  key={i}
  className="mb-6 animate-slide-up"
  style={{ animationDelay: `${i * 120}ms` }}
>

          <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-1.5 mt-1" />
          <time className="text-xs text-gray-400 block">
            {new Date(e.date).toLocaleString()}
          </time>
          <p className="font-medium text-gray-800">
            {EVENT_LABELS[e.label] ?? e.label}
          </p>
        </li>
      ))}
    </ol>
  );
}

