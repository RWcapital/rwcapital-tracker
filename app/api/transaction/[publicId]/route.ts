import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mapWiseStatus } from "../../../../lib/wiseStatus";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

/* ──────────────────────────────
   TIPOS
────────────────────────────── */
type RouteParams = {
  params: Promise<{ // Corregido: Ahora es una Promesa
    publicId: string;
  }>;
};

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  select: {
    id: true;
    publicId: true;
    wiseTransferId: true;
    businessName: true;
    recipientName: true;
    amount: true;
    currency: true;
    status: true;
    reference: true;
    createdAt: true;
    updatedAt: true;
    events: {
      select: {
        occurredAt: true;
        label: true;
      };
    };
    documents: {
      select: {
        id: true;
        type: true;
        fileUrl: true;
      };
    };
  };
}>;

/* ──────────────────────────────
   HELPER: DESTINATARIO DESDE WISE
────────────────────────────── */
async function fetchRecipientName(
  targetAccountId: number | string | null,
  token: string
): Promise<string | null> {
  if (!targetAccountId) return null;

  try {
    const res = await fetch(
      `https://api.wise.com/v1/accounts/${targetAccountId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.accountHolderName ?? null;
  } catch (err) {
    console.error("fetchRecipientName error:", err);
    return null;
  }
}

/* ──────────────────────────────
   ROUTE
────────────────────────────── */
export async function GET(_req: Request, { params }: RouteParams) {
  const { publicId } = await params; // Corregido: Se agrega el await

  if (!publicId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const WISE_TOKEN = process.env.WISE_API_TOKEN ?? "";

  /* ──────────────────────────────
     1️⃣ BUSCAR EN DB
  ────────────────────────────── */
  let tx: TransactionWithRelations | null =
    await prisma.transaction.findFirst({
      where: {
        OR: [{ publicId }, { wiseTransferId: publicId }],
      },
      select: {
        id: true,
        publicId: true,
        wiseTransferId: true,
        businessName: true,
        recipientName: true,
        amount: true,
        currency: true,
        status: true,
        reference: true,
        createdAt: true,
        updatedAt: true,
        events: {
          orderBy: { occurredAt: "asc" },
          select: {
            occurredAt: true,
            label: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            fileUrl: true,
          },
        },
      },
    });

  /* ──────────────────────────────
     2️⃣ AUTO-HEAL recipientName
  ────────────────────────────── */
  if (tx && (!tx.recipientName || tx.recipientName === "Cuenta Wise")) {
    try {
      const res = await fetch(
        `https://api.wise.com/v1/transfers/${tx.wiseTransferId}`,
        { headers: { Authorization: `Bearer ${WISE_TOKEN}` } }
      );

      if (res.ok) {
        const wise = await res.json();
        const resolvedName = await fetchRecipientName(
          wise.targetAccount ?? null,
          WISE_TOKEN
        );

        if (resolvedName && resolvedName !== tx.recipientName) {
          tx = await prisma.transaction.update({
            where: { id: tx.id },
            data: { recipientName: resolvedName },
            select: {
              id: true,
              publicId: true,
              wiseTransferId: true,
              businessName: true,
              recipientName: true,
              amount: true,
              currency: true,
              status: true,
              reference: true,
              createdAt: true,
              updatedAt: true,
              events: {
                orderBy: { occurredAt: "asc" },
                select: {
                  occurredAt: true,
                  label: true,
                },
              },
              documents: {
                select: {
                  id: true,
                  type: true,
                  fileUrl: true,
                },
              },
            },
          });
        }
      }
    } catch (err) {
      console.error("Auto-heal recipientName failed:", err);
    }
  }

  /* ──────────────────────────────
     3️⃣ CREAR SI NO EXISTE
  ────────────────────────────── */
  if (!tx) {
    const res = await fetch(
      `https://api.wise.com/v1/transfers/${publicId}`,
      { headers: { Authorization: `Bearer ${WISE_TOKEN}` } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const wise = await res.json();
    const mapped = mapWiseStatus(wise.status);

    let recipientName = "Cuenta Wise";
    const resolved = await fetchRecipientName(
      wise.targetAccount ?? null,
      WISE_TOKEN
    );
    if (resolved) recipientName = resolved;

    tx = await prisma.transaction.create({
      data: {
        publicId: wise.id.toString(),
        wiseTransferId: wise.id.toString(),
        businessName: "RW Capital Holding, Inc.",
        recipientName,
        amount: wise.sourceValue,
        currency: wise.sourceCurrency,
        status: mapped.publicStatus,
        reference: wise.reference ?? null,
        events: {
          create: {
            label: mapped.labelES,
            occurredAt: new Date(wise.created),
          },
        },
      },
      select: {
        id: true,
        publicId: true,
        wiseTransferId: true,
        businessName: true,
        recipientName: true,
        amount: true,
        currency: true,
        status: true,
        reference: true,
        createdAt: true,
        updatedAt: true,
        events: {
          orderBy: { occurredAt: "asc" },
          select: {
            occurredAt: true,
            label: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            fileUrl: true,
          },
        },
      },
    });
  }

  /* ──────────────────────────────
     4️⃣ RESPUESTA FINAL
  ────────────────────────────── */
  const finalRecipientName =
    tx.recipientName &&
    tx.recipientName.trim() !== "" &&
    tx.recipientName !== "Cuenta Wise"
      ? tx.recipientName
      : "Cuenta Wise";

  return NextResponse.json({
    publicId: tx.publicId,
    businessName: tx.businessName,
    recipientName: finalRecipientName,
    amount: tx.amount.toString(),
    currency: tx.currency,
    status: tx.status,
    reference: tx.reference,
    wiseTransferId: tx.wiseTransferId,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    timeline: tx.events.map((e) => ({
      date: e.occurredAt.toISOString(),
      label: e.label,
    })),
    documents: tx.documents,
  });
}