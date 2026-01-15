import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>; // Debe ser una Promesa
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params; // IMPORTANTE: Esperar los params
  const slug = resolvedParams.slug;
  
  // Cache buster para engañar a WhatsApp
  const v = new Date().getTime();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://track.rwcapitalholding.com";
  const ogImageUrl = `${baseUrl}/track/${slug}/og?v=${v}`;

  return {
    title: "Transfer in progress",
    description: "RW Capital Holding - Tracking System",
    openGraph: {
      title: "Transfer in progress",
      description: "Secure transfer tracking by RW Capital",
      url: `${baseUrl}/track/${slug}`,
      images: [
        {
          url: ogImageUrl, // URL explícita con versión
          width: 1200,
          height: 630,
          alt: "RW Capital Transfer Tracking",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImageUrl],
    },
  };
}

export default async function TrackPage({ params }: Props) {
  const resolvedParams = await params;
  // Redirigimos, pero Next.js ya habrá enviado los meta tags al crawler
  redirect(`/transaction/${resolvedParams.slug}`);
}