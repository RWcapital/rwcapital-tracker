import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { Decimal } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

/* ──────────────────────────────
   CONSTANTES & HELPERS
────────────────────────────── */
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

const MARGIN_X = 50;
const COL_LABEL = 70;
const COL_VALUE = 300;

const footerBase =
  "Receipt generated automatically · No signature required";

const formatAmount = (value: Decimal | number | string) => {
  const n =
    typeof value === "string"
      ? Number(value.replace(",", "."))
      : typeof value === "number"
      ? value
      : value.toNumber();

  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (d: Date) =>
  d.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZoneName: "short",
  });

const drawFooter = (page: any, pageNo: number) => {
  page.drawText(
    `RW Capital Holding · ${footerBase} · Page ${pageNo} of 3`,
    {
      x: MARGIN_X,
      y: 40,
      size: 9,
      color: rgb(0.45, 0.45, 0.45),
    }
  );
};

const drawRow = (
  page: any,
  label: string,
  value: string,
  y: number
) => {
  page.drawText(label, {
    x: COL_LABEL,
    y,
    size: 11,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText(value, {
    x: COL_VALUE,
    y,
    size: 11,
  });
};

/* ──────────────────────────────
   ROUTE
────────────────────────────── */
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

  /* ============================================================
     PAGE 1 — TRANSFER CONFIRMATION (CBPAY STYLE)
  ============================================================ */
  const p1 = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  p1.drawImage(logo, { x: MARGIN_X, y: 780, width: 140, height: 40 });

  p1.drawText("Transfer confirmation", {
    x: MARGIN_X,
    y: 730,
    size: 22,
    font: bold,
  });

  let y = 690;

  // Timeline (events)
  tx.events.forEach((e) => {
    p1.drawText(e.label, {
      x: MARGIN_X,
      y,
      size: 12,
      font: bold,
    });
    y -= 16;
    p1.drawText(formatDate(new Date(e.occurredAt)), {
      x: MARGIN_X,
      y,
      size: 11,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 26;
  });

  y -= 10;

  // Identifiers
  p1.drawText("Transfer", { x: MARGIN_X, y, size: 14, font: bold });
  y -= 20;
  p1.drawText(`#${tx.publicId}`, { x: MARGIN_X, y, size: 12 });
  y -= 30;

  // Sender
  p1.drawText("Your details", { x: MARGIN_X, y, size: 14, font: bold });
  y -= 20;
  p1.drawText(tx.businessName, { x: MARGIN_X, y, size: 12 });
  y -= 30;

  // Overview
  p1.drawText("Transfer overview", {
    x: MARGIN_X,
    y,
    size: 14,
    font: bold,
  });
  y -= 24;

  drawRow(
    p1,
    "Amount paid",
    `${formatAmount(tx.amount)} ${tx.currency}`,
    y
  );
  y -= 22;

  drawRow(p1, "Transfer fees", "—", y);
  y -= 22;

  drawRow(
    p1,
    "Transfer amount",
    `${formatAmount(tx.amount)} ${tx.currency}`,
    y
  );
  y -= 22;

  drawRow(p1, "Exchange rate", "1 USD = 1.0000 USD", y);
  y -= 22;

  drawRow(
    p1,
    "Total received",
    `${formatAmount(tx.amount)} ${tx.currency}`,
    y
  );

  drawFooter(p1, 1);

  /* ============================================================
     PAGE 2 — PARTIES & BANKING DETAILS
  ============================================================ */
  const p2 = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  p2.drawText("Sent to", {
    x: MARGIN_X,
    y: 780,
    size: 16,
    font: bold,
  });

  y = 750;
  drawRow(p2, "Name", tx.reference ?? "Beneficiary", y);
  y -= 24;

  p2.drawText("Account details", {
    x: MARGIN_X,
    y,
    size: 16,
    font: bold,
  });
  y -= 24;

  drawRow(p2, "Bank", "—", y);
  y -= 22;
  drawRow(p2, "Account", "—", y);
  y -= 22;
  drawRow(p2, "SWIFT/BIC", "—", y);
  y -= 30;

  p2.drawText("Paid out from", {
    x: MARGIN_X,
    y,
    size: 16,
    font: bold,
  });
  y -= 24;

  drawRow(
    p2,
    "Institution",
    `RW Capital Holding on behalf of ${tx.businessName}`,
    y
  );

  drawFooter(p2, 2);

  /* ============================================================
     PAGE 3 — MT103 SAMPLE
  ============================================================ */
  const p3 = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  p3.drawText("MT103 sample", {
    x: MARGIN_X,
    y: 780,
    size: 16,
    font: bold,
  });

  const swift = `
{1:F01TRWIUS35AXXX}
{2:I103CITIUS33XXXN}
{4:
:20:${tx.publicId}
:23B:CRED
:32A:${tx.createdAt
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, "")}${tx.currency}${tx.amount},
:50K:${tx.businessName.toUpperCase()}
:59:${tx.reference ?? "BENEFICIARY"}
:71A:OUR
}
`;

  p3.drawText(swift.trim(), {
    x: MARGIN_X,
    y: 740,
    size: 9,
    font: mono,
    lineHeight: 13,
  });

  drawFooter(p3, 3);

  /* ============================================================
     RESPONSE
  ============================================================ */
  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="receipt-${tx.publicId}.pdf"`,
    },
  });
}
