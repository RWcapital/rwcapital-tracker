export async function getRecipientNameFromWise(
  targetAccountId: number
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.wise.com/v1/accounts/${targetAccountId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WISE_API_TOKEN}`,
        },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();

    return data.accountHolderName ?? null;
  } catch (error) {
    console.error("WISE ACCOUNT LOOKUP ERROR:", error);
    return null;
  }
}
