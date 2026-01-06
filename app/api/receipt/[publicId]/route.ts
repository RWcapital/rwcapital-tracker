import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await context.params;

  const tx = await prisma.transaction.findUnique({
    where: { publicId },
    include: {
      events: { orderBy: { occurredAt: "asc" } },
    },
  });

  if (!tx) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  /* ──────────────────────────────
     PDF SETUP
  ────────────────────────────── */
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoBytes = fs.readFileSync(logoPath);
  const logo = await pdf.embedPng(logoBytes);

  const formatDate = (d: Date) =>
    d.toLocaleString("es-ES", {
      dateStyle: "full",
      timeStyle: "short",
    });

  /* ──────────────────────────────
     PAGE 1 — CONFIRMATION
  ────────────────────────────── */
  const p1 = pdf.addPage([595, 842]);

  p1.drawImage(logo, { x: 50, y: 780, width: 140, height: 40 });

  p1.drawText("Transfer confirmation", {
    x: 50,
    y: 720,
    size: 20,
    font: bold,
  });

  const row = (l: string, v: string, y: number) => {
    p1.drawText(l, { x: 50, y, size: 11, font, color: rgb(0.4, 0.4, 0.4) });
    p1.drawText(v, { x: 250, y, size: 11, font });
  };

  row("Transfer ID", tx.publicId, 680);
  row("Status", tx.status, 660);
  row("Amount sent", `${tx.amount.toString()} ${tx.currency}`, 640);
  row("Created", formatDate(tx.createdAt), 620);

  p1.drawText(
    "RW Capital Holding · Automatically generated document · No signature required",
    {
      x: 50,
      y: 80,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  /* ──────────────────────────────
     PAGE 2 — DETAILS + TIMELINE
  ────────────────────────────── */
  const p2 = pdf.addPage([595, 842]);

  p2.drawText("Recipient & transfer details", {
    x: 50,
    y: 780,
    size: 16,
    font: bold,
  });

  let y = 740;

  const row2 = (l: string, v: string) => {
    p2.drawText(l, { x: 50, y, size: 11, font, color: rgb(0.4, 0.4, 0.4) });
    p2.drawText(v, { x: 250, y, size: 11, font });
    y -= 22;
  };

  row2("Sender", tx.businessName);
  row2("Reference", tx.reference ?? "-");
  row2("Currency", tx.currency);
  row2("Amount", tx.amount.toString());

  y -= 20;

  p2.drawText("Timeline", {
    x: 50,
    y,
    size: 14,
    font: bold,
  });

  y -= 24;

  tx.events.forEach((e) => {
    p2.drawText(
      `• ${formatDate(new Date(e.occurredAt))} — ${e.label}`,
      {
        x: 60,
        y,
        size: 10,
        font,
      }
    );
    y -= 16;
  });

  p2.drawText(
    "RW Capital Holding · Automatically generated document · No signature required",
    {
      x: 50,
      y: 80,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  /* ──────────────────────────────
     PAGE 3 — SWIFT MT103
  ────────────────────────────── */
  const p3 = pdf.addPage([595, 842]);

  p3.drawText("SWIFT MT103", {
    x: 50,
    y: 780,
    size: 16,
    font: bold,
  });

  const swift = `
{1:F01TRWIUS35AXXX}
{2:I103CITIUS33XXXN}
{4:
:20:${tx.publicId}
:32A:${tx.createdAt
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, "")}${tx.currency}${tx.amount}
:50K:${tx.businessName}
:59:${tx.reference ?? "-"}
:70:TRANSFER ${tx.publicId}
:71A:SHA
}
`;

  p3.drawText(swift.trim(), {
    x: 50,
    y: 720,
    size: 10,
    font,
    lineHeight: 14,
  });

  p3.drawText(
    "This SWIFT message is provided for informational purposes only.",
    {
      x: 50,
      y: 120,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    }
  );

  p3.drawText(
    "RW Capital Holding · Automatically generated document · No signature required",
    {
      x: 50,
      y: 80,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  /* ──────────────────────────────
     RESPONSE
  ────────────────────────────── */
  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${tx.publicId}.pdf"`,
    },
  });
}
