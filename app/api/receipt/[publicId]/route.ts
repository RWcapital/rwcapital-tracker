import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

/* ──────────────────────────────
   HELPERS
────────────────────────────── */
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

const COL_LABEL = 70;
const COL_VALUE = 300;

const footerText =
  "RW Capital Holding · Automatically generated document · No signature required";

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

  const pdf = await PDFDocument.create();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  const logoBytes = fs.readFileSync(logoPath);
  const logo = await pdf.embedPng(logoBytes);

  const formatDate = (d: Date) =>
    d.toLocaleString("es-ES", {
      dateStyle: "long",
      timeStyle: "short",
    });

  const drawFooter = (page: any) => {
    page.drawText(footerText, {
      x: 50,
      y: 60,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  };

  const card = (
    page: any,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1,
    });
  };

  /* ──────────────────────────────
     PAGE 1 — TRANSFER OVERVIEW
  ────────────────────────────── */
  const p1 = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  p1.drawImage(logo, { x: 50, y: 780, width: 140, height: 40 });

  p1.drawText(
    "RW Capital Holding is a financial services company.\nAutomatically generated document.",
    {
      x: 50,
      y: 820,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
      lineHeight: 12,
    }
  );

  p1.drawText("Transfer confirmation", {
    x: 50,
    y: 730,
    size: 22,
    font: bold,
  });

  // Transfer status
  p1.drawText("Transfer status", {
    x: 50,
    y: 690,
    size: 14,
    font: bold,
  });

  card(p1, 50, 560, 495, 110);

  const timeline = [
    ["Transfer ID", tx.publicId],
    ["Status", tx.status],
    ["Created", formatDate(tx.createdAt)],
  ];

  let ty = 640;
  timeline.forEach(([l, v]) => {
    p1.drawText(l, {
      x: COL_LABEL,
      y: ty,
      size: 11,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    p1.drawText(v, {
      x: COL_VALUE,
      y: ty,
      size: 11,
      font,
    });
    ty -= 26;
  });

  // Transfer overview
  p1.drawText("Transfer overview", {
    x: 50,
    y: 520,
    size: 14,
    font: bold,
  });

  card(p1, 50, 350, 495, 150);

  const overview = [
    ["Amount sent", `${tx.amount.toString()} ${tx.currency}`],
    ["Transfer fees", "—"],
    ["Total received", `${tx.amount.toString()} ${tx.currency}`],
  ];

  let oy = 470;
  overview.forEach(([l, v]) => {
    p1.drawText(l, {
      x: COL_LABEL,
      y: oy,
      size: 11,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    p1.drawText(v, {
      x: COL_VALUE,
      y: oy,
      size: 11,
      font,
    });
    oy -= 30;
  });

  drawFooter(p1);

  /* ──────────────────────────────
     PAGE 2 — PARTIES & DETAILS
  ────────────────────────────── */
  const p2 = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  p2.drawText("Sender details", {
    x: 50,
    y: 780,
    size: 16,
    font: bold,
  });

  card(p2, 50, 620, 495, 130);

  let y = 720;

  const row = (l: string, v: string) => {
    p2.drawText(l, {
      x: COL_LABEL,
      y,
      size: 11,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    p2.drawText(v, {
      x: COL_VALUE,
      y,
      size: 11,
      font,
    });
    y -= 26;
  };

  row("Business name", tx.businessName);
  row("Reference", tx.reference ?? "-");
  row("Currency", tx.currency);
  row("Amount", tx.amount.toString());

  p2.drawText("Timeline", {
    x: 50,
    y: 560,
    size: 16,
    font: bold,
  });

  card(p2, 50, 350, 495, 180);

  y = 500;
  tx.events.forEach((e) => {
    p2.drawText(
      `• ${formatDate(new Date(e.occurredAt))} — ${e.label}`,
      {
        x: 70,
        y,
        size: 10,
        font,
      }
    );
    y -= 18;
  });

  drawFooter(p2);

  /* ──────────────────────────────
     PAGE 3 — SWIFT MT103
  ────────────────────────────── */
  const p3 = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  p3.drawText("SWIFT MT103", {
    x: 50,
    y: 780,
    size: 16,
    font: bold,
  });

  card(p3, 40, 120, 515, 600);

  const swift = `
{1:F01TRWIUS35AXXX}
{2:I103CITIUS33XXXN}
{4:
:20:${tx.publicId}
:32A:${tx.createdAt
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, "")}${tx.currency}${tx.amount},
:50K:${tx.businessName.toUpperCase()}
:59:/0000000000
${tx.reference ?? "BENEFICIARY"}
:70:TRANSFER ${tx.publicId}
:71A:SHA
}
`;

  p3.drawText(swift.trim(), {
    x: 55,
    y: 700,
    size: 9,
    font: mono,
    lineHeight: 13,
  });

  p3.drawText(
    "This SWIFT message is provided for informational purposes only.",
    {
      x: 50,
      y: 100,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    }
  );

  drawFooter(p3);

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
