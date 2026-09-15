import { describe, expect, it } from "vitest";
import { bookingFormSchema, exceedsAreaCapacity } from "./booking-validation";

const base = {
  customer_organizer_name: "PT Kreasi Anak",
  area_id: "area-1",
  date: "2026-01-01",
  start_time: "09:00",
  end_time: "10:00",
};

describe("bookingFormSchema", () => {
  it("accepts a minimal valid booking", () => {
    expect(bookingFormSchema.safeParse(base).success).toBe(true);
  });

  it("requires a customer/organizer name", () => {
    expect(bookingFormSchema.safeParse({ ...base, customer_organizer_name: "" }).success).toBe(
      false,
    );
  });

  it("rejects end_time not after start_time", () => {
    const result = bookingFormSchema.safeParse({ ...base, start_time: "10:00", end_time: "10:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("end_time"))).toBe(true);
    }
  });

  it("rejects a non-positive participant_count", () => {
    expect(bookingFormSchema.safeParse({ ...base, participant_count: 0 }).success).toBe(false);
    expect(bookingFormSchema.safeParse({ ...base, participant_count: -3 }).success).toBe(false);
  });

  it("accepts a booking with no participant_count specified", () => {
    expect(bookingFormSchema.safeParse(base).success).toBe(true);
  });
});

describe("exceedsAreaCapacity", () => {
  it("is false when participant_count is within capacity", () => {
    expect(exceedsAreaCapacity(5, 5)).toBe(false);
    expect(exceedsAreaCapacity(3, 5)).toBe(false);
  });

  it("is true when participant_count exceeds capacity", () => {
    expect(exceedsAreaCapacity(6, 5)).toBe(true);
  });

  it("is false when participant_count is not specified", () => {
    expect(exceedsAreaCapacity(undefined, 5)).toBe(false);
  });

  it("is false for participant_count of 0 (falsy, treated as unspecified)", () => {
    expect(exceedsAreaCapacity(0, 5)).toBe(false);
  });
});
