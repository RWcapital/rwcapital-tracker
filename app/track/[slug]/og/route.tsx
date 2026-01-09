import React from "react";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "edge";

function extractPublicId(slug: string) {
  return slug.split("-")[0];
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const publicId = extractPublicId(params.slug);

  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [{ publicId }, { wiseTransferId: publicId }],
    },
  });

  if (!tx) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
          background: "#ffffff",
        }}
      >
        Transfer
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const amount = `${Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  })} ${tx.currency}`;

  const recipient =
    tx.recipientName && tx.recipientName.trim() !== ""
      ? tx.recipientName
      : tx.businessName;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "96px",
        fontFamily: "Inter, system-ui",
      }}
    >
      <div
        style={{
          fontSize: 112,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#0A0A0A",
        }}
      >
        {amount}
      </div>

      <div
        style={{
          marginTop: 28,
          fontSize: 22,
          color: "#6B7280",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        Arriving to
      </div>

      <div
        style={{
          fontSize: 40,
          fontWeight: 600,
          color: "#0A0A0A",
          marginTop: 8,
        }}
      >
        {recipient}
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
