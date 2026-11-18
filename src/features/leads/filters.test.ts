import { describe, expect, it } from "vitest";
import { buildLeadWhere, parseLeadFilters } from "./filters";

describe("Lead Filters & Where Clause Builder", () => {
  it("parses searchParams correctly from object or URLSearchParams", () => {
    const params = new URLSearchParams("q=Aarav&status=NEW&status=CONTACTED&page=2");
    const parsed = parseLeadFilters(params);

    expect(parsed.q).toBe("Aarav");
    expect(parsed.status).toEqual(["NEW", "CONTACTED"]);
    expect(parsed.page).toBe(2);
  });

  it("builds case-insensitive OR clause for search query matching name, code, or phone", () => {
    const where = buildLeadWhere({
      q: "Aarav",
      status: [],
      source: [],
      page: 1,
    });

    expect(where).toHaveProperty("OR");
    const orClauses = (where as any).OR;
    expect(orClauses).toEqual(
      expect.arrayContaining([
        { clientName: { contains: "Aarav", mode: "insensitive" } },
        { code: { contains: "Aarav", mode: "insensitive" } },
        { phone: { contains: "Aarav", mode: "insensitive" } },
      ])
    );
  });

  it("excludes WON and LOST when filtering by overdue follow-up", () => {
    const now = new Date("2026-11-20T10:00:00.000Z");
    const where = buildLeadWhere(
      {
        followUp: "overdue",
        status: [],
        source: [],
        page: 1,
      },
      now
    );

    expect(where).toHaveProperty("AND");
    const andClauses = (where as any).AND;

    // Must have nextFollowUp lt startOfTodayIST and status notIn WON/LOST
    const nextFollowUpClause = andClauses.find((c: any) => c.nextFollowUp);
    expect(nextFollowUpClause).toBeDefined();
    expect(nextFollowUpClause.nextFollowUp).toHaveProperty("lt");

    const statusClause = andClauses.find((c: any) => c.status);
    expect(statusClause.status).toEqual({ notIn: ["WON", "LOST"] });
  });

  it("filters status and overdue combined without including WON/LOST", () => {
    const now = new Date("2026-11-20T10:00:00.000Z");
    const where = buildLeadWhere(
      {
        followUp: "overdue",
        status: ["NEW", "WON", "FOLLOW_UP"],
        source: [],
        page: 1,
      },
      now
    );

    const andClauses = (where as any).AND;
    const statusClause = andClauses.find((c: any) => c.status);
    // WON should be filtered out
    expect(statusClause.status).toEqual({ in: ["NEW", "FOLLOW_UP"] });
  });

  it("resolves owner='me' to currentUserId", () => {
    const where = buildLeadWhere(
      {
        owner: "me",
        status: [],
        source: [],
        page: 1,
      },
      new Date(),
      "user_123"
    );

    expect((where as any).ownerId).toBe("user_123");
  });
});
