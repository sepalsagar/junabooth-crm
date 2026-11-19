import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  getCashPosition: vi.fn(),
  db: {
    capitalEntry: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-guards", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

vi.mock("@/features/metrics/queries", () => ({
  getCashPosition: mocks.getCashPosition,
}));

import { addCapitalEntry, voidCapitalEntry } from "./actions";

describe("Capital Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires PARTNER role to add capital entry", async () => {
    mocks.requireRole.mockResolvedValueOnce({
      user: { id: "p1", name: "Partner", role: "PARTNER" },
    });
    mocks.db.capitalEntry.create.mockResolvedValueOnce({ id: "entry-1" });

    const result = await addCapitalEntry({
      partnerId: "p1",
      kind: "INJECTED",
      amount: 50000,
      date: "2026-11-20",
      mode: "BANK",
      note: "Seed contribution",
    });

    expect(mocks.requireRole).toHaveBeenCalledWith(["PARTNER"]);
    expect(result.ok).toBe(true);
  });

  it("returns warning on withdrawal that would push cash in hand below zero without confirmation", async () => {
    mocks.requireRole.mockResolvedValueOnce({
      user: { id: "p1", name: "Partner", role: "PARTNER" },
    });
    // Cash position is currently 30000
    mocks.getCashPosition.mockResolvedValueOnce({
      injected: 50000,
      received: 20000,
      expenses: 40000,
      withdrawn: 0,
      total: 30000,
    });

    // Attempt to withdraw 50000 (remaining would be -20000)
    const result = await addCapitalEntry({
      partnerId: "p1",
      kind: "WITHDRAWN",
      amount: 50000,
      date: "2026-11-20",
      confirmBelowZero: false,
    });

    expect(result.ok).toBe(false);
    expect(result.warning).toBe("WITHDRAWAL_BELOW_ZERO");
    expect(mocks.db.capitalEntry.create).not.toHaveBeenCalled();
  });

  it("allows withdrawal that pushes cash below zero when confirmBelowZero is true", async () => {
    mocks.requireRole.mockResolvedValueOnce({
      user: { id: "p1", name: "Partner", role: "PARTNER" },
    });
    mocks.getCashPosition.mockResolvedValueOnce({
      total: 30000,
    });
    mocks.db.capitalEntry.create.mockResolvedValueOnce({ id: "entry-w-1" });

    const result = await addCapitalEntry({
      partnerId: "p1",
      kind: "WITHDRAWN",
      amount: 50000,
      date: "2026-11-20",
      confirmBelowZero: true,
    });

    expect(result.ok).toBe(true);
    expect(mocks.db.capitalEntry.create).toHaveBeenCalled();
  });

  it("voids a capital entry with a reason and never deletes", async () => {
    mocks.requireRole.mockResolvedValueOnce({
      user: { id: "p1", name: "Partner One", role: "PARTNER" },
    });
    mocks.db.capitalEntry.findUnique.mockResolvedValueOnce({
      id: "e-1",
      amount: 20000,
      voidedAt: null,
    });
    mocks.db.capitalEntry.update.mockResolvedValueOnce({
      id: "e-1",
    });

    const result = await voidCapitalEntry({
      entryId: "e-1",
      reason: "Duplicate bank transaction",
    });

    expect(result.ok).toBe(true);
    expect(mocks.db.capitalEntry.update).toHaveBeenCalledWith({
      where: { id: "e-1" },
      data: expect.objectContaining({
        voidedById: "p1",
        voidReason: "Duplicate bank transaction",
      }),
    });
  });
});
