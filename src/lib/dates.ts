// Pure date helpers for IST (UTC+05:30) calculations and formatting.
// Store UTC in the database, compare and display in Indian Standard Time.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function getISTParts(date: Date) {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth(),
    day: istDate.getUTCDate(),
    dayOfWeek: istDate.getUTCDay(), // 0 = Sunday, 1 = Monday, ...
    hours: istDate.getUTCHours(),
    minutes: istDate.getUTCMinutes(),
  };
}

export function startOfTodayIST(now: Date = new Date()): Date {
  const { year, month, day } = getISTParts(now);
  // Midnight IST = UTC minus 5h30m
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MS);
}

export function endOfTodayIST(now: Date = new Date()): Date {
  const { year, month, day } = getISTParts(now);
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - IST_OFFSET_MS);
}

export function endOfWeekIST(now: Date = new Date()): Date {
  const { year, month, day, dayOfWeek } = getISTParts(now);
  // End of the week is Sunday 23:59:59.999 IST. If today is Sunday (0), it ends today.
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  return new Date(
    Date.UTC(year, month, day + daysUntilSunday, 23, 59, 59, 999) - IST_OFFSET_MS
  );
}

export function formatDateIST(
  date: Date | string | number | null | undefined
): string {
  if (!date) return "—";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTimeIST(
  date: Date | string | number | null | undefined
): string {
  if (!date) return "—";
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

// Formats a Date as YYYY-MM-DD in IST for HTML date inputs
export function toISODateStringIST(date: Date): string {
  const { year, month, day } = getISTParts(date);
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

// Parses a YYYY-MM-DD string into a UTC Date representing 00:00:00 IST
export function parseISODateIST(dateStr: string): Date | null {
  const parts = dateStr.trim().split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MS);
}
