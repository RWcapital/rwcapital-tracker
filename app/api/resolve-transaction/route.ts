import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { wiseId } = await req.json();

    if (!wiseId || typeof wiseId !== "string") {
      return NextResponse.json(
        { error: "Invalid tracking code" },
        { status: 400 }
      );
    }

    const tx = await prisma.transaction.findUnique({
      where: {
        wiseTransferId: wiseId,
      },
      select: {
        publicId: true, // o id si prefieres
      },
    });

    if (!tx) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      transactionId: tx.publicId,
    });
  } catch (error) {
    console.error("RESOLVE ERROR", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
