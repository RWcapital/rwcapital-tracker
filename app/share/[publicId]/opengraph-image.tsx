import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: { publicId: string };
}) {
  const publicId = String(params.publicId);

  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { publicId },
        { wiseTransferId: publicId },
      ],
    },
    select: {
      amount: true,
      currency: true,
      recipientName: true,
      businessName: true,
    },
  });

  if (!tx) {
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

  const amount =
    typeof tx.amount === "string"
      ? Number(tx.amount)
      : Number(tx.amount.toString());

  const formattedAmount = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });

  const recipient =
    tx.recipientName && tx.recipientName.trim() !== ""
      ? tx.recipientName
      : "Recipient";

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
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* LOGO / BRAND */}
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

          {/* AMOUNT (ESTILO WISE) */}
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "#0A0A0A",
              lineHeight: 1.1,
              marginBottom: 24,
              letterSpacing: "-2px",
            }}
          >
            {formattedAmount}{" "}
            <span
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: "#374151",
              }}
            >
              {tx.currency}
            </span>
          </div>

          {/* SUBTEXT */}
          <div
            style={{
              fontSize: 28,
              color: "#6B7280",
              marginBottom: 12,
            }}
          >
            Transfer sent to
          </div>

          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: "#1F2937",
            }}
          >
            {recipient}
          </div>
        </div>
      </div>
    ),
    size
  );
}
