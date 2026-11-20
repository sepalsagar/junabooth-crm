import 'dotenv/config';
import { db } from '../src/lib/db';

async function main() {
  const allBookings = await db.booking.findMany({
    select: {
      code: true,
      clientName: true,
      city: true,
      status: true,
      sheetAdvanceReceived: true,
      sheetFinalReceived: true,
      sheetBalanceDue: true,
      basePrice: true,
      travelCharge: true,
      discount: true,
      eventDate: true,
    }
  });

  console.log(`Total bookings: ${allBookings.length}`);

  const rawCityCount: Record<string, any> = {};
  for (const b of allBookings) {
    const c = b.city || 'NO_CITY';
    if (!rawCityCount[c]) rawCityCount[c] = { total: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0, codes: [] };
    rawCityCount[c].total++;
    rawCityCount[c][b.status] = (rawCityCount[c][b.status] || 0) + 1;
    rawCityCount[c].codes.push(b.code);
  }
  console.log('=== Bookings by City in DB ===');
  console.table(rawCityCount);

  let totalAdvance = 0;
  let totalFinal = 0;
  let totalBalanceConfirmed = 0;
  let totalConfirmedPrice = 0;
  let totalAllBookingsPrice = 0;
  let totalAllBookingsBalance = 0;

  for (const b of allBookings) {
    if (b.status === 'CANCELLED') continue;
    totalAdvance += b.sheetAdvanceReceived || 0;
    totalFinal += b.sheetFinalReceived || 0;
    const price = (b.basePrice || 0) + (b.travelCharge || 0) - (b.discount || 0);
    totalAllBookingsPrice += price;
    totalAllBookingsBalance += b.sheetBalanceDue || 0;

    if (b.status === 'CONFIRMED') {
      totalBalanceConfirmed += b.sheetBalanceDue || 0;
      totalConfirmedPrice += price;
    }
  }

  const expensesAgg = await db.expense.aggregate({
    _sum: { amount: true },
    where: { voidedAt: null }
  });

  const capitalEntries = await db.capitalEntry.findMany({
    where: { voidedAt: null }
  });
  let injected = 0;
  let withdrawn = 0;
  for (const c of capitalEntries) {
    if (c.kind === 'INJECTED') injected += c.amount;
    else withdrawn += c.amount;
  }

  console.log('\n=== FINANCIAL TOTALS ===');
  console.log(`Total Price of all non-cancelled Bookings: ₹${totalAllBookingsPrice}`);
  console.log(`Total Advance recorded: ₹${totalAdvance}`);
  console.log(`Total Final Payment recorded: ₹${totalFinal}`);
  console.log(`Total Collections (Advance + Final): ₹${totalAdvance + totalFinal}`);
  console.log(`Upcoming Confirmed Total Price: ₹${totalConfirmedPrice} (Sheet: 471,500)`);
  console.log(`Upcoming Confirmed Balance Due: ₹${totalBalanceConfirmed} (Sheet: 344,200)`);
  console.log(`Total Expenses in DB: ₹${expensesAgg._sum.amount}`);
  console.log(`Capital Injected: ₹${injected}, Withdrawn: ₹${withdrawn}, Net: ₹${injected - withdrawn}`);
}

main().then(() => process.exit(0)).catch(console.error);
