import { describe, expect, it } from "vitest";
import { validateStatusChange } from "./rules";

describe("validateStatusChange rules", () => {
  const now = new Date("2026-11-20T10:00:00.000Z"); // 15:30 IST on 20 Nov 2026
  const futureDate = new Date("2026-11-25T10:00:00.000Z");
  const pastDate = new Date("2026-11-15T10:00:00.000Z");

  it("rejects transition to WON with Phase 4 message", () => {
    const res = validateStatusChange("WON", {}, now);
    expect(res.valid).toBe(false);
    if (!res.valid) {
      expect(res.error).toBe("Convert to a booking (Phase 4)");
    }
  });

  it("requires a non-past follow-up date for CONTACTED, QUOTED, FOLLOW_UP, POSTPONED", () => {
    // Missing date
    const resMissing = validateStatusChange("CONTACTED", {}, now);
    expect(resMissing.valid).toBe(false);

    // Past date
    const resPast = validateStatusChange(
      "FOLLOW_UP",
      { nextFollowUp: pastDate },
      now
    );
    expect(resPast.valid).toBe(false);
    if (!resPast.valid) {
      expect(resPast.error).toContain("past");
    }

    // Future date
    const resValid = validateStatusChange(
      "QUOTED",
      { nextFollowUp: futureDate },
      now
    );
    expect(resValid.valid).toBe(true);

    // Today IST date is accepted
    const today = new Date("2026-11-20T08:00:00.000Z");
    const resToday = validateStatusChange(
      "POSTPONED",
      { nextFollowUp: today },
      now
    );
    expect(resToday.valid).toBe(true);
  });

  it("requires a valid lostReason for LOST status", () => {
    const resMissing = validateStatusChange("LOST", {}, now);
    expect(resMissing.valid).toBe(false);

    const resInvalid = validateStatusChange(
      "LOST",
      { lostReason: "Client was rude" },
      now
    );
    expect(resInvalid.valid).toBe(false);

    const resBudget = validateStatusChange(
      "LOST",
      { lostReason: "Budget" },
      now
    );
    expect(resBudget.valid).toBe(true);
  });

  it("allows NEW without follow-up or lost reason", () => {
    const res = validateStatusChange("NEW", {}, now);
    expect(res.valid).toBe(true);
  });
});
