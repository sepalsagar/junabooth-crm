import ExcelJS from 'exceljs';

async function inspectFull() {
  const filePath = 'C:/Users/ASUS/.gemini/antigravity/brain/2ee30fdb-4e2a-49ef-8c44-a7597622a35c/.user_uploaded/media_1795208777365_55f79d29.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  console.log('=== WORKBOOK ANALYSIS ===');
  
  // 1. Master Bookings
  const mb = wb.getWorksheet('Master Bookings');
  if (mb) {
    const rows: any[] = [];
    mb.eachRow((row, r) => {
      if (r >= 2) {
        const v = row.values as any[];
        if (v[1]) { // Booking ID exists
          rows.push({
            r,
            bookingId: v[1],
            leadId: v[2],
            region: v[3],
            clientName: v[4],
            eventDate: v[5],
            venue: v[6],
            timings: v[7],
            offeredPrice: v[8],
            advance: v[9],
            balanceDue: v[10],
            finalPaymentRecd: v[11],
            paymentStatus: v[12],
            operationalStatus: v[13],
            notes: v[14]
          });
        }
      }
    });
    console.log(`Master Bookings: ${rows.length - 1} data rows (Header: row 2, first: row 3, last: row ${rows[rows.length - 1]?.r})`);
    console.log('Sample first row:', rows[1]);
    console.log('Sample last row:', rows[rows.length - 1]);
    
    // Status counts
    const opStatuses: Record<string, number> = {};
    const payStatuses: Record<string, number> = {};
    rows.slice(1).forEach(r => {
      opStatuses[r.operationalStatus] = (opStatuses[r.operationalStatus] || 0) + 1;
      payStatuses[r.paymentStatus] = (payStatuses[r.paymentStatus] || 0) + 1;
    });
    console.log('Master Bookings operational statuses:', opStatuses);
    console.log('Master Bookings payment statuses:', payStatuses);
  }

  // 2. Leads & CRM
  const leads = wb.getWorksheet('Leads & CRM');
  if (leads) {
    const lrows: any[] = [];
    leads.eachRow((row, r) => {
      if (r >= 2) {
        const v = row.values as any[];
        if (v[1]) {
          lrows.push({
            r,
            leadId: v[1],
            inquiryDate: v[2],
            clientName: v[3],
            whatsApp: v[4],
            region: v[5],
            eventType: v[6],
            targetDate: v[7],
            source: v[8],
            quotedBudget: v[9],
            venueDetails: v[10],
            notes: v[11]
          });
        }
      }
    });
    console.log(`\nLeads & CRM: ${lrows.length - 1} data rows (Header: row 2, first: row 3, last: row ${lrows[lrows.length - 1]?.r})`);
    console.log('Sample first lead:', lrows[1]);
    console.log('Sample last lead:', lrows[lrows.length - 1]);
  }

  // 3. Upcoming Events
  const upcoming = wb.getWorksheet('Upcoming Events');
  if (upcoming) {
    const urows: any[] = [];
    upcoming.eachRow((row, r) => {
      if (r >= 4) {
        const v = row.values as any[];
        if (v[2]) {
          urows.push({
            sn: v[1],
            bookingId: v[2],
            dateOrRegion: v[3],
            client: v[4],
            regionOrDate: v[5],
            venue: v[6],
            timings: v[7],
            fee: v[8],
            advance: v[9],
            balance: v[10],
            collectionNote: v[11]
          });
        }
      }
    });
    console.log(`\nUpcoming Events: ${urows.length} rows`);
    console.log('Upcoming row 3 totals:', upcoming.getRow(3).values);
  }

  // 4. Expenditures & Accounts
  const exp = wb.getWorksheet('Expenditures & Accounts');
  if (exp) {
    console.log('\nExpenditures & Accounts:');
    console.log('Row 3 headers:', (exp.getRow(3).values as any[]).slice(1, 16));
    console.log('Row 4 totals:', (exp.getRow(4).values as any[]).slice(1, 16));
    console.log('Row 5 column headers:', (exp.getRow(5).values as any[]).slice(1, 16));
  }

  // 5. Dashboard
  const dash = wb.getWorksheet('Dashboard');
  if (dash) {
    console.log('\nDashboard:');
    console.log('Row 4 labels:', (dash.getRow(4).values as any[]).slice(1, 9));
    console.log('Row 5 values:', (dash.getRow(5).values as any[]).slice(1, 9));
    console.log('Partner Capital Summary:');
    for (let r = 8; r <= 13; r++) {
      console.log(`Row ${r}:`, (dash.getRow(r).values as any[]).slice(1, 9));
    }
  }
}

inspectFull().catch(console.error);
