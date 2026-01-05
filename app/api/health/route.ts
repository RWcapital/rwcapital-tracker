import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("HEALTH CHECK ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        message: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
