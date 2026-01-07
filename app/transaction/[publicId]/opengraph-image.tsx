// app/transaction/[publicId]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: { publicId: string };
}) {
  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [{ publicId: params.publicId }, { wiseTransferId: params.publicId }],
    },
  });

  if (!tx) {
    return new ImageResponse(
      <div style={{ fontSize: 48 }}>Transferencia</div>
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
          background: "#A7E86A", // verde tipo Wise
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ fontSize: 92, fontWeight: 900, color: "#0A2E00" }}>
          {amount} {tx.currency}
        </div>

        <div style={{ marginTop: 24, fontSize: 36, fontWeight: 700 }}>
          ARRIVING FROM
        </div>

        <div style={{ marginTop: 12, fontSize: 32, fontWeight: 800 }}>
          {tx.businessName.toUpperCase()}
        </div>
      </div>
    ),
    size
  );
}
