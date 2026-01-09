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

  const amount = `${Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  })} ${tx.currency}`;

  const recipient = tx.recipientName || tx.businessName;

  // 🔑 CLAVE: WhatsApp SOLO garantiza mostrar el title
  const title = `${amount} · ${recipient}`;

  return {
    title,
    description: "View transfer details",
    openGraph: {
      title,
      description: "View transfer details",
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
