import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import React from "react";

// Forzamos que no haya caché en el servidor para esta ruta
export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(_req: NextRequest) {
  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          background: "#3b5bda", // EL AZUL SOLICITADO
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          color: "#ffffff",
        },
      },
      [
        // Círculo con Rayo (Blanco)
        React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "140px",
            height: "140px",
            borderRadius: "70px",
            background: "rgba(255, 255, 255, 0.2)",
            marginBottom: "30px",
          }
        }, [
          React.createElement("svg", { width: "70", height: "70", viewBox: "0 0 24 24", fill: "none" }, [
            React.createElement("path", { d: "M4 4h10l-2 6h8l-10 10 2-6H4l2-6z", fill: "white" })
          ])
        ]),
        // Texto Principal
        React.createElement("div", {
          style: { fontSize: 70, fontWeight: "bold", marginBottom: "10px" },
        }, "RW Capital"),
        // Subtítulo
        React.createElement("div", {
          style: { fontSize: 30, opacity: 0.8, textTransform: "uppercase", letterSpacing: "4px" },
        }, "Transfer Tracking")
      ]
    ),
    { width: 1200, height: 630 }
  );
}