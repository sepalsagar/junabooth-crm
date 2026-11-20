import 'dotenv/config';
import { db } from '../src/lib/db';
import ExcelJS from 'exceljs';

async function main() {
  const filePath = 'C:/Users/ASUS/.gemini/antigravity/brain/2ee30fdb-4e2a-49ef-8c44-a7597622a35c/.user_uploaded/media_1795208777365_55f79d29.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  console.log('--- 1. SEEDING / ENSURING PARTNERS ---');
  const partnersData = [
    { name: 'Aman', email: 'aman@junabooth.in' },
    { name: 'Gaurav', email: 'gaurav@junabooth.in' },
    { name: 'Ujjwal', email: 'ujjwal@junabooth.in' },
    { name: 'Mayank', email: 'mayank@junabooth.in' },
  ];

  const partnerUserMap: Record<string, string> = {};
  for (const p of partnersData) {
    let user = await db.user.findFirst({ where: { name: p.name } });
    if (!user) {
      user = await db.user.create({
        data: {
          id: `partner_${p.name.toLowerCase()}`,
          name: p.name,
          email: p.email,
          role: 'PARTNER',
          disabled: false,
        }
      });
      console.log(`Created partner user: ${p.name}`);
    } else {
      await db.user.update({
        where: { id: user.id },
        data: { role: 'PARTNER', disabled: false }
      });
      console.log(`Updated partner user: ${p.name}`);
    }
    partnerUserMap[p.name] = user.id;
  }

  // Delete existing un-voided capital entries and re-seed from Partner Ledger
  await db.capitalEntry.deleteMany({});
  console.log('Cleared existing capital entries.');

  const plEntries = [
    // Aman: Injected 200,000, Withdrawn 50,000 + 35,000
    { partner: 'Aman', kind: 'INJECTED' as const, amount: 200000, date: new Date('2026-05-01'), mode: 'BANK' as const, note: 'Initial equity pool' },
    { partner: 'Aman', kind: 'WITHDRAWN' as const, amount: 50000, date: new Date('2026-07-01'), mode: 'BANK' as const, note: 'Cash Withdrawal - Debited to Aman' },
    { partner: 'Aman', kind: 'WITHDRAWN' as const, amount: 35000, date: new Date('2026-11-19'), mode: 'BANK' as const, note: 'Partner Withdrawal - Aman' },
    // Gaurav: Injected 74,440 + 10,000 + 5,560 = 90,000
    { partner: 'Gaurav', kind: 'INJECTED' as const, amount: 74440, date: new Date('2026-05-10'), mode: 'UPI' as const, note: 'Phase 1 Cumulative Investment (25k+6k+3440+10k+30k)' },
    { partner: 'Gaurav', kind: 'INJECTED' as const, amount: 10000, date: new Date('2026-06-15'), mode: 'UPI' as const, note: 'Additional Capital Injection' },
    { partner: 'Gaurav', kind: 'INJECTED' as const, amount: 5560, date: new Date('2026-06-20'), mode: 'CASH' as const, note: 'Equipment / Material Injection - Tools & materials' },
    // Ujjwal: Injected 30,000 + 20,000 + 400 = 50,400
    { partner: 'Ujjwal', kind: 'INJECTED' as const, amount: 30000, date: new Date('2026-05-05'), mode: 'BANK' as const, note: 'Cash Investment Batch 1' },
    { partner: 'Ujjwal', kind: 'INJECTED' as const, amount: 20000, date: new Date('2026-07-10'), mode: 'BANK' as const, note: 'Cash Investment Batch 2' },
    { partner: 'Ujjwal', kind: 'INJECTED' as const, amount: 400, date: new Date('2026-06-17'), mode: 'CASH' as const, note: 'Direct Extension Board Purchase' },
    // Mayank: Injected 45,000
    { partner: 'Mayank', kind: 'INJECTED' as const, amount: 45000, date: new Date('2026-05-15'), mode: 'BANK' as const, note: 'Capital Injection - Equity contribution' },
  ];

  for (const entry of plEntries) {
    const partnerId = partnerUserMap[entry.partner];
    if (partnerId) {
      await db.capitalEntry.create({
        data: {
          partnerId,
          kind: entry.kind,
          amount: entry.amount,
          date: entry.date,
          mode: entry.mode,
          note: entry.note,
        }
      });
    }
  }
  console.log(`Seeded ${plEntries.length} capital entries matching Partner Ledger.`);

  console.log('\n--- 2. UPDATING LEADS DETAILS AND STATUSES ---');
  // First, map booking client names so leads have correct names
  const mb = wb.getWorksheet('Master Bookings');
  const bookingClientByLeadCode: Record<string, string> = {};
  mb?.eachRow((row, r) => {
    if (r >= 3) {
      const v = row.values as any[];
      const leadId = v[2];
      const client = v[4];
      if (leadId && client) {
        bookingClientByLeadCode[leadId] = client;
      }
    }
  });

  // Explicit status classifications based on sheet notes:
  const lostLeadCodes = ['ENQ-001', 'ENQ-005', 'ENQ-009', 'ENQ-011', 'ENQ-014', 'ENQ-018', 'ENQ-042'];
  const lostReasons: Record<string, string> = {
    'ENQ-001': 'Budget mismatch',
    'ENQ-005': 'Outstation logistics issue',
    'ENQ-009': 'No response',
    'ENQ-011': 'Planner fee cut high',
    'ENQ-014': 'Did not finalize',
    'ENQ-018': 'Cancelled',
    'ENQ-042': 'Opening ceremony cancelled',
  };
  const followUpCodes = ['ENQ-004', 'ENQ-006', 'ENQ-012', 'ENQ-013'];
  const postponedCodes = ['ENQ-010'];
  const newCodes = ['ENQ-003', 'ENQ-026', 'ENQ-028'];

  // Fix known client names for leads
  const specificLeadDetails: Record<string, { clientName: string; city?: string; venue?: string; targetDate?: Date; quotedAmount?: number; source?: any; notes?: string }> = {
    'ENQ-032': {
      clientName: 'Ikonretail',
      city: 'Delhi',
      venue: 'Royal Ballroom, 1st Floor, Eros Hotel, Nehru Place, Delhi',
      targetDate: new Date('2026-10-03'),
      quotedAmount: 18000,
      source: 'META_AD',
      notes: '10:30 AM – 2:30 PM (4 hours) | Adv: 5,400 | Bal: 12,600 after event'
    },
    'ENQ-039': {
      clientName: "Aishwarya ma'am",
      city: 'Delhi',
      venue: 'Delhi NCR (https://maps.app.goo.gl/PWFTS8MMriS1WGmq6?g_st=ic)',
      targetDate: new Date('2026-12-09'),
      quotedAmount: 20000,
      source: 'REFERRAL',
      notes: 'Advance: ₹5,000. Remaining ₹15,000 post-event. Timing: 9:00 PM - 1:00 AM'
    },
    'ENQ-040': {
      clientName: 'Mayank bhaiya',
      city: 'Bodh Gaya',
      venue: 'Marasa Sarovar premiere, Bodh Gaya',
      targetDate: new Date('2027-01-26'),
      quotedAmount: 16000,
      source: 'BNI',
      notes: 'Advance yet to be paid. Remaining: ₹16,000. Timing: 7:30 PM onwards'
    },
    'ENQ-043': {
      clientName: 'Hina (Kairos Events)',
      city: 'Jim Corbett / Uttarakhand',
      venue: 'The Riverview Retreat, Jim Corbett',
      targetDate: new Date('2026-11-24'),
      quotedAmount: 34000,
      source: 'B2B_PARTNER',
      notes: 'Status: Won | 6 hours | Adv: 10,000 | Bal: 24,000 | Contact: Hina Kairos Event (7055914914)'
    }
  };

  const allDbLeads = await db.lead.findMany();
  for (const lead of allDbLeads) {
    let newStatus = lead.status;
    let lostReason = lead.lostReason;

    if (lostLeadCodes.includes(lead.code)) {
      newStatus = 'LOST';
      lostReason = lostReasons[lead.code] || 'Did not convert';
    } else if (followUpCodes.includes(lead.code)) {
      newStatus = 'FOLLOW_UP';
    } else if (postponedCodes.includes(lead.code)) {
      newStatus = 'POSTPONED';
    } else if (newCodes.includes(lead.code)) {
      newStatus = 'NEW';
    } else {
      newStatus = 'WON';
    }

    let clientName = lead.clientName;
    if (specificLeadDetails[lead.code]) {
      clientName = specificLeadDetails[lead.code].clientName;
    } else if ((!clientName || clientName === 'Unspecified') && bookingClientByLeadCode[lead.code]) {
      clientName = bookingClientByLeadCode[lead.code];
    }

    const updates: any = {
      status: newStatus,
      lostReason: newStatus === 'LOST' ? lostReason : null,
      clientName: clientName || lead.clientName,
    };

    if (specificLeadDetails[lead.code]) {
      const s = specificLeadDetails[lead.code];
      if (s.city) updates.city = s.city;
      if (s.venue) updates.venue = s.venue;
      if (s.targetDate) updates.targetDate = s.targetDate;
      if (s.quotedAmount) updates.quotedAmount = s.quotedAmount;
      if (s.source) updates.source = s.source;
      if (s.notes) updates.notes = s.notes;
    }

    await db.lead.update({
      where: { id: lead.id },
      data: updates
    });
  }
  console.log(`Updated all ${allDbLeads.length} leads with exact names and classified statuses.`);

  // Print summary of leads by status
  const leadsGrouped = await db.lead.groupBy({
    by: ['status'],
    _count: true
  });
  console.log('Updated leads summary by status:', leadsGrouped);
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
