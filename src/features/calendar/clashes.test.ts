import { describe, expect, it } from "vitest";
import { findClashes, type BookingForClash } from "./clashes";

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
});
