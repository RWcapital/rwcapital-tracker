import { ImageResponse } from "next/og";

export const runtime = "edge";

export default async function OpenGraphImage({
  params,
}: {
  params: { publicId: string };
}) {
  // 👇 Llamamos a TU API (node)
  const res = await fetch(
    `https://track.rwcapitalholding.com/api/transaction/${params.publicId}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#111",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
        }}
      >
        Transaction not found
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const tx = await res.json();

  const amount = Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#A7F070", // Wise green
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 800 }}>
        {amount} {tx.currency}
      </div>

      <div style={{ marginTop: 24, fontSize: 28, fontWeight: 600 }}>
        ARRIVING FROM
      </div>

      <div style={{ fontSize: 34, fontWeight: 800 }}>
        {tx.businessName.toUpperCase()}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
