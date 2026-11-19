/**
 * Transform: takes extracted raw rows → structured domain objects.
 * Does NOT use sheet status labels to determine payment status — derives from amounts.
 * Missing leads referenced by bookings are synthesised with status WON.
 */

import { parseDate } from "./clean/date";
import { parseMoney } from "./clean/money";
import { cleanPhone } from "./clean/phone";
import { nameKey } from "./clean/name";
import { canonicalCity, parseSheetStatus, guessCategory } from "./clean/maps";
import type { RawRow } from "./extract";

export interface ImportLead {
  sourceRef: string;
  name: string;
  phone: string;
  phoneNeedsReview: boolean;
  city: string | null;
  eventType: string | null;
  source: string | null;
  targetDate: Date | null;
  targetDateWarnings: string[];
  status: string;
  estimatedAmount: number | null;
  notes: string;
  synthetic: boolean; // true = no row in Leads tab; derived from booking
}

export interface ImportBooking {
  sourceRef: string;
  enqRef: string | null;
  name: string;
  phone: string;
  phoneNeedsReview: boolean;
  city: string | null;
  venue: string | null;
  eventDate: Date | null;
  eventDateWarnings: string[];
  packageName: string | null;
  basePrice: number | null;
  travelCost: number | null;
  discount: number | null;
  sheetStatusLabel: string | null;
  statusMismatch: boolean;
  _cancelled: boolean;
}

export interface ImportPayment {
  bookingSourceRef: string;
  amount: number;
  type: "ADVANCE" | "FINAL";
  sourceRef: string;
}

export interface ImportExpense {
  sourceRef: string;
  date: Date | null;
  dateWarnings: string[];
  description: string;
  amount: number | null;
  amountNeedsReview: boolean;
  category: string | null;
  section: string;
  linkedBookingRef: string | null;
}

export interface ImportCapitalEntry {
  sourceRef: string;
  date: Date | null;
  description: string;
  amount: number;
  type: "WITHDRAWN";
}

export interface ReviewItem {
  sheet: string;
  row: number;
  field: string;
  issue: string;
  value: unknown;
}

export interface TransformResult {
  leads: ImportLead[];
  bookings: ImportBooking[];
  payments: ImportPayment[];
  expenses: ImportExpense[];
  capitalEntries: ImportCapitalEntry[];
  reviewItems: ReviewItem[];
  warnings: string[];
}

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v).trim();
}

export function transform(rows: RawRow[]): TransformResult {
  const leads: ImportLead[] = [];
  const bookings: ImportBooking[] = [];
  const payments: ImportPayment[] = [];
  const expenses: ImportExpense[] = [];
  const capitalEntries: ImportCapitalEntry[] = [];
  const reviewItems: ReviewItem[] = [];
  const warnings: string[] = [];

  const seenEnqCodes = new Set<string>();
  const seenJbCodes = new Set<string>();

  const bySheet = new Map<string, RawRow[]>();
  for (const r of rows) {
    if (!bySheet.has(r.sheet)) bySheet.set(r.sheet, []);
    bySheet.get(r.sheet)!.push(r);
  }

  // ── Leads & CRM ───────────────────────────────────────────────────────────
  for (const r of bySheet.get("Leads & CRM") ?? []) {
    const enqCode = str(r.raw["ENQ Code"]);
    if (!enqCode) continue;
    if (seenEnqCodes.has(enqCode)) {
      warnings.push(`Duplicate ENQ code ${enqCode} at Leads row ${r.row}`);
      continue;
    }
    seenEnqCodes.add(enqCode);

    const ph = cleanPhone(r.raw["Phone"], `Leads row ${r.row}`);
    if (ph.needsReview) reviewItems.push({ sheet: r.sheet, row: r.row, field: "Phone", issue: ph.warning ?? "invalid phone", value: r.raw["Phone"] });

    const td = parseDate(r.raw["Target Date"], `Leads row ${r.row}`);
    td.warnings.forEach(w => warnings.push(w));

    const amt = parseMoney(r.raw["Est. Amount"], `Leads row ${r.row}`);
    if (amt.needsReview) reviewItems.push({ sheet: r.sheet, row: r.row, field: "Est. Amount", issue: amt.warning ?? "review", value: r.raw["Est. Amount"] });

    leads.push({
      sourceRef: enqCode,
      name: str(r.raw["Name"]),
      phone: ph.value,
      phoneNeedsReview: ph.needsReview ?? false,
      city: canonicalCity(r.raw["City"]),
      eventType: str(r.raw["Event Type"]) || null,
      source: str(r.raw["Source"]) || null,
      targetDate: td.value,
      targetDateWarnings: td.warnings,
      status: str(r.raw["Status"]) || "New",
      estimatedAmount: amt.value,
      notes: str(r.raw["Notes"]),
      synthetic: false,
    });
  }

  // ── Master Bookings ───────────────────────────────────────────────────────
  for (const r of bySheet.get("Master Bookings") ?? []) {
    const jbCode = str(r.raw["JB Code"]);
    if (!jbCode) continue;
    if (seenJbCodes.has(jbCode)) {
      warnings.push(`Duplicate JB code ${jbCode} at Bookings row ${r.row} — skipping`);
      reviewItems.push({ sheet: r.sheet, row: r.row, field: "JB Code", issue: "duplicate booking ID", value: jbCode });
      continue;
    }
    seenJbCodes.add(jbCode);

    const enqRef = str(r.raw["ENQ Code"]) || null;
    const ph = cleanPhone(r.raw["Phone"], `Bookings row ${r.row}`);
    if (ph.needsReview) reviewItems.push({ sheet: r.sheet, row: r.row, field: "Phone", issue: ph.warning ?? "invalid", value: r.raw["Phone"] });

    const ed = parseDate(r.raw["Event Date"], `Bookings row ${r.row}`);
    ed.warnings.forEach(w => warnings.push(w));

    const basePrice = parseMoney(r.raw["Base Price"], `Bookings row ${r.row}`);
    if (basePrice.needsReview) reviewItems.push({ sheet: r.sheet, row: r.row, field: "Base Price", issue: basePrice.warning ?? "review", value: r.raw["Base Price"] });

    const travel = parseMoney(r.raw["Travel"], `Bookings row ${r.row}`);
    const discount = parseMoney(r.raw["Discount"], `Bookings row ${r.row}`);
    const advance = parseMoney(r.raw["Advance Paid"], `Bookings row ${r.row}`);
    if (advance.needsReview) reviewItems.push({ sheet: r.sheet, row: r.row, field: "Advance Paid", issue: advance.warning ?? "review", value: r.raw["Advance Paid"] });
    const finalPaid = parseMoney(r.raw["Final Paid"], `Bookings row ${r.row}`);
    if (finalPaid.needsReview) reviewItems.push({ sheet: r.sheet, row: r.row, field: "Final Paid", issue: finalPaid.warning ?? "review", value: r.raw["Final Paid"] });

    const sheetStatusLabel = str(r.raw["Status"]) || null;
    const sheetStatus = parseSheetStatus(sheetStatusLabel);
    const cancelled = /cancel/i.test(sheetStatusLabel ?? "");

    // Status mismatch: sheet says "Paid"/"Fully Paid" but finalPaid missing
    let statusMismatch = false;
    if (sheetStatus === "FULLY_PAID" && (finalPaid.value === null || finalPaid.value === 0)) {
      statusMismatch = true;
      reviewItems.push({ sheet: r.sheet, row: r.row, field: "Status", issue: `Sheet says "${sheetStatusLabel}" but Final Paid is blank`, value: sheetStatusLabel });
    }

    bookings.push({
      sourceRef: jbCode, enqRef,
      name: str(r.raw["Client Name"]),
      phone: ph.value, phoneNeedsReview: ph.needsReview ?? false,
      city: canonicalCity(r.raw["City"]),
      venue: str(r.raw["Venue"]) || null,
      eventDate: ed.value, eventDateWarnings: ed.warnings,
      packageName: str(r.raw["Package"]) || null,
      basePrice: basePrice.value, travelCost: travel.value, discount: discount.value,
      sheetStatusLabel, statusMismatch, _cancelled: cancelled,
    });

    if (!cancelled) {
      if (advance.value !== null && advance.value > 0) {
        payments.push({ bookingSourceRef: jbCode, amount: advance.value, type: "ADVANCE", sourceRef: `${jbCode}-advance` });
      }
      if (finalPaid.value !== null && finalPaid.value > 0) {
        payments.push({ bookingSourceRef: jbCode, amount: finalPaid.value, type: "FINAL", sourceRef: `${jbCode}-final` });
      }
    }

    // Synthesise lead if booking references an ENQ code absent from leads tab
    if (enqRef && !seenEnqCodes.has(enqRef)) {
      seenEnqCodes.add(enqRef);
      leads.push({
        sourceRef: enqRef, name: str(r.raw["Client Name"]),
        phone: ph.value, phoneNeedsReview: ph.needsReview ?? false,
        city: canonicalCity(r.raw["City"]), eventType: null, source: null,
        targetDate: ed.value, targetDateWarnings: [],
        status: "WON", estimatedAmount: basePrice.value,
        notes: "Synthesised from booking (lead absent in Leads tab)", synthetic: true,
      });
      warnings.push(`Synthesised lead ${enqRef} from booking ${jbCode}`);
    }
  }

  // ── Expenditures & Accounts ───────────────────────────────────────────────
  // Build name-key index for event-day matching
  const bookingsByNameKey = new Map<string, ImportBooking[]>();
  for (const b of bookings) {
    const key = nameKey(b.name);
    if (!bookingsByNameKey.has(key)) bookingsByNameKey.set(key, []);
    bookingsByNameKey.get(key)!.push(b);
  }

  let expSeq = 0;
  for (const r of bySheet.get("Expenditures & Accounts") ?? []) {
    expSeq++;
    const desc = str(r.raw["Description"] ?? r.raw["col_2"]);
    if (!desc) continue;

    // Skip header-total rows (e.g. "Total Withdrawals:")
    if (/^total/i.test(desc)) continue;

    const isWithdrawal = /withdraw/i.test(desc);
    const hasLinkedBooking = "Linked Booking" in r.raw;
    const hasPaidTo = "Paid To" in r.raw;

    if (isWithdrawal) {
      const amt = parseMoney(r.raw["Amount"] ?? r.raw["col_3"], `Expenses row ${r.row}`);
      if (amt.value === null) {
        if (amt.needsReview) reviewItems.push({ sheet: r.sheet, row: r.row, field: "Amount", issue: amt.warning ?? "review", value: r.raw["Amount"] });
        continue;
      }
      const dt = parseDate(r.raw["Date"] ?? r.raw["col_1"], `Expenses row ${r.row}`);
      dt.warnings.forEach(w => warnings.push(w));
      capitalEntries.push({ sourceRef: `withdrawal-row${r.row}`, date: dt.value, description: desc, amount: amt.value, type: "WITHDRAWN" });
      continue;
    }

    let section = "Junabooth";
    let linkedBookingRef: string | null = null;

    if (hasLinkedBooking) {
      section = "Revenue";
      linkedBookingRef = str(r.raw["Linked Booking"]) || null;
      if (!linkedBookingRef) warnings.push(`Revenue row ${r.row}: no linked booking ID — imported as unlinked`);
    } else if (hasPaidTo) {
      section = "EventDay";
      const descKey = nameKey(desc);
      const candidates: ImportBooking[] = [];
      for (const [key, bList] of bookingsByNameKey) {
        if (key.length > 3 && descKey.includes(key)) candidates.push(...bList);
      }
      if (candidates.length === 1) {
        linkedBookingRef = candidates[0].sourceRef;
      } else if (candidates.length > 1) {
        reviewItems.push({ sheet: r.sheet, row: r.row, field: "Description", issue: `Ambiguous: matches ${candidates.map(b => b.sourceRef).join(", ")}`, value: desc });
      }
    }

    const rawAmt = r.raw["Amount"] ?? r.raw["col_3"];
    const amt = parseMoney(rawAmt, `Expenses row ${r.row}`);
    if (amt.needsReview) reviewItems.push({ sheet: r.sheet, row: r.row, field: "Amount", issue: amt.warning ?? "review amount", value: rawAmt });

    const dt = parseDate(r.raw["Date"] ?? r.raw["col_1"], `Expenses row ${r.row}`);
    dt.warnings.forEach(w => warnings.push(w));

    expenses.push({
      sourceRef: `exp-row${r.row}-${expSeq}`,
      date: dt.value, dateWarnings: dt.warnings,
      description: desc, amount: amt.value,
      amountNeedsReview: amt.needsReview ?? false,
      category: guessCategory(desc), section, linkedBookingRef,
    });
  }

  const withdrawalTotal = capitalEntries.reduce((s, e) => s + e.amount, 0);
  if (withdrawalTotal > 0) {
    warnings.push(`Withdrawals header total in sheet may disagree with entries sum Rs.${withdrawalTotal} — verify manually`);
  }

  return { leads, bookings, payments, expenses, capitalEntries, reviewItems, warnings };
}
