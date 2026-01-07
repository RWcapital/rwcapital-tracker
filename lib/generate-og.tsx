import { ImageResponse } from "@vercel/og";
import fs from "fs";
import path from "path";
import React from "react";

export async function generateOgImage(tx: {
  publicId: string;
  amount: string | number;
  currency: string;
  status: string;
}) {
  const amount = Number(tx.amount).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
  });

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#A7E86A",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Inter, system-ui",
        }}
      >
        <div style={{ fontSize: 28, opacity: 0.8 }}>
          Transferencia completada
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            marginTop: 20,
          }}
        >
          {amount} {tx.currency}
        </div>

        <div style={{ marginTop: 24, fontSize: 22 }}>
          RW Capital Holding
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );

  const buffer = Buffer.from(await image.arrayBuffer());

  const outPath = path.join(
    process.cwd(),
    "public",
    "og",
    `${tx.publicId}.png`
  );

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buffer);
}
