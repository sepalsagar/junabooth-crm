import ExcelJS from 'exceljs';
import path from 'path';

async function main() {
  const filePath = 'C:/Users/ASUS/.gemini/antigravity/brain/2ee30fdb-4e2a-49ef-8c44-a7597622a35c/.user_uploaded/media_1795208777365_55f79d29.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  console.log('Worksheet names:');
  wb.eachSheet((ws, id) => {
    console.log(`\n=== [${id}] Sheet: "${ws.name}" (rows: ${ws.rowCount}, cols: ${ws.columnCount}) ===`);
    let count = 0;
    ws.eachRow((row, rowNumber) => {
      if (count < 8 && row.values && (row.values as any[]).length > 0) {
        const vals = (row.values as any[]).slice(1, 15).map(v => {
          if (v && typeof v === 'object' && 'result' in v) return v.result;
          return v;
        });
        console.log(`Row ${rowNumber}:`, JSON.stringify(vals));
        count++;
      }
    });
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
