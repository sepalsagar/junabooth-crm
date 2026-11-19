import { describe, expect, it } from "vitest";
import { overviewSections } from "./overview-sections";

describe("overviewSections", () => {
  it("enables all financial and overview sections for PARTNER", () => {
    const sections = overviewSections("PARTNER");
    expect(sections.showCash).toBe(true);
    expect(sections.showProfit).toBe(true);
    expect(sections.showExpenses).toBe(true);
    expect(sections.showCapital).toBe(true);
    expect(sections.showRevenueChart).toBe(true);
    expect(sections.showLeadsChart).toBe(true);
    expect(sections.showCityChart).toBe(true);
  });

  it("blocks cash, profit, expenses, capital and revenue chart for SALES", () => {
    const sections = overviewSections("SALES");
    expect(sections.showCash).toBe(false);
    expect(sections.showProfit).toBe(false);
    expect(sections.showExpenses).toBe(false);
    expect(sections.showCapital).toBe(false);
    expect(sections.showRevenueChart).toBe(false);
    expect(sections.showLeadsChart).toBe(true);
    expect(sections.showCityChart).toBe(true);
    expect(sections.showUpcomingEvents).toBe(true);
    expect(sections.showFollowUpToday).toBe(true);
  });
});
