export function inr(amount: number) {
  return `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function inrCompact(n: number): string {
  const isNegative = n < 0;
  const abs = Math.abs(n);
  const sign = isNegative ? "-" : "";

  if (abs >= 10_000_000) {
    const cr = parseFloat((abs / 10_000_000).toFixed(2));
    return `${sign}${cr}Cr`;
  }
  if (abs >= 100_000) {
    const l = parseFloat((abs / 100_000).toFixed(2));
    return `${sign}${l}L`;
  }
  return `${sign}${new Intl.NumberFormat("en-IN").format(abs)}`;
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
