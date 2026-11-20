import 'dotenv/config';
import { db } from '../src/lib/db';

async function main() {
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      disabled: true,
      accounts: {
        select: { id: true, providerId: true }
      },
      capitalEntries: {
        select: { id: true, amount: true, kind: true }
      }
    }
  });

  console.log(`Found ${users.length} users in DB:`);
  for (const u of users) {
    const accs = u.accounts.map(a => a.providerId).join(', ') || 'No accounts';
    console.log(`User: ${u.name} | ${u.email} | Role: ${u.role} | Disabled: ${u.disabled} | Accounts: [${accs}] | Capital entries: ${u.capitalEntries.length}`);
  }
}

main().then(() => process.exit(0)).catch(console.error);
