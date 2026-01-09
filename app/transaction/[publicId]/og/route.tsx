import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
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
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            fontWeight: 600,
            color: "#0A0A0A",
            fontFamily: "Inter, system-ui",
          }}
        >
          Transfer not found
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const amount = `${Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  })} ${tx.currency}`;

  const recipient = tx.recipientName || tx.businessName;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "Inter, system-ui",
        }}
      >
        {/* MONTO */}
        <div
          style={{
            fontSize: 112,
            fontWeight: 700,
            color: "#0A0A0A",
            letterSpacing: "-0.025em",
            marginBottom: 28,
          }}
        >
          {amount}
        </div>

        {/* LABEL */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#6B7280",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Arriving from
        </div>

        {/* DESTINATARIO */}
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: "#0A0A0A",
            lineHeight: 1.25,
            maxWidth: "92%",
            wordWrap: "break-word",
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
