export function monthsBetween(from: string, to: string): string[] {
  const [fromY, fromM] = from.split("-").map(Number);
  const [toY, toM] = to.split("-").map(Number);
  const result: string[] = [];

  let curY = fromY;
  let curM = fromM;

  while (curY < toY || (curY === toY && curM <= toM)) {
    result.push(`${curY}-${String(curM).padStart(2, "0")}`);
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }
  return result;
}

export function fillMonths<T extends { month: string }>(
  rows: T[],
  from: string,
  to: string,
  defaultRow: (month: string) => T
): T[] {
  const allMonths = monthsBetween(from, to);
  const rowMap = new Map<string, T>(rows.map((r) => [r.month, r]));

  return allMonths.map((m) => {
    const existing = rowMap.get(m);
    if (existing) return existing;
    return defaultRow(m);
  });
}
