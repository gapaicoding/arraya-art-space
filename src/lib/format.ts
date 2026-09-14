import { format, parse } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { id } from "date-fns/locale";

export const APP_TIMEZONE = "Asia/Jakarta";

export function toJakarta(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return toZonedTime(d, APP_TIMEZONE);
}

export function jakartaToUtcIso(date: Date) {
  return fromZonedTime(date, APP_TIMEZONE).toISOString();
}

/**
 * Convert a "YYYY-MM-DD" date + "HH:mm" time — both understood as
 * Asia/Jakarta wall-clock values entered by the user — into a UTC ISO
 * string suitable for storage. This is the ONLY correct way to turn a
 * schedule/booking form input into a timestamp: it must NOT go through
 * `new Date(\`${date}T${time}:00\`)`, because that constructor interprets
 * the string using whatever timezone the server/browser happens to run in,
 * not Asia/Jakarta.
 */
export function localDateTimeToIso(date: string, time: string): string {
  return fromZonedTime(`${date}T${time}:00`, APP_TIMEZONE).toISOString();
}

/**
 * Format a pure calendar date string ("YYYY-MM-DD", e.g. schedules.date)
 * that carries no time-of-day/timezone meaning. Parses it directly as a
 * calendar date instead of routing it through `new Date()` + Jakarta
 * conversion, which can shift the displayed day when the server's local
 * timezone differs from Asia/Jakarta.
 */
export function formatDateOnly(dateStr: string, pattern = "EEEE, d MMMM yyyy") {
  return format(parse(dateStr, "yyyy-MM-dd", new Date()), pattern, { locale: id });
}

export function formatDateTime(date: Date | string, pattern = "d MMM yyyy, HH:mm") {
  return format(toJakarta(date), pattern, { locale: id });
}

export function formatTime(date: Date | string) {
  return format(toJakarta(date), "HH:mm");
}

export function formatDate(date: Date | string, pattern = "EEEE, d MMMM yyyy") {
  return format(toJakarta(date), pattern, { locale: id });
}

export const DAY_NAMES_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];
