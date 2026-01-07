import Image from "next/image";
import { notFound } from "next/navigation";

/* ──────────────────────────────
   CONFIGURACIÓN Y HELPERS
────────────────────────────── */

// 1. Textos esperados en el Timeline visual
const WISE_TIMELINE_STEPS = [
  "El remitente ha creado tu transferencia",
  "Hemos recibido los fondos", // Texto corto para facilitar coincidencia
  "Tu dinero está en camino",
  "El dinero se mueve",
  "Tu dinero debería haber llegado",
];

// 2. Helper para comparar textos ignorando acentos y mayúsculas (CLAVE PARA QUE FUNCIONE)
const normalize = (str: string) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/* ──────────────────────────────
   TIPOS
────────────────────────────── */
type TimelineEvent = {
  date: string;
  label: string;
};

type Transaction = {
  publicId: string;
  businessName: string; // Nombre del negocio (fallback)
  recipientName: string | null; // Nombre real del destinatario
  amount: string;
  currency: string;
  status: string;
  reference?: string | null;
  createdAt?: string;
  timeline: TimelineEvent[];
};

/* ──────────────────────────────
   FETCH DE DATOS
────────────────────────────── */
async function getTransaction(publicId: string): Promise<Transaction | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/transaction/${publicId}`,
      { cache: "no-store" } // Importante para ver cambios en tiempo real
    );

    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return null;
  }
}

/* ──────────────────────────────
   COMPONENTE PRINCIPAL
────────────────────────────── */
export default async function TransactionPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const tx = await getTransaction(publicId);

  if (!tx) notFound();

  /* ─────────────────────────────────────────────────────────────
     LÓGICA 1: NOMBRE DEL BENEFICIARIO (Solución a "no aparece")
  ───────────────────────────────────────────────────────────── */
  // Prioridad: 1. Nombre Destinatario -> 2. Nombre Negocio -> 3. "Beneficiario"
  let displayName = "Beneficiario";
  
  if (tx.recipientName && tx.recipientName !== "null" && tx.recipientName.trim() !== "") {
    displayName = tx.recipientName;
  } else if (tx.businessName && tx.businessName !== "null") {
    displayName = tx.businessName;
  }

  /* ─────────────────────────────────────────────────────────────
     LÓGICA 2: ESTADO GLOBAL (Solución a "sale pendiente")
  ───────────────────────────────────────────────────────────── */
  const statusUpper = tx.status?.toUpperCase() || "";

  // Lista ampliada de estados que significan "Terminado"
  const COMPLETED_STATUSES = [
    "COMPLETED",
    "SUCCESS",
    "SENT",
    "FUNDS_SENT",
    "OUTGOING_PAYMENT_SENT",
  ];

  // Verificamos si el status dice completado O si el timeline tiene el evento final
  const hasFinalEvent = tx.timeline.some((e) => 
    normalize(e.label).includes("llegado") || 
    normalize(e.label).includes("completado")
  );

  const isGlobalCompleted = COMPLETED_STATUSES.includes(statusUpper) || hasFinalEvent;

  /* ─────────────────────────────────────────────────────────────
     LÓGICA 3: CONSTRUCCIÓN DEL TIMELINE VISUAL
  ───────────────────────────────────────────────────────────── */
  let lastCompletedIndex = -1;

  if (isGlobalCompleted) {
    // Si está completado globalmente, forzamos que TODO se vea azul
    lastCompletedIndex = WISE_TIMELINE_STEPS.length - 1;
  } else {
    // Si no, buscamos paso a paso con coincidencia flexible
    WISE_TIMELINE_STEPS.forEach((stepLabel, index) => {
      // Buscamos si algún evento de la API coincide parcialmente con el paso
      const exists = tx.timeline.some((apiEvent) => 
        normalize(apiEvent.label).includes(normalize(stepLabel)) ||
        normalize(stepLabel).includes(normalize(apiEvent.label))
      );

      if (exists) {
        lastCompletedIndex = index;
      }
    });
  }

  // Fecha por defecto (creación) para cuando falta la fecha exacta del evento
  const fallbackDate = tx.createdAt ?? new Date().toISOString();

  // Mapeo final para renderizar
  const enrichedTimeline = WISE_TIMELINE_STEPS.map((label, index) => {
    // Buscar evento real para sacar la fecha
    const realEvent = tx.timeline.find((e) =>
      normalize(e.label).includes(normalize(label)) ||
      normalize(label).includes(normalize(e.label))
    );

    const isStepCompleted = index <= lastCompletedIndex;

    return {
      label,
      completed: isStepCompleted,
      // Es el actual solo si es el último completado Y la transacción no ha terminado totalmente
      isCurrent: index === lastCompletedIndex && !isGlobalCompleted,
      date: isStepCompleted ? (realEvent?.date ?? fallbackDate) : null,
    };
  });

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex justify-center px-4 py-10 relative overflow-hidden font-sans">
      
      {/* Fondo Decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px]" />
      </div>

      {/* ─── CARD PRINCIPAL ─── */}
      <div 
        className="relative z-10 w-full max-w-xl bg-white rounded-xl border border-[#E6E8EB] p-8 shadow-xl animate-fade-up opacity-0" 
        style={{ animationFillMode: 'forwards' }}
      >
        
        {/* LOGO (Opcional, si tienes el archivo) */}
        <div className="flex justify-center mb-8">
           {/* Si no tienes logo.png, comenta esta sección o usa un placeholder */}
           {/* <Image src="/logo.png" alt="Logo" width={180} height={50} className="h-auto w-auto" /> */}
        </div>

        {/* HEADER */}
        <div className="text-center mb-10">
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

        {/* ─── TIMELINE VISUAL ─── */}
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
                  className={`absolute left-[-2px] top-2 h-full w-[2px] transition-colors duration-500 delay-300 ${
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
                
                {/* Fecha debajo del título */}
                <span className="text-xs text-gray-400 mt-1 h-4 block font-medium">
                  {e.date 
                    ? new Date(e.date).toLocaleDateString("es-ES", { day: 'numeric', month: 'short' }) 
                    : ""}
                </span>
              </div>
            </li>
          ))}
        </ol>

        {/* ─── RESUMEN FINAL ─── */}
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
              <span className="text-[#0A0A0A] max-w-[200px] truncate text-right">
                {tx.reference || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* BOTÓN DESCARGA (Opcional) */}
        <div className="mt-6 text-center animate-fade-in opacity-0" style={{ animationDelay: '1400ms', animationFillMode: 'forwards' }}>
          <a
            href={`/api/receipt/${tx.publicId}`}
            className="inline-flex items-center text-[#3B5BDB] hover:text-[#2F4AC6] font-medium transition-colors text-sm"
          >
            <span className="mr-2"></span> Descargar comprobante oficial
          </a>
        </div>

      </div>
    </div>
  );
}