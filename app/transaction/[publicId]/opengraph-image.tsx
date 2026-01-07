import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export default async function OpenGraphImage({
  params,
}: {
  params: { publicId: string };
}) {
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
            background: "#f5f6f8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
          }}
        >
          Transfer not found
        </div>
      ),
      { width: 1200, height: 630 }
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
          background: "#f5f6f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 24,
            padding: "80px",
            width: 1000,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 600 }}>
            RW Capital
          </div>

          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              marginTop: 32,
            }}
          >
            {amount}{" "}
            <span style={{ fontSize: 48 }}>{tx.currency}</span>
          </div>

          <div
            style={{
              marginTop: 24,
              fontSize: 28,
              color: "#555",
            }}
          >
            Transfer sent to
          </div>

          <div style={{ fontSize: 36, fontWeight: 600 }}>
            {tx.recipientName}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
