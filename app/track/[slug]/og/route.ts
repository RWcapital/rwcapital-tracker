import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import React from "react";

export const runtime = "edge";

export async function GET(_req: NextRequest) {
  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          background: "#3b5bda", // Azul solicitado
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
        // Icono de Rayo / Logo
        React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "140px",
            height: "140px",
            borderRadius: "40px",
            background: "rgba(255, 255, 255, 0.15)",
            marginBottom: "40px",
          }
        }, [
          React.createElement("svg", { width: "80", height: "80", viewBox: "0 0 24 24", fill: "none" }, [
            React.createElement("path", { d: "M4 4h10l-2 6h8l-10 10 2-6H4l2-6z", fill: "white" })
          ])
        ]),

        // Nombre de la Empresa
        React.createElement("div", {
          style: { fontSize: 64, fontWeight: 900, textAlign: "center", letterSpacing: "-0.02em", marginBottom: "10px" },
        }, "RW Capital Holding"),

        // Subtítulo
        React.createElement("div", {
          style: { fontSize: 28, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 700, opacity: 0.7 },
        }, "Transfer Tracking")
      ]
    ),
    { width: 1200, height: 630 }
  );
}