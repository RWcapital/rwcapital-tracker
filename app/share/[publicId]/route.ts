import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;

  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { publicId },
        { wiseTransferId: publicId },
      ],
    },
    select: {
      amount: true,
      currency: true,
      businessName: true,
    },
  });

  if (!tx) {
    return new NextResponse("Not found", { status: 404 });
  }

  const amount = Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${amount} ${tx.currency}</title>
  <meta name="description" content="Arriving from ${tx.businessName}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  ${amount} ${tx.currency}<br/>
  Arriving from ${tx.businessName}

  <script>
    setTimeout(() => {
      window.location.href = "/transaction/${publicId}";
    }, 200);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
