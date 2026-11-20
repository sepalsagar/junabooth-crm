import 'dotenv/config';
import { db } from '../src/lib/db';

async function cleanupUsers() {
  const users = await db.user.findMany({
    include: {
      capitalEntries: true,
      ownedLeads: true,
      auditLogs: true
    }
  });

  console.log('Existing users:');
  for (const u of users) {
    const isReal = ['Aman', 'Gaurav', 'Ujjwal', 'Mayank'].includes(u.name);
    console.log(`${u.id}: ${u.name} (${u.role}, disabled: ${u.disabled}) - capital: ${u.capitalEntries.length}, leads: ${u.ownedLeads.length}`);
    if (!isReal && u.capitalEntries.length === 0 && u.ownedLeads.length === 0) {
      await db.user.delete({ where: { id: u.id } });
      console.log(`Deleted demo user: ${u.name} (${u.id})`);
    } else if (!isReal) {
      await db.user.update({
        where: { id: u.id },
        data: { disabled: true, role: 'OPERATOR' }
      });
      console.log(`Disabled non-partner user: ${u.name}`);
    }
  }
}

cleanupUsers().then(() => process.exit(0)).catch(console.error);
