import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Intenta conectarse a la BD
    const count = await prisma.transaction.count();
    
    // Intenta encontrar la transacción específica
    const tx = await prisma.transaction.findFirst({
      where: {
        publicId: "1912280005",
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Database connection successful",
      totalTransactions: count,
      specificTransaction: tx || "Not found in this query",
      databaseUrl: process.env.DATABASE_URL ? "✓ Set" : "✗ Missing",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        stack: error.stack,
        databaseUrl: process.env.DATABASE_URL ? "✓ Set" : "✗ Missing",
      },
      { status: 500 }
    );
  }
}
