/**
 * Date parsing for import pipeline.
 * Handles: Excel date serials, dd/mm/yyyy, "12 Nov 26", ISO strings, "TBD"/blank.
 * 2-digit year rule: >=50 → 19xx, <50 → 20xx.
 */

export interface ParsedDate {
  value: Date | null;
  warnings: string[];
  flags: string[];
}

// Excel serial 1 = 1900-01-01.
// Excel's epoch is effectively 1899-12-31 (serial 0 is treated as Jan 0 1900,
// and Excel incorrectly counts 1900 as a leap year with serial 60 = "Feb 29 1900";
// for dates >=61 subtract one extra day, but since we're dealing with post-1990
// import data we can use the simpler fixed offset).
const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 31));

const MONTH_ABBR: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function twoDigitYear(y: number): number {
  return y >= 50 ? 1900 + y : 2000 + y;
}

export function parseDate(raw: unknown, context = ""): ParsedDate {
  const warnings: string[] = [];
  const flags: string[] = [];

  if (raw === null || raw === undefined || raw === "") {
    return { value: null, warnings: [], flags: ["blank"] };
  }

  if (raw instanceof Date) {
    return { value: new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate())), warnings, flags: ["excel-date"] };
  }

  // Excel serial number
  if (typeof raw === "number") {
    if (raw < 1 || raw > 2958465) {
      // 2958465 = 9999-12-31
      warnings.push(`${context}: Excel serial ${raw} out of range`);
      return { value: null, warnings, flags: ["bad-serial"] };
    }
    const ms = raw * 86400000;
    const d = new Date(EXCEL_EPOCH.getTime() + ms);
    return { value: d, warnings, flags: ["excel-serial"] };
  }

  if (typeof raw !== "string") {
    warnings.push(`${context}: unexpected date type ${typeof raw}`);
    return { value: null, warnings, flags: ["bad-type"] };
  }

  const s = raw.trim();
  if (!s || /^(tbd|n\/a|na|-+|unknown)$/i.test(s)) {
    return { value: null, warnings: [], flags: ["tbd"] };
  }

  // ISO or near-ISO: yyyy-mm-dd
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    return { value: d, warnings, flags: [] };
  }

  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const dmy4 = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/.exec(s);
  if (dmy4) {
    const day = +dmy4[1], month = +dmy4[2], year = +dmy4[3];
    if (day <= 12 && month <= 12 && day !== month) {
      flags.push("ambiguous-dmy");
    }
    const d = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(d.getTime())) {
      warnings.push(`${context}: invalid date "${s}"`);
      return { value: null, warnings, flags: ["bad-date"] };
    }
    return { value: d, warnings, flags };
  }

  // dd/mm/yy (2-digit year)
  const dmy2 = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/.exec(s);
  if (dmy2) {
    const day = +dmy2[1], month = +dmy2[2], year = twoDigitYear(+dmy2[3]);
    if (day <= 12 && month <= 12 && day !== month) flags.push("ambiguous-dmy");
    const d = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(d.getTime())) {
      warnings.push(`${context}: invalid 2-digit-year date "${s}"`);
      return { value: null, warnings, flags: ["bad-date"] };
    }
    return { value: d, warnings, flags };
  }

  // "12 Nov 26" or "12 Nov 2026"
  const wordDate = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4})$/.exec(s);
  if (wordDate) {
    const day = +wordDate[1];
    const monthKey = wordDate[2].toLowerCase().slice(0, 3);
    const monthIdx = MONTH_ABBR[monthKey];
    if (monthIdx === undefined) {
      warnings.push(`${context}: unrecognised month "${wordDate[2]}"`);
      return { value: null, warnings, flags: ["bad-month"] };
    }
    const rawYear = +wordDate[3];
    const year = rawYear < 100 ? twoDigitYear(rawYear) : rawYear;
    const d = new Date(Date.UTC(year, monthIdx, day));
    return { value: d, warnings, flags: ["word-date"] };
  }

  // "Nov 12 2026" (US style)
  const usWord = /^([A-Za-z]{3,})\s+(\d{1,2})[,\s]+(\d{2,4})$/.exec(s);
  if (usWord) {
    const monthKey = usWord[1].toLowerCase().slice(0, 3);
    const monthIdx = MONTH_ABBR[monthKey];
    if (monthIdx !== undefined) {
      const rawYear = +usWord[3];
      const year = rawYear < 100 ? twoDigitYear(rawYear) : rawYear;
      const d = new Date(Date.UTC(year, monthIdx, +usWord[2]));
      return { value: d, warnings, flags: ["word-date"] };
    }
  }

  warnings.push(`${context}: unrecognised date format "${s}"`);
  return { value: null, warnings, flags: ["unrecognised"] };
}
