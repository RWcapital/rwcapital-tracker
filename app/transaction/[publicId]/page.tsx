import { notFound } from "next/navigation";

/* ──────────────────────────────
   CONSTANTES Y HELPERS
────────────────────────────── */
const WISE_TIMELINE = [
  "El remitente ha creado tu transferencia",
  "Hemos recibido los fondos", 
  "Tu dinero está en camino",
  "El dinero se mueve",
  "Tu dinero debería haber llegado"
];

// Helper para comparar textos ignorando tildes/mayúsculas
const normalize = (str: string) => 
  str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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

  /* ─────────────────────────────────────────────
     LÓGICA DE ESTADO (SYNC CON WISE)
  ───────────────────────────────────────────── */
  // 1. Detectar estado global
  const statusUpper = tx.status?.toUpperCase() || "";
  const isGlobalCompleted = ["COMPLETED", "SENT", "FUNDS_SENT", "SUCCESS"].includes(statusUpper);

  // 2. Calcular índice completado
  let lastCompletedIndex = -1;

  if (isGlobalCompleted) {
    lastCompletedIndex = WISE_TIMELINE.length - 1;
  } else {
    WISE_TIMELINE.forEach((stepLabel, index) => {
      // Búsqueda flexible (match parcial)
      const exists = tx.timeline.some((e) => 
        normalize(e.label).includes(normalize(stepLabel)) ||
        normalize(stepLabel).includes(normalize(e.label))
      );
      if (exists) lastCompletedIndex = index;
    });
  }

  // 3. Preparar datos para renderizado
  const enrichedTimeline = WISE_TIMELINE.map((label, index) => {
    const realEvent = tx.timeline.find((e) =>
      normalize(e.label).includes(normalize(label)) ||
      normalize(label).includes(normalize(e.label))
    );

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

      {/* Card Principal con Animación de Entrada */}
      <div 
        className="relative z-10 w-full max-w-xl bg-white rounded-xl border border-[#E6E8EB] p-8 shadow-xl animate-fade-up opacity-0" 
        style={{ animationFillMode: 'forwards' }}
      >
        
        {/* HEADER */}
        <div className="text-center mb-10">
           {/* Badge */}
           <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
              isGlobalCompleted 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-blue-50 text-blue-700'
           }`}>
              {isGlobalCompleted ? "Transferencia completada" : "En Progreso"}
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

        {/* TIMELINE VISUAL CON ANIMACIONES */}
        <ol className="relative ml-4 border-l-2 border-[#E6E8EB] space-y-0">
          {enrichedTimeline.map((e, i) => (
            <li
              key={i}
              className="relative pl-8 pb-10 last:pb-0 opacity-0 animate-fade-up"
              style={{ 
                animationDelay: `${i * 150 + 200}ms`, 
                animationFillMode: 'forwards' 
              }}
            >
              {/* Línea Azul Conectora */}
              {i !== enrichedTimeline.length - 1 && (
                <span
                  className={`absolute left-[-2px] top-2 h-full w-[2px] transition-colors duration-500 ${
                    e.completed ? "bg-[#3B5BDB]" : "bg-transparent"
                  }`}
                  style={{ zIndex: 1 }}
                />
              )}

              {/* Punto del Timeline */}
              <span
                className={`absolute -left-[9px] top-1.5 h-5 w-5 rounded-full border-[3px] z-10 transition-all duration-500 ${
                  e.completed
                    ? "bg-[#3B5BDB] border-[#3B5BDB]" 
                    : e.isCurrent 
                      ? "bg-white border-[#3B5BDB] ring-4 ring-blue-100 scale-110" 
                      : "bg-white border-[#E6E8EB]" 
                }`}
              />

              {/* Contenido Texto */}
              <div className="flex flex-col -mt-1">
                <span
                  className={`text-[15px] font-medium transition-colors duration-300 ${
                    e.completed || e.isCurrent ? "text-[#0A0A0A]" : "text-gray-400"
                  }`}
                >
                  {e.label}
                </span>
                
                {/* Fecha */}
                <span className="text-xs text-gray-400 mt-1 h-4 block font-medium">
                  {e.date 
                    ? new Date(e.date).toLocaleDateString("es-ES", { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }) 
                    : ""}
                </span>
              </div>
            </li>
          ))}
        </ol>

        {/* RESUMEN FINAL (TRANSFER DETAIL) CON ANIMACIÓN */}
        <div 
          className="mt-10 bg-[#F9FAFB] border border-[#E6E8EB] rounded-lg p-6 animate-fade-in opacity-0" 
          style={{ animationDelay: '1000ms', animationFillMode: 'forwards' }}
        >
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Resumen de la operación
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Beneficiario</span>
              <span className="text-[#0A0A0A] font-semibold">{displayName}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500">Monto enviado</span>
              <span className="text-[#0A0A0A] font-semibold">
                {Number(tx.amount).toLocaleString("es-ES", { minimumFractionDigits: 2 })} {tx.currency}
              </span>
            </div>
             <div className="flex justify-between items-center">
              <span className="text-gray-500">Referencia</span>
              <span className="text-[#0A0A0A]">
                {tx.reference || "—"}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}