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

  // 1️⃣ Buscar en DB
  let tx = await prisma.transaction.findFirst({
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

    // 3️⃣ GUARDAR EN DB
    tx = await prisma.transaction.create({
      data: {
        publicId: wise.id.toString(),          // 👈 USAMOS EL ID WISE
        wiseTransferId: wise.id.toString(),
        businessName: "RW Capital Holding, Inc.",
        amount: wise.sourceValue,
        currency: wise.sourceCurrency,
        status: mapped.publicStatus,
        reference: wise.reference || null,
        events: {
          create: {
            label: mapped.labelES,
            occurredAt: new Date(wise.created),
          },
        },
      },
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
    amount: tx.amount.toString(),
    currency: tx.currency,
    status: tx.status,
    reference: tx.reference,
    wiseTransferId: tx.wiseTransferId,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    timeline: tx.events.map((e) => ({
      date: e.occurredAt.toISOString(),
      label: e.label,
    })),
    documents: tx.documents.map((d) => ({
      id: d.id,
      type: d.type,
      fileUrl: d.fileUrl,
    })),
  });
}
