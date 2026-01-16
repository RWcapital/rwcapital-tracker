import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getRecipientNameFromWise } from "../../../../../lib/wiseRecipient";
import { mapWiseStatus } from "../../../../../lib/wiseStatus";
import { sseBroker } from "../../../../../lib/sse";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;

    // 1️⃣ Consultar Wise por ID directo
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
    
    // 1.5️⃣ Obtener eventos para detectar si realmente está completada
    const eventsRes = await fetch(
      `https://api.wise.com/v1/transfer-events?transferId=${publicId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    
    let finalStatus = transfer.status;
    if (eventsRes.ok) {
      const events = await eventsRes.json();
      // Buscar evento que indique completitud
      const completionEvents = events.filter((e: any) => 
        e.type === 'COMPLETED' || 
        e.type === 'FUNDS_ARRIVED' ||
        e.description?.toLowerCase().includes('received') ||
        e.description?.toLowerCase().includes('completada')
      );
      if (completionEvents.length > 0) {
        finalStatus = 'completed';
      }
    }
    
    const mapped = mapWiseStatus(finalStatus);

    // 2️⃣ Obtener nombre del destinatario desde Wise
    let recipientName = "Cuenta Wise";
    if (transfer.targetAccount) {
      const resolved = await getRecipientNameFromWise(transfer.targetAccount);
      if (resolved) recipientName = resolved;
    }

    // 3️⃣ Crear o actualizar transacción (idempotente) con estado mapeado y evento si cambia
    const idStr = transfer.id.toString();

    const existing = await prisma.transaction.findUnique({
      where: { wiseTransferId: idStr },
    });

    if (!existing) {
      await prisma.transaction.create({
        data: {
          publicId: idStr,
          wiseTransferId: idStr,
          businessName: "RW Capital Holding, Inc.",
          recipientName,
          amount: transfer.sourceValue ?? 0,
          currency: transfer.sourceCurrency ?? "USD",
          status: mapped.publicStatus,
          reference: transfer.reference ?? null,
          events: {
            create: {
              label: mapped.labelES,
              occurredAt: transfer.created ? new Date(transfer.created) : new Date(),
            },
          },
        },
      });
      sseBroker.publish(idStr, { type: "created", status: mapped.publicStatus });
    } else if (existing.status !== mapped.publicStatus) {
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: existing.id },
          data: { status: mapped.publicStatus, updatedAt: new Date() },
        }),
        prisma.transactionEvent.create({
          data: {
            transactionId: existing.id,
            label: mapped.labelES,
            occurredAt: new Date(),
          },
        }),
      ]);
      sseBroker.publish(idStr, { type: "status", status: mapped.publicStatus });
    } else if (existing.recipientName !== recipientName && recipientName) {
      await prisma.transaction.update({
        where: { id: existing.id },
        data: { recipientName },
      });
    }

    return NextResponse.json({
      ok: true,
      created: !existing,
      publicId,
      debug: {
        wiseStatus: transfer.status,
        finalStatus: finalStatus,
        mappedStatus: mapped.publicStatus,
      },
    });
  } catch (error: any) {
    console.error("FETCH WISE ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
