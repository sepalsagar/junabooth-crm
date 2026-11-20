import type { Prisma } from "@/generated/prisma/client";
import { endOfTodayIST, endOfWeekIST, startOfTodayIST } from "@/lib/dates";
import { normalizePhone } from "./phone";
import { leadFiltersSchema, type LeadFilters, type LeadStatusType } from "./schema";

export function parseLeadFilters(
  rawParams: Record<string, string | string[] | undefined> | URLSearchParams
): LeadFilters {
  const params: Record<string, unknown> = {};

  if (rawParams instanceof URLSearchParams) {
    for (const key of Array.from(rawParams.keys())) {
      const all = rawParams.getAll(key);
      params[key] = all.length > 1 ? all : all[0];
    }
  } else {
    for (const [key, value] of Object.entries(rawParams)) {
      params[key] = value;
    }
  }

  // Safe parse with fallback defaults
  const parsed = leadFiltersSchema.safeParse(params);
  if (parsed.success) {
    return parsed.data;
  }

  return leadFiltersSchema.parse({});
}

export function buildLeadWhere(
  filters: Partial<LeadFilters>,
  now: Date = new Date(),
  currentUserId?: string
): Prisma.LeadWhereInput {
  const andClauses: Prisma.LeadWhereInput[] = [];

  // Search query: clientName OR phone OR code (case-insensitive)
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim();
    const cleanDigits = normalizePhone(q);
    const searchConditions: Prisma.LeadWhereInput[] = [
      { clientName: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { venue: { contains: q, mode: "insensitive" } },
      { sourceText: { contains: q, mode: "insensitive" } },
    ];
    // If search text contains digits that could match phone, also search clean digits
    if (cleanDigits && cleanDigits !== q) {
      searchConditions.push({ phone: { contains: cleanDigits } });
    }
    andClauses.push({ OR: searchConditions });
  }

  // Status filtering
  let statusList: LeadStatusType[] | undefined =
    filters.status && filters.status.length > 0 ? filters.status : undefined;

  // Follow-up filtering
  if (filters.followUp) {
    const startToday = startOfTodayIST(now);
    const endToday = endOfTodayIST(now);
    const endWeek = endOfWeekIST(now);

    // Overdue excludes WON and LOST
    if (filters.followUp === "overdue") {
      andClauses.push({
        nextFollowUp: { lt: startToday },
      });
      if (statusList) {
        statusList = statusList.filter((s) => s !== "WON" && s !== "LOST");
      } else {
        andClauses.push({ status: { notIn: ["WON", "LOST"] } });
      }
    } else if (filters.followUp === "today") {
      andClauses.push({
        nextFollowUp: { gte: startToday, lte: endToday },
      });
      if (statusList) {
        statusList = statusList.filter((s) => s !== "WON" && s !== "LOST");
      } else {
        andClauses.push({ status: { notIn: ["WON", "LOST"] } });
      }
    } else if (filters.followUp === "week") {
      andClauses.push({
        nextFollowUp: { gte: startToday, lte: endWeek },
      });
      if (statusList) {
        statusList = statusList.filter((s) => s !== "WON" && s !== "LOST");
      } else {
        andClauses.push({ status: { notIn: ["WON", "LOST"] } });
      }
    } else if (filters.followUp === "none") {
      andClauses.push({
        nextFollowUp: null,
      });
      if (statusList) {
        statusList = statusList.filter((s) => s !== "WON" && s !== "LOST");
      } else {
        andClauses.push({ status: { notIn: ["WON", "LOST"] } });
      }
    }
  }

  if (statusList && statusList.length > 0) {
    andClauses.push({ status: { in: statusList } });
  }

  // City filter (case-insensitive)
  if (filters.city) {
    andClauses.push({ city: { equals: filters.city, mode: "insensitive" } });
  }

  // Source filter
  if (filters.source && filters.source.length > 0) {
    andClauses.push({ source: { in: filters.source } });
  }

  // Event type filter (case-insensitive)
  if (filters.eventType) {
    andClauses.push({
      eventType: { equals: filters.eventType, mode: "insensitive" },
    });
  }

  // Owner filter: "me" or specific user ID
  if (filters.owner) {
    if (filters.owner === "me") {
      if (currentUserId) {
        andClauses.push({ ownerId: currentUserId });
      } else {
        // If not logged in or no ID, ensure no rows match
        andClauses.push({ ownerId: "__UNAUTHENTICATED__" });
      }
    } else {
      andClauses.push({ ownerId: filters.owner });
    }
  }

  // Target date range
  if (filters.from || filters.to) {
    const targetDateClause: Prisma.DateTimeNullableFilter = {};
    if (filters.from) targetDateClause.gte = filters.from;
    if (filters.to) targetDateClause.lte = filters.to;
    andClauses.push({ targetDate: targetDateClause });
  }

  // Created at range
  if (filters.createdFrom || filters.createdTo) {
    const createdAtClause: Prisma.DateTimeFilter = {};
    if (filters.createdFrom) createdAtClause.gte = filters.createdFrom;
    if (filters.createdTo) createdAtClause.lte = filters.createdTo;
    andClauses.push({ createdAt: createdAtClause });
  }

  // Quoted amount range
  if (filters.minAmt !== undefined || filters.maxAmt !== undefined) {
    const amountClause: Prisma.IntNullableFilter = {};
    if (filters.minAmt !== undefined) amountClause.gte = filters.minAmt;
    if (filters.maxAmt !== undefined) amountClause.lte = filters.maxAmt;
    andClauses.push({ quotedAmount: amountClause });
  }

  if (andClauses.length === 0) return {};
  if (andClauses.length === 1) return andClauses[0];
  return { AND: andClauses };
}
