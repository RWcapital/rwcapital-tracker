export async function getRecipientNameFromWise(
  accountId: number
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.wise.com/v1/accounts/${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();

    return (
      data.accountHolderName ??
      data.details?.accountHolderName ??
      null
    );
  } catch {
    return null;
  }
}
