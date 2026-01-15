import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>; // En Next.js 15+ params es una Promesa
};

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  
  // Buscamos la transacción para validar que existe
  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { publicId: slug },
        { wiseTransferId: slug },
      ],
    },
    select: {
      businessName: true,
    },
  });

  if (!tx) {
    return { title: "Transfer Tracking" };
  }

  /**
   * DECISIÓN TÉCNICA: Cache Busting
   * Agregamos un timestamp o versión (?v=...) para que WhatsApp 
   * detecte una URL nueva y descargue la imagen azul corregida.
   */
  const v = new Date().getTime(); 
  const ogImageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/track/${slug}/og?v=${v}`;

  return {
    // Usamos títulos genéricos para evitar discrepancias con el caché
    title: "Transfer in progress",
    description: "RW Capital Holding - Tracking System",
    openGraph: {
      title: "Transfer in progress",
      description: "Secure transfer tracking by RW Capital",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // El humano es redirigido a la fuente de verdad inmediatamente
  redirect(`/transaction/${slug}`);
}