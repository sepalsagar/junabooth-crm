/**
 * Money parsing for import pipeline.
 * blank → null (NOT zero). Never guess ambiguous amounts — flag for review.
 */

export interface ParsedMoney {
  value: number | null;
  warning?: string;
  needsReview?: boolean;
}

// Strip Indian number-format commas (1,45,000 → 145000)
function stripIndianCommas(s: string): string {
  // After stripping Rs/etc, only digits, commas, dots remain
  return s.replace(/,/g, "");
}

export function parseMoney(raw: unknown, context = ""): ParsedMoney {
  if (raw === null || raw === undefined || raw === "") {
    return { value: null };
  }

  if (typeof raw === "number") {
    if (!isFinite(raw)) return { value: null, warning: `${context}: non-finite number` };
    return { value: Math.round(raw) };
  }

  if (typeof raw !== "string") {
    return { value: null, warning: `${context}: unexpected type ${typeof raw}` };
  }

  const s = raw.trim();
  if (!s || /^-+$/.test(s)) return { value: null };

  // "approx", "~", "abt", "around" → needs review, do NOT import as a number
  if (/approx|abt\b|around|~|\?/i.test(s)) {
    return { value: null, needsReview: true, warning: `${context}: approximate amount "${s}" – needs review` };
  }

  // Strip currency markers: Rs., Rs, ₹, /-, trailing symbols
  let cleaned = s
    .replace(/Rs\.?\s*/gi, "")
    .replace(/₹\s*/g, "")
    .replace(/\/-\s*$/, "")
    .replace(/\s/g, "")
    .trim();

  // "15k" / "1.5L" / "1.5Cr" shorthand
  const shorthand = /^([\d.]+)(k|l|cr)$/i.exec(cleaned);
  if (shorthand) {
    const n = parseFloat(shorthand[1]);
    const suffix = shorthand[2].toLowerCase();
    let multiplier = 1;
    if (suffix === "k") multiplier = 1000;
    else if (suffix === "l") multiplier = 100000;
    else if (suffix === "cr") multiplier = 10000000;
    if (!isFinite(n)) return { value: null, warning: `${context}: bad shorthand "${s}"` };
    return { value: Math.round(n * multiplier) };
  }

  cleaned = stripIndianCommas(cleaned);

  // After stripping everything, should be a plain number (possibly with one decimal)
  const n = parseFloat(cleaned);
  if (isNaN(n) || !isFinite(n)) {
    return { value: null, needsReview: true, warning: `${context}: cannot parse amount "${s}"` };
  }

  return { value: Math.round(n) };
}
