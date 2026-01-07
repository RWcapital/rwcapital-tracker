import { getWiseReceiptPdf } from "./getWiseReceiptPdf";
import { extractTextFromPdf } from "../mt103/extractTextFromPdf";
import { parseMT103 } from "../mt103/parseMT103";

export async function parseWiseReceipt(transferId: string) {
  const pdfBuffer = await getWiseReceiptPdf(transferId);
  if (!pdfBuffer) return null;

  const text = await extractTextFromPdf(pdfBuffer);
  return parseMT103(text);
}
