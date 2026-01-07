import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export default async function Image({
  params,
}: {
  params: { publicId: string };
}) {
  // 👉 JAMÁS Prisma aquí
  const res = await fetch(
    `https://track.rwcapitalholding.com/api/transaction/${params.publicId}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            fontWeight: 700,
            background: "#fff",
          }}
        >
          Transfer not found
        </div>
      ),
      size
    );
  }

  const tx = await res.json();

  const amount = Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#ffffff",
          color: "#000",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 16 }}>
          Transferencia enviada
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: "-2px",
            marginBottom: 24,
          }}
        >
          {amount} {tx.currency}
        </div>

        <div style={{ fontSize: 28, color: "#555" }}>
          Arriving from {tx.businessName}
        </div>

        <div style={{ fontSize: 24, marginTop: 12 }}>
          To {tx.recipientName ?? "Wise account"}
        </div>
      </div>
    ),
    size
  );
}
