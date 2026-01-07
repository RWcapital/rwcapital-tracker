import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mapWiseStatus } from "../../../../lib/wiseStatus";
import { getRecipientNameFromWise } from "../../../../lib/wiseRecipient";

export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await fetch(
      `https://api.wise.com/v1/profiles/${process.env.WISE_PROFILE_ID}/transfers?limit=50`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error("Wise API error");
    }

    const transfers = await res.json();

    let created = 0;
    let updated = 0;

    for (const transfer of transfers) {
      const wiseId = transfer.id.toString(); // ✅ ID REAL DE WISE
      const mapped = mapWiseStatus(transfer.status);

      // ⏱ Fecha correcta
      const occurredAt = transfer.created
        ? new Date(transfer.created)
        : new Date();

      // 🔎 Buscar si ya existe
      const existing = await prisma.transaction.findUnique({
        where: { wiseTransferId: wiseId },
      });

      // 🎯 OBTENER NOMBRE REAL DEL DESTINATARIO
      let recipientName: string | null = null;

      if (transfer.targetAccount) {
        recipientName = await getRecipientNameFromWise(
          transfer.targetAccount
        );
      }

      // 🆕 CREAR SI NO EXISTE
      if (!existing) {
        await prisma.transaction.create({
          data: {
            publicId: wiseId,              // 👈 EL MISMO QUE USA CBPAY
            wiseTransferId: wiseId,

            // ✅ QUIÉN ENVÍA
            businessName: "RW Capital Holding, Inc.",

            // ✅ QUIÉN RECIBE (CLAVE)
            recipientName: recipientName,

            // ✅ MONTOS CORRECTOS
            amount: transfer.sourceValue,
            currency: transfer.sourceCurrency,

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

      // 🔄 ACTUALIZAR SI CAMBIÓ EL ESTADO
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
