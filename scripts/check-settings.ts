import ExcelJS from 'exceljs';

async function checkSettings() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/ASUS/.gemini/antigravity/brain/2ee30fdb-4e2a-49ef-8c44-a7597622a35c/.user_uploaded/media_1795208777365_55f79d29.xlsx');
  const s = wb.getWorksheet('del - Settings');
  console.log('Settings Sheet rows:');
  s?.eachRow((row, r) => {
    console.log(`Row ${r}:`, row.values);
  });
}

checkSettings().catch(console.error);
