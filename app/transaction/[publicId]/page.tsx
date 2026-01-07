import Image from "next/image";
import { notFound } from "next/navigation";

/* ──────────────────────────────
   ESTRUCTURA VISUAL (EL MAPA)
   Estos son los pasos que se verán en gris hasta que ocurran.
   IMPORTANTE: Deben coincidir semánticamente con lo que guardas en DB.
────────────────────────────── */
const WISE_TIMELINE = [
  "El remitente ha creado tu transferencia",
  "Hemos recibido los fondos", // Ajustado para ser más genérico y facilitar match
  "Tu dinero está en camino",
  "El dinero se mueve",
  "Tu dinero debería haber llegado"
];

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
   FETCH DE DATOS REALES
────────────────────────────── */
async function getTransaction(publicId: string): Promise<Transaction | null> {
  // 'no-store' asegura que siempre veas el estado actual de la DB
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/transaction/${publicId}`,
    { cache: "no-store" }
  );

  if (!res.ok) return null;
  return res.json();
}

/* ──────────────────────────────
   HELPER: NORMALIZAR TEXTO
   Ayuda a comparar textos ignorando mayúsculas/tildes
────────────────────────────── */
const normalize = (str: string) => 
  str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/* ──────────────────────────────
   COMPONENTE PAGE
────────────────────────────── */
export default async function TransactionPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  
  // 1. AQUÍ CARGAMOS LA DATA REAL DE TU API
  const tx = await getTransaction(publicId);

  if (!tx) notFound();

  /* ─────────────────────────────────────────────
     LOGICA DE SINCRONIZACIÓN (DB vs VISUAL)
  ───────────────────────────────────────────── */
  
  // A. Estado Global
  const statusUpper = tx.status?.toUpperCase() || "";
  const isGlobalCompleted = ["COMPLETED", "SENT", "FUNDS_SENT", "SUCCESS"].includes(statusUpper);

  // B. Calcular progreso
  let lastCompletedIndex = -1;

  if (isGlobalCompleted) {
    // Si la transacción finalizó, llenamos todo el timeline
    lastCompletedIndex = WISE_TIMELINE.length - 1;
  } else {
    // Si no, buscamos en los eventos de la DB cuál es el último paso cumplido
    WISE_TIMELINE.forEach((stepLabel, index) => {
      // Buscamos coincidencia parcial (ej: "dinero se mueve" match con "El dinero se mueve...")
      const exists = tx.timeline.some((dbEvent) => 
        normalize(dbEvent.label).includes(normalize(stepLabel)) ||
        normalize(stepLabel).includes(normalize(dbEvent.label))
      );
      
      if (exists) {
        lastCompletedIndex = index;
      }
    });
  }

  // C. Construir el objeto para renderizar
  const enrichedTimeline = WISE_TIMELINE.map((label, index) => {
    // Buscar fecha real del evento en la DB
    const realEvent = tx.timeline.find((dbEvent) =>
      normalize(dbEvent.label).includes(normalize(label)) ||
      normalize(label).includes(normalize(dbEvent.label))
    );

    // Fecha fallback: si ya pasó el evento pero no hay fecha exacta, usa la creación
    const fallbackDate = tx.createdAt ?? new Date().toISOString();
    const isStepCompleted = index <= lastCompletedIndex;

    return {
      label,
      completed: isStepCompleted,
      isCurrent: index === lastCompletedIndex && !isGlobalCompleted,
      date: isStepCompleted ? (realEvent?.date ?? fallbackDate) : null
    };
  });

  const displayName = tx.recipientName || tx.businessName || "Beneficiario";

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex justify-center px-4 py-10 relative overflow-hidden font-sans">
      
      {/* Fondo Decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl bg-white rounded-xl border border-[#E6E8EB] p-8 shadow-xl">
        
        {/* HEADER */}
        <div className="text-center mb-10">
           <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
              isGlobalCompleted 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-yellow-50 text-yellow-700'
           }`}>
              {isGlobalCompleted ? "Transferencia completada" : "Procesando pago"}
           </span>
           
           <h1 className="text-3xl font-bold text-[#0A0A0A] tracking-tight mb-2 leading-tight">
             {isGlobalCompleted ? "Enviado a" : "Enviando a"} <br />
             <span className="text-[#3B5BDB]">{displayName}</span>
           </h1>
           
           <p className="text-gray-500 text-sm mt-2">
             Iniciado el {new Date(tx.createdAt || Date.now()).toLocaleDateString("es-ES", { 
               day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' 
             })}
           </p>
        </div>

        {/* TIMELINE VISUAL */}
        <ol className="relative ml-4 border-l-2 border-[#E6E8EB] space-y-0">
          {enrichedTimeline.map((e, i) => (
            <li key={i} className="relative pl-8 pb-10 last:pb-0">
              
              {/* Línea Conectora Azul (Dinámica) */}
              {i !== enrichedTimeline.length - 1 && (
                <span
                  className={`absolute left-[-2px] top-2 h-full w-[2px] transition-colors duration-500 ${
                    e.completed ? "bg-[#3B5BDB]" : "bg-transparent"
                  }`}
                  style={{ zIndex: 1 }}
                />
              )}

              {/* Punto del estado */}
              <span
                className={`absolute -left-[9px] top-1.5 h-5 w-5 rounded-full border-[3px] z-10 transition-all duration-500 ${
                  e.completed
                    ? "bg-[#3B5BDB] border-[#3B5BDB]" // Completado
                    : e.isCurrent 
                      ? "bg-white border-[#3B5BDB] ring-4 ring-blue-100 scale-110" // Actual
                      : "bg-white border-[#E6E8EB]" // Pendiente
                }`}
              />

              {/* Textos */}
              <div className="flex flex-col -mt-1">
                <span className={`text-[15px] font-medium transition-colors duration-300 ${
                    e.completed || e.isCurrent ? "text-[#0A0A0A]" : "text-gray-400"
                  }`}
                >
                  {e.label}
                </span>
                
                {/* Fecha dinámica (solo si el paso está completo) */}
                <span className="text-xs text-gray-400 mt-1 h-4 block font-medium">
                  {e.date 
                    ? new Date(e.date).toLocaleDateString("es-ES", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                    : ""}
                </span>
              </div>
            </li>
          ))}
        </ol>

        {/* FOOTER DATOS */}
        <div className="mt-10 bg-[#F9FAFB] border border-[#E6E8EB] rounded-lg p-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Monto</span>
              <span className="text-[#0A0A0A] font-semibold">
                {Number(tx.amount).toLocaleString("es-ES", { minimumFractionDigits: 2 })} {tx.currency}
              </span>
            </div>
             <div className="flex justify-between items-center">
              <span className="text-gray-500">Referencia</span>
              <span className="text-[#0A0A0A] max-w-[200px] truncate text-right">
                {tx.reference || "—"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}