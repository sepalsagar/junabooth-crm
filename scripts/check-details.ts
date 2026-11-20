import ExcelJS from 'exceljs';

async function detailedCheck() {
  const filePath = 'C:/Users/ASUS/.gemini/antigravity/brain/2ee30fdb-4e2a-49ef-8c44-a7597622a35c/.user_uploaded/media_1795208777365_55f79d29.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const mb = wb.getWorksheet('Master Bookings');
  console.log('--- Master Bookings Rows ---');
  const bIds: string[] = [];
  mb?.eachRow((row, r) => {
    if (r >= 3) {
      const v = row.values as any[];
      const bId = v[1];
      const leadId = v[2];
      const client = v[4];
      const opStatus = v[13];
      const payStatus = v[12];
      if (bId) {
        bIds.push(bId);
        if (!opStatus || !payStatus || opStatus === 'Cancelled' || !leadId) {
          console.log(`Row ${r}: bId=${bId}, leadId=${leadId}, client=${client}, op=${opStatus}, pay=${payStatus}`);
        }
      }
    }
  });
  console.log(`Total Master Bookings rows with Booking ID: ${bIds.length}`);
  console.log('Booking IDs:', bIds.join(', '));

  console.log('\n--- Leads & CRM Rows ---');
  const leads = wb.getWorksheet('Leads & CRM');
  const leadRows: any[] = [];
  leads?.eachRow((row, r) => {
    if (r >= 3) {
      const v = row.values as any[];
      const leadId = v[1];
      const client = v[3];
      const status = v[11];
      if (leadId && client) {
        leadRows.push({ r, leadId, client, status });
      }
    }
  });
  console.log(`Total valid Leads rows: ${leadRows.length}`);
  console.log('Leads:', leadRows.map(l => `${l.leadId}: ${l.client}`).join('; '));
}

detailedCheck().catch(console.error);
