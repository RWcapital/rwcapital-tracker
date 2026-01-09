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

  return {
    title: `${amount} ${tx.currency}`,
    description: `Arriving from ${tx.businessName}`,
    openGraph: {
      title: `${amount} ${tx.currency}`,
      description: `Arriving from ${tx.businessName}`,
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
