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
   TIPO CON FORZADO DE CAMPO
────────────────────────────── */
// Sincronizamos el tipo con la consulta real y forzamos recipientName
type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    events: {
      orderBy: { occurredAt: "asc" };
    };
    documents: true;
  };
}> & { 
  recipientName?: string | null; 
};

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
    console.error("❌ LOG [fetchRecipientName Error]:", err);
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
  // CORRECCIÓN NEXT.JS 15: Await params
  const { publicId } = await params;
  console.log(`\n🚀 LOG [GET /api/transaction/${publicId}]: Iniciando búsqueda...`);

  if (!publicId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const WISE_TOKEN = process.env.WISE_API_TOKEN;
  if (!WISE_TOKEN) {
    console.error("❌ LOG [Error]: WISE_API_TOKEN no configurado.");
    return NextResponse.json(
      { error: "Wise API token not configured" },
      { status: 500 }
    );
  }

  /* ──────────────────────────────
     1️⃣ BUSCAR EN DB
  ────────────────────────────── */
  let tx = await prisma.transaction.findFirst({
    where: {
      OR: [{ publicId }, { wiseTransferId: publicId }],
    },
    include: {
      events: {
        orderBy: { occurredAt: "asc" },
      },
      documents: true,
    },
  }) as TransactionWithRelations | null;

  if (tx) console.log("✅ LOG [DB]: Encontrado en base de datos.");

  /* ──────────────────────────────
     2️⃣ AUTO-HEAL recipientName
  ────────────────────────────── */
  if (tx && (!tx.recipientName || tx.recipientName === "Cuenta Wise")) {
    console.log("🛠️ LOG [Auto-heal]: Consultando nombre en Wise...");
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
          // CORRECCIÓN: Cast a any para saltar la validación de Prisma
          data: { recipientName: resolvedName } as any,
          include: {
            events: {
              orderBy: { occurredAt: "asc" },
            },
            documents: true,
          },
        }) as TransactionWithRelations;
        console.log("✅ LOG [Auto-heal]: Nombre actualizado.");
      }
    }
  }

  /* ──────────────────────────────
     3️⃣ CREAR SI NO EXISTE
  ────────────────────────────── */
  if (!tx) {
    const wiseUrl = `https://api.wise.com/v1/transfers/${publicId}`;
    console.log(`📡 LOG [Wise API]: Consultando ${wiseUrl}`);
    const res = await fetch(wiseUrl, { 
      headers: { Authorization: `Bearer ${WISE_TOKEN}` } 
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ LOG [Wise API Error]: Status ${res.status}. Detalle: ${errorText}`);
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
      // CORRECCIÓN: Cast a any para permitir recipientName aunque no esté en el schema
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
      } as any,
      include: {
        events: {
          orderBy: { occurredAt: "asc" },
        },
        documents: true,
      },
    }) as TransactionWithRelations;
    console.log("✅ LOG [DB]: Nuevo registro creado exitosamente.");
  }

  /* ──────────────────────────────
     4️⃣ RESPUESTA FINAL
  ────────────────────────────── */
  return NextResponse.json({
    ...tx,
    amount: tx.amount.toString(),
    recipientName: tx.recipientName ?? "Cuenta Wise",
    timeline: tx.events.map((e) => ({
      date: e.occurredAt.toISOString(),
      label: e.label,
    })),
  });
}