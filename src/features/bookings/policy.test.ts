import { describe, expect, it } from "vitest";
import { refundAmount, refundPercent } from "./policy";

describe("Cancellation & Refund Policy", () => {
  const eventStart = new Date("2026-12-01T18:00:00.000Z");

  it("calculates refund percent across boundaries accurately", () => {
    // Exactly 168 hours before event
    const exactly168h = new Date(eventStart.getTime() - 168 * 60 * 60 * 1000);
    expect(refundPercent(eventStart, exactly168h)).toBe(100);

    // 167 hours 59 minutes before event (1 minute less than 168h) -> falls into 75% tier
    const minus167h59m = new Date(
      eventStart.getTime() - (168 * 60 - 1) * 60 * 1000
    );
    expect(refundPercent(eventStart, minus167h59m)).toBe(75);

    // Exactly 72 hours before event -> 75%
    const exactly72h = new Date(eventStart.getTime() - 72 * 60 * 60 * 1000);
    expect(refundPercent(eventStart, exactly72h)).toBe(75);

    // Exactly 48 hours before event -> 50%
    const exactly48h = new Date(eventStart.getTime() - 48 * 60 * 60 * 1000);
    expect(refundPercent(eventStart, exactly48h)).toBe(50);

    // 47 hours 59 minutes before event -> 0%
    const minus47h59m = new Date(
      eventStart.getTime() - (48 * 60 - 1) * 60 * 1000
    );
    expect(refundPercent(eventStart, minus47h59m)).toBe(0);

    // After the event has started -> 0%
    const afterEvent = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
    expect(refundPercent(eventStart, afterEvent)).toBe(0);
  });

  it("calculates rounded refund amount", () => {
    expect(refundAmount(10000, 100)).toBe(10000);
    expect(refundAmount(10000, 75)).toBe(7500);
    expect(refundAmount(10000, 50)).toBe(5000);
    expect(refundAmount(10000, 0)).toBe(0);

    // Rounding check
    expect(refundAmount(3333, 50)).toBe(1667);
    expect(refundAmount(0, 100)).toBe(0);
    expect(refundAmount(-100, 100)).toBe(0);
  });
});
