import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  // 🔑 Next.js 15: params es PROMISE
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // --- PDF ---
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  // Logo
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoBytes = fs.readFileSync(logoPath);
  const logoImage = await pdf.embedPng(logoBytes);

  page.drawImage(logoImage, {
    x: 50,
    y: 780,
    width: 120,
    height: 30,
  });

  // Title
  page.drawText("Transaction Receipt", {
    x: 50,
    y: 730,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });

  const drawRow = (label: string, value: string, y: number) => {
    page.drawText(label, { x: 50, y, size: 10, font });
    page.drawText(value, { x: 250, y, size: 10, font });
  };

  drawRow("Transaction ID", tx.publicId, 690);
  drawRow("Business", tx.businessName, 670);
  drawRow(
    "Amount",
    `${tx.amount.toString()} ${tx.currency}`,
    650
  );
  drawRow("Status", tx.status, 630);
  drawRow(
    "Date",
    new Date(tx.createdAt).toLocaleString(),
    610
  );

  // Timeline
  let y = 580;

  page.drawText("Timeline", {
    x: 50,
    y,
    size: 12,
    font,
  });

  y -= 20;

  tx.events.forEach((event) => {
    page.drawText(
      `• ${new Date(event.occurredAt).toLocaleString()} — ${event.label}`,
      {
        x: 60,
        y,
        size: 9,
        font,
      }
    );
    y -= 14;
  });

  // Footer
  page.drawText(
    "RW Capital Holding · This document is automatically generated and valid without signature.",
    {
      x: 50,
      y: 50,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

const pdfBytes = await pdf.save();
const pdfBuffer = Buffer.from(pdfBytes);

return new NextResponse(pdfBuffer, {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="receipt-${tx.publicId}.pdf"`,
  },
});
}
