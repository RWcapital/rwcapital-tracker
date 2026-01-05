import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function verifySignature(rawBody: string, signature: string | null) {
  if (!signature) return false;

  const secret = process.env.WISE_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-wise-signature");

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
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
