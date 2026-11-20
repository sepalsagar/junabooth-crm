import 'dotenv/config';
import { db } from '../src/lib/db';

async function main() {
  const seedUsers = await db.user.findMany({
    where: {
      email: {
        in: [
          'sagarkrsepal@gmail.com',
          'gauravkumar4799@gmail.com',
          'abc12@gmail.com',
          'abc@gmail.com'
        ]
      }
    }
  });

  console.log(`Found ${seedUsers.length} seed users with credentials:`);
  for (const u of seedUsers) {
    console.log(`- ${u.id}: ${u.name} (${u.email})`);
  }

  const userByEmail: Record<string, string> = {};
  for (const u of seedUsers) {
    userByEmail[u.email] = u.id;
  }

  const p1 = userByEmail['sagarkrsepal@gmail.com'];
  const p2 = userByEmail['gauravkumar4799@gmail.com'];
  const p3 = userByEmail['abc12@gmail.com'];
  const p4 = userByEmail['abc@gmail.com'];

  // Update names to match the Partners in the sheet while keeping emails and credentials intact
  await db.user.update({ where: { id: p1 }, data: { name: 'Aman' } });
  await db.user.update({ where: { id: p2 }, data: { name: 'Gaurav' } });
  await db.user.update({ where: { id: p3 }, data: { name: 'Ujjwal' } });
  await db.user.update({ where: { id: p4 }, data: { name: 'Mayank' } });
  console.log('Updated user names to match Partners (Aman, Gaurav, Ujjwal, Mayank).');

  // Re-seed capital entries directly on these 4 user IDs
  await db.capitalEntry.deleteMany({});
  console.log('Cleared old capital entries.');

  const plEntries = [
    // Aman: Injected 200,000, Withdrawn 50,000 + 35,000
    { partnerId: p1, kind: 'INJECTED' as const, amount: 200000, date: new Date('2026-05-01'), mode: 'BANK' as const, note: 'Initial equity pool' },
    { partnerId: p1, kind: 'WITHDRAWN' as const, amount: 50000, date: new Date('2026-07-01'), mode: 'BANK' as const, note: 'Cash Withdrawal - Debited to Aman' },
    { partnerId: p1, kind: 'WITHDRAWN' as const, amount: 35000, date: new Date('2026-11-19'), mode: 'BANK' as const, note: 'Partner Withdrawal - Aman' },
    // Gaurav: Injected 74,440 + 10,000 + 5,560 = 90,000
    { partnerId: p2, kind: 'INJECTED' as const, amount: 74440, date: new Date('2026-05-10'), mode: 'UPI' as const, note: 'Phase 1 Cumulative Investment (25k+6k+3440+10k+30k)' },
    { partnerId: p2, kind: 'INJECTED' as const, amount: 10000, date: new Date('2026-06-15'), mode: 'UPI' as const, note: 'Additional Capital Injection' },
    { partnerId: p2, kind: 'INJECTED' as const, amount: 5560, date: new Date('2026-06-20'), mode: 'CASH' as const, note: 'Equipment / Material Injection - Tools & materials' },
    // Ujjwal: Injected 30,000 + 20,000 + 400 = 50,400
    { partnerId: p3, kind: 'INJECTED' as const, amount: 30000, date: new Date('2026-05-05'), mode: 'BANK' as const, note: 'Cash Investment Batch 1' },
    { partnerId: p3, kind: 'INJECTED' as const, amount: 20000, date: new Date('2026-07-10'), mode: 'BANK' as const, note: 'Cash Investment Batch 2' },
    { partnerId: p3, kind: 'INJECTED' as const, amount: 400, date: new Date('2026-06-17'), mode: 'CASH' as const, note: 'Direct Extension Board Purchase' },
    // Mayank: Injected 45,000
    { partnerId: p4, kind: 'INJECTED' as const, amount: 45000, date: new Date('2026-05-15'), mode: 'BANK' as const, note: 'Capital Injection - Equity contribution' },
    // Voided entry for test verification
    { partnerId: p1, kind: 'INJECTED' as const, amount: 10000, date: new Date('2026-06-01'), mode: 'BANK' as const, note: 'Erroneous duplicate entry', voidedAt: new Date('2026-06-02'), voidReason: 'Mistaken duplicate entry voided by admin' },
  ];

  for (const e of plEntries) {
    await db.capitalEntry.create({ data: e });
  }
  console.log('Re-seeded capital entries on authenticated partner IDs.');

  // Delete the 4 duplicate unauthenticated dummy users (partner_aman, partner_gaurav, partner_ujjwal, partner_mayank)
  await db.user.deleteMany({
    where: {
      id: { in: ['partner_aman', 'partner_gaurav', 'partner_ujjwal', 'partner_mayank'] }
    }
  });
  console.log('Removed duplicate unauthenticated user records.');
}

main().then(() => process.exit(0)).catch(console.error);
