import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import React from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Image({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

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
      status: true,
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
            background: "linear-gradient(135deg, #3B5BDB 0%, #2F4AC6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 48,
            fontWeight: "bold",
          },
        },
        "Transfer Details"
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

  const statusLabel = tx.status === "COMPLETED" ? "Completed ✓" : "In Progress";

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #3B5BDB 0%, #2F4AC6 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        },
      },
      [
        // Decoración de fondo
        React.createElement("div", {
          style: {
            position: "absolute",
            top: "-50px",
            right: "-50px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.1)",
          },
        }),

        // Contenido principal
        React.createElement(
          "div",
          {
            style: {
              position: "relative",
              zIndex: 1,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            },
          },
          [
            // Status badge
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 14,
                  fontWeight: "600",
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
                  padding: "6px 16px",
                  borderRadius: "20px",
                  marginBottom: "30px",
                  backdropFilter: "blur(10px)",
                },
              },
              statusLabel
            ),

            // Monto principal
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 104,
                  fontWeight: "800",
                  marginBottom: "10px",
                  letterSpacing: "-2px",
                },
              },
              `${amount} ${tx.currency}`
            ),

            // Línea separadora
            React.createElement("div", {
              style: {
                width: "60px",
                height: "3px",
                background: "rgba(255, 255, 255, 0.5)",
                borderRadius: "2px",
                margin: "20px 0",
              },
            }),

            // Destinatario
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 32,
                  fontWeight: "500",
                  marginBottom: "30px",
                  opacity: 0.95,
                },
              },
              `To ${recipient}`
            ),

            // Call to action
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 16,
                  fontWeight: "600",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  padding: "10px 24px",
                  borderRadius: "8px",
                  marginTop: "20px",
                  backdropFilter: "blur(10px)",
                },
              },
              "View Transfer Details"
            ),
          ]
        ),

        // RW Capital branding en esquina
        React.createElement(
          "div",
          {
            style: {
              position: "absolute",
              bottom: "30px",
              right: "40px",
              fontSize: 14,
              fontWeight: "600",
              opacity: 0.7,
            },
          },
          "RW Capital"
        ),
      ]
    ),
    { width: 1200, height: 630 }
  );
}
