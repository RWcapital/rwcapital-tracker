import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma"; // Verifica que esta ruta sea correcta
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

  // 1️⃣ Buscar en DB
  // Usamos 'any' aquí para evitar conflictos de tipos estrictos
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

  // 2️⃣ SI NO EXISTE → CONSULTAR WISE EN TIEMPO REAL
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

    const recipientNameVal = wise.details?.accountHolderName || wise.targetAccount?.accountHolderName || "Beneficiary";

    // 3️⃣ GUARDAR EN DB
    // FIX: Agregamos 'as any' al objeto data para que TypeScript no bloquee el build
    // si no ha detectado la actualización de prisma client todavía.
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

  // 4️⃣ RESPUESTA NORMALIZADA
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