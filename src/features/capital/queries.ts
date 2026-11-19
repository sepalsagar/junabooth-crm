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

export interface FirmCapitalSummary {
  partners: PartnerCapitalSummary[];
  firmInjected: number;
  firmWithdrawn: number;
  firmNet: number;
  positiveTotalNet: number;
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

/**
 * SINGLE SHARED HELPER for partner capital cards and firm totals.
 * Live entries only (voidedAt null).
 *
 * Equity share policy:
 * Partners with net <= 0 have share 0.0% and are excluded from positive denominator pool.
 * positiveTotalNet is sum_{net > 0} net.
 */
export async function getFirmCapitalSummary(): Promise<FirmCapitalSummary> {
  const [partnerUsers, liveEntries] = await Promise.all([
    db.user.findMany({
      where: { role: "PARTNER", disabled: false },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.capitalEntry.findMany({
      where: { voidedAt: null },
      select: { partnerId: true, kind: true, amount: true },
    }),
  ]);

  const stats = new Map<string, { injected: number; withdrawn: number }>();
  for (const u of partnerUsers) {
    stats.set(u.id, { injected: 0, withdrawn: 0 });
  }

  let firmInjected = 0;
  let firmWithdrawn = 0;

  for (const entry of liveEntries) {
    if (!stats.has(entry.partnerId)) {
      stats.set(entry.partnerId, { injected: 0, withdrawn: 0 });
    }
    const s = stats.get(entry.partnerId)!;
    if (entry.kind === "INJECTED") {
      s.injected += entry.amount;
      firmInjected += entry.amount;
    } else {
      s.withdrawn += entry.amount;
      firmWithdrawn += entry.amount;
    }
  }

  const firmNet = firmInjected - firmWithdrawn;

  let positiveTotalNet = 0;
  const partnerPre = partnerUsers.map((u) => {
    const s = stats.get(u.id) ?? { injected: 0, withdrawn: 0 };
    const net = s.injected - s.withdrawn;
    if (net > 0) positiveTotalNet += net;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      injected: s.injected,
      withdrawn: s.withdrawn,
      net,
    };
  });

  const partners: PartnerCapitalSummary[] = partnerPre.map((p) => ({
    ...p,
    share: capitalShare(p.net, positiveTotalNet),
  }));

  return {
    partners,
    firmInjected,
    firmWithdrawn,
    firmNet,
    positiveTotalNet,
  };
}

export async function getPartnersCapitalData(): Promise<PartnersCapitalData> {
  const [capSummary, allEntries, cashInputs] = await Promise.all([
    getFirmCapitalSummary(),
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
    partners: capSummary.partners,
    cashPosition: cashPos,
    entries,
    totalNet: capSummary.firmNet,
  };
}
