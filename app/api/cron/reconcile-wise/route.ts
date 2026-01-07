import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mapWiseStatus } from "../../../../lib/wiseStatus";
import { getRecipientNameFromWise } from "../../../../lib/wiseRecipient";

export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await fetch(
      `https://api.wise.com/v1/transfers?profile=${process.env.WISE_PROFILE_ID}&limit=50`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) throw new Error("Wise API error");

    const transfers: any[] = await res.json();

    let created = 0;
    let updated = 0;

    for (const transfer of transfers) {
      const wiseId = transfer.id.toString();
      const mapped = mapWiseStatus(transfer.status);

      const occurredAt = transfer.created
        ? new Date(transfer.created)
        : new Date();

      const existing = await prisma.transaction.findUnique({
        where: { wiseTransferId: wiseId },
      });

      let recipientName = "Cuenta Wise";
      if (transfer.targetAccount) {
        const resolved = await getRecipientNameFromWise(
          transfer.targetAccount
        );
        if (resolved) recipientName = resolved;
      }

      // 🆕 INSERT DEFINITIVO (SQL CONTROLADO)
      if (!existing) {
        const [row] = await prisma.$queryRawUnsafe<
          { id: string }[]
        >(`
          INSERT INTO "Transaction"
            ("id","publicId","wiseTransferId","businessName","recipientName",
             "amount","currency","status","reference","createdAt","updatedAt")
          VALUES
            (gen_random_uuid(),
             '${wiseId}',
             '${wiseId}',
             'RW Capital Holding, Inc.',
             '${recipientName.replace(/'/g, "''")}',
             ${transfer.sourceValue},
             '${transfer.sourceCurrency}',
             '${mapped.publicStatus}',
             ${transfer.reference ? `'${transfer.reference.replace(/'/g, "''")}'` : "NULL"},
             NOW(),
             NOW()
            )
          RETURNING "id";
        `);

        await prisma.transactionEvent.create({
          data: {
            transactionId: row.id,
            label: mapped.labelES,
            occurredAt,
          },
        });

        created++;
        continue;
      }

      // 🔄 UPDATE STATUS NORMAL (Prisma OK)
      if (existing.status !== mapped.publicStatus) {
        await prisma.transaction.update({
          where: { id: existing.id },
          data: { status: mapped.publicStatus },
        });

        await prisma.transactionEvent.create({
          data: {
            transactionId: existing.id,
            label: mapped.labelES,
            occurredAt,
          },
        });

        updated++;
      }
    }

    return NextResponse.json({ ok: true, created, updated });
  } catch (error: any) {
    console.error("RECONCILE ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
