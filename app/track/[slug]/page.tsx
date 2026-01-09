import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/* ──────────────────────────────
   HELPERS
────────────────────────────── */
function extractPublicId(slug: string) {
  return slug.split("-")[0];
}

/* ──────────────────────────────
   METADATA
────────────────────────────── */
type MetadataProps = {
  params: {
    slug: string;
  };
};

export async function generateMetadata(
  { params }: MetadataProps
): Promise<Metadata> {
  const publicId = extractPublicId(params.slug);

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
      recipientName: true,
      businessName: true,
    },
  });

  if (!tx) return {};

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
          url: `/track/${params.slug}/og?v=${Date.now()}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

/* ──────────────────────────────
   PAGE (REDIRECT HUMANO)
────────────────────────────── */
export default function TrackSharePage({
  params,
}: {
  params: { slug: string };
}) {
  const publicId = extractPublicId(params.slug);

  redirect(`/transaction/${publicId}`);
}
