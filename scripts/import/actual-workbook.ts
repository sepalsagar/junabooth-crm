import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { parseDate } from "./clean/date";
import { guessCategory } from "./clean/maps";

const workbookPath = process.env.JUNABOOTH_WORKBOOK_PATH ?? "D:/Copy of Junabooth - Exclusive Dashboard copy file.xlsx";
const text = (value: unknown) => value === null || value === undefined ? "" : String(value).trim();
const money = (value: unknown) => Math.round(Number(text(value).replace(/[^0-9.-]/g, "")) || 0);
const code = (value: unknown) => text(value).replace(/\s+/g, "").toUpperCase();
const date = (value: unknown) => parseDate(value, "workbook").value;
function cell(cell: ExcelJS.Cell): unknown { const value = cell.value; return value && typeof value === "object" && "result" in value ? (value as ExcelJS.CellFormulaValue).result ?? null : value; }
function status(value: unknown) { const raw = text(value).toLowerCase(); return raw.includes("cancel") ? "CANCELLED" : raw.includes("complete") ? "COMPLETED" : raw.includes("option") ? "OPTION" : "CONFIRMED" as const; }
function times(value: unknown) { const values = text(value).split(/\s*(?:–|—|-)\s*/).filter(Boolean); return { startTime: values[0] ?? null, endTime: values[1] ?? null }; }

async function read() {
  if (!fs.existsSync(workbookPath)) throw new Error("Workbook not found. Set JUNABOOTH_WORKBOOK_PATH.");
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.readFile(workbookPath);
  const bookings = workbook.getWorksheet("Master Bookings"); const leads = workbook.getWorksheet("Leads & CRM"); const expenses = workbook.getWorksheet("Expenditures & Accounts"); const settings = workbook.getWorksheet("del - Settings");
  if (!bookings || !leads || !expenses || !settings) throw new Error("Required workbook source sheets are missing.");
  const bookingRows = [] as Array<{ code: string; leadCode: string | null; clientName: string; city: string | null; venue: string | null; eventDate: Date; startTime: string | null; endTime: string | null; price: number; advance: number; balance: number; final: number; paymentStatus: string | null; status: "OPTION" | "CONFIRMED" | "COMPLETED" | "CANCELLED"; type: "PAID" | "COLLAB"; payOnEvent: boolean; notes: string | null }>;
  for (let n = 3; n <= bookings.rowCount; n++) { const row = bookings.getRow(n); const bookingCode = code(cell(row.getCell(1))); const eventDate = date(cell(row.getCell(5))); if (!bookingCode.startsWith("JB-") || !eventDate) continue; const paymentStatus = text(cell(row.getCell(12))); const time = times(cell(row.getCell(7))); bookingRows.push({ code: bookingCode, leadCode: code(cell(row.getCell(2))).startsWith("ENQ-") ? code(cell(row.getCell(2))) : null, clientName: text(cell(row.getCell(4))), city: text(cell(row.getCell(3))) || null, venue: text(cell(row.getCell(6))) || null, eventDate, startTime: time.startTime, endTime: time.endTime, price: money(cell(row.getCell(8))), advance: money(cell(row.getCell(9))), balance: money(cell(row.getCell(10))), final: money(cell(row.getCell(11))), paymentStatus: paymentStatus || null, status: status(cell(row.getCell(13))), type: /collab|promo/i.test(paymentStatus) ? "COLLAB" : "PAID", payOnEvent: /pay on event/i.test(paymentStatus), notes: text(cell(row.getCell(14))) || null }); }
  const leadMap = new Map<string, { code: string; name: string; phone: string; inquiryDate: Date | null; city: string | null; eventType: string | null; targetDate: Date | null; source: string | null; budget: number | null; venue: string | null; notes: string | null }>();
  for (let n = 3; n <= leads.rowCount; n++) { const row = leads.getRow(n); const leadCode = code(cell(row.getCell(1))); if (!leadCode.startsWith("ENQ-")) continue; leadMap.set(leadCode, { code: leadCode, name: text(cell(row.getCell(3))), phone: text(cell(row.getCell(4))), inquiryDate: date(cell(row.getCell(2))), city: text(cell(row.getCell(5))) || null, eventType: text(cell(row.getCell(6))) || null, targetDate: date(cell(row.getCell(7))), source: text(cell(row.getCell(8))) || null, budget: money(cell(row.getCell(9))) || null, venue: text(cell(row.getCell(10))) || null, notes: text(cell(row.getCell(11))) || null }); }
  for (const booking of bookingRows) if (booking.leadCode && !leadMap.has(booking.leadCode)) leadMap.set(booking.leadCode, { code: booking.leadCode, name: booking.clientName, phone: "", inquiryDate: null, city: booking.city, eventType: null, targetDate: booking.eventDate, source: null, budget: booking.price || null, venue: booking.venue, notes: "Created from linked Master Booking." });
  const expenseRows = [] as Array<{ ref: string; date: Date; amount: number; note: string }>;
  for (const group of [{ d: 2, a: 3, n: 4, label: "business" }, { d: 6, a: 7, n: 8, label: "event-day" }]) for (let n = 6; n <= expenses.rowCount; n++) { const row = expenses.getRow(n); const when = date(cell(row.getCell(group.d))); const amount = money(cell(row.getCell(group.a))); const note = text(cell(row.getCell(group.n))); if (when && amount && note && !/^till\b/i.test(note)) expenseRows.push({ ref: `${group.label}-${n}`, date: when, amount, note }); }
  const regions: string[] = []; const packages: string[] = []; for (let n = 3; n <= settings.rowCount; n++) { const row = settings.getRow(n); const region = text(cell(row.getCell(1))); const pkg = text(cell(row.getCell(5))); if (region) regions.push(region); if (pkg) packages.push(pkg); }
  return { bookingRows, leads: [...leadMap.values()], expenseRows, regions: [...new Set(regions)], packages: [...new Set(packages)] };
}

async function apply(data: Awaited<ReturnType<typeof read>>) {
  const sha = crypto.createHash("sha256").update(fs.readFileSync(workbookPath)).digest("hex");
  await db.$transaction(async (tx) => {
    await tx.auditLog.deleteMany(); await tx.payment.deleteMany(); await tx.expense.deleteMany(); await tx.bookingActivity.deleteMany(); await tx.booking.deleteMany(); await tx.leadActivity.deleteMany(); await tx.lead.deleteMany(); await tx.capitalEntry.deleteMany(); await tx.importRun.deleteMany(); await tx.package.deleteMany(); await tx.region.deleteMany();
    for (const name of data.regions) await tx.region.create({ data: { name } }); for (const name of data.packages) await tx.package.create({ data: { name, hours: Number(/(\d+)\s*hr/i.exec(name)?.[1] ?? 0), price: 0 } });
    const linked = new Set(data.bookingRows.map((row) => row.leadCode).filter((value): value is string => Boolean(value))); const ids = new Map<string, string>();
    for (const lead of data.leads) { const created = await tx.lead.create({ data: { code: lead.code, sourceRef: `actual-lead:${lead.code}`, clientName: lead.name || "Unspecified", phone: lead.phone, whatsapp: lead.phone || null, inquiryDate: lead.inquiryDate, city: lead.city, eventType: lead.eventType, targetDate: lead.targetDate, venue: lead.venue, sourceText: lead.source, quotedAmount: lead.budget, notes: lead.notes, status: linked.has(lead.code) ? "WON" : "NEW" } }); ids.set(lead.code, created.id); }
    for (const booking of data.bookingRows) await tx.booking.create({ data: { code: booking.code, sourceRef: `actual-booking:${booking.code}`, leadId: booking.leadCode ? ids.get(booking.leadCode) : null, clientName: booking.clientName || "Unspecified", phone: "", city: booking.city, venue: booking.venue, eventDate: booking.eventDate, startTime: booking.startTime, endTime: booking.endTime, packageName: "Imported booking", basePrice: booking.price, type: booking.type, status: booking.status, payOnEvent: booking.payOnEvent, sheetAdvanceReceived: booking.advance, sheetBalanceDue: booking.balance, sheetFinalReceived: booking.final, sheetPaymentStatus: booking.paymentStatus, notes: booking.notes } });
    for (const expense of data.expenseRows) await tx.expense.create({ data: { sourceRef: `actual-expense:${expense.ref}`, amount: expense.amount, spentOn: expense.date, category: guessCategory(expense.note) ?? "OTHER", note: expense.note } });
    const maximum = (prefix: string, values: string[]) => Math.max(0, ...values.map((value) => Number(new RegExp(`^${prefix}-(\\d+)`).exec(value)?.[1]) || 0)); await tx.counter.upsert({ where: { name: "JB" }, update: { value: maximum("JB", data.bookingRows.map((row) => row.code)) }, create: { name: "JB", value: maximum("JB", data.bookingRows.map((row) => row.code)) } }); await tx.counter.upsert({ where: { name: "ENQ" }, update: { value: maximum("ENQ", data.leads.map((row) => row.code)) }, create: { name: "ENQ", value: maximum("ENQ", data.leads.map((row) => row.code)) } });
    await tx.importRun.create({ data: { fileSha256: sha, countsJson: { leads: data.leads.length, bookings: data.bookingRows.length, expenses: data.expenseRows.length }, warningsCount: 1, decisionsJson: { source: path.basename(workbookPath), skippedDerivedSheets: ["Upcoming Events", "Completed Events", "Dashboard"], excludedRecord: "JB-033 duplicate continuation row / one booking without date" }, targetHost: "actual-workbook" } });
  }, { timeout: 60000 });
}
async function main() { const data = await read(); const summary = { leads: data.leads.length, bookings: data.bookingRows.length, expenses: data.expenseRows.length, regions: data.regions.length, packages: data.packages.length }; if (!process.argv.includes("--apply")) console.log(JSON.stringify(summary)); else { await apply(data); console.log(JSON.stringify({ ...summary, applied: true })); } }
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Import failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
