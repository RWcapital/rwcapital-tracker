import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma"; 
import { mapWiseStatus } from "../../../../lib/wiseStatus";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function GET(_req: Request, { params }: Params) {
  const { publicId } = await params;

  if (!publicId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // 1️⃣ Buscar en DB (usamos 'any' para flexibilidad de tipos)
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

  // 🚨 AUTO-CORRECCIÓN: Si existe pero no tiene nombre, consultamos a Wise para arreglarlo
  if (tx && !tx.recipientName) {
    try {
      const res = await fetch(
        `https://api.wise.com/v1/transfers/${tx.publicId}`, // Usamos el ID real guardado
        {
          headers: { Authorization: `Bearer ${process.env.WISE_API_TOKEN}` },
        }
      );
      
      if (res.ok) {
        const wiseData = await res.json();
        const realName = wiseData.details?.accountHolderName || wiseData.targetAccount?.accountHolderName || "Beneficiario";
        
        // Actualizamos la DB
        tx = await prisma.transaction.update({
          where: { id: tx.id },
          data: { recipientName: realName } as any, // 'as any' para evitar error de tipos
          include: {
            events: { orderBy: { occurredAt: "asc" } },
            documents: true,
          }
        });
      }
    } catch (error) {
      console.error("Error auto-healing recipient name:", error);
    }
  }

  // 2️⃣ SI NO EXISTE → CONSULTAR WISE Y CREAR
  if (!tx) {
    const res = await fetch(
      `https://api.wise.com/v1/transfers/${publicId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
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

    const recipientNameVal = wise.details?.accountHolderName || wise.targetAccount?.accountHolderName || "Beneficiario";

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
        recipientName: recipientNameVal,
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
    recipientName: tx.recipientName, // Ahora siempre debería tener valor
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