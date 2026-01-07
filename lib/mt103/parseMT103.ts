export function parseMT103(text: string) {
  const getBlock = (tag: string) => {
    const regex = new RegExp(`:${tag}:([\\s\\S]*?)(?=:\\d{2}|$)`);
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  const beneficiaryBlock = getBlock("59");
  const orderingBlock = getBlock("50K");
  const bankBlock = getBlock("57A");
  const amountBlock = getBlock("32A");

  return {
    finalRecipientName: beneficiaryBlock
      ? beneficiaryBlock.split("\n")[0].trim()
      : null,

    finalRecipientAddress: beneficiaryBlock
      ? beneficiaryBlock.split("\n").slice(1).join(", ").trim()
      : null,

    orderingCustomer: orderingBlock
      ? orderingBlock.split("\n").join(", ").trim()
      : null,

    finalRecipientSwift: bankBlock
      ? bankBlock.replace(/\s+/g, "").trim()
      : null,

    amount: amountBlock
      ? amountBlock.match(/[A-Z]{3}([\d,\.]+)/)?.[1] ?? null
      : null,

    currency: amountBlock
      ? amountBlock.match(/([A-Z]{3})/)?.[1] ?? null
      : null,
  };
}
