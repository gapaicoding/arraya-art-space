import { startOfWeek, endOfWeek, format } from "date-fns";
import { toJakarta, formatTime } from "./format";

/** Monday–Sunday range (as "YYYY-MM-DD", Asia/Jakarta) containing `now`. */
export function currentWeekRangeJakarta(now: Date = new Date()) {
  const jakartaNow = toJakarta(now);
  return {
    start: format(startOfWeek(jakartaNow, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    end: format(endOfWeek(jakartaNow, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
}

export type PublicAgendaRow = {
  date: string;
  start_at: string;
  end_at: string;
  activities: { name: string } | null;
  areas: { name: string } | null;
};

export type AgendaDayGroup = {
  date: string;
  items: { timeRange: string; activityName: string; areaName: string }[];
};

/** Group and format raw schedule rows into per-day agenda entries for display. */
export function groupAgendaByDate(rows: PublicAgendaRow[]): AgendaDayGroup[] {
  const byDate = new Map<string, AgendaDayGroup["items"]>();
  for (const row of rows) {
    const items = byDate.get(row.date) ?? [];
    items.push({
      timeRange: `${formatTime(row.start_at)}–${formatTime(row.end_at)}`,
      activityName: row.activities?.name ?? "Kegiatan",
      areaName: row.areas?.name ?? "-",
    });
    byDate.set(row.date, items);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, items }));
}
