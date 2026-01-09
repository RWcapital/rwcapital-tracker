import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import React from "react";

export const runtime = "nodejs";

function extractPublicId(slug: string) {
  return slug.split("-")[0];
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const publicId = extractPublicId(slug);

  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [{ publicId }, { wiseTransferId: publicId }],
    },
    select: {
      amount: true,
      currency: true,
      recipientName: true,
      businessName: true,
    },
  });

  const amount = tx
    ? `${Number(tx.amount).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      })} ${tx.currency}`
    : "Transfer";

  const recipient =
    tx?.recipientName?.trim() || tx?.businessName || "";

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "96px",
          fontFamily: "Inter, system-ui",
          color: "#0A0A0A",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 112,
            fontWeight: 700,
            marginBottom: 24,
          },
        },
        amount
      ),
      React.createElement(
        "div",
        {
          style: {
            fontSize: 22,
            color: "#6B7280",
            marginBottom: 6,
          },
        },
        "Arriving to"
      ),
      React.createElement(
        "div",
        {
          style: {
            fontSize: 42,
            fontWeight: 700,
          },
        },
        recipient
      )
    ),
    { width: 1200, height: 630 }
  );
}
