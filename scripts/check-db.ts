import 'dotenv/config';
import { db } from '../src/lib/db';

async function checkDb() {
  const bookingsCount = await db.booking.count();
  const leadsCount = await db.lead.count();
  const expensesCount = await db.expense.count();
  const capitalCount = await db.capitalEntry.count();

  console.log(`Current DB counts: Bookings=${bookingsCount}, Leads=${leadsCount}, Expenses=${expensesCount}, Capital=${capitalCount}`);

  const bookingsByStatus = await db.booking.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('Bookings by operational status:', bookingsByStatus);

  const bookingsByPayment = await db.booking.groupBy({
    by: ['sheetPaymentStatus'],
    _count: true
  });
  console.log('Bookings by payment status:', bookingsByPayment);

  const leadsByStatus = await db.lead.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('Leads by status:', leadsByStatus);

  const expensesByCategory = await db.expense.groupBy({
    by: ['category'],
    _count: true,
    _sum: { amount: true }
  });
  console.log('Expenses by category:', expensesByCategory);

  const capital = await db.capitalEntry.findMany();
  console.log('Capital entries:', capital);
}

checkDb().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
