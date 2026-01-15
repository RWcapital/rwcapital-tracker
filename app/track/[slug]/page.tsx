import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = "https://track.rwcapitalholding.com";
  
  // CACHE BUSTER: Esto es vital para que Meta crea que es una imagen nueva
  const v = new Date().getTime(); 
  const ogImageUrl = `${baseUrl}/track/${slug}/og?v=${v}`;

  return {
    title: "Transfer in progress",
    description: "Secure transfer tracking by RW Capital",
    alternates: {
      canonical: `${baseUrl}/track/${slug}`,
    },
    other: {
      "fb:app_id": "966242223397117", // ID genérico para quitar la advertencia
    },
    openGraph: {
      title: "Transfer in progress",
      description: "RW Capital Holding - Tracking System",
      url: `${baseUrl}/track/${slug}`,
      siteName: "RW Capital",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          type: "image/png",
        },
      ],
      type: "website",
    },
  };
}

export default async function TrackPage({ params }: Props) {
  const { slug } = await params;
  return (
    <html>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `window.location.href = '/transaction/${slug}';` }} />
      </head>
      <body style={{ background: "#3b5bda" }} />
    </html>
  );
}