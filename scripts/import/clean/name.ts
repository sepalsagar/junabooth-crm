/**
 * Name cleaning for import pipeline.
 * nameKey: used to fuzzy-match event-day expense rows to bookings.
 * Strips honorifics so "Snigdha jii" and "snigdha ji" produce the same key.
 */

// Common honorifics in Indian contexts
const HONORIFICS = [
  "jii?",        // ji / jii
  "ma'?am",      // ma'am / maam
  "madam",
  "sir",
  "bhaiya",
  "bhai",
  "didi",
  "sahib",
  "sahab",
  "mr\\.?",
  "mrs\\.?",
  "ms\\.?",
  "dr\\.?",
  "prof\\.?",
];

const HONORIFIC_RE = new RegExp(
  `\\b(${HONORIFICS.join("|")})\\b`,
  "gi"
);

/** Canonical key for fuzzy matching – lowercase, no honorifics, no punctuation, collapsed spaces. */
export function nameKey(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(HONORIFIC_RE, " ")       // remove honorifics
    .replace(/[^a-z0-9\s]/g, " ")    // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits a full name into { first, last } best-effort. */
export function splitName(raw: string): { first: string; last: string } {
  const cleaned = raw.replace(HONORIFIC_RE, " ").replace(/\s+/g, " ").trim();
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}
