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

  // ✅ DESTINATARIO REAL SEGÚN TU SCHEMA
  const recipient = tx.recipientName || tx.businessName;

  return {
    // 👉 WhatsApp muestra ESTO como título principal
    title: amount,

    // 👉 WhatsApp muestra ESTO debajo del título
    description: `Arriving from ${recipient}`,

    openGraph: {
      // 🔑 WhatsApp prioriza estos dos campos
      title: amount,
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
