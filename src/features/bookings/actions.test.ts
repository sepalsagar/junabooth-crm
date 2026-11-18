import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelBooking,
  changeBookingStatus,
  convertLeadToBooking,
  voidPayment,
} from "./actions";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth-guards and db using vi.hoisted to prevent hoisting reference errors
const { mockDb, mockRequireRole } = vi.hoisted(() => {
  const mockDbInstance = {
    lead: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    leadActivity: {
      create: vi.fn(),
    },
    bookingActivity: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mockDbInstance.$transaction.mockImplementation((cb) => cb(mockDbInstance));

  return {
    mockDb: mockDbInstance,
    mockRequireRole: vi.fn(),
  };
});

vi.mock("@/lib/auth-guards", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/codes", () => ({
  nextCode: vi.fn().mockResolvedValue("JB-999"),
}));

describe("Booking Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({
      user: { id: "u_partner", name: "Demo Partner", role: "PARTNER" },
    });
  });

  it("prevents converting an already WON or linked lead", async () => {
    mockDb.lead.findUnique.mockResolvedValueOnce({
      id: "lead_won",
      status: "WON",
      booking: { id: "b_1", code: "JB-001" },
    });

    const res = await convertLeadToBooking({
      leadId: "lead_won",
      eventDate: "2026-12-10",
      packageName: "Classic",
      basePrice: 16000,
      type: "PAID",
      payOnEvent: false,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("already converted");
    }
  });

  it("rejects illegal state transition: COMPLETED -> CONFIRMED", async () => {
    mockDb.booking.findUnique.mockResolvedValueOnce({
      id: "b_completed",
      status: "COMPLETED",
      payments: [],
    });

    const res = await changeBookingStatus({
      bookingId: "b_completed",
      status: "CONFIRMED",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("Cannot transition booking status from COMPLETED to CONFIRMED");
    }
  });

  it("requires advance payment or payOnEvent when moving OPTION -> CONFIRMED", async () => {
    mockDb.booking.findUnique.mockResolvedValueOnce({
      id: "b_option",
      status: "OPTION",
      payOnEvent: false,
      payments: [],
    });

    const res = await changeBookingStatus({
      bookingId: "b_option",
      status: "CONFIRMED",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("advance payment or payOnEvent");
    }
  });

  it("blocks SALES from voiding a payment", async () => {
    mockRequireRole.mockImplementationOnce(async (roles: string[]) => {
      if (!roles.includes("SALES")) {
        throw new Error("REDIRECT:/forbidden");
      }
      return { user: { id: "u_sales", role: "SALES" } };
    });

    await expect(
      voidPayment({
        paymentId: "p_1",
        reason: "Entered wrong amount",
      })
    ).rejects.toThrow("REDIRECT:/forbidden");
  });

  it("blocks SALES from cancelling a booking with refund", async () => {
    mockRequireRole.mockImplementationOnce(async (roles: string[]) => {
      if (!roles.includes("SALES")) {
        throw new Error("REDIRECT:/forbidden");
      }
      return { user: { id: "u_sales", role: "SALES" } };
    });

    await expect(
      cancelBooking({
        bookingId: "b_1",
        refundAmount: 5000,
        reason: "Customer cancelled",
      })
    ).rejects.toThrow("REDIRECT:/forbidden");
  });
});
