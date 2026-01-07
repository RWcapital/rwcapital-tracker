import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: { publicId: string };
}) {
  const tx = await prisma.transaction.findUnique({
    where: { publicId: params.publicId },
  });

  if (!tx) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#111",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
          fontWeight: 700,
        }}
      >
        Transfer not found
      </div>,
      size
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
          background: "#A7E36E", // verde Wise-style
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          fontFamily: "Inter, system-ui",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: "#0A0A0A",
          }}
        >
          {amount} {tx.currency}
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 1,
            color: "#0A0A0A",
          }}
        >
          ARRIVING FROM
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 36,
            fontWeight: 800,
            color: "#0A0A0A",
            textTransform: "uppercase",
          }}
        >
          {tx.businessName}
        </div>
      </div>
    ),
    size
  );
}
