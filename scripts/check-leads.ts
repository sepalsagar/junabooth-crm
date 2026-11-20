import ExcelJS from 'exceljs';

async function checkLeads() {
  const filePath = 'C:/Users/ASUS/.gemini/antigravity/brain/2ee30fdb-4e2a-49ef-8c44-a7597622a35c/.user_uploaded/media_1795208777365_55f79d29.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const leads = wb.getWorksheet('Leads & CRM');
  console.log('--- All Leads & CRM Rows ---');
  leads?.eachRow((row, r) => {
    if (r >= 2) {
      console.log(`Row ${r}:`, JSON.stringify((row.values as any[]).slice(1, 12)));
    }
  });
}

checkLeads().catch(console.error);
