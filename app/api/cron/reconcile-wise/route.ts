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
      const wiseId = transfer.id.toString();
      const mapped = mapWiseStatus(transfer.status);

      const existing = await prisma.transaction.findUnique({
        where: { wiseTransferId: wiseId },
      });

      const occurredAt = transfer.updated
        ? new Date(transfer.updated)
        : new Date();

      if (!existing) {
        await prisma.transaction.create({
          data: {
            publicId: wiseId, // 👈 mismo ID Wise
            wiseTransferId: wiseId,
            businessName:
              transfer.recipient?.name ||
              transfer.details?.reference ||
              "RW Capital Holding",
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
    console.error("CRON RECONCILE ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
