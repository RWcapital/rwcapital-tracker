import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

function verifySignature(rawBody: string, signature: string | null) {
  if (!signature) return false;

  const secret = process.env.WISE_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
}

function generatePublicId() {
  return `RWC-${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-wise-signature");

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json(
        { ok: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const { event_type, data } = payload;

    // 🟢 1. CREACIÓN AUTOMÁTICA
    if (event_type === "transfer.created") {
      const publicId = generatePublicId();

      await prisma.transaction.create({
        data: {
          publicId,
          wiseTransferId: data.transfer_id,
          businessName: "RW Capital Holding, Inc.",
          amount: data.amount.value,
          currency: data.amount.currency,
          status: "CREATED",
          reference: data.reference ?? null,
          events: {
            create: {
              label: "El remitente ha creado tu transferencia",
              occurredAt: new Date(data.occurred_at),
            },
          },
        },
      });

      return NextResponse.json({ ok: true, created: true, publicId });
    }

    // 🟡 2. ACTUALIZACIÓN DE ESTADO
    if (event_type === "transfer.status.changed") {
      const tx = await prisma.transaction.findUnique({
        where: { wiseTransferId: data.transfer_id },
      });

      if (!tx) {
        return NextResponse.json({ ok: true, ignored: true });
      }

      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: data.status,
          events: {
            create: {
              label: data.description ?? "Estado actualizado",
              occurredAt: new Date(data.occurred_at),
            },
          },
        },
      });

      return NextResponse.json({ ok: true, updated: true });
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (error: any) {
    console.error("WEBHOOK ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
