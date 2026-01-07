import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { publicId: string } }
) {
  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { publicId: params.publicId },
        { wiseTransferId: params.publicId },
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
  <p>${amount} ${tx.currency}</p>
  <p>Arriving from ${tx.businessName}</p>

  <script>
    setTimeout(() => {
      window.location.href = "/transaction/${params.publicId}";
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
