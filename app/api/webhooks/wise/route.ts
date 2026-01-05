import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("WEBHOOK RECIBIDO", body);

    return NextResponse.json({
      ok: true,
      received: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("ERROR WEBHOOK", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
