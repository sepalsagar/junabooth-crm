import 'dotenv/config';
import { db } from '../src/lib/db';

async function main() {
  const users = await db.user.findMany({
    where: { role: 'PARTNER' },
    select: { id: true, name: true }
  });
  const entries = await db.capitalEntry.findMany({
    where: { voidedAt: null },
    select: { partnerId: true, kind: true, amount: true }
  });

  const totals: Record<string, { injected: number; withdrawn: number }> = {};
  for (const u of users) {
    totals[u.id] = { injected: 0, withdrawn: 0 };
  }

  for (const e of entries) {
    if (!totals[e.partnerId]) totals[e.partnerId] = { injected: 0, withdrawn: 0 };
    if (e.kind === 'INJECTED') totals[e.partnerId].injected += e.amount;
    else totals[e.partnerId].withdrawn += e.amount;
  }

  const netTotal = Object.values(totals).reduce((sum, t) => sum + (t.injected - t.withdrawn), 0);

  console.log('=== PARTNER CAPITAL LEDGER VERIFICATION ===');
  for (const u of users) {
    const t = totals[u.id];
    const net = t.injected - t.withdrawn;
    const share = netTotal > 0 ? ((net / netTotal) * 100).toFixed(2) : '0';
    console.log(
      `${u.name.padEnd(10)} | Injected: ₹${t.injected.toLocaleString('en-IN').padStart(8)} | Withdrawn: ₹${t.withdrawn.toLocaleString('en-IN').padStart(8)} | Net: ₹${net.toLocaleString('en-IN').padStart(8)} | Share: ${share}%`
    );
  }
  console.log(`TOTAL NET CAPITAL POOL: ₹${netTotal.toLocaleString('en-IN')}`);
}

main().then(() => process.exit(0)).catch(console.error);
