import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            background: "#F7F8FA",
            color: "#111",
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
          background: "#F7F8FA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 28,
            padding: "80px 90px",
            width: 1040,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            RW Capital
          </div>

          <div
            style={{
              marginTop: 40,
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-2px",
            }}
          >
            {amount}{" "}
            <span style={{ fontSize: 48 }}>
              {tx.currency}
            </span>
          </div>

          <div
            style={{
              marginTop: 24,
              fontSize: 28,
              color: "#6B7280",
            }}
          >
            Transfer sent to
          </div>

          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
            }}
          >
            {tx.recipientName}
          </div>
        </div>
      </div>
    ),
    size
  );
}
