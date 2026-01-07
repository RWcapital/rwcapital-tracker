import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: Request,
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
<html>
<head>
  <title>${amount} ${tx.currency}</title>
  <meta name="description" content="Arriving from ${tx.businessName}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <script>
    window.location.href = "/transaction/${params.publicId}";
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
