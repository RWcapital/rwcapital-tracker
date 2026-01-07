import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function Image({
  params,
}: {
  params: { publicId: string };
}) {
  const tx = await prisma.transaction.findFirst({
    where: { publicId: params.publicId },
    select: {
      amount: true,
      currency: true,
    },
  });

  if (!tx) {
    return new ImageResponse(
      <div style={{ fontSize: 48 }}>NOT FOUND</div>,
      { width: 1200, height: 630 }
    );
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 96,
        fontWeight: 800,
        background: "#ffffff",
      }}
    >
      {Number(tx.amount).toLocaleString("en-US")} {tx.currency}
    </div>,
    { width: 1200, height: 630 }
  );
}
