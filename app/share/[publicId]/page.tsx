import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: { publicId: string } }
): Promise<Metadata> {
  const url = `https://track.rwcapitalholding.com/share/${params.publicId}`;

  return {
    title: "Transfer in progress",
    description: "Transfer tracking",
    openGraph: {
      title: "Transfer in progress",
      description: "Transfer tracking",
      url,
      siteName: "RWC Capital",
      images: [
        {
          url: `${url}/opengraph-image`,
          width: 1200,
          height: 630,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Transfer in progress",
      description: "Transfer tracking",
      images: [`${url}/opengraph-image`],
    },
  };
}

export default function SharePage() {
  return null;
}
