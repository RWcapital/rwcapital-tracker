import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mapWiseStatus } from "../../../../lib/wiseStatus";
import { parseWiseReceipt } from "../../../../lib/wise/parseWiseReceipt";
import { getRecipientNameFromWise } from "../../../../lib/wiseRecipient";

export const runtime = "nodejs";

const LIMIT = 50;

export async function GET() {
  try {
    let offset = 0;
    let created = 0;
    let updated = 0;

    while (true) {
      const res = await fetch(
        `https://api.wise.com/v1/transfers?profile=${process.env.WISE_PROFILE_ID}&limit=${LIMIT}&offset=${offset}`,
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
      if (!transfers.length) break;

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

        // ── CREATE ──────────────────────────────────
        if (!existing) {
          const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(`
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
            ON CONFLICT ("publicId") DO NOTHING
            RETURNING "id";
          `);

          if (rows.length) {
            const row = rows[0];

            await prisma.transactionEvent.create({
              data: {
                transactionId: row.id,
                label: mapped.labelES,
                occurredAt,
              },
            });

            const parsed = await parseWiseReceipt(wiseId);
            if (parsed?.finalRecipientName) {
              await prisma.$executeRawUnsafe(`
                UPDATE "Transaction"
                SET
                  "finalRecipientName" = '${parsed.finalRecipientName.replace(/'/g, "''")}',
                  "finalRecipientSwift" = ${
                    parsed.finalRecipientSwift
                      ? `'${parsed.finalRecipientSwift}'`
                      : "NULL"
                  },
                  "finalRecipientAddr" = ${
                    parsed.finalRecipientAddress
                      ? `'${parsed.finalRecipientAddress.replace(/'/g, "''")}'`
                      : "NULL"
                  },
                  "updatedAt" = NOW()
                WHERE "id" = '${row.id}'
              `);
            }

            created++;
          }

          continue;
        }

        // ── UPDATE ──────────────────────────────────
        if (existing.status !== mapped.publicStatus) {
          await prisma.transaction.update({
            where: { id: existing.id },
            data: {
              status: mapped.publicStatus,
              updatedAt: new Date(),
            },
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

      offset += LIMIT;
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
