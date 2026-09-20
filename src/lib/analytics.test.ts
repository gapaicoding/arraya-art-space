import { describe, it, expect } from "vitest";
import {
  summarizeBookingStatus,
  calculateOperationalMinutes,
  calculateOccupancyRate,
  buildBookingTrend,
} from "./analytics";

describe("summarizeBookingStatus", () => {
  it("counts rows per status, defaulting missing statuses to 0", () => {
    const summary = summarizeBookingStatus([
      { status: "pending" },
      { status: "pending" },
      { status: "confirmed" },
    ]);
    expect(summary).toEqual({ pending: 2, confirmed: 1, cancelled: 0, completed: 0 });
  });

  it("returns all zeros for an empty set", () => {
    expect(summarizeBookingStatus([])).toEqual({
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
    });
  });
});

describe("calculateOperationalMinutes", () => {
  const hours = [
    { day_of_week: 1, is_closed: false, open_time: "09:00:00", close_time: "17:00:00" }, // Mon, 8h
    { day_of_week: 2, is_closed: false, open_time: "09:00:00", close_time: "17:00:00" }, // Tue, 8h
    { day_of_week: 0, is_closed: true, open_time: null, close_time: null }, // Sun, closed
  ];

  it("sums operational minutes across a date range", () => {
    // 2024-01-08 Mon, 2024-01-09 Tue -> 8h + 8h = 960 minutes
    const minutes = calculateOperationalMinutes(hours, "2024-01-08", "2024-01-09");
    expect(minutes).toBe(960);
  });

  it("skips closed days and days with no business_hours row", () => {
    // 2024-01-07 Sun is closed, 2024-01-08 Mon is 8h
    const minutes = calculateOperationalMinutes(hours, "2024-01-07", "2024-01-08");
    expect(minutes).toBe(480);
  });
});

describe("calculateOccupancyRate", () => {
  it("computes booked minutes over operational minutes as a percentage", () => {
    expect(calculateOccupancyRate([120, 60], 960)).toBe(18.8);
  });

  it("returns 0 when there are no operational minutes", () => {
    expect(calculateOccupancyRate([120], 0)).toBe(0);
  });

  it("returns 0 for an empty range with no bookings", () => {
    expect(calculateOccupancyRate([], 960)).toBe(0);
  });
});

describe("buildBookingTrend", () => {
  it("fills gap dates with 0 and counts bookings per day", () => {
    const trend = buildBookingTrend(
      [{ date: "2024-01-08" }, { date: "2024-01-08" }, { date: "2024-01-10" }],
      "2024-01-08",
      "2024-01-10",
    );
    expect(trend).toEqual([
      { date: "2024-01-08", count: 2 },
      { date: "2024-01-09", count: 0 },
      { date: "2024-01-10", count: 1 },
    ]);
  });

  it("returns all-zero days for an empty booking set", () => {
    const trend = buildBookingTrend([], "2024-01-08", "2024-01-09");
    expect(trend.map((t) => t.count)).toEqual([0, 0]);
  });
});
