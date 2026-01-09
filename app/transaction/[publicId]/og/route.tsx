import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await context.params;

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
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
          fontWeight: 600,
          color: "#0A0A0A",
        }}
      >
        Transfer not found
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const amount = `${Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  })} ${tx.currency}`;

  const recipient = tx.businessName;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#F5F7FA",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Inter, system-ui",
          padding: "80px",
        }}
      >
        {/* MONTO (PROTAGONISTA) */}
        <div
          style={{
            fontSize: 112,
            fontWeight: 800,
            color: "#0A0A0A",
            letterSpacing: "-0.03em",
            marginBottom: 28,
          }}
        >
          {amount}
        </div>

        {/* SUBLABEL */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#6B7280",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Arriving from
        </div>

        {/* DESTINATARIO */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#0A0A0A",
            textAlign: "center",
            maxWidth: "90%",
          }}
        >
          {recipient}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
