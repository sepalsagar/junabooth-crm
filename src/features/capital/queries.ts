import { db } from "@/lib/db";
import { capitalShare, cashPosition, type CashPositionResult } from "./calc";
import { getCashInputs } from "@/features/metrics/queries";

export interface PartnerCapitalSummary {
  id: string;
  name: string;
  email: string;
  injected: number;
  withdrawn: number;
  net: number;
  share: number | null;
}

export interface CapitalEntryItem {
  id: string;
  partnerId: string;
  partnerName: string;
  kind: "INJECTED" | "WITHDRAWN";
  amount: number;
  date: Date;
  mode: "UPI" | "BANK" | "CASH" | "CHEQUE" | null;
  note: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
  voidedByName: string | null;
  createdAt: Date;
}

export interface PartnersCapitalData {
  partners: PartnerCapitalSummary[];
  cashPosition: CashPositionResult;
  entries: CapitalEntryItem[];
  totalNet: number;
}

export async function getPartnersCapitalData(): Promise<PartnersCapitalData> {
  const [partnerUsers, allEntries, cashInputs] = await Promise.all([
    db.user.findMany({
      where: { role: "PARTNER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.capitalEntry.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        partner: { select: { id: true, name: true } },
        voidedBy: { select: { id: true, name: true } },
      },
    }),
    getCashInputs(),
  ]);

  const cashPos = cashPosition(cashInputs);

  // Compute live capital per partner
  const livePartnerStats = new Map<string, { injected: number; withdrawn: number }>();
  for (const u of partnerUsers) {
    livePartnerStats.set(u.id, { injected: 0, withdrawn: 0 });
  }

  for (const entry of allEntries) {
    if (entry.voidedAt) continue;
    if (!livePartnerStats.has(entry.partnerId)) {
      livePartnerStats.set(entry.partnerId, { injected: 0, withdrawn: 0 });
    }
    const stat = livePartnerStats.get(entry.partnerId)!;
    if (entry.kind === "INJECTED") {
      stat.injected += entry.amount;
    } else {
      stat.withdrawn += entry.amount;
    }
  }

  let totalNet = 0;
  const partnerSummariesPre: Array<{
    id: string;
    name: string;
    email: string;
    injected: number;
    withdrawn: number;
    net: number;
  }> = [];

  for (const u of partnerUsers) {
    const stat = livePartnerStats.get(u.id) ?? { injected: 0, withdrawn: 0 };
    const net = stat.injected - stat.withdrawn;
    totalNet += net;
    partnerSummariesPre.push({
      id: u.id,
      name: u.name,
      email: u.email,
      injected: stat.injected,
      withdrawn: stat.withdrawn,
      net,
    });
  }

  const partners: PartnerCapitalSummary[] = partnerSummariesPre.map((p) => ({
    ...p,
    share: capitalShare(p.net, totalNet),
  }));

  const entries: CapitalEntryItem[] = allEntries.map((e) => ({
    id: e.id,
    partnerId: e.partnerId,
    partnerName: e.partner.name,
    kind: e.kind,
    amount: e.amount,
    date: e.date,
    mode: e.mode,
    note: e.note,
    voidedAt: e.voidedAt,
    voidReason: e.voidReason,
    voidedByName: e.voidedBy?.name ?? null,
    createdAt: e.createdAt,
  }));

  return {
    partners,
    cashPosition: cashPos,
    entries,
    totalNet,
  };
}
