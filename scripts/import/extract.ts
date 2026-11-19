/**
 * Extract: reads junabooth-fake.xlsx with ExcelJS.
 * Returns raw rows per sheet, skips empty rows.
 * Does NOT import: Upcoming Events, Dashboard, Completed Events, del- tabs.
 */

import ExcelJS from "exceljs";

export interface RawRow {
  sheet: string;
  row: number;
  raw: Record<string, unknown>;
}

export interface ExtractResult {
  rows: RawRow[];
  duplicateIds: { sheet: string; id: string; rows: number[] }[];
  skippedSheets: string[];
}

const SKIP_SHEETS = new Set([
  "Upcoming Events",
  "Dashboard",
  "Completed Events",
]);
const SKIP_PREFIX = "del -";

function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && "result" in (v as object)) {
    return (v as ExcelJS.CellFormulaValue).result ?? null;
  }
  if (typeof v === "object" && "richText" in (v as object)) {
    return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
  }
  return v;
}

function isRowEmpty(values: unknown[]): boolean {
  return values.every((v) => v === null || v === undefined || v === "");
}

export async function extractWorkbook(filePath: string): Promise<ExtractResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const rows: RawRow[] = [];
  const skippedSheets: string[] = [];
  const idTracker = new Map<string, Map<string, number[]>>();

  wb.eachSheet((sheet) => {
    const name = sheet.name;
    if (SKIP_SHEETS.has(name) || name.startsWith(SKIP_PREFIX)) {
      skippedSheets.push(name);
      return;
    }

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      const v = cellValue(cell);
      headers.push(v ? String(v).trim() : `col_${cell.col}`);
    });

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const values: unknown[] = [];
      const record: Record<string, unknown> = {};

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const v = cellValue(cell);
        const header = headers[colNumber - 1] ?? `col_${colNumber}`;
        record[header] = v;
        values.push(v);
      });

      if (isRowEmpty(values)) return;

      const firstVal = values[0];
      if (typeof firstVal === "string" && (firstVal.startsWith("===") || firstVal.startsWith("NOTE:"))) return;

      rows.push({ sheet: name, row: rowNumber, raw: record });

      // Track IDs for duplicate detection
      const idCol = record["JB Code"] ?? record["ENQ Code"];
      if (typeof idCol === "string" && idCol.trim()) {
        const id = idCol.trim();
        if (!idTracker.has(name)) idTracker.set(name, new Map());
        const sheetMap = idTracker.get(name)!;
        if (!sheetMap.has(id)) sheetMap.set(id, []);
        sheetMap.get(id)!.push(rowNumber);
      }
    });
  });

  const duplicateIds: ExtractResult["duplicateIds"] = [];
  for (const [sheet, sheetMap] of idTracker) {
    for (const [id, rowNums] of sheetMap) {
      if (rowNums.length > 1) duplicateIds.push({ sheet, id, rows: rowNums });
    }
  }

  return { rows, duplicateIds, skippedSheets };
}
