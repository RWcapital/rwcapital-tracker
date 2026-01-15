import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = "https://track.rwcapitalholding.com";
  
  // Cache Buster dinámico para forzar a WhatsApp a refrescar
  const v = new Date().getTime(); 
  const ogImageUrl = `${baseUrl}/track/${slug}/og?v=${v}`;

  return {
    title: "Transfer in progress",
    description: "RW Capital Holding - Tracking System",
    alternates: {
      canonical: `${baseUrl}/track/${slug}`, // Evita que Meta use la URL de destino
    },
    openGraph: {
      title: "Transfer in progress",
      description: "Secure transfer tracking by RW Capital",
      url: `${baseUrl}/track/${slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
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
        {/* Redirección por JS: Permite que el bot lea la metadata primero */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.location.href = '/transaction/${slug}';`,
          }}
        />
      </head>
      <body style={{ background: "#3b5bda", display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <h2>RW Capital</h2>
          <p>Cargando detalles de la transferencia...</p>
        </div>
      </body>
    </html>
  );
}