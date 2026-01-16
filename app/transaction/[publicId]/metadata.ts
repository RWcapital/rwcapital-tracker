import { prisma } from "@/lib/prisma";

export async function generateMetadata(
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
  });

  if (!tx) {
    return {
      title: "International Money Transfer - RW Capital Holding",
      description: "Track your international money transfer securely with RW Capital Holding. Real-time status updates and detailed transfer information.",
    };
  }

  const amount = `${Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  })} ${tx.currency}`;

  const recipient = tx.recipientName || tx.businessName;

  // Textos optimizados para redes sociales
  const title = `${amount} International Transfer to ${recipient} - RW Capital`;
  const description = `Track your international money transfer in real-time. View current status, payment timeline, and complete transfer details. Secure transfer tracking by RW Capital Holding.`;

  // Cache-buster fuerte: timestamp + random hash
  const timestamp = new Date().getTime();
  const randomId = Math.random().toString(36).substring(2, 8);
  const ogImageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/transaction/${publicId}/og?t=${timestamp}&r=${randomId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/transaction/${publicId}`,
      siteName: "RW Capital Holding",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${amount} transfer to ${recipient}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}
