import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function extractPublicId(slug: string) {
  return slug.split("-")[0]; // 👈 1911055525-xyz → 1911055525
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const publicId = extractPublicId(params.slug);

  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [{ publicId }, { wiseTransferId: publicId }],
    },
  });

  if (!tx) return { title: "Transfer" };

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
          url: `${process.env.NEXT_PUBLIC_BASE_URL}/track/${params.slug}/og`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default function TrackSharePage({
  params,
}: {
  params: { slug: string };
}) {
  const publicId = extractPublicId(params.slug);

  // El humano ve la página real
  redirect(`/transaction/${publicId}`);
}
