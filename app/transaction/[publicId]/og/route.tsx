import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "edge";

export async function GET(
  _req: Request,
  context: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await context.params;

  const tx = await prisma.transaction.findFirst({
    where: {
      OR: [
        { publicId },
        { wiseTransferId: publicId },
      ],
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
        padding: "100px",
        fontFamily: "Inter, system-ui",
      }}
    >
      {/* MONTO */}
      <div
        style={{
          fontSize: 112,            // ⬅️ MÁS GRANDE
          fontWeight: 700,
          color: "#0A0A0A",
          letterSpacing: "-0.025em",
          marginBottom: 36,
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
          marginBottom: 10,
        }}
      >
        Arriving from
      </div>

      {/* DESTINATARIO */}
      <div
        style={{
          fontSize: 40,             // ⬅️ DESTINATARIO CLARO Y PROTAGÓNICO
          fontWeight: 700,
          color: "#0A0A0A",
          lineHeight: 1.25,
          maxWidth: "90%",
        }}
      >
        {tx.businessName}
      </div>
    </div>
  ),
  {
    width: 1200,
    height: 630,
  }
);

}
