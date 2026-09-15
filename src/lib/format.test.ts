import { describe, it, expect } from "vitest";
import { localDateTimeToIso, formatDateOnly, APP_TIMEZONE } from "./format";

describe("localDateTimeToIso", () => {
  it("converts a Jakarta wall-clock time to the correct UTC ISO string", () => {
    // Asia/Jakarta is UTC+7, no DST.
    // 2024-01-15 10:00 Jakarta -> 2024-01-15 03:00 UTC
    expect(localDateTimeToIso("2024-01-15", "10:00")).toBe(
      "2024-01-15T03:00:00.000Z",
    );
  });

  it("shifts the calendar day back when Jakarta time is early morning", () => {
    // 2024-01-15 00:30 Jakarta -> 2024-01-14 17:30 UTC (previous day in UTC)
    expect(localDateTimeToIso("2024-01-15", "00:30")).toBe(
      "2024-01-14T17:30:00.000Z",
    );
  });

  it("handles a time close to midnight without off-by-one day errors", () => {
    // 2024-06-01 23:30 Jakarta -> 2024-06-01 16:30 UTC (same UTC day)
    expect(localDateTimeToIso("2024-06-01", "23:30")).toBe(
      "2024-06-01T16:30:00.000Z",
    );
  });
});

describe("formatDateOnly", () => {
  it("formats a pure YYYY-MM-DD date string as an Indonesian date, independent of timezone", () => {
    // 2024-01-15 is a Monday ("Senin")
    expect(formatDateOnly("2024-01-15")).toBe("Senin, 15 Januari 2024");
  });

  it("does not shift the day even for dates near a UTC offset boundary", () => {
    // If this routed through new Date() + Jakarta conversion incorrectly,
    // a date like 2024-01-01 could shift to Dec 31 in some environments.
    expect(formatDateOnly("2024-01-01")).toBe("Senin, 1 Januari 2024");
  });

  it("respects a custom format pattern", () => {
    expect(formatDateOnly("2024-03-10", "yyyy-MM-dd")).toBe("2024-03-10");
  });
});

describe("APP_TIMEZONE", () => {
  it("is Asia/Jakarta", () => {
    expect(APP_TIMEZONE).toBe("Asia/Jakarta");
  });
});
