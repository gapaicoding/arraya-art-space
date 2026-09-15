import { z } from "zod";

export const SCHEDULE_NONE = "__none__";

export const scheduleFormSchema = z
  .object({
    date: z.string().min(1, "Tanggal wajib diisi"),
    area_id: z.string().min(1, "Area wajib dipilih"),
    type: z.enum(["internal_activity", "external_booking", "blocked"]),
    activity_id: z.string().optional(),
    organizer_id: z.string().optional(),
    start_time: z.string().min(1, "Jam mulai wajib diisi"),
    end_time: z.string().min(1, "Jam selesai wajib diisi"),
    capacity: z.coerce.number().int().positive().optional().or(z.literal(undefined)),
    notes: z.string().optional(),
  })
  .refine((v) => v.end_time > v.start_time, {
    message: "Jam selesai harus setelah jam mulai",
    path: ["end_time"],
  })
  .refine((v) => v.type !== "internal_activity" || (v.activity_id && v.activity_id !== SCHEDULE_NONE), {
    message: "Aktivitas wajib dipilih untuk internal activity",
    path: ["activity_id"],
  });

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;
