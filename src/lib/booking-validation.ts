import { z } from "zod";

export const bookingFormSchema = z
  .object({
    customer_organizer_name: z.string().min(1, "Nama customer/organizer wajib diisi"),
    contact_person: z.string().optional(),
    phone: z.string().optional(),
    area_id: z.string().min(1, "Area wajib dipilih"),
    date: z.string().min(1, "Tanggal wajib diisi"),
    start_time: z.string().min(1, "Jam mulai wajib diisi"),
    end_time: z.string().min(1, "Jam selesai wajib diisi"),
    participant_count: z.coerce.number().int().positive().optional().or(z.literal(undefined)),
    purpose: z.string().optional(),
    activity_id: z.string().optional(),
    organizer_id: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.end_time > v.start_time, {
    message: "Jam selesai harus setelah jam mulai",
    path: ["end_time"],
  });

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

/**
 * Client-side pre-check mirroring the capacity validation the
 * create_booking Postgres function also enforces server-side (the DB is
 * the real authority — this is only for a fast, friendly error message).
 */
export function exceedsAreaCapacity(
  participantCount: number | undefined,
  areaCapacity: number,
): boolean {
  return !!participantCount && participantCount > areaCapacity;
}
