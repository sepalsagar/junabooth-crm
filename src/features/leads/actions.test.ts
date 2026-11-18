import { describe, expect, it, vi, beforeEach } from "vitest";
import { changeStatus, createLead } from "./actions";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth-guards
vi.mock("@/lib/auth-guards", () => ({
  requireRole: vi.fn().mockResolvedValue({
    user: { id: "user_partner_1", name: "Partner One", role: "PARTNER" },
  }),
}));

// Mock db and codes
vi.mock("@/lib/db", () => {
  const dummyLead = {
    id: "lead_123",
    code: "ENQ-001",
    clientName: "Test Client",
    phone: "9876543210",
    status: "NEW",
    nextFollowUp: null,
  };

  return {
    db: {
      lead: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(dummyLead),
        create: vi.fn().mockResolvedValue(dummyLead),
        update: vi.fn().mockResolvedValue(dummyLead),
      },
      leadActivity: {
        create: vi.fn().mockResolvedValue({ id: "act_1" }),
      },
      $transaction: vi.fn().mockImplementation(async (cb) => {
        return cb({
          lead: {
            create: vi.fn().mockResolvedValue(dummyLead),
            update: vi.fn().mockResolvedValue(dummyLead),
          },
          leadActivity: {
            create: vi.fn().mockResolvedValue({ id: "act_1" }),
          },
        });
      }),
    },
  };
});

vi.mock("@/lib/codes", () => ({
  nextCode: vi.fn().mockResolvedValue("ENQ-999"),
}));

describe("Leads Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("server rejects changing status to LOST without a reason", async () => {
    const res = await changeStatus({
      leadId: "lead_123",
      status: "LOST",
      lostReason: null,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("lost reason is required");
    }
  });

  it("server rejects changing status to WON with Phase 4 booking message", async () => {
    const res = await changeStatus({
      leadId: "lead_123",
      status: "WON",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("Convert to a booking (Phase 4)");
    }
  });

  it("warns about duplicate phone number without failing createLead", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.lead.findFirst).mockResolvedValueOnce({
      id: "lead_001",
      code: "ENQ-001",
      clientName: "Existing Client",
    } as unknown as Awaited<ReturnType<typeof db.lead.findFirst>>);

    const res = await createLead({
      clientName: "New Client",
      phone: "9876543210",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.duplicateWarning).toContain("already linked to lead ENQ-001");
    }
  });
});
