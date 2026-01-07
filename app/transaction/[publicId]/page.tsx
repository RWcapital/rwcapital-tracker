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
  recipientName: string | null;
  amount: string;
  currency: string;
  status: string;
  reference?: string | null;
  createdAt?: string;
  timeline: TimelineEvent[];
};

/* ──────────────────────────────
   TIMELINE DEFINITIVO (Sincronizado con wiseStatus.ts)
────────────────────────────── */
const WISE_TIMELINE = [
  "El remitente ha creado tu transferencia",
  "Hemos recibido los fondos del remitente",
  "Tu dinero está en camino",
  "El dinero se mueve a través de la red bancaria",
  "Tu dinero debería haber llegado a tu banco",
];

/* ──────────────────────────────
   FETCH
────────────────────────────── */
async function getTransaction(publicId: string): Promise<Transaction | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transaction/${publicId}`,
    { cache: "no-store" } // Importante: Sin caché para ver actualizaciones al instante
  );

  if (!res.ok) return null;
  return res.json();
}

/* ──────────────────────────────
   COMPONENTE DE PÁGINA
────────────────────────────── */
export default async function TransactionPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const tx = await getTransaction(publicId);

  if (!tx) notFound();

  // 1. Detectar si está completada (por status general o por evento final)
  const statusUpper = tx.status?.toUpperCase() || "";
  const isCompleted =
    statusUpper === "COMPLETED" ||
    statusUpper === "SUCCESS" ||
    tx.timeline.some((e) =>
      e.label.includes("Tu dinero debería haber llegado")
    );

  // 2. Ordenar eventos cronológicamente
  const sortedEvents = [...tx.timeline].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const lastRealEvent = sortedEvents.at(-1);
  const fallbackDate =
    lastRealEvent?.date ?? tx.createdAt ?? new Date().toISOString();

  // 3. Calcular hasta qué paso pintar (Logic Fill)
  let lastCompletedIndex = -1;

  if (isCompleted) {
    lastCompletedIndex = WISE_TIMELINE.length - 1;
  } else {
    // Buscamos el paso más avanzado que coincida con los eventos
    lastCompletedIndex = WISE_TIMELINE.reduce((maxIndex, stepLabel, index) => {
      const stepClean = stepLabel.toLowerCase().trim();
      
      const found = tx.timeline.some((e) => {
        const eventClean = e.label.toLowerCase().trim();
        return eventClean.includes(stepClean) || stepClean.includes(eventClean);
      });

      return found ? index : maxIndex;
    }, -1);
  }

  // 4. Construir el objeto para renderizar
  const enrichedTimeline = WISE_TIMELINE.map((label, index) => {
    // Buscar evento real para obtener la fecha exacta
    const realEvent = tx.timeline.find(
      (e) =>
        e.label.toLowerCase().includes(label.toLowerCase()) ||
        label.toLowerCase().includes(e.label.toLowerCase())
    );

    const completed = index <= lastCompletedIndex;
    
    // Si el paso está completado, mostramos fecha (real o fallback). Si no, null.
    const displayDate = completed
      ? realEvent?.date ?? fallbackDate
      : null;

    return {
      label,
      completed,
      isCurrent: index === lastCompletedIndex,
      date: displayDate,
    };
  });

  return (
    <div className="min-h-screen bg-fintech-light flex justify-center px-4 py-10 relative overflow-hidden font-sans">
      
      {/* Fondo Glow Animado */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-500/10 blur-[180px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-blue-400/10 blur-[160px]" />
      </div>

      {/* Card Principal con Animación de Entrada */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-xl border border-[#E6E8EB] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] animate-fade-in">
        
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

        {/* HEADER: Título y Nombre del Beneficiario */}
        <h1 className="text-2xl md:text-3xl font-semibold leading-tight mb-2 text-[#0A0A0A]">
          {isCompleted ? "Transferencia completada" : "Transferencia en curso"}
          <br />
          <span className="font-bold uppercase text-[#3B5BDB]">
            {tx.recipientName || "Beneficiario"}
          </span>
        </h1>

        {tx.createdAt && (
          <p className="text-sm text-[#5F6368] mb-6">
            Iniciada el{" "}
            {new Date(tx.createdAt).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

        {/* TIMELINE VISUAL */}
        <ol className="relative ml-2 mb-8 border-l border-[#E6E8EB] md:border-none md:ml-0">
          {enrichedTimeline.map((e, i) => (
            <li
              key={i}
              className="relative pl-8 pb-8 timeline-item"
              // Animación escalonada para cada item (Cascada)
              style={{ animationDelay: `${i * 150}ms` }} 
            >
              {/* Línea vertical conectora (Solo si no es el último) */}
              {i !== enrichedTimeline.length - 1 && (
                <span
                  className={`absolute left-[6px] top-4 h-full w-px transition-colors duration-500 ${
                    e.completed ? "bg-[#3B5BDB]" : "bg-[#E6E8EB]"
                  }`}
                />
              )}

              {/* Punto indicador (Dot) */}
              <span
                className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 transition-all duration-500 ${
                  e.completed
                    ? "bg-[#3B5BDB] border-[#3B5BDB]"
                    : "bg-white border-[#CBD5E1]"
                } ${
                  e.isCurrent
                    ? "ring-4 ring-[#3B5BDB]/20 scale-110"
                    : ""
                }`}
              />

              {/* Fecha y Hora */}
              <p className="text-xs text-[#8A8F98] mb-0.5">
                {e.date
                  ? new Date(e.date).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Pendiente"}
              </p>

              {/* Etiqueta del paso */}
              <p
                className={`text-sm transition-colors duration-300 ${
                  e.completed
                    ? "text-[#0A0A0A] font-medium"
                    : "text-[#6B7280]"
                }`}
              >
                {e.label}
              </p>
            </li>
          ))}
        </ol>

        {/* DETALLES DE LA TRANSFERENCIA */}
        <div className="border border-[#E6E8EB] rounded-lg p-5 mb-6 bg-[#F7F8FA]">
          <h3 className="text-[#3B5BDB] font-semibold mb-4">
            Detalles de la transferencia
          </h3>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-[#5F6368] block">De</span>
              <span className="text-[#0A0A0A] font-medium">
                {tx.businessName}
              </span>
            </div>

            <div>
              <span className="text-[#5F6368] block">Para</span>
              <span className="text-[#0A0A0A] font-medium">
                {tx.recipientName || "—"}
              </span>
            </div>

            <div>
              <span className="text-[#5F6368] block">Monto</span>
              <span className="text-lg font-semibold text-[#0A0A0A]">
                {Number(tx.amount).toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                })}{" "}
                {tx.currency}
              </span>
            </div>

            <div>
              <span className="text-[#5F6368] block">Referencia</span>
              <span className="text-[#0A0A0A]">
                {tx.reference && tx.reference.trim() !== ""
                  ? tx.reference
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* BOTÓN DESCARGA PDF */}
        <div className="border border-[#E6E8EB] rounded-lg p-5 mb-6 flex items-center justify-between bg-[#F7F8FA] hover:bg-gray-100 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-[#3B5BDB] text-xl">📄</span>
            <span className="font-medium text-[#0A0A0A]">
              Recibo de transferencia
            </span>
          </div>

          <a
            href={`/api/receipt/${tx.publicId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#3B5BDB] hover:bg-[#2F4AC6] text-white font-medium px-4 py-2 rounded-md transition-all shadow-sm hover:shadow-md"
          >
            Descargar PDF
          </a>
        </div>

        {/* FOOTER */}
        <div className="mt-6 text-xs text-[#8A8F98] text-center">
          RW Capital Holding · Transaction Tracker
        </div>
      </div>
    </div>
  );
}