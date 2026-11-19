/**
 * Fake messy sheet generator.
 * Produces fixtures/fake-sheet/junabooth-fake.xlsx with known planted problems.
 * Run: npx tsx fixtures/fake-sheet/generate.ts
 * All names, phones, amounts are FAKE. No real client data.
 */

import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, "junabooth-fake.xlsx");
const TOTALS_FILE = path.join(__dirname, "expected-totals.json");

// ── Fake data pools ────────────────────────────────────────────────────────

const CITIES = ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Hassan"];
const EVENT_TYPES = ["Wedding", "Engagement", "Birthday", "Corporate", "Baby Shower"];
const SOURCES = ["Instagram", "Reference", "Google", "Justdial", "Walk-in"];
const PACKAGES = ["Classic 3h", "Grand 4h", "Royal 6h", "Custom"];
const PACKAGE_PRICES: Record<string, number> = {
  "Classic 3h": 16000, "Grand 4h": 20000, "Royal 6h": 28000, "Custom": 0,
};

// Fake client names (deliberately varied)
const NAMES = [
  "Rahul Sharma", "Priya Nair", "Ankit Patel", "Sneha Reddy", "Vikram Singh",
  "Deepa Menon", "Suresh Kumar", "Anjali Verma", "Manoj Joshi", "Kavitha Rao",
  "Ravi Bhat", "Meena Pillai", "Arun Hegde", "Pooja Desai", "Nikhil Kulkarni",
  "Sudha Iyer", "Karthik Nayak", "Ramya Shetty", "Aditya Shah", "Bhavna Jain",
  "Girish Gowda", "Lakshmi Naidu", "Sameer Khan", "Tanvi Deshpande", "Vinod Murthy",
  "Hema Nair", "Prasad Reddy", "Usha Pillai", "Ganesh Murthy", "Swathi Rao",
  "Rajesh Patel", "Nandini Sharma", "Sunil Joshi", "Rekha Menon", "Arvind Kumar",
  "Divya Verma", "Prakash Singh", "Jyoti Hegde", "Ashok Desai", "Saritha Kulkarni",
  "Mohan Iyer", "Geeta Nayak", "Santosh Shetty", "Shobha Shah", "Ramesh Jain",
];

// Fake phones (all invalid in real world: 7xxx area, fictitious)
const PHONES = [
  "7000000001", "7000000002", "7000000003", "7000000004", "7000000005",
  "7000000006", "7000000007", "7000000008", "7000000009", "7000000010",
  "7000000011", "7000000012", "7000000013", "7000000014", "7000000015",
  "7000000016", "7000000017", "7000000018", "7000000019", "7000000020",
  "7000000021", "7000000022", "7000000023", "7000000024", "7000000025",
  "7000000026", "7000000027", "7000000028", "7000000029", "7000000030",
  "7000000031", "7000000032", "7000000033", "7000000034", "7000000035",
  "7000000036", "7000000037", "7000000038", "7000000039", "7000000040",
  "7000000041", "7000000042", "7000000043", "7000000044", "7000000045",
];

const VENUES = [
  "City Hall", "Hotel Grand", "Green Meadows", "Shree Hall", "Orchid Banquet",
  "Royal Palms", "Sunrise Convention", "Blue Lotus Hall", "Diamond Garden",
  "Pearl Banquet", "Lotus Convention", "Monarch Hall",
];

// ── Helper to format date as dd/mm/yyyy string ──────────────────────────────
function ddmm(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Excel serial for a date (days since 1899-12-31)
function excelSerial(d: Date): number {
  const epoch = new Date(Date.UTC(1899, 11, 31));
  return Math.round((d.getTime() - epoch.getTime()) / 86400000);
}

// Add days to a date
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

// Random event date in next 12 months from a reference date
function futureDate(ref: Date, minDays: number, maxDays: number): Date {
  const days = minDays + Math.floor(Math.random() * (maxDays - minDays));
  return addDays(ref, days);
}

// ── Reference date: treat as "today" for the sheet ──────────────────────────
const TODAY = new Date(Date.UTC(2026, 10, 1)); // 2026-11-01 UTC

// ── Build booking data ──────────────────────────────────────────────────────

interface BookingRow {
  jbCode: string;
  enqCode: string;
  name: string;
  phone: string;
  city: string;
  venue: string;
  eventDate: Date;
  package: string;
  basePrice: number;
  travel: number;
  discount: number;
  advance: number | null;
  finalPaid: number | null;
  statusLabel: string;   // what the sheet says (may differ from actual)
  notes: string;
  // internal flags (not written to sheet)
  _cancelled: boolean;
}

const bookings: BookingRow[] = [];

// Generate 70 bookings (JB-001 to JB-070, with JB-025 missing and JB-039 duplicate)
let seq = 1;
for (let i = 1; i <= 72; i++) {
  if (i === 25) continue;        // planted: gap in JB codes (JB-025 missing)
  if (i > 70) break;

  const jbNum = seq < 10 ? `0${seq}` : `${seq}`;
  // planted: JB-039 appears twice (duplicate id) — handled by inserting a row later
  seq++;

  const idx = (i - 1) % NAMES.length;
  const name = NAMES[idx];
  const phone = PHONES[idx % PHONES.length];
  const city = CITIES[i % CITIES.length];
  const venue = VENUES[i % VENUES.length];
  const pkg = PACKAGES[i % PACKAGES.length];
  const basePrice = PACKAGE_PRICES[pkg] || 18000;
  const travel = (i % 5 === 0) ? 2000 : 0;
  const discount = (i % 7 === 0) ? 1000 : 0;
  const totalBill = basePrice + travel - discount;

  // Vary event dates: some past, some future
  const isCompleted = i <= 40;
  const eventDate = isCompleted
    ? addDays(TODAY, -(i * 5 + 10))
    : futureDate(TODAY, 20, 300);

  let advance: number | null = null;
  let finalPaid: number | null = null;
  let statusLabel = "";
  const cancelled = (i === 55); // planted: one cancelled booking

  if (cancelled) {
    statusLabel = "Cancelled";
    advance = null;
    finalPaid = null;
  } else if (isCompleted) {
    // Various payment label mixups (planted)
    if (i === 10) {
      // planted: "Paid" label but only advance collected (label disagrees with amounts)
      advance = Math.floor(totalBill * 0.5);
      finalPaid = null;
      statusLabel = "Paid"; // should be "Advance Paid"
    } else if (i === 22) {
      // planted: blank advance on a "Fully Paid" event
      advance = null;
      finalPaid = totalBill;
      statusLabel = "Fully Paid";
    } else {
      advance = Math.floor(totalBill * 0.4);
      finalPaid = totalBill - advance;
      statusLabel = i % 3 === 0 ? "Paid" : "Fully Paid";
    }
  } else {
    // upcoming
    if (i % 4 === 1) {
      advance = Math.floor(totalBill * 0.5);
      statusLabel = "Advance Paid";
    } else if (i % 4 === 2) {
      advance = null;
      finalPaid = null;
      statusLabel = "";
    } else {
      advance = Math.floor(totalBill * 0.3);
      statusLabel = "Advance Paid";
    }
  }

  bookings.push({
    jbCode: `JB-${jbNum}`,
    enqCode: `ENQ-${String(i).padStart(3, "0")}`,
    name,
    phone,
    city,
    venue,
    eventDate,
    package: pkg,
    basePrice,
    travel,
    discount,
    advance,
    finalPaid,
    statusLabel,
    notes: "",
    _cancelled: cancelled,
  });
}

// Plant: duplicate JB-039 row
const dup39 = bookings.find(b => b.jbCode === "JB-039")!;
bookings.splice(bookings.indexOf(dup39) + 1, 0, {
  ...dup39,
  jbCode: "JB-039", // same code — will be flagged as duplicate
  name: "Priya Nair (duplicate row)",
  advance: 5000,
  statusLabel: "Advance Paid",
  notes: "DUPLICATE ROW",
});

// Plant: price in "Rs. 16,000/-" format for one booking
const priceFmtRow = bookings.find(b => b.enqCode === "ENQ-003");
if (priceFmtRow) (priceFmtRow as any)._priceDisplay = "Rs. 16,000/-";

// Plant: price as "1,45,000" (Indian grouping with no Rs) for another
const lakshRow = bookings.find(b => b.enqCode === "ENQ-005");
if (lakshRow) (lakshRow as any)._priceDisplay = "1,45,000";

// Plant: phone stored as number (Excel number, no leading zero) for ENQ-007
const phoneNumRow = bookings.find(b => b.enqCode === "ENQ-007");
if (phoneNumRow) (phoneNumRow as any)._phoneAsNumber = true;

// Plant: ambiguous name matching two bookings
// ENQ-012 and ENQ-033 share the same event-day expense name "Ravi Kumar event"
const ambigRow1 = bookings.find(b => b.enqCode === "ENQ-012");
if (ambigRow1) ambigRow1.notes = "ambig-name-test";
const ambigRow2 = bookings.find(b => b.enqCode === "ENQ-033");
if (ambigRow2) ambigRow2.notes = "ambig-name-test";

// ── Build leads data ────────────────────────────────────────────────────────

interface LeadRow {
  enqCode: string;
  name: string;
  phone: string;
  city: string;
  eventType: string;
  source: string;
  targetDate: unknown;  // mixed types on purpose
  status: string;
  followUpDate: unknown;
  amount: unknown;
  notes: string;
}

const leads: LeadRow[] = [];

// 45 leads, ENQ-001..ENQ-045 (note: ENQ-044 and ENQ-045 are referenced by bookings but appear as leads)
// Planted: leads only go to ENQ-043 in this section — ENQ-044+ appear in bookings only
for (let i = 1; i <= 43; i++) {
  const idx = (i - 1) % NAMES.length;
  const name = i === 20
    ? "Snigdha jii"       // planted: honorific variant
    : i === 21
    ? "snigdha ji"        // planted: same person, different variant
    : NAMES[idx];

  const phone = PHONES[idx % PHONES.length];
  const city = CITIES[i % CITIES.length];

  // Planted: one past target date (year 2025)
  let targetDate: unknown;
  if (i === 15) {
    targetDate = "15/11/2025"; // past
  } else if (i === 8) {
    targetDate = excelSerial(futureDate(TODAY, 60, 180)); // Excel serial
  } else if (i === 12) {
    targetDate = "TBD";       // planted: TBD date
  } else if (i === 25) {
    targetDate = `${futureDate(TODAY, 90, 150).getUTCDate()} Nov 26`; // word date
  } else {
    targetDate = ddmm(futureDate(TODAY, 60, 365));
  }

  const statuses = ["New", "Contacted", "Quoted", "Follow Up", "Won", "Lost", "New"];
  const status = i === 20 || i === 21 ? "Won" : statuses[i % statuses.length];

  // Planted: blank duplicate rows (i=30 and i=31)
  if (i === 30 || i === 31) {
    leads.push({
      enqCode: "",
      name: "",
      phone: "",
      city: "",
      eventType: "",
      source: "",
      targetDate: "",
      status: "",
      followUpDate: "",
      amount: "",
      notes: "blank-row",
    });
    continue;
  }

  leads.push({
    enqCode: `ENQ-${String(i).padStart(3, "0")}`,
    name,
    phone,
    city,
    eventType: EVENT_TYPES[i % EVENT_TYPES.length],
    source: SOURCES[i % SOURCES.length],
    targetDate,
    status,
    followUpDate: i % 3 === 0 ? ddmm(futureDate(TODAY, 7, 30)) : "",
    amount: i % 4 === 0 ? (16000 + (i * 500)) : (i % 4 === 1 ? `Rs. ${16000 + i * 200}/-` : ""),
    notes: "",
  });
}

// ── Expenditure data ────────────────────────────────────────────────────────

interface ExpRow {
  section: "Revenue" | "EventDay" | "Junabooth" | "Withdrawals";
  date: unknown;
  description: string;
  amount: unknown;
  linkedBooking?: string;
  paidTo?: string;
}

const expenses: ExpRow[] = [];

// Revenue rows: some without booking ID (planted)
for (let i = 1; i <= 15; i++) {
  expenses.push({
    section: "Revenue",
    date: ddmm(addDays(TODAY, -(i * 7))),
    description: i === 5 ? "Misc studio fees" : `Revenue - JB-${String(i).padStart(3,"0")}`,
    amount: 2000 + i * 500,
    linkedBooking: i === 5 ? "" : `JB-${String(i).padStart(3,"0")}`, // planted: row 5 has no booking id
  });
}

// Event day expenses
const eventDayDescs = [
  "Ravi Kumar event - cake",           // ambiguous: matches JB-012 and JB-033
  "Priya Nair event - travel",          // matches JB-002 exactly
  "Hotel Grand event - refreshments",   // venue-based, no booking link
  "Rahul Sharma event - lunch",
  "Deepa Menon - flowers",
  "Suresh Kumar event - cake",
  "Anjali Verma - props",
  "Manoj Joshi event - travel",
];
for (let i = 0; i < eventDayDescs.length; i++) {
  expenses.push({
    section: "EventDay",
    date: ddmm(addDays(TODAY, -(i * 10 + 5))),
    description: eventDayDescs[i],
    amount: 500 + i * 200,
    paidTo: "Cash",
  });
}

// General Junabooth overheads
const junaCosts = [
  { desc: "Studio rent - October", amount: 15000 },
  { desc: "till 10 October - misc overheads", amount: "approx 15k" },  // planted: approximate
  { desc: "Instagram ads", amount: 3000 },
  { desc: "Camera battery pack", amount: 2500 },
  { desc: "Printer cartridge", amount: 800 },
  { desc: "Staff lunch", amount: 450 },
  { desc: "Fuel reimbursement", amount: 1200 },
  { desc: "till 15 November - general expenses", amount: 8000 },        // planted: lump sum
  { desc: "Subscriptions - software", amount: 2000 },
  { desc: "Office supplies", amount: 650 },
];
for (const c of junaCosts) {
  expenses.push({
    section: "Junabooth",
    date: ddmm(addDays(TODAY, -Math.floor(Math.random() * 60 + 10))),
    description: c.desc,
    amount: c.amount,
  });
}

// Withdrawals section
// Planted: header cell says 30,000 but entries sum to 80,000
const withdrawals = [
  { date: "01/10/2026", desc: "Partner A withdrawal", amount: 20000 },
  { date: "15/10/2026", desc: "Partner B withdrawal", amount: 25000 },
  { date: "01/11/2026", desc: "Partner A withdrawal", amount: 35000 },
  // Header total 30,000 is planted as a cell in the sheet (wrong; actual sum = 80,000)
];
for (const w of withdrawals) {
  expenses.push({
    section: "Withdrawals",
    date: w.date,
    description: w.desc,
    amount: w.amount,
  });
}

// ── Computed expected totals (independent of loader) ─────────────────────────

// Only non-cancelled bookings
const activeBookings = bookings.filter(b => !b._cancelled && b.jbCode !== "JB-039" || false)
  .filter(b => b.notes !== "DUPLICATE ROW");
// remove the duplicate row for totals
const uniqueBookings = bookings.filter(b => b.notes !== "DUPLICATE ROW");
const nonCancelledUnique = uniqueBookings.filter(b => !b._cancelled);

let totalBilled = 0;
let totalReceived = 0;

for (const b of nonCancelledUnique) {
  const billed = b.basePrice + b.travel - b.discount;
  totalBilled += billed;
  totalReceived += (b.advance ?? 0) + (b.finalPaid ?? 0);
}

const balanceDue = totalBilled - totalReceived;

const expensesBySection = { eventDay: 0, junabooth: 0, revenue: 0 };
for (const e of expenses) {
  if (typeof e.amount !== "number") continue; // skip approx rows
  if (e.section === "EventDay") expensesBySection.eventDay += e.amount as number;
  if (e.section === "Junabooth") expensesBySection.junabooth += e.amount as number;
  if (e.section === "Revenue") expensesBySection.revenue += e.amount as number;
}

// Capital: sum withdrawal entries (not header)
const capitalWithdrawn = withdrawals.reduce((s, w) => s + w.amount, 0);
// No injection rows in this sheet (would come from partner ledger tab)
const capitalInjected = 0;

const rowCounts = {
  bookings: uniqueBookings.filter(b => !b._cancelled).length,
  leads: leads.filter(l => l.enqCode !== "").length,
  payments: nonCancelledUnique.filter(b => b.advance || b.finalPaid).length,
  expenses: expenses.filter(e => typeof e.amount === "number").length,
  capitalEntries: withdrawals.length,
};

const expectedTotals = {
  _note: "Computed independently from planted data, NOT by running the loader. Tolerances: 0 (exact match required).",
  totalBilled,
  totalReceived,
  balanceDue,
  expensesBySection,
  capitalInjected,
  capitalWithdrawn,
  rowCounts,
  plantedProblems: [
    "JB-025 missing (gap in JB sequence)",
    "JB-039 appears twice (duplicate booking ID)",
    "JB-010 labelled 'Paid' but only advance collected",
    "JB-022 blank advance on Fully Paid event",
    "JB-055 is CANCELLED",
    "JB-003 price displayed as 'Rs. 16,000/-' string",
    "JB-005 price displayed as '1,45,000' (Indian grouping, no Rs)",
    "JB-007 phone stored as Excel number (no leading zero)",
    "JB-012 and JB-033 share ambiguous event-day expense name 'Ravi Kumar event'",
    "Lead ENQ-015 has past target date (2025)",
    "Lead ENQ-008 target date as Excel serial",
    "Lead ENQ-012 target date is 'TBD'",
    "Lead ENQ-025 target date as word date ('N Nov 26')",
    "Lead ENQ-020/021 same person: 'Snigdha jii' and 'snigdha ji'",
    "Leads section ends at ENQ-043; bookings reference ENQ-044+ (leads inferred as WON)",
    "Blank duplicate rows at leads rows 30-31",
    "Revenue row 5 has no booking ID",
    "Expense 'approx 15k' (needs-review, not importable as number)",
    "Lump sum 'till 15 November' expense",
    "Withdrawals header cell says 30000 but entries sum to 80000",
  ],
};

// ── Write workbook ──────────────────────────────────────────────────────────

async function writeSheet() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "JunabithFakeGenerator";
  wb.created = new Date();

  // ── 1. Master Bookings ───────────────────────────────────────
  const mbSheet = wb.addWorksheet("Master Bookings");
  mbSheet.addRow([
    "JB Code", "ENQ Code", "Client Name", "Phone", "City", "Venue",
    "Event Date", "Package", "Base Price", "Travel", "Discount",
    "Advance Paid", "Final Paid", "Status", "Notes",
  ]);

  for (const b of bookings) {
    const priceDisplay = (b as any)._priceDisplay;
    const phoneAsNumber = (b as any)._phoneAsNumber;

    // Planted: price as formatted string for certain rows
    const basePriceCell = priceDisplay ?? b.basePrice;

    // Event date in mixed formats
    let eDateCell: unknown;
    const idx = bookings.indexOf(b);
    if (idx === 2) eDateCell = ddmm(b.eventDate);                // dd/mm/yyyy string
    else if (idx === 5) eDateCell = excelSerial(b.eventDate);   // Excel serial
    else if (idx === 8) eDateCell = `${b.eventDate.getUTCDate()} Nov 26`;  // word date
    else eDateCell = b.eventDate;                                 // JS Date (ExcelJS writes as date cell)

    const row = mbSheet.addRow([
      b.jbCode,
      b.enqCode,
      b.name,
      phoneAsNumber ? parseInt(b.phone, 10) : b.phone,  // planted: phone as number
      b.city,
      b.venue,
      eDateCell,
      b.package,
      basePriceCell,
      b.travel || "",
      b.discount || "",
      b.advance ?? "",
      b.finalPaid ?? "",
      b.statusLabel,
      b.notes,
    ]);
    void row; // suppress unused warning
  }

  // ── 2. Leads & CRM ──────────────────────────────────────────
  const leadSheet = wb.addWorksheet("Leads & CRM");
  leadSheet.addRow([
    "ENQ Code", "Name", "Phone", "City", "Event Type", "Source",
    "Target Date", "Status", "Follow-Up Date", "Est. Amount", "Notes",
  ]);

  for (const l of leads) {
    leadSheet.addRow([
      l.enqCode, l.name, l.phone, l.city, l.eventType, l.source,
      l.targetDate, l.status, l.followUpDate, l.amount, l.notes,
    ]);
  }

  // ── 3. Expenditures & Accounts ──────────────────────────────
  const expSheet = wb.addWorksheet("Expenditures & Accounts");

  // Revenue section
  expSheet.addRow(["=== REVENUE ==="]);
  expSheet.addRow(["Date", "Description", "Amount", "Linked Booking"]);
  for (const e of expenses.filter(x => x.section === "Revenue")) {
    expSheet.addRow([e.date, e.description, e.amount, e.linkedBooking ?? ""]);
  }

  expSheet.addRow([]);

  // Event Day section
  expSheet.addRow(["=== EVENT DAY ==="]);
  expSheet.addRow(["Date", "Description", "Amount", "Paid To"]);
  for (const e of expenses.filter(x => x.section === "EventDay")) {
    expSheet.addRow([e.date, e.description, e.amount, e.paidTo ?? ""]);
  }

  expSheet.addRow([]);

  // Junabooth overheads
  expSheet.addRow(["=== JUNABOOTH (OVERHEADS) ==="]);
  expSheet.addRow(["Date", "Description", "Amount"]);
  for (const e of expenses.filter(x => x.section === "Junabooth")) {
    expSheet.addRow([e.date, e.description, e.amount]);
  }

  expSheet.addRow([]);

  // Withdrawals section
  expSheet.addRow(["=== WITHDRAWALS ==="]);
  // planted: header total disagrees with sum
  expSheet.addRow(["Total Withdrawals:", "", 30000]);  // wrong header total
  expSheet.addRow(["Date", "Description", "Amount"]);
  for (const e of expenses.filter(x => x.section === "Withdrawals")) {
    expSheet.addRow([e.date, e.description, e.amount]);
  }

  // ── 4. Completed Events (auto summary - do NOT import) ──────
  const compSheet = wb.addWorksheet("Completed Events");
  compSheet.addRow(["NOTE: This tab is auto-generated. DO NOT import."]);
  compSheet.addRow(["JB Code", "Client", "Event Date", "Total Billed", "Received"]);
  for (const b of uniqueBookings.filter(x => !x._cancelled && x.eventDate < TODAY)) {
    compSheet.addRow([b.jbCode, b.name, b.eventDate, b.basePrice + b.travel - b.discount, (b.advance ?? 0) + (b.finalPaid ?? 0)]);
  }

  // ── 5. Upcoming Events (Date and Region columns SWAPPED) ────
  const upSheet = wb.addWorksheet("Upcoming Events");
  upSheet.addRow(["NOTE: Date and Region columns are SWAPPED vs Master Bookings. DO NOT import."]);
  // planted: Region where Date should be, Date where Region should be
  upSheet.addRow(["JB Code", "Client", "City/Region", "Event Date", "Package", "Status"]);  // header looks normal
  for (const b of uniqueBookings.filter(x => !x._cancelled && x.eventDate >= TODAY)) {
    // planted: columns actually swapped in data rows
    upSheet.addRow([b.jbCode, b.name, ddmm(b.eventDate), b.city, b.package, b.statusLabel]);
    //                                 ^ date here (City column)  ^ city here (Date column)
  }

  // ── 6. Dashboard (stale numbers - do NOT import) ────────────
  const dashSheet = wb.addWorksheet("Dashboard");
  dashSheet.addRow(["STALE DASHBOARD - last updated manually, DO NOT import"]);
  dashSheet.addRow(["Total Bookings", 42]);           // stale
  dashSheet.addRow(["Total Revenue", "5,60,000"]);    // stale
  dashSheet.addRow(["Balance Due", "1,20,000"]);      // stale

  // ── 7. del - Settings ───────────────────────────────────────
  const setSheet = wb.addWorksheet("del - Settings");
  setSheet.addRow(["Archive tab. DO NOT import."]);
  setSheet.addRow(["Package", "Price"]);
  setSheet.addRow(["Classic 3h", 16000]);
  setSheet.addRow(["Grand 4h", 20000]);
  setSheet.addRow(["Royal 6h", 28000]);

  // ── 8. del - Partner Ledger ─────────────────────────────────
  const ledSheet = wb.addWorksheet("del - Partner Ledger");
  ledSheet.addRow(["Archive tab. DO NOT import."]);
  ledSheet.addRow(["Partner", "Injected", "Withdrawn", "Net"]);
  ledSheet.addRow(["Partner A", 150000, 55000, 95000]);
  ledSheet.addRow(["Partner B", 120000, 25000, 95000]);

  // ── 9. del - Master Cashbook ────────────────────────────────
  const cashSheet = wb.addWorksheet("del - Master Cashbook");
  cashSheet.addRow(["Archive tab. DO NOT import."]);
  cashSheet.addRow(["Date", "Description", "In", "Out", "Balance"]);
  cashSheet.addRow(["01/01/2026", "Opening balance", 50000, 0, 50000]);
  cashSheet.addRow(["15/01/2026", "Studio rent", 0, 15000, 35000]);

  await wb.xlsx.writeFile(OUT_FILE);
  console.log(`✅  Written: ${OUT_FILE}`);

  // Write expected totals
  fs.writeFileSync(TOTALS_FILE, JSON.stringify(expectedTotals, null, 2) + "\n");
  console.log(`✅  Written: ${TOTALS_FILE}`);
  console.log("\nExpected totals:");
  console.log(`  totalBilled:    ₹${totalBilled.toLocaleString("en-IN")}`);
  console.log(`  totalReceived:  ₹${totalReceived.toLocaleString("en-IN")}`);
  console.log(`  balanceDue:     ₹${balanceDue.toLocaleString("en-IN")}`);
  console.log(`  capitalWithdrawn: ₹${capitalWithdrawn.toLocaleString("en-IN")}`);
  console.log(`  rowCounts:`, rowCounts);
}

writeSheet().catch(err => { console.error(err); process.exit(1); });
