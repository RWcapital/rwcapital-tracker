import { prisma } from "@/lib/prisma";

export async function generateMetadata(
  { params }: { params: { publicId: string } }
) {
  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { publicId: params.publicId },
        { wiseTransferId: params.publicId },
      ],
    },
  });

  if (!tx) return {};

  const amount = Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });

  // ✅ DESTINATARIO REAL (según tu schema)
  const recipient = tx.recipientName || tx.businessName;

  return {
    title: `${amount} ${tx.currency}`,
    description: `Arriving from ${recipient}`,
    openGraph: {
      title: `${amount} ${tx.currency}`,
      description: `Arriving from ${recipient}`,
      images: [
        {
          url: `/transaction/${params.publicId}/og`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}
