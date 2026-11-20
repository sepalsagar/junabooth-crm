import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ userFindMany: vi.fn(), capitalFindMany: vi.fn(), leadFindMany: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { findMany: mocks.userFindMany }, capitalEntry: { findMany: mocks.capitalFindMany }, lead: { findMany: mocks.leadFindMany, groupBy: vi.fn(async () => []) } } }));
vi.mock("@/features/metrics/queries", () => ({ getCashInputs: vi.fn(async () => ({ payments: [], expenses: [], capital: [] })) }));

import { getFirmCapitalSummary } from "./queries";
import { getLeadFacets } from "@/features/leads/queries";

describe("inactive partner capital", () => {
  it("keeps disabled historical entries in firm totals while retaining their row", async () => {
    mocks.userFindMany.mockResolvedValueOnce([
      { id: "active", name: "Active", email: "active@example.test", disabled: false },
      { id: "inactive", name: "Inactive", email: "inactive@example.test", disabled: true },
    ]);
    mocks.capitalFindMany.mockResolvedValueOnce([
      { partnerId: "active", kind: "INJECTED", amount: 100 },
      { partnerId: "inactive", kind: "INJECTED", amount: 50 },
    ]);
    const summary = await getFirmCapitalSummary();
    expect(summary.firmInjected).toBe(150);
    expect(summary.partners.find((partner) => partner.id === "inactive")?.injected).toBe(50);
  });

  it("filters disabled users from lead owner facets", async () => {
    mocks.leadFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mocks.userFindMany.mockResolvedValueOnce([{ id: "active", name: "Active", role: "PARTNER" }]);
    const facets = await getLeadFacets();
    expect(facets.users).toEqual([{ id: "active", name: "Active", role: "PARTNER" }]);
    expect(mocks.userFindMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { role: { in: ["PARTNER", "SALES"] }, disabled: false } }));
  });
});
