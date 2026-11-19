import { describe, expect, it } from "vitest";
import { findClashes, UNIT_BUFFER_MINUTES, type BookingForClash } from "./clashes";

describe("findClashes", () => {
  it("detects clashes when same unit + same IST date + overlapping times", () => {
    const bookings: BookingForClash[] = [
      {
        id: "b1",
        eventDate: "2026-11-20T12:30:00.000Z", // 18:00 IST
        startTime: "18:00",
        endTime: "21:00",
        unit: "UNIT_1",
        status: "CONFIRMED",
      },
      {
        id: "b2",
        eventDate: "2026-11-20T14:30:00.000Z", // 20:00 IST
        startTime: "20:00",
        endTime: "23:00",
        unit: "UNIT_1",
        status: "CONFIRMED",
      },
      {
        id: "b3",
        eventDate: "2026-11-20T12:30:00.000Z",
        startTime: "18:00",
        endTime: "21:00",
        unit: "UNIT_2", // Different unit, no clash
        status: "CONFIRMED",
      },
    ];

    const result = findClashes(bookings);
    expect(result.get("b1")?.hasClash).toBe(true);
    expect(result.get("b1")?.clashingWith).toContain("b2");

    expect(result.get("b2")?.hasClash).toBe(true);
    expect(result.get("b2")?.clashingWith).toContain("b1");

    expect(result.get("b3")?.hasClash).toBe(false);
  });

  it("considers missing times on same date and unit as possible clash", () => {
    const bookings: BookingForClash[] = [
      {
        id: "b1",
        eventDate: "2026-11-20T10:00:00.000Z",
        startTime: null,
        endTime: null,
        unit: "UNIT_1",
        status: "CONFIRMED",
      },
      {
        id: "b2",
        eventDate: "2026-11-20T12:00:00.000Z",
        startTime: "18:00",
        endTime: "22:00",
        unit: "UNIT_1",
        status: "CONFIRMED",
      },
    ];

    const result = findClashes(bookings);
    expect(result.get("b1")?.hasClash).toBe(true);
    expect(result.get("b1")?.clashingWith).toContain("b2");
    expect(result.get("b2")?.hasClash).toBe(true);
    expect(result.get("b2")?.clashingWith).toContain("b1");
  });

  it("ignores CANCELLED bookings completely", () => {
    const bookings: BookingForClash[] = [
      {
        id: "b1",
        eventDate: "2026-11-20T12:00:00.000Z",
        startTime: "18:00",
        endTime: "22:00",
        unit: "UNIT_1",
        status: "CANCELLED",
      },
      {
        id: "b2",
        eventDate: "2026-11-20T12:00:00.000Z",
        startTime: "18:00",
        endTime: "22:00",
        unit: "UNIT_1",
        status: "CONFIRMED",
      },
    ];

    const result = findClashes(bookings);
    expect(result.has("b1")).toBe(false); // ignored
    expect(result.get("b2")?.hasClash).toBe(false);
  });

  it("flags bookings with no unit assigned", () => {
    const bookings: BookingForClash[] = [
      {
        id: "b1",
        eventDate: "2026-11-20T12:00:00.000Z",
        unit: null,
        status: "CONFIRMED",
      },
      {
        id: "b2",
        eventDate: "2026-11-20T12:00:00.000Z",
        unit: "UNIT_1",
        status: "CONFIRMED",
      },
    ];

    const result = findClashes(bookings);
    expect(result.get("b1")?.noUnit).toBe(true);
    expect(result.get("b1")?.hasClash).toBe(false);
    expect(result.get("b2")?.noUnit).toBe(false);
  });

  it("supports configurable buffer (default UNIT_BUFFER_MINUTES = 0) and detects buffer violations with buffer = 120", () => {
    expect(UNIT_BUFFER_MINUTES).toBe(0);

    const bookings: BookingForClash[] = [
      {
        id: "b1",
        eventDate: "2026-11-20T10:00:00.000Z",
        startTime: "10:00",
        endTime: "13:00",
        unit: "UNIT_1",
        status: "CONFIRMED",
      },
      {
        id: "b2",
        eventDate: "2026-11-20T10:00:00.000Z",
        startTime: "14:30", // 90 min after 13:00
        endTime: "17:30",
        unit: "UNIT_1",
        status: "CONFIRMED",
      },
      {
        id: "b3",
        eventDate: "2026-11-20T10:00:00.000Z",
        startTime: "19:45", // 135 min after 17:30
        endTime: "22:45",
        unit: "UNIT_1",
        status: "CONFIRMED",
      },
    ];

    // Default (buffer 0): No clash because 13:00 <= 14:30 and 17:30 <= 19:45
    const noBuffer = findClashes(bookings);
    expect(noBuffer.get("b1")?.hasClash).toBe(false);
    expect(noBuffer.get("b2")?.hasClash).toBe(false);
    expect(noBuffer.get("b3")?.hasClash).toBe(false);

    // Buffer 120 min: b1 and b2 clash (90 min gap < 120 min buffer), b2 and b3 do not clash (135 min gap >= 120 min)
    const withBuffer120 = findClashes(bookings, 120);
    expect(withBuffer120.get("b1")?.hasClash).toBe(true);
    expect(withBuffer120.get("b1")?.clashingWith).toEqual(["b2"]);
    expect(withBuffer120.get("b2")?.hasClash).toBe(true);
    expect(withBuffer120.get("b2")?.clashingWith).toEqual(["b1"]);
    expect(withBuffer120.get("b3")?.hasClash).toBe(false);
  });
});
