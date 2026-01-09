import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: { publicId: string } }
): Promise<Metadata> {
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
      recipientName: true,
      businessName: true,
    },
  });

  if (!tx) {
    return {
      title: "Transfer",
    };
  }

  const amount = Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });

  const recipient =
    tx.recipientName && tx.recipientName.trim() !== ""
      ? tx.recipientName
      : tx.businessName;

  return {
    title: `${amount} ${tx.currency}`,
    description: `Arriving to ${recipient}`,
    openGraph: {
      title: `${amount} ${tx.currency}`,
      description: `Arriving to ${recipient}`,
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

export default function SharePage() {
  // Página vacía, solo existe para el preview
  return null;
}
