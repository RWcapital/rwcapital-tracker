import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ publicId: string }>;
};

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  const { publicId } = await params;

  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [{ publicId }, { wiseTransferId: publicId }],
    },
    select: {
      amount: true,
      currency: true,
      businessName: true,
      recipientName: true,
    },
  });

  if (!tx) {
    return new NextResponse("Not found", { status: 404 });
  }

  const amount = Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });

  const title = `${amount} ${tx.currency}`;
  const description = `Sent to ${tx.recipientName ?? "Recipient"}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />

  <title>${title}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:site_name" content="RW Capital Holding" />
  <meta property="og:url" content="https://track.rwcapitalholding.com/share/${publicId}" />

  <!-- Twitter / WhatsApp -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />

  <!-- 🔑 REDIRECT REAL (LO QUE FALTABA) -->
  <meta http-equiv="refresh" content="0;url=/transaction/${publicId}" />
</head>
<body>
  Redirecting…
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
