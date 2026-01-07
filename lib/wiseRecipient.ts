// lib/wiseRecipient.ts

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

    const account = await res.json();

    return account.accountHolderName || null;
  } catch (error) {
    console.error("Error fetching recipient account:", error);
    return null;
  }
}
