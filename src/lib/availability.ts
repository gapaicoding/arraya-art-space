import { addHours, format, isBefore, parse } from "date-fns";
import type { Area, BusinessHour, Schedule } from "@/lib/supabase/types";
import { toJakarta } from "@/lib/format";

export type AvailabilityStatus =
  | "AVAILABLE"
  | "INTERNAL_ACTIVITY"
  | "BOOKED"
  | "BLOCKED"
  | "CLOSED";

export interface AvailabilitySlot {
  /** "HH:mm" in Asia/Jakarta */
  time: string;
  status: AvailabilityStatus;
  schedule?: Schedule;
}

export interface AreaAvailability {
  area: Area;
  slots: AvailabilitySlot[];
}

function scheduleTypeToStatus(type: Schedule["type"]): AvailabilityStatus {
  if (type === "internal_activity") return "INTERNAL_ACTIVITY";
  if (type === "external_booking") return "BOOKED";
  return "BLOCKED";
}

/**
 * Build the list of hourly slot start-times ("HH:mm") between open_time and
 * close_time for a given business-hours row. Presentation-only per PRD 7.8 —
 * the DB never stores these as records.
 */
export function buildHourSlots(openTime: string, closeTime: string): string[] {
  const slots: string[] = [];
  const base = parse(openTime, "HH:mm", new Date(0));
  const end = parse(closeTime, "HH:mm", new Date(0));
  let cursor = base;
  while (isBefore(cursor, end)) {
    slots.push(format(cursor, "HH:mm"));
    cursor = addHours(cursor, 1);
  }
  return slots;
}

/**
 * Compute per-hour availability status for a single area on a given date,
 * per PRD 7.9: Business Hours + Area Status + Existing Schedule.
 */
export function computeAreaAvailability(
  area: Area,
  date: string,
  businessHour: BusinessHour | undefined,
  schedulesForArea: Schedule[],
): AreaAvailability {
  if (area.status === "inactive" || !businessHour || businessHour.is_closed || !businessHour.open_time || !businessHour.close_time) {
    // Fully closed for the day — still show a single CLOSED marker slot.
    return {
      area,
      slots: [{ time: "-", status: "CLOSED" }],
    };
  }

  const hourStarts = buildHourSlots(businessHour.open_time, businessHour.close_time);
  const activeSchedules = schedulesForArea.filter(
    (s) => s.status !== "cancelled" && s.date === date,
  );

  const slots: AvailabilitySlot[] = hourStarts.map((time) => {
    const slotStart = parse(time, "HH:mm", new Date(`${date}T00:00:00`));
    const slotEnd = addHours(slotStart, 1);

    const match = activeSchedules.find((s) => {
      const sStart = toJakarta(s.start_at);
      const sEnd = toJakarta(s.end_at);
      return isBefore(sStart, slotEnd) && isBefore(slotStart, sEnd);
    });

    if (match) {
      return { time, status: scheduleTypeToStatus(match.type), schedule: match };
    }
    return { time, status: "AVAILABLE" };
  });

  return { area, slots };
}

/**
 * Compute availability for a set of areas on a given date.
 */
export function computeAvailability(
  areas: Area[],
  date: string,
  businessHours: BusinessHour[],
  schedules: Schedule[],
): AreaAvailability[] {
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  const businessHour = businessHours.find((h) => h.day_of_week === dayOfWeek);

  return areas.map((area) => {
    const schedulesForArea = schedules.filter((s) => s.area_id === area.id);
    return computeAreaAvailability(area, date, businessHour, schedulesForArea);
  });
}

export const STATUS_LABEL_ID: Record<AvailabilityStatus, string> = {
  AVAILABLE: "Tersedia",
  INTERNAL_ACTIVITY: "Aktivitas Internal",
  BOOKED: "Booking",
  BLOCKED: "Diblokir",
  CLOSED: "Tutup",
};

export const STATUS_BADGE_CLASS: Record<AvailabilityStatus, string> = {
  AVAILABLE: "bg-mint/40 text-emerald-800 border-mint/60",
  INTERNAL_ACTIVITY: "bg-accentv/30 text-accentv-ink border-accentv/50",
  BOOKED: "bg-brand/30 text-brand-ink border-brand/50",
  BLOCKED: "bg-amber-200/60 text-amber-900 border-amber-300",
  CLOSED: "bg-muted text-muted-ink border-border",
};
