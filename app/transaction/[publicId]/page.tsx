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
  recipientName: string | null; // A veces viene null real o "null" texto
  amount: string;
  currency: string;
  status: string;
  reference?: string | null;
  createdAt?: string;
  timeline: TimelineEvent[];
};

/* ──────────────────────────────
   TIMELINE (Labels fijos)
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
  // Evitar caché para ver estados en tiempo real
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transaction/${publicId}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;
  return res.json();
}

/* ──────────────────────────────
   COMPONENTE PAGE
────────────────────────────── */
export default async function TransactionPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const tx = await getTransaction(publicId);

  if (!tx) notFound();

  // ─── 1. Lógica de Beneficiario Blindada ───
  // Si es null, undefined, "null" o string vacío, usa "Beneficiario"
  const rawName = tx.recipientName;
  const displayName =
    rawName && rawName !== "null" && rawName.trim() !== ""
      ? rawName
      : "Beneficiario";

  // ─── 2. Lógica de Estado Reforzada ───
  const statusUpper = tx.status?.toUpperCase() || "";
  
  // Detectar si la transacción finalizó exitosamente por STATUS o por evento final
  const isCompleted =
    statusUpper === "COMPLETED" ||
    statusUpper === "SUCCESS" ||
    statusUpper === "FUNDS_SENT" ||
    tx.timeline.some((e) => 
      e.label.toLowerCase().includes("llegado a tu banco") || 
      e.label.toLowerCase().includes("completado")
    );

  // ─── 3. Lógica del Timeline (Progreso Visual) ───
  let lastCompletedIndex = -1;

  if (isCompleted) {
    // Si está completada, pintamos TODO de azul
    lastCompletedIndex = WISE_TIMELINE.length - 1;
  } else {
    // Si no, buscamos cuál es el paso más avanzado que coincide con la API
    // Recorremos el timeline fijo y vemos si ese paso existe en la respuesta de la API
    WISE_TIMELINE.forEach((stepLabel, index) => {
      const stepClean = stepLabel.toLowerCase();
      
      const hasStep = tx.timeline.some((apiEvent) => {
        const eventClean = apiEvent.label.toLowerCase();
        // Coincidencia laxa (una contiene a la otra)
        return eventClean.includes(stepClean) || stepClean.includes(eventClean);
      });

      if (hasStep) {
        lastCompletedIndex = index;
      }
    });
  }

  // Fallback de fecha para pasos completados sin fecha específica
  const fallbackDate = tx.createdAt ?? new Date().toISOString();

  // Construir objeto visual para renderizar
  const enrichedTimeline = WISE_TIMELINE.map((label, index) => {
    // Buscar evento real asociado a este paso
    const realEvent = tx.timeline.find(
      (e) =>
        e.label.toLowerCase().includes(label.toLowerCase()) ||
        label.toLowerCase().includes(e.label.toLowerCase())
    );

    const isFinishedStep = index <= lastCompletedIndex;
    
    // Solo mostrar fecha si el paso ya ocurrió
    let displayDate = null;
    if (isFinishedStep) {
      displayDate = realEvent?.date ?? fallbackDate;
    }

    return {
      label,
      completed: isFinishedStep, // Azul
      isCurrent: index === lastCompletedIndex && !isCompleted, // Efecto pulsante solo si es el actual y NO ha terminado todo
      date: displayDate,
    };
  });

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex justify-center px-4 py-10 relative overflow-hidden font-sans">
      
      {/* Fondo Decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px]" />
      </div>

      {/* ─── CARD PRINCIPAL CON ANIMACIÓN DE ENTRADA ─── */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-xl border border-[#E6E8EB] p-8 shadow-xl animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        
        {/* LOGO */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="Logo"
            width={180}
            height={50}
            priority
            className="h-auto w-auto" // Fix para next/image aspect ratio
          />
        </div>

        {/* HEADER */}
        <div className="text-center mb-8">
           <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
              {isCompleted ? "Transacción Exitosa" : "En Progreso"}
           </span>
           <h1 className="text-2xl md:text-3xl font-bold text-[#0A0A0A] leading-tight">
             {isCompleted ? "Enviado a" : "Enviando a"} <br />
             <span className="text-[#3B5BDB]">{displayName}</span>
           </h1>
           {tx.createdAt && (
            <p className="text-sm text-gray-500 mt-2">
              Iniciado el {new Date(tx.createdAt).toLocaleDateString("es-ES", { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}
            </p>
           )}
        </div>

        {/* ─── TIMELINE ANIMADO ─── */}
        <ol className="relative ml-3 border-l-2 border-[#E6E8EB] md:ml-4 md:border-l-2 space-y-0">
          {enrichedTimeline.map((e, i) => (
            <li
              key={i}
              // AQUÍ ESTABA EL ERROR: Faltaban las clases de animación
              className="relative pl-8 pb-10 last:pb-0 opacity-0 animate-fade-up"
              style={{ 
                animationDelay: `${i * 200 + 300}ms`, // Stagger effect (escalonado)
                animationFillMode: 'forwards' // Mantiene el estado final (visible)
              }}
            >
              {/* Línea conectora coloreada */}
              {i !== enrichedTimeline.length - 1 && (
                <span
                  className={`absolute left-[-2px] top-2 h-full w-[2px] transition-colors duration-700 delay-500 ${
                    e.completed ? "bg-[#3B5BDB]" : "bg-transparent"
                  }`}
                  style={{ zIndex: 1 }}
                />
              )}

              {/* Punto del Timeline */}
              <span
                className={`absolute -left-[9px] top-1 h-5 w-5 rounded-full border-4 transition-all duration-500 z-10 ${
                  e.completed
                    ? "bg-[#3B5BDB] border-[#3B5BDB]"
                    : "bg-white border-[#E6E8EB]"
                } ${e.isCurrent ? "ring-4 ring-blue-100 scale-110" : ""}`}
              />

              {/* Contenido del paso */}
              <div className="flex flex-col">
                <span
                  className={`text-sm font-medium transition-colors duration-300 ${
                    e.completed ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {e.label}
                </span>
                <span className="text-xs text-gray-400 mt-1 h-4 block">
                  {e.date 
                    ? new Date(e.date).toLocaleDateString("es-ES", { day: 'numeric', month: 'short' }) 
                    : ""}
                </span>
              </div>
            </li>
          ))}
        </ol>

        <div className="h-8"></div> {/* Espaciador */}

        {/* ─── DETALLES ─── */}
        <div className="bg-[#F9FAFB] border border-[#E6E8EB] rounded-lg p-6 animate-fade-in opacity-0" style={{ animationDelay: '1200ms', animationFillMode: 'forwards' }}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Resumen de la operación
          </h3>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-gray-500">Beneficiario</span>
              <span className="text-gray-900 font-semibold text-right">{displayName}</span>
            </div>

            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-gray-500">Monto enviado</span>
              <span className="text-gray-900 font-semibold">
                {Number(tx.amount).toLocaleString("es-ES", { minimumFractionDigits: 2 })} {tx.currency}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Referencia</span>
              <span className="text-gray-900">{tx.reference || "—"}</span>
            </div>
          </div>
        </div>

        {/* BOTÓN PDF */}
        <div className="mt-6 text-center animate-fade-in opacity-0" style={{ animationDelay: '1400ms', animationFillMode: 'forwards' }}>
          <a
            href={`/api/receipt/${tx.publicId}`}
            className="inline-flex items-center text-[#3B5BDB] hover:text-[#2F4AC6] font-medium transition-colors text-sm"
          >
            <span className="mr-2">📄</span> Descargar comprobante oficial
          </a>
        </div>
      </div>
    </div>
  );
}