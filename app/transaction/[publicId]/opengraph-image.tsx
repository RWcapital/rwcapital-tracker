import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

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
    },
  });

  if (!tx) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Transaction not found
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
          background: "#f7f8fa",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "Inter, Arial",
        }}
      >
        <div style={{ fontSize: 24, color: "#6b7280" }}>
          Transfer amount
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.1,
            marginTop: 12,
          }}
        >
          {amount} {tx.currency}
        </div>

        <div style={{ fontSize: 28, color: "#374151", marginTop: 32 }}>
          Arriving from {tx.businessName}
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 20,
            color: "#9ca3af",
          }}
        >
          RW Capital Holding
        </div>
      </div>
    ),
    size
  );
}
