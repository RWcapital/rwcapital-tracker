export async function getWiseReceiptPdf(
  transferId: string
): Promise<Buffer | null> {
  const res = await fetch(
    `https://api.wise.com/v1/transfers/${transferId}/receipt.pdf`,
    {
      headers: {
        Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
      },
    }
  );

  if (!res.ok) return null;

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
