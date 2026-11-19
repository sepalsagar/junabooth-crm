import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getMonthlyPLData: vi.fn(),
  getConversionBySource: vi.fn(),
  getCitySummary: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/db", () => ({
  db: {
    booking: {
      findMany: mocks.findMany,
    },
  },
}));

vi.mock("@/features/metrics/queries", () => ({
  getMonthlyPLData: mocks.getMonthlyPLData,
  getConversionBySource: mocks.getConversionBySource,
  getCitySummary: mocks.getCitySummary,
}));

import { GET } from "./route";

describe("GET /reports/export Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 Unauthorized when logged out (never redirects)", async () => {
    mocks.getSession.mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/reports/export?month=2026-11");
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("returns 403 Forbidden when logged in as SALES (never redirects)", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { id: "u-sales", name: "Sales Agent", role: "SALES" },
    });

    const request = new Request("http://localhost:3000/reports/export?month=2026-11");
    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(await response.text()).toContain("Forbidden");
  });

  it("returns 200 with UTF-8 BOM, attachment header, and neutralized formulas for PARTNER", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { id: "u-partner", name: "Partner Boss", role: "PARTNER" },
    });

    mocks.getMonthlyPLData.mockResolvedValueOnce({
      current: {
        month: "2026-11",
        revenue: 50000,
        directCosts: 10000,
        grossProfit: 40000,
        grossMargin: 80,
        overheads: { setup: 1000, marketing: 2000, general: 1000, total: 4000 },
        netProfit: 36000,
        netMargin: 72,
        bookingCount: 2,
        cancelledCount: 0,
      },
      previous: {
        month: "2026-10",
        revenue: 40000,
        directCosts: 8000,
        grossProfit: 32000,
        grossMargin: 80,
        overheads: { setup: 1000, marketing: 2000, general: 1000, total: 4000 },
        netProfit: 28000,
        netMargin: 70,
        bookingCount: 2,
        cancelledCount: 0,
      },
      comparison: {
        revenueDiff: 10000,
        directCostsDiff: 2000,
        grossProfitDiff: 8000,
        overheadsDiff: 0,
        netProfitDiff: 8000,
      },
    });

    mocks.getConversionBySource.mockResolvedValueOnce([
      { source: "INSTAGRAM", totalLeads: 5, won: 3, lost: 1, open: 1, conversion: 75 },
    ]);

    mocks.getCitySummary.mockResolvedValueOnce([
      { city: "Patna", events: 3, billed: 60000, avgDealSize: 20000, grossMargin: 70 },
    ]);

    // Bookings including a formula injection attempt in clientName: "=1+1"
    mocks.findMany.mockResolvedValueOnce([
      {
        code: "JB-001",
        clientName: "=1+1",
        phone: "9876500001",
        city: "Patna",
        venue: "Hotel Maurya",
        eventDate: new Date("2026-11-15T12:00:00.000Z"),
        packageName: "Classic",
        basePrice: 16000,
        travelCharge: 0,
        discount: 0,
        status: "CONFIRMED",
        unit: "UNIT_1",
        payments: [{ amount: 16000, kind: "FINAL", voidedAt: null }],
      },
    ]);

    const request = new Request("http://localhost:3000/reports/export?month=2026-11");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="junabooth-report-2026-11.csv"'
    );

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    // Excel-friendly UTF-8 BOM must be present as the first 3 bytes (0xEF, 0xBB, 0xBF)
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    const text = new TextDecoder("utf-8").decode(bytes);
    // Formula injection "=1+1" must be neutralized with a leading apostrophe: '=1+1
    expect(text).toContain("'=1+1");
  });
});
