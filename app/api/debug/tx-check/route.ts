import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Exactamente lo que hace la página
    const tx = await prisma.transaction.findFirst({
      where: {
        OR: [
          { publicId: "1912280005" },
          { wiseTransferId: "1912280005" },
        ],
      },
      include: {
        events: {
          orderBy: { occurredAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Query exacto de la página",
      transaction: tx,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
