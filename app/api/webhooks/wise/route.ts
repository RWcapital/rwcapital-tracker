import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function verifySignature(rawBody: string, signature: string | null) {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", process.env.WISE_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-wise-signature");

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json(
        { ok: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    return NextResponse.json({
      ok: true,
      verified: true,
      payload,
    });
  } catch (err: any) {
    console.error("WEBHOOK ERROR", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
