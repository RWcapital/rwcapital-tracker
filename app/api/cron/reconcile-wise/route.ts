import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mapWiseStatus } from "../../../../lib/wiseStatus";

export const runtime = "nodejs";

/**
 * Reconciliación automática Wise
 * - Importa transferencias reales
 * - Usa el ID real de Wise como publicId
 */
export async function GET() {
  try {
    if (!process.env.WISE_API_TOKEN || !process.env.WISE_PROFILE_ID) {
      throw new Error("Missing Wise env vars");
    }

    const res = await fetch(
      `https://api.wise.com/v1/profiles/${process.env.WISE_PROFILE_ID}/transfers?limit=50`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Wise API error: ${text}`);
    }

    const payload = await res.json();

    // ⚠️ Wise devuelve { transfers: [] }
    const transfers = payload.transfers ?? [];

    let created = 0;
    let updated = 0;

    for (const transfer of transfers) {
      if (!transfer.id || !transfer.status) continue;

      const wiseId = transfer.id.toString();
      const mapped = mapWiseStatus(transfer.status);

      const existing = await prisma.transaction.findUnique({
        where: { wiseTransferId: wiseId },
      });

      // 🔎 Montos reales Wise
      const amount =
        transfer.targetAmount?.value ??
        transfer.sourceAmount?.value ??
        0;

      const currency =
        transfer.targetAmount?.currency ??
        transfer.sourceAmount?.currency ??
        "USD";

      const occurredAt = transfer.modifiedAt
        ? new Date(transfer.modifiedAt)
        : transfer.created
        ? new Date(transfer.created)
        : new Date();

      // 🆕 CREAR TRANSFERENCIA
      if (!existing) {
        await prisma.transaction.create({
          data: {
            publicId: wiseId, // ✅ MISMO ID QUE WISE (1905790069)
            wiseTransferId: wiseId,
            businessName:
              transfer.recipient?.name ??
              transfer.details?.reference ??
              "RW Capital Holding",
            amount,
            currency,
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

      // 🔄 ACTUALIZAR ESTADO
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
      imported: transfers.length,
      created,
      updated,
    });
  } catch (error: any) {
    console.error("CRON RECONCILE ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
