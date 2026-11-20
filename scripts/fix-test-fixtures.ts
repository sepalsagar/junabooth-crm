import 'dotenv/config';
import { db } from '../src/lib/db';

async function main() {
  // 1. Ensure at least one voided capital entry exists for testing exclusion
  const aman = await db.user.findFirst({ where: { name: 'Aman' } });
  if (aman) {
    const existingVoided = await db.capitalEntry.findFirst({ where: { voidedAt: { not: null } } });
    if (!existingVoided) {
      await db.capitalEntry.create({
        data: {
          partnerId: aman.id,
          kind: 'INJECTED',
          amount: 10000,
          date: new Date('2026-06-01'),
          mode: 'BANK',
          note: 'Erroneous duplicate entry',
          voidedAt: new Date('2026-06-02'),
          voidReason: 'Mistaken duplicate entry voided by admin',
        }
      });
      console.log('Created voided capital entry for verification.');
    }
  }

  // 2. Set unit: 'UNIT_1' for JB-011 and JB-020 for calendar clash verification
  await db.booking.updateMany({
    where: { code: { in: ['JB-011', 'JB-020'] } },
    data: { unit: 'UNIT_1' }
  });
  console.log('Set unit: UNIT_1 on JB-011 and JB-020 for calendar clash verification.');
}

main().then(() => process.exit(0)).catch(console.error);
