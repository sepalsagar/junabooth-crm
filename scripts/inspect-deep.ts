import ExcelJS from 'exceljs';

async function main() {
  const filePath = 'C:/Users/ASUS/.gemini/antigravity/brain/2ee30fdb-4e2a-49ef-8c44-a7597622a35c/.user_uploaded/media_1795208777365_55f79d29.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const mb = wb.getWorksheet('Master Bookings');
  console.log('--- Master Bookings Rows 33-38 ---');
  for (let r = 33; r <= 38; r++) {
    console.log(`Row ${r}:`, (mb?.getRow(r).values as any[])?.slice(1, 15));
  }

  const ce = wb.getWorksheet('Completed Events');
  console.log('\n--- Completed Events ---');
  let ceCount = 0;
  ce?.eachRow((row, r) => {
    if (r >= 3 && (row.values as any[])[2]) {
      ceCount++;
      if (ceCount <= 5 || ceCount >= 40) {
        console.log(`CE Row ${r}:`, (row.values as any[]).slice(1, 12));
      }
    }
  });
  console.log(`Total Completed Events rows: ${ceCount}`);

  const pl = wb.getWorksheet('del - Partner Ledger');
  console.log('\n--- Partner Ledger ---');
  pl?.eachRow((row, r) => {
    if (r >= 2 && r <= 20) {
      console.log(`PL Row ${r}:`, (row.values as any[]).slice(1, 10));
    }
  });
}

main().catch(console.error);
