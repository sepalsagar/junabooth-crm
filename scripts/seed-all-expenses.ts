import 'dotenv/config';
import { db } from '../src/lib/db';
import ExcelJS from 'exceljs';
import { parseDate } from './import/clean/date';
import { guessCategory } from './import/clean/maps';

async function importExpenses() {
  const filePath = 'C:/Users/ASUS/.gemini/antigravity/brain/2ee30fdb-4e2a-49ef-8c44-a7597622a35c/.user_uploaded/media_1795208777365_55f79d29.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const ws = wb.getWorksheet('Expenditures & Accounts');
  if (!ws) throw new Error('Sheet "Expenditures & Accounts" not found');

  const expensesToCreate: any[] = [];
  let lastDateJB = new Date('2026-10-10');
  let lastDateEvent = new Date('2026-10-10');

  // Junabooth Exp (cols B, C, D)
  for (let r = 6; r <= 97; r++) {
    const row = ws.getRow(r);
    const v = row.values as any[];
    const rawAmount = v[3];
    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
      const amount = Math.round(Number(String(rawAmount).replace(/[^0-9.-]/g, '')) || 0);
      if (amount > 0) {
        const rawDate = v[2];
        const parsedDate = rawDate ? parseDate(rawDate, 'workbook').value : lastDateJB;
        if (parsedDate) lastDateJB = parsedDate;
        const note = String(v[4] || 'Junabooth Capex/Opex').trim();
        const category = guessCategory(note) ?? 'ADMIN';

        expensesToCreate.push({
          sourceRef: `actual-expense:junabooth-${r}`,
          amount,
          spentOn: parsedDate || lastDateJB,
          category,
          note: `[Junabooth] ${note}`,
        });
      }
    }
  }

  // Event Day Exp (cols F, G, H)
  for (let r = 6; r <= 97; r++) {
    const row = ws.getRow(r);
    const v = row.values as any[];
    const rawAmount = v[7];
    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
      const amount = Math.round(Number(String(rawAmount).replace(/[^0-9.-]/g, '')) || 0);
      if (amount > 0) {
        const rawDate = v[6];
        const parsedDate = rawDate ? parseDate(rawDate, 'workbook').value : lastDateEvent;
        if (parsedDate) lastDateEvent = parsedDate;
        const note = String(v[8] || 'Event Day Expense').trim();
        const category = guessCategory(note) ?? 'TRANSPORT';

        expensesToCreate.push({
          sourceRef: `actual-expense:event-day-${r}`,
          amount,
          spentOn: parsedDate || lastDateEvent,
          category,
          note: `[Event Day] ${note}`,
        });
      }
    }
  }

  console.log(`Total expenses to load: ${expensesToCreate.length}`);
  const jbSum = expensesToCreate
    .filter(e => e.sourceRef.includes('junabooth'))
    .reduce((s, e) => s + e.amount, 0);
  const eventSum = expensesToCreate
    .filter(e => e.sourceRef.includes('event-day'))
    .reduce((s, e) => s + e.amount, 0);

  console.log(`Junabooth expenses sum: ₹${jbSum} (target: 610436)`);
  console.log(`Event Day expenses sum: ₹${eventSum} (target: 127638)`);
  console.log(`Total expenses sum: ₹${jbSum + eventSum} (target: 738074)`);

  // Clear existing expenses and insert full exact set
  await db.expense.deleteMany({});
  for (const exp of expensesToCreate) {
    await db.expense.create({
      data: {
        sourceRef: exp.sourceRef,
        amount: exp.amount,
        spentOn: exp.spentOn,
        category: exp.category,
        note: exp.note,
      }
    });
  }
  console.log(`Successfully inserted ${expensesToCreate.length} expenses into database!`);
}

importExpenses().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
