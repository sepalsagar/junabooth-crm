import ExcelJS from 'exceljs';

async function checkRows() {
  const filePath = 'C:/Users/ASUS/.gemini/antigravity/brain/2ee30fdb-4e2a-49ef-8c44-a7597622a35c/.user_uploaded/media_1795213166052_401218a2.png';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('C:/Users/ASUS/.gemini/antigravity/brain/2ee30fdb-4e2a-49ef-8c44-a7597622a35c/.user_uploaded/media_1795208777365_55f79d29.xlsx');
  const mb = wb.getWorksheet('Master Bookings');
  mb?.eachRow((row, r) => {
    if (r >= 3) {
      const v = row.values as any[];
      const bId = v[1];
      const region = v[3];
      const client = v[4];
      if (['JB-020', 'JB-021', 'JB-023', 'JB-024'].includes(bId)) {
        console.log(`Row ${r}: ${bId} | Region: "${region}" | Client: "${client}"`);
      }
    }
  });
}

checkRows().catch(console.error);
