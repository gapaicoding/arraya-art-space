import { describe, it, expect } from "vitest";
import { currentWeekRangeJakarta, groupAgendaByDate, type PublicAgendaRow } from "./agenda";
import { localDateTimeToIso } from "./format";

describe("currentWeekRangeJakarta", () => {
  it("returns Monday..Sunday for a mid-week Wednesday", () => {
    // 2024-01-10 is a Wednesday
    const { start, end } = currentWeekRangeJakarta(new Date("2024-01-10T05:00:00.000Z"));
    expect(start).toBe("2024-01-08"); // Monday
    expect(end).toBe("2024-01-14"); // Sunday
  });

  it("treats Sunday as the last day of its own week, not the next week's start", () => {
    // 2024-01-14 is a Sunday
    const { start, end } = currentWeekRangeJakarta(new Date("2024-01-14T05:00:00.000Z"));
    expect(start).toBe("2024-01-08");
    expect(end).toBe("2024-01-14");
  });
});

describe("groupAgendaByDate", () => {
  it("groups rows by date, formats time range, and sorts dates ascending", () => {
    const rows: PublicAgendaRow[] = [
      {
        date: "2024-01-10",
        start_at: localDateTimeToIso("2024-01-10", "09:00"),
        end_at: localDateTimeToIso("2024-01-10", "11:00"),
        activities: { name: "Melukis Kanvas Polos" },
        areas: { name: "Room 1" },
      },
      {
        date: "2024-01-08",
        start_at: localDateTimeToIso("2024-01-08", "13:00"),
        end_at: localDateTimeToIso("2024-01-08", "14:30"),
        activities: { name: "Meronce Manik-Manik" },
        areas: { name: "Room 2" },
      },
    ];

    const groups = groupAgendaByDate(rows);
    expect(groups.map((g) => g.date)).toEqual(["2024-01-08", "2024-01-10"]);
    expect(groups[0].items[0]).toEqual({
      timeRange: "13:00–14:30",
      activityName: "Meronce Manik-Manik",
      areaName: "Room 2",
    });
  });

  it("falls back to placeholder names when activity/area is missing", () => {
    const rows: PublicAgendaRow[] = [
      {
        date: "2024-01-10",
        start_at: localDateTimeToIso("2024-01-10", "09:00"),
        end_at: localDateTimeToIso("2024-01-10", "11:00"),
        activities: null,
        areas: null,
      },
    ];
    const groups = groupAgendaByDate(rows);
    expect(groups[0].items[0].activityName).toBe("Kegiatan");
    expect(groups[0].items[0].areaName).toBe("-");
  });
});
