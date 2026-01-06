import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const TIMEZONE = "America/Mexico_City";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await context.params;

  const tx = await prisma.transaction.findUnique({
    where: { publicId },
    include: {
      events: {
        orderBy: { occurredAt: "asc" },
      },
    },
  });

  if (!tx) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  /* ──────────────────────────────
     PDF SETUP
  ────────────────────────────── */
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  /* ──────────────────────────────
     LOGO
  ────────────────────────────── */
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoBytes = fs.readFileSync(logoPath);
  const logo = await pdf.embedPng(logoBytes);

  /* ──────────────────────────────
     PAGE 1 — TRANSFER OVERVIEW
  ────────────────────────────── */
  const page1 = pdf.addPage([595, 842]);

  page1.drawImage(logo, {
    x: 50,
    y: 790,
    width: 120,
    height: 28,
  });

  page1.drawText("Transfer confirmation", {
    x: 50,
    y: 750,
    size: 18,
    font,
  });

  const formatDate = (date: Date) =>
    date.toLocaleString("es-ES", {
      timeZone: TIMEZONE,
      dateStyle: "full",
      timeStyle: "short",
    });

  page1.drawText(`Transfer ID: ${tx.publicId}`, { x: 50, y: 710, size: 11, font });
  page1.drawText(`Status: ${tx.status}`, { x: 50, y: 690, size: 11, font });
  page1.drawText(
    `Amount sent: ${tx.amount.toString()} ${tx.currency}`,
    { x: 50, y: 670, size: 11, font }
  );
  page1.drawText(
    `Created: ${formatDate(tx.createdAt)}`,
    { x: 50, y: 650, size: 10, font }
  );

  /* ──────────────────────────────
     PAGE 2 — DETAILS
  ────────────────────────────── */
  const page2 = pdf.addPage([595, 842]);

  page2.drawText("Recipient & transfer details", {
    x: 50,
    y: 780,
    size: 16,
    font,
  });

  const drawRow = (label: string, value: string, y: number) => {
    page2.drawText(label, { x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
    page2.drawText(value, { x: 200, y, size: 10, font });
  };

  drawRow("Sender", tx.businessName, 740);
  drawRow("Reference", tx.reference ?? "-", 720);
  drawRow("Currency", tx.currency, 700);
  drawRow("Amount", tx.amount.toString(), 680);

  let yTimeline = 640;
  page2.drawText("Timeline", { x: 50, y: yTimeline, size: 12, font });
  yTimeline -= 20;

  tx.events.forEach((e) => {
    page2.drawText(
      `• ${formatDate(e.occurredAt)} — ${e.label}`,
      { x: 60, y: yTimeline, size: 9, font }
    );
    yTimeline -= 14;
  });

  /* ──────────────────────────────
     PAGE 3 — SWIFT MT103
  ────────────────────────────── */
  const page3 = pdf.addPage([595, 842]);

  page3.drawText("SWIFT MT103", {
    x: 50,
    y: 780,
    size: 16,
    font,
  });

  const swiftDate = tx.createdAt
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, "");

  const mt103 = `
{1:F01TRWIUS35AXXX}
{2:I103CITIUS33XXXN}
{4:
:20:${tx.publicId}
:32A:${swiftDate}${tx.currency}${tx.amount}
:50K:${tx.businessName}
:59:${tx.reference ?? "BENEFICIARY"}
:70:TRANSFER ${tx.publicId}
:71A:SHA
}
`;

  page3.drawText(mt103.trim(), {
    x: 50,
    y: 740,
    size: 9,
    font,
    lineHeight: 12,
  });

  page3.drawText(
    "This SWIFT message is provided for informational purposes only.",
    {
      x: 50,
      y: 60,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  /* ──────────────────────────────
     FOOTER (ALL PAGES)
  ────────────────────────────── */
  [page1, page2, page3].forEach((page) => {
    page.drawText(
      "RW Capital Holding · Automatically generated document · No signature required",
      {
        x: 50,
        y: 40,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      }
    );
  });

  /* ──────────────────────────────
     RESPONSE
  ────────────────────────────── */
  const pdfBytes = await pdf.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${tx.publicId}.pdf"`,
    },
  });
}
