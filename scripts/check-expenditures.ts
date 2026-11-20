import ExcelJS from 'exceljs';

async function checkExpenditures() {
  const filePath = 'C:/Users/ASUS/.gemini/antigravity/brain/2ee30fdb-4e2a-49ef-8c44-a7597622a35c/.user_uploaded/media_1795208777365_55f79d29.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const ws = wb.getWorksheet('Expenditures & Accounts');
  if (!ws) return;

  console.log('Row 3 headers:', ws.getRow(3).values);
  console.log('Row 4 totals:', ws.getRow(4).values);
  console.log('Row 5 columns:', ws.getRow(5).values);

  const junaboothExp: any[] = [];
  const eventExp: any[] = [];
  const revenue: any[] = [];
  const withdrawals: any[] = [];

  for (let r = 6; r <= 97; r++) {
    const row = ws.getRow(r);
    const v = row.values as any[];
    // Junabooth Exp: col B (Date), col C (Amount), col D (Remarks)
    if (v[2] !== undefined || v[3] !== undefined || v[4] !== undefined) {
      if (v[3] !== undefined && v[3] !== null && v[3] !== '') {
        junaboothExp.push({ r, date: v[2], amount: v[3], remarks: v[4] });
      }
    }
    // Event Day Exp: col F (Date), col G (Amount), col H (Remarks)
    if (v[6] !== undefined || v[7] !== undefined || v[8] !== undefined) {
      if (v[7] !== undefined && v[7] !== null && v[7] !== '') {
        eventExp.push({ r, date: v[6], amount: v[7], remarks: v[8] });
      }
    }
    // Revenue: col J (Date), col K (Amount), col L (Remarks)
    if (v[10] !== undefined || v[11] !== undefined || v[12] !== undefined) {
      if (v[11] !== undefined && v[11] !== null && v[11] !== '') {
        revenue.push({ r, date: v[10], amount: v[11], remarks: v[12] });
      }
    }
    // Withdrawals: col N (Date), col O (Amount)
    if (v[14] !== undefined || v[15] !== undefined) {
      if (v[15] !== undefined && v[15] !== null && v[15] !== '') {
        withdrawals.push({ r, date: v[14], amount: v[15] });
      }
    }
  }

  const sumJB = junaboothExp.reduce((s, x) => s + Number(x.amount || 0), 0);
  const sumEvent = eventExp.reduce((s, x) => s + Number(x.amount || 0), 0);
  const sumRev = revenue.reduce((s, x) => s + Number(x.amount || 0), 0);
  const sumW = withdrawals.reduce((s, x) => s + Number(x.amount || 0), 0);

  console.log(`Junabooth Exp count: ${junaboothExp.length}, sum: ${sumJB} (Sheet total: 610436)`);
  console.log(`Event Day Exp count: ${eventExp.length}, sum: ${sumEvent} (Sheet total: 127638)`);
  console.log(`Revenue count: ${revenue.length}, sum: ${sumRev} (Sheet total: 1025340)`);
  console.log(`Withdrawals count: ${withdrawals.length}, sum: ${sumW} (Sheet total: 65000)`);
}

checkExpenditures().catch(console.error);
