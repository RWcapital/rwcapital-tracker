import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

/**
 * Genera un publicId seguro y no adivinable
 */
function generatePublicId() {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RWC-${year}-${rand}`;
}

/**
 * Verifica firma HMAC de Wise
 */
function verifySignature(body: string, signature: string | null) {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", process.env.WISE_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-wise-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  const payload = JSON.parse(rawBody);
  const eventType = payload.event_type;
  const data = payload.data;

  const wiseTransferId = data.transfer_id;
  if (!wiseTransferId) {
    return NextResponse.json({ ok: true }); // ignorar
  }

  // Buscar transacción existente
  const existingTx = await prisma.transaction.findUnique({
    where: { wiseTransferId },
  });

  /**
   * 🟡 CASO 1 — TRANSFERENCIA CREADA (NO EXISTE EN DB)
   */
  if (!existingTx && eventType === "transfer.created") {
    const publicId = generatePublicId();

    await prisma.transaction.create({
      data: {
        publicId,
        wiseTransferId,
        businessName: data.recipient?.name ?? "RW Capital Holding, Inc.",
        amount: data.amount?.value ?? 0,
        currency: data.amount?.currency ?? "USD",
        status: "CREATED",
        reference: data.reference ?? null,
        events: {
          create: {
            label: "Transfer created",
            occurredAt: new Date(data.occurred_at ?? Date.now()),
          },
        },
      },
    });

    return NextResponse.json({ ok: true, created: true });
  }

  /**
   * 🟢 CASO 2 — TRANSFERENCIA YA EXISTE → ACTUALIZAR ESTADO
   */
  if (existingTx) {
    const statusMap: Record<string, string> = {
      "transfer.processing": "PROCESSING",
      "transfer.completed": "COMPLETED",
      "transfer.cancelled": "CANCELLED",
      "transfer.failed": "FAILED",
    };

    const newStatus = statusMap[eventType];
    const label =
      data.description ??
      eventType.replace("transfer.", "").replace("-", " ");

    if (newStatus) {
      await prisma.transaction.update({
        where: { id: existingTx.id },
        data: {
          status: newStatus,
          events: {
            create: {
              label,
              occurredAt: new Date(data.occurred_at ?? Date.now()),
            },
          },
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
