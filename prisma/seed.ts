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
  PrintSize,
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
    const configuredPassword = process.env[`SEED_PARTNER_${index}_PASSWORD`];
    const password = configuredPassword || crypto.randomUUID();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await seedAuth.api.signUpEmail({ body: { name, email, password } });
      user = await prisma.user.findUniqueOrThrow({ where: { email } });
      if (!configuredPassword) console.log(`Generated password for ${email}: ${password}`);
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
    update: { value: 15 },
    create: { name: "JB", value: 15 },
  });

  // Seed standard photobooth packages
  const packages = [
    { name: "Classic", hours: 3, price: 16000 },
    { name: "Grand", hours: 4, price: 20000 },
    { name: "Royal", hours: 6, price: 28000 },
    { name: "Custom", hours: 0, price: 0 },
  ];
  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { name: pkg.name },
      update: { hours: pkg.hours, price: pkg.price, active: true },
      create: { name: pkg.name, hours: pkg.hours, price: pkg.price, active: true },
    });
  }

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

  // Idempotent booking scenarios cover active, collection, and payment-edge cases.
  const nisha = await prisma.lead.findUniqueOrThrow({ where: { code: "ENQ-005" } });
  const packageRows = await prisma.package.findMany({ where: { name: { in: ["Classic", "Grand", "Royal", "Custom"] } } });
  const packageByName = new Map(packageRows.map((pkg) => [pkg.name, pkg]));

  const bookingRows = [
    { code: "JB-001", leadId: nisha.id, clientName: "Nisha Gupta", phone: "9876500005", city: "Patna", venue: "Royal Garden", offset: 2, packageName: "Royal", basePrice: 28000, travelCharge: 2000, discount: 1000, status: BookingStatus.CONFIRMED, type: BookingType.PAID, payOnEvent: false },
    { code: "JB-002", leadId: null, clientName: "Acme Demo Co.", phone: "9876500010", city: "Delhi NCR", venue: "Expo Centre", offset: 5, packageName: "Grand", basePrice: 20000, travelCharge: 3000, discount: 0, status: BookingStatus.OPTION, type: BookingType.B2B, payOnEvent: false },
    { code: "JB-003", leadId: null, clientName: "Sample University", phone: "9876500011", city: "Patna", venue: "Campus Hall", offset: -3, packageName: "Classic", basePrice: 12000, travelCharge: 0, discount: 2000, status: BookingStatus.COMPLETED, type: BookingType.COLLAB, payOnEvent: false },
    { code: "JB-004", leadId: null, clientName: "Devika Rao", phone: "9876500012", city: "Delhi NCR", venue: "Green Hotel", offset: 7, packageName: "Royal", basePrice: 30000, travelCharge: 2500, discount: 0, status: BookingStatus.CONFIRMED, type: BookingType.PAID, payOnEvent: false },
    { code: "JB-005", leadId: null, clientName: "Mira Collective", phone: "9876500025", city: "Gaya", venue: "Riverside Lawn", offset: 1, packageName: "Grand", basePrice: 18000, travelCharge: 1000, discount: 0, status: BookingStatus.CONFIRMED, type: BookingType.PAID, payOnEvent: false },
    { code: "JB-006", leadId: null, clientName: "Bodh Gaya Retreat", phone: "9876500010", city: "Bodh Gaya", venue: "Lotus Convention", offset: 6, packageName: "Royal", basePrice: 28000, travelCharge: 2000, discount: 0, status: BookingStatus.IN_PROGRESS, type: BookingType.PAID, payOnEvent: false },
    { code: "JB-007", leadId: null, clientName: "Greenfield School", phone: "9876500026", city: "Patna", venue: "School Auditorium", offset: 12, packageName: "Classic", basePrice: 14000, travelCharge: 0, discount: 1000, status: BookingStatus.POSTPONED, type: BookingType.COLLAB, payOnEvent: true },
    { code: "JB-008", leadId: null, clientName: "Aurora Events", phone: "9876500027", city: "Delhi NCR", venue: "Palm Hall", offset: 4, packageName: "Custom", basePrice: 22000, travelCharge: 3000, discount: 0, status: BookingStatus.CONFIRMED, type: BookingType.B2B, payOnEvent: false },
    { code: "JB-009", leadId: null, clientName: "Roshni Kapoor", phone: "9876500028", city: "Gaya", venue: "Heritage Hall", offset: -12, packageName: "Classic", basePrice: 16000, travelCharge: 500, discount: 500, status: BookingStatus.COMPLETED, type: BookingType.PAID, payOnEvent: false },
    { code: "JB-010", leadId: null, clientName: "City Sports Club", phone: "9876500029", city: "Patna", venue: "Club Arena", offset: -5, packageName: "Grand", basePrice: 20000, travelCharge: 1000, discount: 0, status: BookingStatus.COMPLETED, type: BookingType.PAID, payOnEvent: false },
    { code: "JB-011", leadId: null, clientName: "Lakeview Banquet", phone: "9876500030", city: "Bodh Gaya", venue: "Lakeview", offset: 3, packageName: "Royal", basePrice: 26000, travelCharge: 2500, discount: 500, status: BookingStatus.CONFIRMED, type: BookingType.PAID, payOnEvent: false },
    { code: "JB-012", leadId: null, clientName: "Northline Expo", phone: "9876500031", city: "Delhi NCR", venue: "North Expo", offset: 9, packageName: "Grand", basePrice: 21000, travelCharge: 4000, discount: 1000, status: BookingStatus.CANCELLED, type: BookingType.B2B, payOnEvent: false },
    { code: "JB-013", leadId: null, clientName: "Ishan Malhotra", phone: "9876500032", city: "Patna", venue: "Starlight Hall", offset: 0, packageName: "Classic", basePrice: 16000, travelCharge: 0, discount: 0, status: BookingStatus.CONFIRMED, type: BookingType.PAID, payOnEvent: true },
    { code: "JB-014", leadId: null, clientName: "Saanvi Foundation", phone: "9876500033", city: "Gaya", venue: "Foundation Campus", offset: 15, packageName: "Custom", basePrice: 19500, travelCharge: 1500, discount: 0, status: BookingStatus.CONFIRMED, type: BookingType.COLLAB, payOnEvent: false },
    { code: "JB-015", leadId: null, clientName: "Veda Weddings", phone: "9876500034", city: "Delhi NCR", venue: "Veda Palace", offset: -20, packageName: "Royal", basePrice: 28000, travelCharge: 2500, discount: 0, status: BookingStatus.CANCELLED, type: BookingType.PAID, payOnEvent: false },
  ] as const;

  const bookings = [];
  for (const row of bookingRows) {
    const pkg = packageByName.get(row.packageName);
    bookings.push(await prisma.booking.upsert({
      where: { code: row.code },
      update: {
        leadId: row.leadId,
        clientName: row.clientName,
        phone: row.phone,
        city: row.city,
        venue: row.venue,
        eventDate: day(row.offset),
        startTime: "18:00",
        endTime: "22:00",
        packageId: pkg?.id ?? null,
        packageName: row.packageName,
        basePrice: row.basePrice,
        travelCharge: row.travelCharge,
        discount: row.discount,
        status: row.status,
        type: row.type,
        payOnEvent: row.payOnEvent,
        dayContact: "Seed day contact",
      },
      create: {
        code: row.code,
        leadId: row.leadId,
        clientName: row.clientName,
        phone: row.phone,
        city: row.city,
        venue: row.venue,
        eventDate: day(row.offset),
        startTime: "18:00",
        endTime: "22:00",
        packageId: pkg?.id ?? null,
        packageName: row.packageName,
        basePrice: row.basePrice,
        travelCharge: row.travelCharge,
        discount: row.discount,
        status: row.status,
        type: row.type,
        payOnEvent: row.payOnEvent,
        dayContact: "Seed day contact",
      },
    }));
  }

  await prisma.booking.update({ where: { code: "JB-003" }, data: { printSize: PrintSize.TWO_BY_SIX, printsUsed: 220 } });
  await prisma.booking.update({ where: { code: "JB-009" }, data: { printSize: PrintSize.FOUR_BY_SIX, printsUsed: 180 } });
  await prisma.booking.update({ where: { code: "JB-010" }, data: { printSize: PrintSize.TWO_BY_SIX, printsUsed: 120 } });

  await prisma.payment.deleteMany({
    where: {
      reference: null,
      OR: [
        { bookingId: bookings[0].id, amount: 10000, kind: PaymentKind.ADVANCE },
        { bookingId: bookings[0].id, amount: 16000, kind: PaymentKind.FINAL },
        { bookingId: bookings[2].id, amount: 10000, kind: PaymentKind.ADVANCE },
        { bookingId: bookings[2].id, amount: 1000, kind: PaymentKind.REFUND },
      ],
    },
  });

  const paymentRefs = [
    { booking: 0, reference: "SEED-JB001-ADVANCE", amount: 8000, kind: PaymentKind.ADVANCE, mode: PaymentMode.UPI },
    { booking: 1, reference: "SEED-JB002-NO-PAYMENT", amount: 0, kind: PaymentKind.ADVANCE, mode: PaymentMode.UPI },
    { booking: 2, reference: "SEED-JB003-FULL", amount: 10000, kind: PaymentKind.FINAL, mode: PaymentMode.BANK },
    { booking: 3, reference: "SEED-JB004-OVERPAID", amount: 35000, kind: PaymentKind.FINAL, mode: PaymentMode.UPI },
    { booking: 4, reference: "SEED-JB005-UNDERPAID", amount: 7000, kind: PaymentKind.ADVANCE, mode: PaymentMode.CASH },
    { booking: 5, reference: "SEED-JB006-FULL", amount: 30000, kind: PaymentKind.FINAL, mode: PaymentMode.BANK },
    { booking: 7, reference: "SEED-JB008-VOIDED", amount: 5000, kind: PaymentKind.PART, mode: PaymentMode.CASH },
    { booking: 8, reference: "SEED-JB009-FULL", amount: 16000, kind: PaymentKind.FINAL, mode: PaymentMode.UPI },
    { booking: 9, reference: "SEED-JB010-PART", amount: 12000, kind: PaymentKind.PART, mode: PaymentMode.BANK },
    { booking: 10, reference: "SEED-JB011-ADVANCE", amount: 9000, kind: PaymentKind.ADVANCE, mode: PaymentMode.UPI },
    { booking: 11, reference: "SEED-JB012-REFUND", amount: 6000, kind: PaymentKind.REFUND, mode: PaymentMode.UPI },
    { booking: 12, reference: "SEED-JB013-PAY-ON-EVENT", amount: 0, kind: PaymentKind.FINAL, mode: PaymentMode.CASH },
    { booking: 13, reference: "SEED-JB014-PART", amount: 5000, kind: PaymentKind.PART, mode: PaymentMode.CHEQUE },
  ] as const;

  for (const ref of paymentRefs) {
    if (ref.amount <= 0) continue;
    const existing = await prisma.payment.findFirst({ where: { reference: ref.reference } });
    if (!existing) {
      await prisma.payment.create({
        data: {
          bookingId: bookings[ref.booking].id,
          amount: ref.amount,
          kind: ref.kind,
          mode: ref.mode,
          paidOn: day(-2),
          receivedBy: "Demo Partner",
          reference: ref.reference,
        },
      });
    }
  }

  const voided = await prisma.payment.findFirst({ where: { reference: "SEED-JB008-VOIDED" } });
  if (voided && !voided.voidedAt) {
    await prisma.payment.update({
      where: { id: voided.id },
      data: {
        voidedAt: new Date(),
        voidReason: "Seeded duplicate entry for voided-payment verification",
      },
    });
  }

  const expenseDefs: Array<{ bookingId: string | null; category: ExpenseCategory; amount: number; offset: number; paidBy: string; note: string }> = [];
  const fullCostBookingIndexes = [0, 8, 9];
  for (const bookingIndex of fullCostBookingIndexes) {
    for (const [category, amount] of [
      [ExpenseCategory.OPERATOR_FEE, 1500],
      [ExpenseCategory.TRANSPORT, 2500],
      [ExpenseCategory.FOOD, 800],
      [ExpenseCategory.VENUE_CUT, 575],
      [ExpenseCategory.CONSUMABLES, 1000],
    ] as const) {
      expenseDefs.push({
        bookingId: bookings[bookingIndex].id,
        category,
        amount,
        offset: -(bookingIndex + 3),
        paidBy: "Demo Partner",
        note: `SEED-FULL-COST-${bookingIndex + 1}-${category}`,
      });
    }
  }
  const generalCategories = [
    ExpenseCategory.CARPENTRY, ExpenseCategory.EMI, ExpenseCategory.EQUIPMENT,
    ExpenseCategory.SOFTWARE, ExpenseCategory.MARKETING, ExpenseCategory.ADMIN,
    ExpenseCategory.OTHER, ExpenseCategory.TRANSPORT, ExpenseCategory.FOOD,
  ] as const;
  for (let index = 0; index < 25; index++) {
    const category = generalCategories[index % generalCategories.length];
    expenseDefs.push({
      bookingId: index % 7 === 0 ? bookings[index % bookings.length].id : null,
      category,
      amount: 350 + ((index * 137) % 4200),
      offset: -(index * 3),
      paidBy: index % 2 === 0 ? "Demo Partner" : "Seed Operator",
      note: `SEED-GENERAL-${index + 1}-${category}`,
    });
  }
  expenseDefs.push({
    bookingId: null,
    category: ExpenseCategory.ADMIN,
    amount: 250,
    offset: 0,
    paidBy: "Demo Partner",
    note: "SEED-MONTH-END-19UTC",
  });
  for (let index = 0; index < expenseDefs.length; index++) {
    const def = expenseDefs[index];
    const spentOn = def.note === "SEED-MONTH-END-19UTC"
      ? new Date("2026-11-30T19:00:00Z")
      : day(def.offset);
    if (!(await prisma.expense.findFirst({ where: { note: def.note } }))) {
      await prisma.expense.create({
        data: {
          bookingId: def.bookingId,
          category: def.category,
          amount: def.amount,
          spentOn,
          paidBy: def.paidBy,
          note: def.note,
          voidedAt: index === 3 || index === 16 ? new Date() : null,
          voidReason: index === 3 || index === 16 ? "Seeded void for verification" : null,
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
