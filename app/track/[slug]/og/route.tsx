import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

/* ──────────────────────────────
   HELPERS
────────────────────────────── */
function extractPublicId(slug: string) {
  return slug.split("-")[0];
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const publicId = extractPublicId(params.slug);

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
    },
  });

  if (!tx) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            fontWeight: 600,
            background: "#FFFFFF",
            color: "#0A0A0A",
            fontFamily: "Inter, system-ui",
          }}
        >
          Transfer
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const amount = `${Number(tx.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  })} ${tx.currency}`;

  const recipient =
    tx.recipientName?.trim() || tx.businessName || "Recipient";

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
          padding: "96px",
          fontFamily: "Inter, system-ui",
        }}
      >
        {/* MONTO */}
        <div
          style={{
            fontSize: 112,
            fontWeight: 700,
            color: "#0A0A0A",
            letterSpacing: "-0.03em",
            marginBottom: 28,
          }}
        >
          {amount}
        </div>

        {/* LABEL */}
        <div
          style={{
            fontSize: 26,
            fontWeight: 500,
            color: "#6B7280",
          }}
        >
          Arriving to
        </div>

        {/* DESTINATARIO */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            color: "#0A0A0A",
            marginTop: 6,
          }}
        >
          {recipient}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
