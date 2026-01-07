import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "edge";

/* Tamaño estándar OpenGraph */
export const size = {
  width: 1200,
  height: 630,
};

export default async function Image({
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
      businessName: true,
      recipientName: true,
    },
  });

  if (!tx) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            fontSize: 48,
            fontWeight: 700,
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
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#ffffff",
          color: "#000000",
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
