import { differenceInMinutes, eachDayOfInterval, parse } from "date-fns";
import type { BookingStatus } from "./supabase/types";

export type BookingStatusSummary = Record<BookingStatus, number>;

/** Count bookings per status within a filtered set of rows. */
export function summarizeBookingStatus(rows: { status: BookingStatus }[]): BookingStatusSummary {
  const summary: BookingStatusSummary = { pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
  for (const row of rows) {
    summary[row.status] += 1;
  }
  return summary;
}

export type BusinessHourRow = {
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

/**
 * Total operational minutes across every day in [start, end] (inclusive),
 * from the weekly `business_hours` schedule. `start`/`end` are "YYYY-MM-DD".
 */
export function calculateOperationalMinutes(
  businessHours: BusinessHourRow[],
  start: string,
  end: string,
): number {
  const byDay = new Map(businessHours.map((h) => [h.day_of_week, h]));
  const days = eachDayOfInterval({
    start: parse(start, "yyyy-MM-dd", new Date()),
    end: parse(end, "yyyy-MM-dd", new Date()),
  });
  let totalMinutes = 0;
  for (const day of days) {
    const hours = byDay.get(day.getDay());
    if (!hours || hours.is_closed || !hours.open_time || !hours.close_time) continue;
    const open = parse(hours.open_time, "HH:mm:ss", day);
    const close = parse(hours.close_time, "HH:mm:ss", day);
    totalMinutes += Math.max(0, differenceInMinutes(close, open));
  }
  return totalMinutes;
}

/**
 * Occupancy rate: minutes booked by non-cancelled schedules (any type —
 * `blocked` also makes an area unavailable to others) divided by total
 * operational minutes in range. Returns a 0–100 percentage, rounded to one
 * decimal. Returns 0 when there are no operational minutes to divide by.
 */
export function calculateOccupancyRate(
  scheduleDurationsMinutes: number[],
  operationalMinutes: number,
): number {
  if (operationalMinutes <= 0) return 0;
  const bookedMinutes = scheduleDurationsMinutes.reduce((sum, m) => sum + m, 0);
  return Math.round((bookedMinutes / operationalMinutes) * 1000) / 10;
}

export type BookingTrendPoint = { date: string; count: number };

/**
 * Daily booking counts across [start, end] (inclusive), with days that have
 * no bookings filled in as 0 so the trend line has no gaps.
 */
export function buildBookingTrend(
  rows: { date: string }[],
  start: string,
  end: string,
): BookingTrendPoint[] {
  const countsByDate = new Map<string, number>();
  for (const row of rows) {
    countsByDate.set(row.date, (countsByDate.get(row.date) ?? 0) + 1);
  }
  const days = eachDayOfInterval({
    start: parse(start, "yyyy-MM-dd", new Date()),
    end: parse(end, "yyyy-MM-dd", new Date()),
  });
  return days.map((day) => {
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return { date: key, count: countsByDate.get(key) ?? 0 };
  });
}
