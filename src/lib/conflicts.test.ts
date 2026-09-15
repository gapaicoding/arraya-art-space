import { describe, expect, it } from "vitest";
import { computeScheduleConflicts } from "./conflicts";

describe("computeScheduleConflicts", () => {
  it("returns no conflicts for schedules in different areas", () => {
    const conflicts = computeScheduleConflicts([
      { id: "1", area_id: "area-a", start_at: "2026-01-01T09:00:00Z", end_at: "2026-01-01T10:00:00Z" },
      { id: "2", area_id: "area-b", start_at: "2026-01-01T09:00:00Z", end_at: "2026-01-01T10:00:00Z" },
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it("returns no conflicts for back-to-back schedules in the same area", () => {
    const conflicts = computeScheduleConflicts([
      { id: "1", area_id: "area-a", start_at: "2026-01-01T09:00:00Z", end_at: "2026-01-01T10:00:00Z" },
      { id: "2", area_id: "area-a", start_at: "2026-01-01T10:00:00Z", end_at: "2026-01-01T11:00:00Z" },
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it("detects overlapping schedules in the same area", () => {
    const a = { id: "1", area_id: "area-a", start_at: "2026-01-01T09:00:00Z", end_at: "2026-01-01T10:00:00Z" };
    const b = { id: "2", area_id: "area-a", start_at: "2026-01-01T09:30:00Z", end_at: "2026-01-01T10:30:00Z" };
    const conflicts = computeScheduleConflicts([a, b]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({ a, b });
  });

  it("detects multiple conflicting pairs across three overlapping schedules", () => {
    const a = { id: "1", area_id: "area-a", start_at: "2026-01-01T09:00:00Z", end_at: "2026-01-01T11:00:00Z" };
    const b = { id: "2", area_id: "area-a", start_at: "2026-01-01T09:30:00Z", end_at: "2026-01-01T10:30:00Z" };
    const c = { id: "3", area_id: "area-a", start_at: "2026-01-01T10:00:00Z", end_at: "2026-01-01T12:00:00Z" };
    const conflicts = computeScheduleConflicts([a, b, c]);
    // a-b, a-c, b-c all overlap
    expect(conflicts).toHaveLength(3);
  });

  it("returns no conflicts for an empty list", () => {
    expect(computeScheduleConflicts([])).toHaveLength(0);
  });
});
