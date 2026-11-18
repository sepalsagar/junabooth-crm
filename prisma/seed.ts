import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  BookingStatus,
  BookingType,
  CapitalKind,
  ExpenseCategory,
  LeadActivityType,
  LeadSource,
  LeadStatus,
  PaymentKind,
  PaymentMode,
  PrismaClient,
} from "../src/generated/prisma/client";
import { seedAuth } from "../src/lib/seed-auth";

const connectionString = process.env.DIRECT_URL;
if (!connectionString) throw new Error("DIRECT_URL is required to seed the database.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000);

async function main() {
  const users = await Promise.all([1, 2, 3, 4].map(async (index) => {
    const name = process.env[`SEED_PARTNER_${index}_NAME`] ?? `Demo User ${index}`;
    const email = process.env[`SEED_PARTNER_${index}_EMAIL`] ?? `partner${index}@example.test`;
    const password = process.env[`SEED_PARTNER_${index}_PASSWORD`] ?? "Pass1234!Demo";
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await seedAuth.api.signUpEmail({ body: { name, email, password } });
      user = await prisma.user.findUniqueOrThrow({ where: { email } });
      console.log(`Generated user ${email}`);
    }
    // Give user 3 SALES role to test sales role permissions, others PARTNER
    const role = index === 3 ? "SALES" : "PARTNER";
    return prisma.user.update({ where: { id: user.id }, data: { role } });
  }));

  await prisma.counter.upsert({
    where: { name: "ENQ" },
    update: { value: 30 },
    create: { name: "ENQ", value: 30 },
  });
  await prisma.counter.upsert({
    where: { name: "JB" },
    update: {},
    create: { name: "JB", value: 4 },
  });

  const leadDefs = [
    // 1-8: Original leads with diverse statuses
    { code: "ENQ-001", name: "Aarav Mehta", phone: "9876500001", city: "Patna", event: "Wedding", src: LeadSource.INSTAGRAM, st: LeadStatus.NEW, amt: 22000, targetOffset: 12, fuOffset: null, ownerIdx: 0, lostReason: null },
    { code: "ENQ-002", name: "Isha Verma", phone: "9876500002", city: "Delhi NCR", event: "Birthday", src: LeadSource.META_AD, st: LeadStatus.CONTACTED, amt: 18000, targetOffset: 25, fuOffset: -2, ownerIdx: 1, lostReason: null }, // Overdue
    { code: "ENQ-003", name: "Kabir Singh", phone: "9876500003", city: "Patna", event: "Corporate", src: LeadSource.BNI, st: LeadStatus.QUOTED, amt: 35000, targetOffset: 40, fuOffset: 0, ownerIdx: 0, lostReason: null }, // Today
    { code: "ENQ-004", name: "Meera Kapoor", phone: "9876500004", city: "Delhi NCR", event: "Wedding", src: LeadSource.REFERRAL, st: LeadStatus.FOLLOW_UP, amt: 28000, targetOffset: 18, fuOffset: 1, ownerIdx: 2, lostReason: null }, // This week
    { code: "ENQ-005", name: "Nisha Gupta", phone: "9876500005", city: "Patna", event: "Engagement", src: LeadSource.WEBSITE, st: LeadStatus.WON, amt: 25000, targetOffset: 7, fuOffset: null, ownerIdx: 0, lostReason: null },
    { code: "ENQ-006", name: "Om Prakash", phone: "9876500006", city: "Delhi NCR", event: "College fest", src: LeadSource.TR_EVENT, st: LeadStatus.LOST, amt: 15000, targetOffset: 5, fuOffset: null, ownerIdx: 1, lostReason: "Budget" },
    { code: "ENQ-007", name: "Priya Das", phone: "9876500007", city: "Patna", event: "Anniversary", src: LeadSource.PHONE, st: LeadStatus.POSTPONED, amt: 20000, targetOffset: 60, fuOffset: 14, ownerIdx: 0, lostReason: null },
    { code: "ENQ-008", name: "Rohan Batra", phone: "9876500008", city: "Delhi NCR", event: "Product launch", src: LeadSource.B2B_PARTNER, st: LeadStatus.FOLLOW_UP, amt: 32000, targetOffset: 30, fuOffset: -4, ownerIdx: 2, lostReason: null }, // Overdue

    // 9-16: Leads in Gaya and Bodh Gaya
    { code: "ENQ-009", name: "Ananya Roy", phone: "9876500009", city: "Gaya", event: "Wedding", src: LeadSource.INSTAGRAM, st: LeadStatus.NEW, amt: 24000, targetOffset: 15, fuOffset: null, ownerIdx: 0, lostReason: null },
    { code: "ENQ-010", name: "Devansh Mishra", phone: "9876500010", city: "Bodh Gaya", event: "Retreat Gala", src: LeadSource.WEBSITE, st: LeadStatus.CONTACTED, amt: 30000, targetOffset: 20, fuOffset: 0, ownerIdx: 1, lostReason: null }, // Today
    { code: "ENQ-011", name: "Kavya Saxena", phone: "9876500011", city: "Gaya", event: "Engagement", src: LeadSource.META_AD, st: LeadStatus.QUOTED, amt: 22000, targetOffset: 10, fuOffset: 2, ownerIdx: 2, lostReason: null }, // This week
    { code: "ENQ-012", name: "Manish Kumar", phone: "9876500012", city: "Bodh Gaya", event: "Conference", src: LeadSource.BNI, st: LeadStatus.FOLLOW_UP, amt: 45000, targetOffset: 35, fuOffset: -1, ownerIdx: 0, lostReason: null }, // Overdue
    { code: "ENQ-013", name: "Pooja Trivedi", phone: "9876500013", city: "Patna", event: "Birthday", src: LeadSource.REFERRAL, st: LeadStatus.POSTPONED, amt: 16000, targetOffset: 45, fuOffset: 20, ownerIdx: 1, lostReason: null },
    { code: "ENQ-014", name: "Suresh Nambiar", phone: "9876500014", city: "Delhi NCR", event: "Corporate Dinner", src: LeadSource.B2B_PARTNER, st: LeadStatus.LOST, amt: 38000, targetOffset: 10, fuOffset: null, ownerIdx: 2, lostReason: "Date taken" },
    { code: "ENQ-015", name: "Tanvi Hegde", phone: "9876500015", city: "Patna", event: "Wedding", src: LeadSource.INSTAGRAM, st: LeadStatus.NEW, amt: 26000, targetOffset: 22, fuOffset: null, ownerIdx: 0, lostReason: null }, // Shared phone test
    { code: "ENQ-016", name: "Tanvi Sister Event", phone: "9876500015", city: "Patna", event: "Sangeet", src: LeadSource.PHONE, st: LeadStatus.CONTACTED, amt: 20000, targetOffset: 23, fuOffset: 1, ownerIdx: 0, lostReason: null }, // Duplicate phone!

    // 17-24: More leads with different sources, amounts & dates
    { code: "ENQ-017", name: "Vikramaditya Roy", phone: "9876500017", city: "Delhi NCR", event: "Exhibition", src: LeadSource.PSC, st: LeadStatus.QUOTED, amt: 50000, targetOffset: 14, fuOffset: 0, ownerIdx: 1, lostReason: null }, // Today
    { code: "ENQ-018", name: "Ritika Sen", phone: "9876500018", city: "Gaya", event: "Family Reunion", src: LeadSource.TR_EVENT, st: LeadStatus.FOLLOW_UP, amt: 19000, targetOffset: 28, fuOffset: 3, ownerIdx: 2, lostReason: null }, // This week
    { code: "ENQ-019", name: "Sameer Joshi", phone: "9876500019", city: "Bodh Gaya", event: "Festival Party", src: LeadSource.OTHER, st: LeadStatus.NEW, amt: 21000, targetOffset: 19, fuOffset: null, ownerIdx: null, lostReason: null }, // Unassigned
    { code: "ENQ-020", name: "Shruti Bajaj", phone: "9876500020", city: "Patna", event: "Baby Shower", src: LeadSource.INSTAGRAM, st: LeadStatus.LOST, amt: 14000, targetOffset: 8, fuOffset: null, ownerIdx: 0, lostReason: "Outstation" },
    { code: "ENQ-021", name: "Aditya Chopra", phone: "9876500021", city: "Delhi NCR", event: "Fashion Show", src: LeadSource.META_AD, st: LeadStatus.CONTACTED, amt: 42000, targetOffset: 16, fuOffset: -3, ownerIdx: 1, lostReason: null }, // Overdue
    { code: "ENQ-022", name: "Deepa Narang", phone: "9876500022", city: "Gaya", event: "Housewarming", src: LeadSource.REFERRAL, st: LeadStatus.POSTPONED, amt: 17000, targetOffset: 50, fuOffset: 25, ownerIdx: 2, lostReason: null },
    { code: "ENQ-023", name: "Gaurav Malhotra", phone: "9876500023", city: "Patna", event: "Doctor Meet", src: LeadSource.BNI, st: LeadStatus.QUOTED, amt: 29000, targetOffset: 33, fuOffset: 2, ownerIdx: 0, lostReason: null },
    { code: "ENQ-024", name: "Harsh Vardhan", phone: "9876500024", city: "Bodh Gaya", event: "Charity Gala", src: LeadSource.WEBSITE, st: LeadStatus.FOLLOW_UP, amt: 31000, targetOffset: 11, fuOffset: 0, ownerIdx: 1, lostReason: null }, // Today

    // 25-30: Rounding out to 30 leads
    { code: "ENQ-025", name: "Ishaan Khatter", phone: "9876500025", city: "Delhi NCR", event: "Wrap Party", src: LeadSource.PHONE, st: LeadStatus.NEW, amt: 27000, targetOffset: 9, fuOffset: null, ownerIdx: 2, lostReason: null },
    { code: "ENQ-026", name: "Jhanvi Anand", phone: "9876500026", city: "Patna", event: "Wedding", src: LeadSource.INSTAGRAM, st: LeadStatus.CONTACTED, amt: 33000, targetOffset: 21, fuOffset: 4, ownerIdx: 0, lostReason: null },
    { code: "ENQ-027", name: "Kunal Ghosh", phone: "9876500027", city: "Gaya", event: "Reception", src: LeadSource.PSC, st: LeadStatus.QUOTED, amt: 23000, targetOffset: 17, fuOffset: -5, ownerIdx: 1, lostReason: null }, // Overdue
    { code: "ENQ-028", name: "Lavanya Pillai", phone: "9876500028", city: "Delhi NCR", event: "Cocktail Night", src: LeadSource.META_AD, st: LeadStatus.FOLLOW_UP, amt: 36000, targetOffset: 13, fuOffset: 1, ownerIdx: 2, lostReason: null }, // This week
    { code: "ENQ-029", name: "Mohit Suri", phone: "9876500029", city: "Bodh Gaya", event: "Music Fest", src: LeadSource.B2B_PARTNER, st: LeadStatus.LOST, amt: 48000, targetOffset: 30, fuOffset: null, ownerIdx: 0, lostReason: "No reply" },
    { code: "ENQ-030", name: "Nandini Iyer", phone: "9876500030", city: "Patna", event: "Mehndi", src: LeadSource.REFERRAL, st: LeadStatus.POSTPONED, amt: 21000, targetOffset: 40, fuOffset: 18, ownerIdx: 1, lostReason: null },
  ] as const;

  for (const def of leadDefs) {
    const ownerId = def.ownerIdx !== null ? users[def.ownerIdx].id : null;
    const targetDate = def.targetOffset !== null ? day(def.targetOffset) : null;
    const nextFollowUp = def.fuOffset !== null ? day(def.fuOffset) : null;

    const lead = await prisma.lead.upsert({
      where: { code: def.code },
      update: {
        clientName: def.name,
        phone: def.phone,
        whatsapp: def.phone,
        city: def.city,
        eventType: def.event,
        source: def.src,
        status: def.st,
        quotedAmount: def.amt,
        targetDate,
        nextFollowUp,
        ownerId,
        lostReason: def.lostReason,
      },
      create: {
        code: def.code,
        clientName: def.name,
        phone: def.phone,
        whatsapp: def.phone,
        city: def.city,
        eventType: def.event,
        source: def.src,
        status: def.st,
        quotedAmount: def.amt,
        packageName: "Classic Booth",
        venue: `${def.city} Central Banquet`,
        targetDate,
        nextFollowUp,
        ownerId,
        lostReason: def.lostReason,
        notes: `Seed lead generated for testing ${def.city} pipeline.`,
      },
    });

    // Ensure initial activities exist for the lead
    const activityCount = await prisma.leadActivity.count({ where: { leadId: lead.id } });
    if (activityCount === 0) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: ownerId,
          type: LeadActivityType.CREATED,
          message: `Lead created (${lead.code})`,
          createdAt: day(-10),
        },
      });

      if (def.st === LeadStatus.LOST && def.lostReason) {
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            userId: ownerId,
            type: LeadActivityType.STATUS_CHANGED,
            message: `Status changed to LOST (${def.lostReason})`,
            createdAt: day(-2),
          },
        });
      } else if (def.fuOffset !== null) {
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            userId: ownerId,
            type: LeadActivityType.FOLLOW_UP_SET,
            message: `Follow-up set for offset ${def.fuOffset} days`,
            createdAt: day(-1),
          },
        });
      }

      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: ownerId,
          type: LeadActivityType.NOTE,
          message: "Client confirmed photobooth slot requirements and initial budget range.",
          createdAt: day(-1),
        },
      });
    }
  }

  // Preserve existing bookings, payments, expenses, capital logic
  const nisha = await prisma.lead.findUniqueOrThrow({ where: { code: "ENQ-005" } });
  const bookingRows = [
    ["JB-001", nisha.id, "Nisha Gupta", "9876500005", "Patna", "Royal Garden", 7, "Premium Booth", 25000, 2000, 1000, BookingStatus.CONFIRMED, BookingType.PAID],
    ["JB-002", null, "Acme Demo Co.", "9876500010", "Delhi NCR", "Expo Centre", 14, "Classic Booth", 18000, 3000, 0, BookingStatus.OPTION, BookingType.B2B],
    ["JB-003", null, "Sample University", "9876500011", "Patna", "Campus Hall", -3, "Classic Booth", 12000, 0, 2000, BookingStatus.COMPLETED, BookingType.COLLAB],
    ["JB-004", null, "Devika Rao", "9876500012", "Delhi NCR", "Green Hotel", 21, "Premium Booth", 30000, 2500, 0, BookingStatus.CONFIRMED, BookingType.PAID],
  ] as const;
  const bookings = [];
  for (const [code, leadId, clientName, phone, city, venue, offset, packageName, basePrice, travelCharge, discount, status, type] of bookingRows) {
    bookings.push(
      await prisma.booking.upsert({
        where: { code },
        update: {},
        create: {
          code,
          leadId,
          clientName,
          phone,
          city,
          venue,
          eventDate: day(offset),
          startTime: "18:00",
          endTime: "22:00",
          packageName,
          basePrice,
          travelCharge,
          discount,
          status,
          type,
          dayContact: "Sample Site Contact",
        },
      })
    );
  }

  const payments = [
    [bookings[0].id, 10000, PaymentKind.ADVANCE, PaymentMode.UPI],
    [bookings[0].id, 16000, PaymentKind.FINAL, PaymentMode.BANK],
    [bookings[2].id, 10000, PaymentKind.ADVANCE, PaymentMode.CASH],
    [bookings[2].id, 1000, PaymentKind.REFUND, PaymentMode.UPI],
  ] as const;
  for (const [bookingId, amount, kind, mode] of payments) {
    if (!(await prisma.payment.findFirst({ where: { bookingId, amount, kind } }))) {
      await prisma.payment.create({
        data: {
          bookingId,
          amount,
          kind,
          mode,
          paidOn: day(-2),
          receivedBy: "Demo Partner",
        },
      });
    }
  }

  const expenses = [
    [bookings[0].id, ExpenseCategory.OPERATOR_FEE, 3500],
    [bookings[0].id, ExpenseCategory.TRANSPORT, 1200],
    [bookings[2].id, ExpenseCategory.FOOD, 700],
    [null, ExpenseCategory.SOFTWARE, 1500],
    [null, ExpenseCategory.MARKETING, 4500],
    [bookings[3].id, ExpenseCategory.CONSUMABLES, 900],
  ] as const;
  for (const [bookingId, category, amount] of expenses) {
    if (!(await prisma.expense.findFirst({ where: { bookingId, category, amount } }))) {
      await prisma.expense.create({
        data: {
          bookingId,
          category,
          amount,
          spentOn: day(-1),
          paidBy: "Demo Partner",
        },
      });
    }
  }

  const capital = [
    [users[0].id, CapitalKind.INJECTED, 50000],
    [users[1].id, CapitalKind.INJECTED, 40000],
    [users[0].id, CapitalKind.WITHDRAWN, 5000],
    [users[1].id, CapitalKind.INJECTED, 10000],
  ] as const;
  for (const [partnerId, kind, amount] of capital) {
    if (!(await prisma.capitalEntry.findFirst({ where: { partnerId, kind, amount } }))) {
      await prisma.capitalEntry.create({
        data: {
          partnerId,
          kind,
          amount,
          date: day(-5),
          mode: PaymentMode.BANK,
        },
      });
    }
  }
}

main()
  .then(() => console.log("Seed data is ready."))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
