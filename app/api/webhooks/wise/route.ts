import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../lib/prisma";
import { mapWiseStatus } from "../../../../lib/wiseStatus";

export const runtime = "nodejs";

/* ──────────────────────────────
   FIRMA HMAC (SEGURA)
────────────────────────────── */
function verifySignature(rawBody: string, signature: string | null) {
  if (!signature) return false;

  const secret = process.env.WISE_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

/* ──────────────────────────────
   ID PÚBLICO (ROBUSTO)
────────────────────────────── */

/* ──────────────────────────────
   WEBHOOK HANDLER
────────────────────────────── */
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

    /* ──────────────────────────────
       1️⃣ TRANSFER CREATED (IDEMPOTENTE)
    ────────────────────────────── */
    if (event_type === "transfer.created") {
  const wiseId = data.transfer_id.toString();

  const existing = await prisma.transaction.findUnique({
    where: { wiseTransferId: wiseId },
  });

  if (existing) {
    return NextResponse.json({
      ok: true,
      idempotent: true,
      publicId: existing.publicId,
    });
  }

  await prisma.transaction.create({
    data: {
      publicId: wiseId,        // 👈 ID visible
      wiseTransferId: wiseId,  // 👈 mismo ID
      businessName: "RW Capital Holding, Inc.",
      amount: data.amount.value,
      currency: data.amount.currency,
      status: "PENDING",
      reference: data.reference ?? null,
      events: {
        create: {
          label: "El remitente ha creado tu transferencia",
          occurredAt: new Date(data.occurred_at),
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    created: true,
    publicId: wiseId,
  });
}

    /* ──────────────────────────────
       2️⃣ STATUS CHANGED
    ────────────────────────────── */
    if (event_type === "transfer.status.changed") {
      const tx = await prisma.transaction.findUnique({
        where: { wiseTransferId: data.transfer_id },
      });

      if (!tx) {
        return NextResponse.json({ ok: true, ignored: true });
      }

      const mapped = mapWiseStatus(data.status);

      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: mapped.publicStatus,
          events: {
            create: {
              label: mapped.labelES,
              occurredAt: new Date(data.occurred_at),
            },
          },
        },
      });

      return NextResponse.json({
        ok: true,
        updated: true,
        status: mapped.publicStatus,
      });
    }

    /* ──────────────────────────────
       EVENTOS NO SOPORTADOS
    ────────────────────────────── */
    return NextResponse.json({ ok: true, ignored: true });
  } catch (error: any) {
    console.error("WISE WEBHOOK ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
