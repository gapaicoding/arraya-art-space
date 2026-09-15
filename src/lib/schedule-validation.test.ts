import { describe, expect, it } from "vitest";
import { scheduleFormSchema, SCHEDULE_NONE } from "./schedule-validation";

const base = {
  date: "2026-01-01",
  area_id: "area-1",
  type: "external_booking" as const,
  start_time: "09:00",
  end_time: "10:00",
};

describe("scheduleFormSchema", () => {
  it("accepts a valid external_booking schedule", () => {
    const result = scheduleFormSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects end_time not after start_time", () => {
    const result = scheduleFormSchema.safeParse({ ...base, start_time: "10:00", end_time: "10:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("end_time"))).toBe(true);
    }
  });

  it("rejects end_time before start_time", () => {
    const result = scheduleFormSchema.safeParse({ ...base, start_time: "10:00", end_time: "09:00" });
    expect(result.success).toBe(false);
  });

  it("requires an activity for internal_activity type", () => {
    const result = scheduleFormSchema.safeParse({
      ...base,
      type: "internal_activity",
      activity_id: SCHEDULE_NONE,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("activity_id"))).toBe(true);
    }
  });

  it("accepts internal_activity when a real activity is chosen", () => {
    const result = scheduleFormSchema.safeParse({
      ...base,
      type: "internal_activity",
      activity_id: "activity-1",
    });
    expect(result.success).toBe(true);
  });

  it("does not require an activity for external_booking or blocked types", () => {
    expect(scheduleFormSchema.safeParse({ ...base, type: "external_booking" }).success).toBe(true);
    expect(scheduleFormSchema.safeParse({ ...base, type: "blocked" }).success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(scheduleFormSchema.safeParse({ ...base, area_id: "" }).success).toBe(false);
    expect(scheduleFormSchema.safeParse({ ...base, date: "" }).success).toBe(false);
  });
});
