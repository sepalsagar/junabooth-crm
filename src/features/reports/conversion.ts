import type { LeadSource, LeadStatus } from "@/generated/prisma/client";

export interface LeadForConversion {
  source: LeadSource | null;
  status: LeadStatus;
}

export interface SourceConversion {
  source: string;
  totalLeads: number;
  won: number;
  lost: number;
  open: number;
  conversion: number | null; // won / (won + lost) as percentage, e.g. 50.0, or null when won+lost=0
}

export function leadConversion(rows: LeadForConversion[]): SourceConversion[] {
  const sourceMap = new Map<
    string,
    { total: number; won: number; lost: number; open: number }
  >();

  for (const row of rows) {
    const src = row.source ?? "OTHER";
    if (!sourceMap.has(src)) {
      sourceMap.set(src, { total: 0, won: 0, lost: 0, open: 0 });
    }
    const stat = sourceMap.get(src)!;
    stat.total++;

    if (row.status === "WON") {
      stat.won++;
    } else if (row.status === "LOST") {
      stat.lost++;
    } else {
      stat.open++;
    }
  }

  const results: SourceConversion[] = [];
  for (const [source, stat] of sourceMap.entries()) {
    const closed = stat.won + stat.lost;
    const conversion =
      closed > 0 ? Math.round((stat.won / closed) * 1000) / 10 : null;

    results.push({
      source,
      totalLeads: stat.total,
      won: stat.won,
      lost: stat.lost,
      open: stat.open,
      conversion,
    });
  }

  // Sort by totalLeads desc, then won desc
  return results.sort((a, b) => b.totalLeads - a.totalLeads || b.won - a.won);
}
