import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "edge";

export default async function OpenGraphImage({
  params,
}: {
  params: { publicId: string };
}) {
  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [{ publicId: params.publicId }, { wiseTransferId: params.publicId }],
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
            background: "#111",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
          }}
        >
          Transaction not found
        </div>
      ),
      { width: 1200, height: 630 }
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
          background: "#A7F070", // Verde estilo Wise
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
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
