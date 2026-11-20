import 'dotenv/config';
import { db } from '../src/lib/db';

async function listLeads() {
  const leads = await db.lead.findMany({
    orderBy: { code: 'asc' },
    select: {
      id: true,
      code: true,
      clientName: true,
      phone: true,
      city: true,
      status: true,
      quotedAmount: true,
      notes: true,
      booking: {
        select: { id: true, clientName: true }
      }
    }
  });

  console.log(`Found ${leads.length} leads in DB:`);
  for (const l of leads) {
    const b = l.booking ? `${l.booking.id}: ${l.booking.clientName}` : 'None';
    console.log(`${l.code.padEnd(8)} | ${l.status.padEnd(10)} | ${(l.clientName || '').padEnd(25)} | Booking: [${b}] | Notes: ${l.notes || ''}`);
  }
}

listLeads().then(() => process.exit(0)).catch(console.error);
