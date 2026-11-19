/**
 * Phone cleaning for import pipeline.
 * Reuses normalisation logic from src/features/leads/phone.ts.
 * Phone may arrive as an Excel number (9876500001.0) — convert first.
 */

export interface ParsedPhone {
  value: string;          // normalised 10-digit, or original if invalid
  needsReview?: boolean;
  warning?: string;
}

export function cleanPhone(raw: unknown, context = ""): ParsedPhone {
  if (raw === null || raw === undefined || raw === "") {
    return { value: "", needsReview: true, warning: `${context}: blank phone` };
  }

  // Excel may store phone as a floating-point number with no leading zero
  let s: string;
  if (typeof raw === "number") {
    // e.g. 9876500001.0 → "9876500001"
    s = Math.round(raw).toString();
  } else {
    s = String(raw).trim();
  }

  // Strip spaces, dashes, dots
  s = s.replace(/[\s\-\.]/g, "");

  // Strip leading +91 or 0091
  s = s.replace(/^(\+91|0091)/, "");

  // Strip leading 0 (STD code style)
  s = s.replace(/^0/, "");

  // Must be 10 digits starting with 6-9
  if (/^[6-9]\d{9}$/.test(s)) {
    return { value: s };
  }

  return {
    value: String(raw).trim(),
    needsReview: true,
    warning: `${context}: invalid Indian mobile "${raw}"`,
  };
}
