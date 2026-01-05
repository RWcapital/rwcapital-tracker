import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mapWiseStatus } from "../../../../lib/wiseStatus";


export const runtime = "nodejs";

/**
 * Reconciliación automática contra Wise
 * Ejecutado por Vercel Cron
 */
export async function GET() {
  try {
    // 1️⃣ Buscar transacciones NO finales
    const transactions = await prisma.transaction.findMany({
      where: {
        status: {
          notIn: ["COMPLETED", "FAILED", "CANCELLED"],
        },
      },
    });

    if (transactions.length === 0) {
      return NextResponse.json({ ok: true, message: "Nothing to reconcile" });
    }

    // 2️⃣ Consultar Wise una por una
    for (const tx of transactions) {
      const res = await fetch(
        `https://api.wise.com/v1/transfers/${tx.wiseTransferId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
          },
        }
      );

      if (!res.ok) continue;

      const wise = await res.json();

      const mapped = mapWiseStatus(wise.status);

      // 3️⃣ Actualizar solo si hay cambio
      if (mapped.publicStatus !== tx.status) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: {
            status: mapped.publicStatus,
            events: {
              create: {
                label: mapped.labelES,
                occurredAt: new Date(),
              },
            },
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      reconciled: transactions.length,
    });
  } catch (error: any) {
    console.error("CRON RECONCILE ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
