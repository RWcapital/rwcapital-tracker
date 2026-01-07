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
  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { publicId: params.publicId },
        { wiseTransferId: params.publicId },
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
            background: "#0A0A0A",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
          }}
        >
          Transfer not found
        </div>
      ),
      size
    );
  }

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
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          fontFamily: "Inter, Arial",
        }}
      >
        <div style={{ fontSize: 28, color: "#6B7280", marginBottom: 16 }}>
          Transfer amount
        </div>

        {/* 🔥 MONTO GRANDE COMO WISE */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: "#0A0A0A",
            lineHeight: 1,
          }}
        >
          {amount} {tx.currency}
        </div>

        <div style={{ fontSize: 32, marginTop: 32, color: "#374151" }}>
          To {tx.recipientName ?? "Recipient"}
        </div>

        <div style={{ fontSize: 24, marginTop: 12, color: "#6B7280" }}>
          From {tx.businessName}
        </div>
      </div>
    ),
    size
  );
}
