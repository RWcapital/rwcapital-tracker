import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: {
    slug: string;
  };
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { publicId: params.slug },
        { wiseTransferId: params.slug },
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
    tx.recipientName?.trim() || tx.businessName || "Recipient";

  return {
    title: `${amount} ${tx.currency}`,
    description: `Arriving to ${recipient}`,
    openGraph: {
      title: `${amount} ${tx.currency}`,
      description: `Arriving to ${recipient}`,
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_BASE_URL}/track/${params.slug}/og`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default function TrackPage({ params }: Props) {
  redirect(`/transaction/${params.slug}`);
}
