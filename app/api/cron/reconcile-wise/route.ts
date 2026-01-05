import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mapWiseStatus } from "../../../../lib/wiseStatus";

export const runtime = "nodejs";

/**
 * Reconciliación automática contra Wise
 * - Crea transferencias nuevas
 * - Actualiza estados existentes
 */
export async function GET() {
  try {
    const headers = {
      Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
    };

    // 1️⃣ Obtener transferencias recientes desde Wise
    const res = await fetch(
      "https://api.wise.com/v1/transfers?limit=50",
      { headers }
    );

    if (!res.ok) {
      throw new Error("Wise API error");
    }

    const transfers = await res.json();

    let created = 0;
    let updated = 0;

    for (const transfer of transfers) {
      const wiseId = transfer.id.toString();

      const mapped = mapWiseStatus(transfer.status);

      // 2️⃣ Buscar en DB por wiseTransferId
      const existing = await prisma.transaction.findUnique({
        where: { wiseTransferId: wiseId },
      });

      // 🆕 NO EXISTE → CREAR
      if (!existing) {
        await prisma.transaction.create({
          data: {
            publicId: wiseId, // 👈 MISMO ID DE WISE
            wiseTransferId: wiseId,
            businessName:
              transfer.recipient?.name ?? "Cliente",
            amount: transfer.amount.value,
            currency: transfer.amount.currency,
            status: mapped.publicStatus,
            reference: transfer.reference ?? null,
            events: {
              create: {
                label: mapped.labelES,
                occurredAt: new Date(transfer.updated),
              },
            },
          },
        });

        created++;
        continue;
      }

      // 🔄 EXISTE → ACTUALIZAR SI CAMBIÓ
      if (existing.status !== mapped.publicStatus) {
        await prisma.transaction.update({
          where: { id: existing.id },
          data: {
            status: mapped.publicStatus,
            events: {
              create: {
                label: mapped.labelES,
                occurredAt: new Date(transfer.updated),
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
    console.error("CRON RECONCILE ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
