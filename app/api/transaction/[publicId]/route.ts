import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mapWiseStatus } from "../../../../lib/wiseStatus";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

/* ──────────────────────────────
   PARAMS (Next.js 15)
────────────────────────────── */
type RouteParams = {
  params: Promise<{
    publicId: string;
  }>;
};

/* ──────────────────────────────
   TIPO CORRECTO CON INCLUDE (ÚNICO VÁLIDO)
────────────────────────────── */
type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    events: {
      orderBy: { occurredAt: "asc" };
    };
    documents: true;
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
  } catch {
    return null;
  }
}

/* ──────────────────────────────
   ROUTE
────────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  const { publicId } = await params;

  if (!publicId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const WISE_TOKEN = process.env.WISE_API_TOKEN;
  if (!WISE_TOKEN) {
    return NextResponse.json(
      { error: "Wise API token not configured" },
      { status: 500 }
    );
  }

  /* ──────────────────────────────
     1️⃣ BUSCAR EN DB
  ────────────────────────────── */
  let tx: TransactionWithRelations | null =
    await prisma.transaction.findFirst({
      where: {
        OR: [{ publicId }, { wiseTransferId: publicId }],
      },
      include: {
        events: {
          orderBy: { occurredAt: "asc" },
        },
        documents: true,
      },
    });

  /* ──────────────────────────────
     2️⃣ AUTO-HEAL recipientName
  ────────────────────────────── */
  if (tx && (!tx.recipientName || tx.recipientName === "Cuenta Wise")) {
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
          include: {
            events: {
              orderBy: { occurredAt: "asc" },
            },
            documents: true,
          },
        });
      }
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

    const resolved = await fetchRecipientName(
      wise.targetAccount ?? null,
      WISE_TOKEN
    );

    tx = await prisma.transaction.create({
      data: {
        publicId: wise.id.toString(),
        wiseTransferId: wise.id.toString(),
        businessName: "RW Capital Holding, Inc.",
        recipientName: resolved ?? "Cuenta Wise",
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
      include: {
        events: {
          orderBy: { occurredAt: "asc" },
        },
        documents: true,
      },
    });
  }

  /* ──────────────────────────────
     4️⃣ RESPUESTA FINAL
  ────────────────────────────── */
  return NextResponse.json({
    publicId: tx.publicId,
    businessName: tx.businessName,
    recipientName:
      tx.recipientName && tx.recipientName !== "Cuenta Wise"
        ? tx.recipientName
        : "Cuenta Wise",
    amount: tx.amount.toString(),
    currency: tx.currency,
    status: tx.status,
    reference: tx.reference,
    wiseTransferId: tx.wiseTransferId,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
    timeline: tx.events.map((e: { occurredAt: Date; label: string }) => ({
      date: e.occurredAt.toISOString(),
      label: e.label,
    })),
    documents: tx.documents,
  });
}
