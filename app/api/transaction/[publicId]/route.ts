import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma"; 
import { mapWiseStatus } from "../../../../lib/wiseStatus";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ publicId: string }>;
};

// Helper para obtener datos de la cuenta (Nombre del Destinatario)
async function fetchRecipientName(targetAccountId: number | string | null, token: string): Promise<string | null> {
  if (!targetAccountId) return null;
  
  try {
    // Si targetAccount ya es un objeto (raro, pero posible en algunas respuestas), intentamos leerlo directo
    if (typeof targetAccountId === 'object' && (targetAccountId as any).accountHolderName) {
      return (targetAccountId as any).accountHolderName;
    }

    // Si es un ID, consultamos la API de cuentas
    const res = await fetch(`https://api.wise.com/v1/accounts/${targetAccountId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      return data.accountHolderName || null;
    }
  } catch (error) {
    console.error("Error fetching recipient account details:", error);
  }
  return null;
}

export async function GET(_req: Request, { params }: Params) {
  const { publicId } = await params;

  if (!publicId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const WISE_TOKEN = process.env.WISE_API_TOKEN || "";

  // 1️⃣ Buscar en DB
  let tx: any = await prisma.transaction.findFirst({
    where: {
      OR: [
        { publicId },
        { wiseTransferId: publicId },
      ],
    },
    include: {
      events: { orderBy: { occurredAt: "asc" } },
      documents: true,
    },
  });

  // 🚨 AUTO-CORRECCIÓN: Si existe pero no tiene nombre, intentamos arreglarlo
  if (tx && (!tx.recipientName || tx.recipientName === "Destinatario")) {
    try {
      // Volvemos a consultar a Wise para obtener el ID de la cuenta
      const res = await fetch(
        `https://api.wise.com/v1/transfers/${tx.wiseTransferId || tx.publicId}`, 
        {
          headers: { Authorization: `Bearer ${WISE_TOKEN}` },
        }
      );
      
      if (res.ok) {
        const wiseData = await res.json();
        
        // Intentamos sacar el nombre de los detalles o consultando la cuenta
        let realName = wiseData.details?.accountHolderName;
        
        if (!realName) {
           realName = await fetchRecipientName(wiseData.targetAccount, WISE_TOKEN);
        }

        if (realName && realName !== tx.recipientName) {
          // Actualizamos la DB
          tx = await prisma.transaction.update({
            where: { id: tx.id },
            data: { recipientName: realName } as any, 
            include: {
              events: { orderBy: { occurredAt: "asc" } },
              documents: true,
            }
          });
        }
      }
    } catch (error) {
      console.error("Error auto-healing recipient name:", error);
    }
  }

  // 2️⃣ SI NO EXISTE EN DB → CONSULTAR WISE Y CREAR
  if (!tx) {
    const res = await fetch(
      `https://api.wise.com/v1/transfers/${publicId}`,
      {
        headers: {
          Authorization: `Bearer ${WISE_TOKEN}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const wise = await res.json();
    const mapped = mapWiseStatus(wise.status);

    // ── LÓGICA DE NOMBRE DEL DESTINATARIO ──
    let recipientNameVal = "Destinatario"; // Default solicitado

    // Intento 1: Buscar en details directos
    if (wise.details?.accountHolderName) {
      recipientNameVal = wise.details.accountHolderName;
    } 
    // Intento 2: Buscar consultando la cuenta destino (Fetch adicional)
    else if (wise.targetAccount) {
      const fetchedName = await fetchRecipientName(wise.targetAccount, WISE_TOKEN);
      if (fetchedName) recipientNameVal = fetchedName;
    }

    // GUARDAR EN DB
    tx = await prisma.transaction.create({
      data: {
        publicId: wise.id.toString(),
        wiseTransferId: wise.id.toString(),
        businessName: "RW Capital Holding, Inc.",
        amount: wise.sourceValue,
        currency: wise.sourceCurrency,
        status: mapped.publicStatus,
        reference: wise.reference || null,
        recipientName: recipientNameVal, // Aquí ya lleva el nombre real o "Destinatario"
        events: {
          create: {
            label: mapped.labelES,
            occurredAt: new Date(wise.created),
          },
        },
      } as any,
      include: {
        events: { orderBy: { occurredAt: "asc" } },
        documents: true,
      },
    });
  }

  // 4️⃣ RESPUESTA
  return NextResponse.json({
    publicId: tx.publicId,
    businessName: tx.businessName,
    recipientName: tx.recipientName, 
    amount: tx.amount.toString(),
    currency: tx.currency,
    status: tx.status,
    reference: tx.reference,
    wiseTransferId: tx.wiseTransferId,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    timeline: tx.events.map((e: any) => ({
      date: e.occurredAt.toISOString(),
      label: e.label,
    })),
    documents: tx.documents.map((d: any) => ({
      id: d.id,
      type: d.type,
      fileUrl: d.fileUrl,
    })),
  });
}