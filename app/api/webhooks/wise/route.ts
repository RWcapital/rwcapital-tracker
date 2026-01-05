import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

function verifySignature(rawBody: string, signature: string | null) {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", process.env.WISE_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-wise-signature");

    if (!verifySignature(rawBody, signature)) {
      console.error("❌ Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    console.log("✅ Webhook payload:", payload);

    const eventType = payload.event_type;
    const data = payload.data;

    // 🟢 SIMULACIÓN: creación
    if (eventType === "transfer.created") {
      const publicId = `RWC-${Date.now()}`;

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

    // 🟡 Cambio de estado
    if (eventType === "transfer.status.changed") {
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
  } catch (err: any) {
    console.error("🔥 Webhook error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
