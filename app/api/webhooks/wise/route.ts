import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../lib/prisma";
import { mapWiseStatus } from "../../../../lib/wiseStatus";

export const runtime = "nodejs";

/* ──────────────────────────────
   FIRMA HMAC
────────────────────────────── */
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
       1️⃣ CREACIÓN (IDEMPOTENTE)
    ────────────────────────────── */
    if (event_type === "transfer.created") {
      const existing = await prisma.transaction.findUnique({
        where: { wiseTransferId: data.transfer_id },
      });

      if (existing) {
        return NextResponse.json({
          ok: true,
          idempotent: true,
          publicId: existing.publicId,
        });
      }

      const publicId = generatePublicId();

      await prisma.transaction.create({
        data: {
          publicId,
          wiseTransferId: data.transfer_id,
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

      return NextResponse.json({ ok: true, created: true, publicId });
    }

    /* ──────────────────────────────
       2️⃣ CAMBIO DE ESTADO (MAPEADO)
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
