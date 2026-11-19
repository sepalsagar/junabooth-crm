export interface MonthGridCell {
  iso: string; // YYYY-MM-DD
  inMonth: boolean;
  year: number;
  month: number; // 1-12
  day: number;
  dayOfWeek: number; // 0=Sun..6=Sat
}

/**
 * Builds a 42-cell calendar grid for a given year and month (1-indexed: 1 = Jan, 12 = Dec).
 * Uses pure UTC date arithmetic.
 * weekStartsOn: 1 for Monday (default), 0 for Sunday.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  weekStartsOn: number = 1
): MonthGridCell[] {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDay.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  // Days from previous month to display in the first row
  const daysBefore = (firstDayOfWeek - weekStartsOn + 7) % 7;

  const cells: MonthGridCell[] = [];

  for (let i = 0; i < 42; i++) {
    const current = new Date(Date.UTC(year, month - 1, 1 - daysBefore + i));
    const curY = current.getUTCFullYear();
    const curM = current.getUTCMonth() + 1;
    const curD = current.getUTCDate();
    const iso = `${curY}-${String(curM).padStart(2, "0")}-${String(curD).padStart(2, "0")}`;
    const inMonth = curY === year && curM === month;

    cells.push({
      iso,
      inMonth,
      year: curY,
      month: curM,
      day: curD,
      dayOfWeek: current.getUTCDay(),
    });
  }

  return cells;
}
