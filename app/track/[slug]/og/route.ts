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

  const amountStr = tx
    ? Number(tx.amount).toLocaleString("en-US", {
        minimumFractionDigits: 2,
      })
    : "0.00";
  const currencyStr = tx?.currency || "USD";
  const recipient = tx?.recipientName?.trim() || tx?.businessName || "Recipient";

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          background: "#3b5bda",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          color: "#ffffff",
          fontFamily: "sans-serif",
        },
      },
      [
        // 1. Icono de Rayo (Superior Izquierda)
        React.createElement("div", {
          style: { position: "absolute", top: 60, left: 60, display: "flex" },
        }, [
          React.createElement("svg", { width: "40", height: "40", viewBox: "0 0 24 24", fill: "none" }, [
            React.createElement("path", { d: "M4 4h10l-2 6h8l-10 10 2-6H4l2-6z", fill: "white" })
          ])
        ]),

        // 2. NUEVO: Icono de Checkmark Circular (Capa de Éxito)
        React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "40px",
            background: "rgba(255, 255, 255, 0.2)",
            marginBottom: "30px",
          }
        }, [
          React.createElement("svg", { width: "45", height: "45", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "3.5", strokeLinecap: "round", strokeLinejoin: "round" }, [
            React.createElement("polyline", { points: "20 6 9 17 4 12" })
          ])
        ]),

        // 3. Bloque del Monto
        React.createElement(
          "div",
          {
            style: {
              fontSize: 110,
              fontWeight: 900,
              display: "flex",
              alignItems: "baseline",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            },
          },
          [
            React.createElement("span", {}, amountStr),
            React.createElement("span", { style: { fontSize: 45, marginLeft: 15, opacity: 0.8, fontWeight: 700 } }, currencyStr)
          ]
        ),

        // 4. Etiqueta "Arriving to"
        React.createElement(
          "div",
          {
            style: {
              fontSize: 24,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontWeight: 700,
              opacity: 0.7,
              marginTop: 40,
              marginBottom: 10,
            },
          },
          "Arriving to"
        ),

        // 5. Nombre del Recipiente
        React.createElement(
          "div",
          {
            style: {
              fontSize: 54,
              fontWeight: 800,
              textAlign: "center",
              textTransform: "uppercase",
              maxWidth: "900px",
            },
          },
          recipient
        ),

        // 6. NUEVO: Badge de estado inferior
        React.createElement("div", {
          style: {
            position: "absolute",
            bottom: 60,
            display: "flex",
            background: "white",
            color: "#3b5bda",
            padding: "8px 20px",
            borderRadius: "100px",
            fontSize: "20px",
            fontWeight: "800",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }
        }, "Transfer Sent")
      ]
    ),
    { width: 1200, height: 630 }
  );
}