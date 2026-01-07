import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: { publicId: string };
}) {
  const publicId = params.publicId;

  // ✅ USAR TU API EXISTENTE (CLAVE)
  const res = await fetch(
    `https://track.rwcapitalholding.com/api/transaction/${publicId}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
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
            fontSize: 48,
            color: "#111",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Transfer not found
        </div>
      ),
      size
    );
  }

  const tx = await res.json();

  const amount = Number(tx.amount);
  const formattedAmount = amount.toLocaleString("en-US", {
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
            width: 1040,
            background: "#FFFFFF",
            borderRadius: 28,
            padding: "80px 90px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#1F2937",
              marginBottom: 40,
            }}
          >
            RW Capital
          </div>

          {/* MONTO GRANDE ESTILO WISE */}
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "#0A0A0A",
              lineHeight: 1.1,
              letterSpacing: "-2px",
            }}
          >
            {formattedAmount}{" "}
            <span style={{ fontSize: 48, fontWeight: 700 }}>
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
              color: "#1F2937",
              marginTop: 6,
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
