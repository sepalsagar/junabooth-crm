import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getCashInputs } from "./queries";
import { cashPosition, capitalShare } from "@/features/capital/calc";
import { buildMonthGrid } from "@/features/calendar/grid";
import { findClashes } from "@/features/calendar/clashes";
import { parseMonth } from "./filters";
import { overviewSections } from "./overview-sections";
import { csvCell } from "@/features/reports/csv";
import { BoothUnit, BookingStatus, UserRole } from "@/generated/prisma/client";

describe("Phase 6 Comprehensive Verification", () => {
  it("Cash position equals hand calculation from direct database aggregation", async () => {
    const [liveInjections, liveWithdrawals, livePayments, liveRefunds, liveExpenses] =
      await Promise.all([
        db.capitalEntry.aggregate({
          where: { kind: "INJECTED", voidedAt: null },
          _sum: { amount: true },
        }),
        db.capitalEntry.aggregate({
          where: { kind: "WITHDRAWN", voidedAt: null },
          _sum: { amount: true },
        }),
        db.payment.aggregate({
          where: { voidedAt: null, kind: { not: "REFUND" } },
          _sum: { amount: true },
        }),
        db.payment.aggregate({
          where: { voidedAt: null, kind: "REFUND" },
          _sum: { amount: true },
        }),
        db.expense.aggregate({
          where: { voidedAt: null },
          _sum: { amount: true },
        }),
      ]);

    const injected = liveInjections._sum.amount ?? 0;
    const withdrawn = liveWithdrawals._sum.amount ?? 0;
    const received = (livePayments._sum.amount ?? 0) - (liveRefunds._sum.amount ?? 0);
    const expenses = liveExpenses._sum.amount ?? 0;

    const handCalculatedNetCash = injected - withdrawn + received - expenses;
    const helperInputs = await getCashInputs();
    const computed = cashPosition(helperInputs);

    expect(helperInputs.injected).toBe(injected);
    expect(helperInputs.withdrawn).toBe(withdrawn);
    expect(helperInputs.received).toBe(received);
    expect(helperInputs.expenses).toBe(expenses);
    expect(computed.total).toBe(handCalculatedNetCash);
  });

  it("Partner capital shares correctly distribute non-trivial equity and ignore voided entries", async () => {
    const partners = await db.user.findMany({
      where: { role: UserRole.PARTNER },
      include: { capitalEntries: true },
      orderBy: { email: "asc" },
    });

    expect(partners.length).toBeGreaterThanOrEqual(4);

    const partnerNets = partners.map((p) => {
      const live = p.capitalEntries.filter((c) => !c.voidedAt);
      const inj = live.filter((c) => c.kind === "INJECTED").reduce((s, c) => s + c.amount, 0);
      const wth = live.filter((c) => c.kind === "WITHDRAWN").reduce((s, c) => s + c.amount, 0);
      return { id: p.id, email: p.email, net: inj - wth };
    });

    const totalNet = partnerNets.reduce((s, p) => s + p.net, 0);
    expect(totalNet).toBeGreaterThan(0);

    let totalPct = 0;
    for (const p of partnerNets) {
      const pct = capitalShare(p.net, totalNet);
      expect(pct).not.toBeNull();
      totalPct += pct!;
    }

    // Sum of shares rounded to 1 decimal should be 100.0% +/- 0.5% due to rounding
    expect(Math.abs(totalPct - 100)).toBeLessThanOrEqual(0.5);

    // Verify at least one partner has a voided capital entry
    const voidedEntries = await db.capitalEntry.findMany({ where: { voidedAt: { not: null } } });
    expect(voidedEntries.length).toBeGreaterThanOrEqual(1);
    expect(voidedEntries[0].voidReason).toBeTruthy();
  });

  it("Calendar leap year handles Feb 29, 2028 with 42 cells, and garbage input falls back", () => {
    const leapGrid = buildMonthGrid(2028, 2);
    expect(leapGrid.length).toBe(42);
    const feb29 = leapGrid.find((c) => c.iso === "2028-02-29");
    expect(feb29).toBeDefined();
    expect(feb29?.inMonth).toBe(true);

    const parsedGarbage = parseMonth("invalid-garbage");
    expect(parsedGarbage).toMatch(/^\d{4}-\d{2}$/);
  });

  it("Deliberate clash on calendar is detected between JB-011 and JB-020, and moving unit resolves it", async () => {
    const activeBookings = await db.booking.findMany({
      where: { status: { not: BookingStatus.CANCELLED } },
      select: {
        id: true,
        code: true,
        clientName: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        unit: true,
        status: true,
      },
    });

    const jb011 = activeBookings.find((b) => b.code === "JB-011");
    const jb020 = activeBookings.find((b) => b.code === "JB-020");

    expect(jb011).toBeDefined();
    expect(jb020).toBeDefined();
    expect(jb011?.unit).toBe(BoothUnit.UNIT_1);
    expect(jb020?.unit).toBe(BoothUnit.UNIT_1);

    const clashingBookings = activeBookings.map((b) =>
      b.code === "JB-020" && jb011
        ? { ...b, eventDate: jb011.eventDate, startTime: jb011.startTime, endTime: jb011.endTime, unit: BoothUnit.UNIT_1 }
        : b.code === "JB-011"
        ? { ...b, unit: BoothUnit.UNIT_1 }
        : b
    );

    const clashes = findClashes(clashingBookings);
    const clash11 = clashes.get(jb011!.id);
    const clash20 = clashes.get(jb020!.id);

    expect(clash11).toBeDefined();
    expect(clash11?.hasClash).toBe(true);
    expect(clash11?.clashingWith).toContain(jb020!.id);
    expect(clash20).toBeDefined();
    expect(clash20?.hasClash).toBe(true);
    expect(clash20?.clashingWith).toContain(jb011!.id);

    // Resolving clash by reassigning JB-020 to UNIT_2
    const simulated = clashingBookings.map((b) =>
      b.id === jb020!.id ? { ...b, unit: BoothUnit.UNIT_2 } : b
    );
    const resolvedClashes = findClashes(simulated);
    expect(resolvedClashes.get(jb011!.id)?.hasClash).toBe(false);
    expect(resolvedClashes.get(jb020!.id)?.hasClash).toBe(false);
  });

  it("SALES role privacy: financial tiles, cash, expenses, capital are strictly absent", () => {
    const salesVisibility = overviewSections(UserRole.SALES);
    expect(salesVisibility.showCash).toBe(false);
    expect(salesVisibility.showProfit).toBe(false);
    expect(salesVisibility.showExpenses).toBe(false);
    expect(salesVisibility.showCapital).toBe(false);
    expect(salesVisibility.showRevenueChart).toBe(false);
    expect(salesVisibility.showLeadsChart).toBe(true);
    expect(salesVisibility.showCityChart).toBe(true);
    expect(salesVisibility.showUpcomingEvents).toBe(true);

    const partnerVisibility = overviewSections(UserRole.PARTNER);
    expect(partnerVisibility.showCash).toBe(true);
    expect(partnerVisibility.showProfit).toBe(true);
    expect(partnerVisibility.showExpenses).toBe(true);
    expect(partnerVisibility.showCapital).toBe(true);
    expect(partnerVisibility.showRevenueChart).toBe(true);
  });

  it("CSV export: neutralizes spreadsheet formulas starting with =, +, -, @, tab, or CR", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+447123456")).toBe("'+447123456");
    expect(csvCell("-500")).toBe("'-500");
    expect(csvCell("@username")).toBe("'@username");
    expect(csvCell("\tcommand")).toBe("'\tcommand");
    expect(csvCell("\rcommand")).toBe('"\'\rcommand"');
    expect(csvCell("Normal Text")).toBe("Normal Text");
    expect(csvCell("Text, with comma")).toBe('"Text, with comma"');
  });
});
