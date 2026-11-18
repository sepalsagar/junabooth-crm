import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { BookingStatus, BookingType, CapitalKind, ExpenseCategory, LeadSource, LeadStatus, PaymentKind, PaymentMode, PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL;
if (!connectionString) throw new Error("DIRECT_URL is required to seed the database.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000);

async function main() {
  await prisma.counter.upsert({ where: { name: "ENQ" }, update: {}, create: { name: "ENQ", value: 8 } });
  await prisma.counter.upsert({ where: { name: "JB" }, update: {}, create: { name: "JB", value: 4 } });
  const leadRows = [
    ["ENQ-001", "Aarav Mehta", "9876500001", "Patna", "Wedding", LeadSource.INSTAGRAM, LeadStatus.NEW],
    ["ENQ-002", "Isha Verma", "9876500002", "Delhi NCR", "Birthday", LeadSource.META_AD, LeadStatus.CONTACTED],
    ["ENQ-003", "Kabir Singh", "9876500003", "Patna", "Corporate", LeadSource.BNI, LeadStatus.QUOTED],
    ["ENQ-004", "Meera Kapoor", "9876500004", "Delhi NCR", "Wedding", LeadSource.REFERRAL, LeadStatus.FOLLOW_UP],
    ["ENQ-005", "Nisha Gupta", "9876500005", "Patna", "Engagement", LeadSource.WEBSITE, LeadStatus.WON],
    ["ENQ-006", "Om Prakash", "9876500006", "Delhi NCR", "College fest", LeadSource.TR_EVENT, LeadStatus.LOST],
    ["ENQ-007", "Priya Das", "9876500007", "Patna", "Anniversary", LeadSource.PHONE, LeadStatus.POSTPONED],
    ["ENQ-008", "Rohan Batra", "9876500008", "Delhi NCR", "Product launch", LeadSource.B2B_PARTNER, LeadStatus.FOLLOW_UP],
  ] as const;
  for (const [code, clientName, phone, city, eventType, source, status] of leadRows) await prisma.lead.upsert({ where: { code }, update: {}, create: { code, clientName, phone, whatsapp: phone, city, eventType, source, status, targetDate: day(10), nextFollowUp: status === LeadStatus.FOLLOW_UP ? day(-2) : null, quotedAmount: 20000, packageName: "Classic Booth", venue: "Sample Venue" } });
  const nisha = await prisma.lead.findUniqueOrThrow({ where: { code: "ENQ-005" } });
  const bookingRows = [
    ["JB-001", nisha.id, "Nisha Gupta", "9876500005", "Patna", "Royal Garden", 7, "Premium Booth", 25000, 2000, 1000, BookingStatus.CONFIRMED, BookingType.PAID],
    ["JB-002", null, "Acme Demo Co.", "9876500010", "Delhi NCR", "Expo Centre", 14, "Classic Booth", 18000, 3000, 0, BookingStatus.OPTION, BookingType.B2B],
    ["JB-003", null, "Sample University", "9876500011", "Patna", "Campus Hall", -3, "Classic Booth", 12000, 0, 2000, BookingStatus.COMPLETED, BookingType.COLLAB],
    ["JB-004", null, "Devika Rao", "9876500012", "Delhi NCR", "Green Hotel", 21, "Premium Booth", 30000, 2500, 0, BookingStatus.CONFIRMED, BookingType.PAID],
  ] as const;
  const bookings = [];
  for (const [code, leadId, clientName, phone, city, venue, offset, packageName, basePrice, travelCharge, discount, status, type] of bookingRows) bookings.push(await prisma.booking.upsert({ where: { code }, update: {}, create: { code, leadId, clientName, phone, city, venue, eventDate: day(offset), startTime: "18:00", endTime: "22:00", packageName, basePrice, travelCharge, discount, status, type, dayContact: "Sample Site Contact" } }));
  const payments = [[bookings[0].id, 10000, PaymentKind.ADVANCE, PaymentMode.UPI], [bookings[0].id, 16000, PaymentKind.FINAL, PaymentMode.BANK], [bookings[2].id, 10000, PaymentKind.ADVANCE, PaymentMode.CASH], [bookings[2].id, 1000, PaymentKind.REFUND, PaymentMode.UPI]] as const;
  for (const [bookingId, amount, kind, mode] of payments) if (!await prisma.payment.findFirst({ where: { bookingId, amount, kind } })) await prisma.payment.create({ data: { bookingId, amount, kind, mode, paidOn: day(-2), receivedBy: "Demo Partner" } });
  const expenses = [[bookings[0].id, ExpenseCategory.OPERATOR_FEE, 3500], [bookings[0].id, ExpenseCategory.TRANSPORT, 1200], [bookings[2].id, ExpenseCategory.FOOD, 700], [null, ExpenseCategory.SOFTWARE, 1500], [null, ExpenseCategory.MARKETING, 4500], [bookings[3].id, ExpenseCategory.CONSUMABLES, 900]] as const;
  for (const [bookingId, category, amount] of expenses) if (!await prisma.expense.findFirst({ where: { bookingId, category, amount } })) await prisma.expense.create({ data: { bookingId, category, amount, spentOn: day(-1), paidBy: "Demo Partner" } });
  const capital = [["Asha Sharma", CapitalKind.INJECTED, 50000], ["Vikram Jain", CapitalKind.INJECTED, 40000], ["Asha Sharma", CapitalKind.WITHDRAWN, 5000], ["Vikram Jain", CapitalKind.INJECTED, 10000]] as const;
  for (const [partnerName, kind, amount] of capital) if (!await prisma.capitalEntry.findFirst({ where: { partnerName, kind, amount } })) await prisma.capitalEntry.create({ data: { partnerName, kind, amount, date: day(-5), mode: PaymentMode.BANK } });
}
main().then(() => console.log("Seed data is ready.")).finally(() => prisma.$disconnect());
