import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import React from "react";

export const runtime = "nodejs";

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
      recipientName: true,
      businessName: true,
    },
  });

  if (!tx) {
    return new ImageResponse(
      React.createElement(
        "div",
        {
          style: {
            width: "100%",
            height: "100%",
            background: "#3B5BDB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 48,
            fontWeight: "bold",
          },
        },
        "Transfer not found"
      ),
      { width: 1200, height: 630 }
    );
  }

  const amount = Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const recipient = tx.recipientName && tx.recipientName.trim()
    ? tx.recipientName
    : tx.businessName;

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          background: "#3B5BDB",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        },
      },
      [
        // Logo / Branding
        React.createElement(
          "div",
          {
            style: {
              fontSize: 32,
              fontWeight: "bold",
              marginBottom: "40px",
              opacity: 0.9,
            },
          },
          "RW Capital"
        ),

        // Monto principal
        React.createElement(
          "div",
          {
            style: {
              fontSize: 96,
              fontWeight: "bold",
              marginBottom: "20px",
              textAlign: "center",
            },
          },
          `${amount} ${tx.currency}`
        ),

        // Destinatario
        React.createElement(
          "div",
          {
            style: {
              fontSize: 42,
              fontWeight: "600",
              marginBottom: "40px",
              textAlign: "center",
              opacity: 0.95,
            },
          },
          `→ ${recipient}`
        ),

        // Subtítulo
        React.createElement(
          "div",
          {
            style: {
              fontSize: 24,
              opacity: 0.8,
              textAlign: "center",
              marginTop: "20px",
            },
          },
          "Transfer in progress"
        ),
      ]
    ),
    { width: 1200, height: 630 }
  );
}
