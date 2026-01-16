import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getRecipientNameFromWise } from "../../../../../lib/wiseRecipient";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;

    // 1️⃣ Si ya existe, no hacer nada
    const existing = await prisma.transaction.findUnique({
      where: { publicId },
    });

    if (existing) {
      return NextResponse.json({ ok: true, existing: true });
    }

    // 2️⃣ Consultar Wise por ID directo
    const res = await fetch(
      `https://api.wise.com/v1/transfers/${publicId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "Transfer not found in Wise" },
        { status: 404 }
      );
    }

    const transfer = await res.json();

    // 3️⃣ Obtener nombre del destinatario desde Wise
    let recipientName = "Cuenta Wise";
    if (transfer.targetAccount) {
      const resolved = await getRecipientNameFromWise(transfer.targetAccount);
      if (resolved) recipientName = resolved;
    }

    // 4️⃣ Crear transacción (idempotente)
    await prisma.transaction.upsert({
      where: { publicId: transfer.id.toString() },
      create: {
        publicId: transfer.id.toString(),
        wiseTransferId: transfer.id.toString(),
        businessName: "RW Capital Holding, Inc.",
        recipientName: recipientName,
        amount: transfer.sourceValue ?? 0,
        currency: transfer.sourceCurrency ?? "USD",
        status: transfer.status ?? "PROCESSING",
        reference: transfer.reference ?? null,
        events: {
          create: {
            label: "Transferencia detectada automáticamente",
            occurredAt: transfer.created
              ? new Date(transfer.created)
              : new Date(),
          },
        },
      },
      update: {}, // idempotente
    });

    return NextResponse.json({
      ok: true,
      created: true,
      publicId,
    });
  } catch (error: any) {
    console.error("FETCH WISE ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
