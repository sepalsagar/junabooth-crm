export function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Neutralise spreadsheet formulas:
  // If the cell begins with =, +, -, @, \t (tab), or \r (CR)
  const formulaTriggers = ["=", "+", "-", "@", "\t", "\r"];
  const startsWithFormula = formulaTriggers.some((char) => str.startsWith(char));

  if (startsWithFormula) {
    str = `'${str}`;
  }

  // Quote / escape if it contains comma, double quote, newline, or CR
  const needsQuotes =
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r");

  if (needsQuotes) {
    return `"${str.replaceAll('"', '""')}"`;
  }

  return str;
}

export function toCSVRow(cells: unknown[]): string {
  return cells.map(csvCell).join(",");
}
