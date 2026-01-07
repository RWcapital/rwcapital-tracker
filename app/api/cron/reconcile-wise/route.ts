import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mapWiseStatus } from "../../../../lib/wiseStatus";

export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await fetch(
      `https://api.wise.com/v1/profiles/${process.env.WISE_PROFILE_ID}/transfers?limit=50`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error("Wise API error");
    }

    const transfers: any[] = await res.json();

    let created = 0;
    let updated = 0;

    for (const transfer of transfers) {
      const wiseId = transfer.id.toString(); // 🔑 ID REAL DE WISE
      const mapped = mapWiseStatus(transfer.status);

      const occurredAt = transfer.updated
        ? new Date(transfer.updated)
        : new Date();

      const existing = await prisma.transaction.findUnique({
        where: { wiseTransferId: wiseId },
      });

      // 🆕 CREAR TRANSACCIÓN
      if (!existing) {
        await prisma.transaction.create({
          data: {
            publicId: wiseId,
            wiseTransferId: wiseId,

            businessName:
              transfer.recipient?.name ??
              "RW Capital Holding, Inc.",

            amount: transfer.amount.value,
            currency: transfer.amount.currency,

            status: mapped.publicStatus,
            reference: transfer.reference ?? null,

            events: {
              create: {
                label: mapped.labelES,
                occurredAt,
              },
            },
          },
        });

        created++;
        continue;
      }

      // 🔄 ACTUALIZAR ESTADO SI CAMBIÓ
      if (existing.status !== mapped.publicStatus) {
        await prisma.transaction.update({
          where: { id: existing.id },
          data: {
            status: mapped.publicStatus,
            events: {
              create: {
                label: mapped.labelES,
                occurredAt,
              },
            },
          },
        });

        updated++;
      }
    }

    return NextResponse.json({
      ok: true,
      created,
      updated,
    });
  } catch (error: any) {
    console.error("RECONCILE ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
