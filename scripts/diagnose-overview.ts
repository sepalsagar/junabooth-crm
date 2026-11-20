import 'dotenv/config';
import { db } from '../src/lib/db';
import { getBalanceToCollect, getReceivedToDate, getBookedThisMonth, getCashInputs, getCashPosition, getEventsByCity } from '../src/features/metrics/queries';

async function main() {
  console.log('=== 1. EVENTS BY CITY ===');
  const cityData = await getEventsByCity();
  console.log(cityData);

  const allBookings = await db.booking.findMany({
    select: { code: true, clientName: true, city: true, status: true, sheetAdvanceReceived: true, sheetFinalReceived: true, sheetBalanceDue: true, basePrice: true }
  });

  const rawCityCount: Record<string, any> = {};
  for (const b of allBookings) {
    const c = b.city || 'NO_CITY';
    if (!rawCityCount[c]) rawCityCount[c] = { total: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0, codes: [] };
    rawCityCount[c].total++;
    rawCityCount[c][b.status] = (rawCityCount[c][b.status] || 0) + 1;
    rawCityCount[c].codes.push(b.code);
  }
  console.log('Raw Bookings by City:', rawCityCount);

  console.log('\n=== 2. FINANCIAL METRICS ===');
  const bal = await getBalanceToCollect();
  const rec = await getReceivedToDate();
  const booked = await getBookedThisMonth();
  const cashIn = await getCashInputs();
  const cashPos = await getCashPosition();

  console.log({
    balanceToCollect: bal,
    receivedToDate: rec,
    bookedThisMonth: booked,
    cashInputs: cashIn,
    cashPosition: cashPos,
  });

  // Calculate actual workbook sums:
  let totalAdvance = 0;
  let totalFinal = 0;
  let totalBalanceConfirmed = 0;
  let totalConfirmedPrice = 0;
  for (const b of allBookings) {
    totalAdvance += b.sheetAdvanceReceived || 0;
    totalFinal += b.sheetFinalReceived || 0;
    if (b.status === 'CONFIRMED') {
      totalBalanceConfirmed += b.sheetBalanceDue || 0;
      totalConfirmedPrice += b.basePrice || 0;
    }
  }

  console.log('\n=== 3. SPREADSHEET TRUTH VALUES ===');
  console.log(`Total Advance recorded on Bookings: ₹${totalAdvance}`);
  console.log(`Total Final recorded on Bookings: ₹${totalFinal}`);
  console.log(`Total Combined Collections on Bookings: ₹${totalAdvance + totalFinal}`);
  console.log(`Upcoming Confirmed Total Price: ₹${totalConfirmedPrice} (Sheet header: 471,500)`);
  console.log(`Upcoming Confirmed Balance Due: ₹${totalBalanceConfirmed} (Sheet header: 344,200)`);
}

main().then(() => process.exit(0)).catch(console.error);
