import { describe, it, expect } from "vitest";
import {
  buildHourSlots,
  computeAreaAvailability,
  computeAvailability,
} from "./availability";
import { localDateTimeToIso } from "./format";
import type { Area, BusinessHour, Schedule } from "@/lib/supabase/types";

function makeArea(overrides: Partial<Area> = {}): Area {
  return {
    id: "area-1",
    name: "Main Hall",
    code: "MH",
    description: null,
    capacity: 50,
    location: null,
    status: "active",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

function makeBusinessHour(overrides: Partial<BusinessHour> = {}): BusinessHour {
  return {
    id: "bh-1",
    day_of_week: 1, // Monday
    is_closed: false,
    open_time: "09:00",
    close_time: "17:00",
    updated_at: "2024-01-01T00:00:00.000Z",
    updated_by: null,
    ...overrides,
  };
}

function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  const date = overrides.date ?? "2024-01-15";
  return {
    id: "sched-1",
    area_id: "area-1",
    activity_id: null,
    organizer_id: null,
    type: "internal_activity",
    date,
    start_at: localDateTimeToIso(date, "10:00"),
    end_at: localDateTimeToIso(date, "12:00"),
    capacity: null,
    notes: null,
    status: "confirmed",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

describe("buildHourSlots", () => {
  it("builds hourly slots between open and close time", () => {
    expect(buildHourSlots("09:00", "17:00")).toEqual([
      "09:00",
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
    ]);
  });

  it("excludes the close time itself (last slot ends exactly at close)", () => {
    const slots = buildHourSlots("09:00", "10:00");
    expect(slots).toEqual(["09:00"]);
  });

  it("returns an empty array when open equals close", () => {
    expect(buildHourSlots("09:00", "09:00")).toEqual([]);
  });
});

describe("computeAreaAvailability", () => {
  const date = "2024-01-15"; // Monday

  it("marks the whole day CLOSED when the business hour row says closed", () => {
    const area = makeArea();
    const bh = makeBusinessHour({ is_closed: true });
    const result = computeAreaAvailability(area, date, bh, []);
    expect(result.slots).toEqual([{ time: "-", status: "CLOSED" }]);
  });

  it("marks the whole day CLOSED when there is no business hour row for that day", () => {
    const area = makeArea();
    const result = computeAreaAvailability(area, date, undefined, []);
    expect(result.slots).toEqual([{ time: "-", status: "CLOSED" }]);
  });

  it("marks the whole day CLOSED for an inactive area, even with open business hours", () => {
    const area = makeArea({ status: "inactive" });
    const bh = makeBusinessHour();
    const result = computeAreaAvailability(area, date, bh, []);
    expect(result.slots).toEqual([{ time: "-", status: "CLOSED" }]);
  });

  it("marks all hours AVAILABLE when there are no schedules", () => {
    const area = makeArea();
    const bh = makeBusinessHour();
    const result = computeAreaAvailability(area, date, bh, []);
    expect(result.slots.every((s) => s.status === "AVAILABLE")).toBe(true);
    expect(result.slots).toHaveLength(8);
  });

  it("splits the day into AVAILABLE and INTERNAL_ACTIVITY around an internal_activity schedule", () => {
    const area = makeArea();
    const bh = makeBusinessHour();
    const schedule = makeSchedule({
      type: "internal_activity",
      date,
      start_at: localDateTimeToIso(date, "10:00"),
      end_at: localDateTimeToIso(date, "12:00"),
    });
    const result = computeAreaAvailability(area, date, bh, [schedule]);
    const byTime = Object.fromEntries(result.slots.map((s) => [s.time, s.status]));
    expect(byTime["09:00"]).toBe("AVAILABLE");
    expect(byTime["10:00"]).toBe("INTERNAL_ACTIVITY");
    expect(byTime["11:00"]).toBe("INTERNAL_ACTIVITY");
    expect(byTime["12:00"]).toBe("AVAILABLE");
    expect(byTime["16:00"]).toBe("AVAILABLE");
  });

  it("marks slots BOOKED for an external_booking schedule", () => {
    const area = makeArea();
    const bh = makeBusinessHour();
    const schedule = makeSchedule({
      type: "external_booking",
      date,
      start_at: localDateTimeToIso(date, "13:00"),
      end_at: localDateTimeToIso(date, "14:00"),
    });
    const result = computeAreaAvailability(area, date, bh, [schedule]);
    const byTime = Object.fromEntries(result.slots.map((s) => [s.time, s.status]));
    expect(byTime["13:00"]).toBe("BOOKED");
    expect(byTime["12:00"]).toBe("AVAILABLE");
  });

  it("marks slots BLOCKED for a blocked-type schedule", () => {
    const area = makeArea();
    const bh = makeBusinessHour();
    const schedule = makeSchedule({
      type: "blocked",
      date,
      start_at: localDateTimeToIso(date, "09:00"),
      end_at: localDateTimeToIso(date, "10:00"),
    });
    const result = computeAreaAvailability(area, date, bh, [schedule]);
    const byTime = Object.fromEntries(result.slots.map((s) => [s.time, s.status]));
    expect(byTime["09:00"]).toBe("BLOCKED");
  });

  it("ignores cancelled schedules — they must not occupy any slot", () => {
    const area = makeArea();
    const bh = makeBusinessHour();
    const schedule = makeSchedule({
      type: "external_booking",
      date,
      status: "cancelled",
      start_at: localDateTimeToIso(date, "10:00"),
      end_at: localDateTimeToIso(date, "12:00"),
    });
    const result = computeAreaAvailability(area, date, bh, [schedule]);
    expect(result.slots.every((s) => s.status === "AVAILABLE")).toBe(true);
  });

  it("ignores schedules on a different date", () => {
    const area = makeArea();
    const bh = makeBusinessHour();
    const schedule = makeSchedule({
      date: "2024-01-16",
      start_at: localDateTimeToIso("2024-01-16", "10:00"),
      end_at: localDateTimeToIso("2024-01-16", "12:00"),
    });
    const result = computeAreaAvailability(area, date, bh, [schedule]);
    expect(result.slots.every((s) => s.status === "AVAILABLE")).toBe(true);
  });

  it("handles a schedule starting exactly at business open time as occupying the first slot", () => {
    const area = makeArea();
    const bh = makeBusinessHour();
    const schedule = makeSchedule({
      type: "external_booking",
      date,
      start_at: localDateTimeToIso(date, "09:00"),
      end_at: localDateTimeToIso(date, "10:00"),
    });
    const result = computeAreaAvailability(area, date, bh, [schedule]);
    const byTime = Object.fromEntries(result.slots.map((s) => [s.time, s.status]));
    expect(byTime["09:00"]).toBe("BOOKED");
    expect(byTime["10:00"]).toBe("AVAILABLE");
  });

  it("handles a schedule ending exactly at business close time as not leaking past the last slot", () => {
    const area = makeArea();
    const bh = makeBusinessHour();
    const schedule = makeSchedule({
      type: "external_booking",
      date,
      start_at: localDateTimeToIso(date, "16:00"),
      end_at: localDateTimeToIso(date, "17:00"),
    });
    const result = computeAreaAvailability(area, date, bh, [schedule]);
    const byTime = Object.fromEntries(result.slots.map((s) => [s.time, s.status]));
    expect(byTime["16:00"]).toBe("BOOKED");
    expect(result.slots).toHaveLength(8);
  });
});

describe("computeAvailability", () => {
  it("computes availability across multiple areas using the matching business hour by day of week", () => {
    const date = "2024-01-15"; // Monday -> day_of_week 1
    const areas = [makeArea({ id: "a1" }), makeArea({ id: "a2", status: "inactive" })];
    const businessHours = [
      makeBusinessHour({ day_of_week: 0, is_closed: true }),
      makeBusinessHour({ day_of_week: 1, is_closed: false, open_time: "09:00", close_time: "11:00" }),
    ];
    const schedules: Schedule[] = [];
    const result = computeAvailability(areas, date, businessHours, schedules);
    expect(result).toHaveLength(2);
    expect(result[0].slots).toEqual([
      { time: "09:00", status: "AVAILABLE" },
      { time: "10:00", status: "AVAILABLE" },
    ]);
    // inactive area is CLOSED regardless of business hours
    expect(result[1].slots).toEqual([{ time: "-", status: "CLOSED" }]);
  });

  it("marks CLOSED for a day with no matching business hour row (e.g. Sunday with none configured)", () => {
    const date = "2024-01-14"; // Sunday -> day_of_week 0
    const areas = [makeArea()];
    const businessHours = [makeBusinessHour({ day_of_week: 1 })]; // only Monday configured
    const result = computeAvailability(areas, date, businessHours, []);
    expect(result[0].slots).toEqual([{ time: "-", status: "CLOSED" }]);
  });
});
