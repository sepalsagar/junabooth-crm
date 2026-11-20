import { db } from "@/lib/db";
import { endOfTodayIST } from "@/lib/dates";
import { buildLeadWhere } from "./filters";
import type { LeadFilters } from "./schema";
import type { Prisma } from "@/generated/prisma/client";

export const LEADS_PAGE_SIZE = 20;

function getOrderBy(sort?: string): Prisma.LeadOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "targetDate_asc":
      return { targetDate: { sort: "asc", nulls: "last" } };
    case "targetDate_desc":
      return { targetDate: { sort: "desc", nulls: "last" } };
    case "followUp_asc":
      return { nextFollowUp: { sort: "asc", nulls: "last" } };
    case "amount_desc":
      return { quotedAmount: { sort: "desc", nulls: "last" } };
    case "amount_asc":
      return { quotedAmount: { sort: "asc", nulls: "last" } };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export async function getLeads(
  filters: LeadFilters,
  user?: { id: string; role?: string }
) {
  const now = new Date();
  const where = buildLeadWhere(filters, now, user?.id);
  const skip = (filters.page - 1) * LEADS_PAGE_SIZE;
  const take = LEADS_PAGE_SIZE;
  const orderBy = getOrderBy(filters.sort);

  // Single transaction for findMany + count
  const [leads, total] = await db.$transaction([
    db.lead.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        code: true,
        clientName: true,
        phone: true,
        whatsapp: true,
        city: true,
        eventType: true,
        targetDate: true,
        source: true,
        sourceText: true,
        inquiryDate: true,
        venue: true,
        notes: true,
        quotedAmount: true,
        status: true,
        nextFollowUp: true,
        createdAt: true,
        booking: {
          select: {
            code: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    db.lead.count({ where }),
  ]);

  return {
    leads,
    total,
    page: filters.page,
    pageSize: LEADS_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE)),
  };
}

export async function getLead(code: string) {
  return db.lead.findUnique({
    where: { code },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      booking: {
        select: {
          id: true,
          code: true,
          status: true,
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      },
    },
  });
}

export async function getFollowUpsDue(now: Date = new Date()) {
  const endToday = endOfTodayIST(now);

  return db.lead.findMany({
    where: {
      status: { notIn: ["WON", "LOST"] },
      nextFollowUp: {
        not: null,
        lte: endToday,
      },
    },
    orderBy: {
      nextFollowUp: "asc",
    },
    select: {
      id: true,
      code: true,
      clientName: true,
      phone: true,
      whatsapp: true,
      city: true,
      eventType: true,
      status: true,
      nextFollowUp: true,
      quotedAmount: true,
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function getLeadFacets() {
  const [citiesRows, eventTypesRows, users, statusCountRows] = await Promise.all([
    db.lead.findMany({
      select: { city: true },
      distinct: ["city"],
      where: { city: { not: null } },
      orderBy: { city: "asc" },
    }),
    db.lead.findMany({
      select: { eventType: true },
      distinct: ["eventType"],
      where: { eventType: { not: null } },
      orderBy: { eventType: "asc" },
    }),
    db.user.findMany({
      where: { role: { in: ["PARTNER", "SALES"] }, disabled: false },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    db.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const cities = citiesRows
    .map((r) => r.city?.trim())
    .filter((c): c is string => Boolean(c));

  const eventTypes = eventTypesRows
    .map((r) => r.eventType?.trim())
    .filter((e): e is string => Boolean(e));

  const statusCounts = Object.fromEntries(
    statusCountRows.map((r) => [r.status, r._count._all])
  ) as Record<string, number>;

  return {
    cities,
    eventTypes,
    users,
    statusCounts,
  };
}
