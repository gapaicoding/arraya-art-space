"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import type {
  Activity,
  Area,
  BusinessHour,
  Organizer,
  Schedule,
} from "@/lib/supabase/types";
import {
  computeAvailability,
  STATUS_BADGE_CLASS,
  STATUS_LABEL_ID,
} from "@/lib/availability";
import { formatDate, formatDateOnly, formatTime, DAY_NAMES_ID, localDateTimeToIso } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

type ScheduleWithRelations = Schedule & {
  areas?: { name: string; code: string } | null;
  activities?: { name: string } | null;
  organizers?: { name: string } | null;
};

const schema = z
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
  .refine((v) => v.type !== "internal_activity" || (v.activity_id && v.activity_id !== NONE), {
    message: "Aktivitas wajib dipilih untuk internal activity",
    path: ["activity_id"],
  });

type FormValues = z.infer<typeof schema>;

const TYPE_LABEL_ID: Record<Schedule["type"], string> = {
  internal_activity: "Aktivitas Internal",
  external_booking: "Booking Eksternal",
  blocked: "Blocked",
};

const SCHEDULE_STATUS_LABEL_ID: Record<Schedule["status"], string> = {
  draft: "Draft",
  confirmed: "Konfirmasi",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

export function ScheduleClient({
  initialAreas,
  activities,
  organizers,
  businessHours,
  initialDate,
  initialSchedules,
}: {
  initialAreas: Area[];
  activities: Activity[];
  organizers: Organizer[];
  businessHours: BusinessHour[];
  initialDate: string;
  initialSchedules: ScheduleWithRelations[];
}) {
  const [areas] = useState<Area[]>(initialAreas);
  const [date, setDate] = useState(initialDate);
  const [schedules, setSchedules] = useState<ScheduleWithRelations[]>(initialSchedules);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleWithRelations | null>(null);
  const [tab, setTab] = useState("list");

  const activeAreas = useMemo(() => areas.filter((a) => a.status === "active"), [areas]);

  async function loadSchedules(forDate: string) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("schedules")
      .select("*, areas(name, code), activities(name), organizers(name)")
      .eq("date", forDate)
      .order("start_at", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error("Gagal memuat jadwal: " + error.message);
      return;
    }
    setSchedules((data as any) ?? []);
  }

  useEffect(() => {
    loadSchedules(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: initialDate,
      area_id: "",
      type: "internal_activity",
      activity_id: NONE,
      organizer_id: NONE,
      start_time: "09:00",
      end_time: "10:00",
      notes: "",
    },
  });

  const watchType = form.watch("type");

  function openCreate() {
    setEditing(null);
    form.reset({
      date,
      area_id: "",
      type: "internal_activity",
      activity_id: NONE,
      organizer_id: NONE,
      start_time: "09:00",
      end_time: "10:00",
      notes: "",
    });
    setOpen(true);
  }

  function openEdit(s: ScheduleWithRelations) {
    setEditing(s);
    form.reset({
      date: s.date,
      area_id: s.area_id,
      type: s.type,
      activity_id: s.activity_id ?? NONE,
      organizer_id: s.organizer_id ?? NONE,
      start_time: formatTime(s.start_at),
      end_time: formatTime(s.end_at),
      capacity: s.capacity ?? undefined,
      notes: s.notes ?? "",
    });
    setOpen(true);
  }

  function businessHourFor(dateStr: string) {
    const dow = new Date(`${dateStr}T00:00:00`).getDay();
    return businessHours.find((h) => h.day_of_week === dow);
  }

  async function onSubmit(values: FormValues) {
    const bh = businessHourFor(values.date);
    if (!bh || bh.is_closed || !bh.open_time || !bh.close_time) {
      toast.error(`Arayya tutup pada hari ${DAY_NAMES_ID[new Date(`${values.date}T00:00:00`).getDay()]}.`);
      return;
    }
    if (values.start_time < bh.open_time || values.end_time > bh.close_time) {
      toast.error(
        `Jadwal harus berada dalam jam operasional (${bh.open_time}–${bh.close_time}).`,
      );
      return;
    }

    const area = areas.find((a) => a.id === values.area_id);
    if (!area || area.status !== "active") {
      toast.error("Area tidak aktif dan tidak dapat menerima jadwal baru.");
      return;
    }

    const start_at = localDateTimeToIso(values.date, values.start_time);
    const end_at = localDateTimeToIso(values.date, values.end_time);

    const supabase = createClient();

    // Client-side pre-check (friendly UX) — DB exclusion constraint is the
    // real authority (PRD 8.1).
    const { data: existing } = await supabase
      .from("schedules")
      .select("id, start_at, end_at, status")
      .eq("area_id", values.area_id)
      .eq("date", values.date)
      .neq("status", "cancelled");

    const conflict = (existing ?? []).some((s) => {
      if (editing && s.id === editing.id) return false;
      return new Date(s.start_at) < new Date(end_at) && new Date(start_at) < new Date(s.end_at);
    });
    if (conflict) {
      toast.error("Jadwal bertabrakan dengan jadwal lain di area ini.");
      return;
    }

    const payload = {
      area_id: values.area_id,
      activity_id: values.type === "internal_activity" && values.activity_id !== NONE ? values.activity_id : null,
      organizer_id: values.organizer_id !== NONE ? values.organizer_id : null,
      type: values.type,
      date: values.date,
      start_at,
      end_at,
      capacity: values.capacity ?? null,
      notes: values.notes ?? null,
    };

    if (editing) {
      const { error } = await supabase.from("schedules").update(payload).eq("id", editing.id);
      if (error) {
        toast.error(mapScheduleError(error));
        return;
      }
      toast.success("Jadwal diperbarui");
    } else {
      const { error } = await supabase.from("schedules").insert({ ...payload, status: "confirmed" });
      if (error) {
        toast.error(mapScheduleError(error));
        return;
      }
      toast.success("Jadwal ditambahkan");
    }
    setOpen(false);
    if (values.date === date) {
      loadSchedules(date);
    } else {
      setDate(values.date);
    }
  }

  function mapScheduleError(error: { code?: string; message: string }) {
    if (error.code === "23P01" || error.code === "23505") {
      return "Jadwal bertabrakan dengan jadwal lain di area ini.";
    }
    if (error.code === "23514") {
      return "Data jadwal tidak valid (misalnya jam selesai harus setelah jam mulai, atau kapasitas tidak sesuai). Periksa kembali isian Anda.";
    }
    if (error.code === "23503") {
      return "Area, aktivitas, atau organizer yang dipilih sudah tidak tersedia (mungkin telah dihapus). Silakan pilih ulang.";
    }
    return "Gagal menyimpan jadwal. Silakan coba lagi atau hubungi admin jika berlanjut.";
  }

  async function cancelSchedule(s: ScheduleWithRelations) {
    const supabase = createClient();
    const { error } = await supabase.from("schedules").update({ status: "cancelled" }).eq("id", s.id);
    if (error) {
      toast.error(mapScheduleError(error));
      return;
    }
    toast.success("Jadwal dibatalkan");
    loadSchedules(date);
  }

  const availability = useMemo(
    () => computeAvailability(activeAreas, date, businessHours, schedules),
    [activeAreas, date, businessHours, schedules],
  );

  return (
    <AppShell
      title="Jadwal"
      subtitle="Kelola jadwal & lihat availability area"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <PrimaryButton onClick={openCreate}>+ Jadwal Baru</PrimaryButton>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="area_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih area" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeAreas.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} ({a.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Jadwal</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="internal_activity">Aktivitas Internal</SelectItem>
                          <SelectItem value="external_booking">Booking Eksternal</SelectItem>
                          <SelectItem value="blocked">Blocked Time</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchType === "internal_activity" && (
                  <FormField
                    control={form.control}
                    name="activity_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aktivitas</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pilih aktivitas" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activities.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="organizer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organizer (opsional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>Tidak ada</SelectItem>
                          {organizers.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jam Mulai</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jam Selesai</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kapasitas (opsional)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Simpan
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="glass rounded-[22px] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          <p className="text-sm text-muted-ink">{formatDateOnly(date)}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">Daftar Jadwal</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <div className="glass rounded-[22px] p-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jam</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatTime(s.start_at)}–{formatTime(s.end_at)}
                      </TableCell>
                      <TableCell>{s.areas?.name ?? "-"}</TableCell>
                      <TableCell>{TYPE_LABEL_ID[s.type]}</TableCell>
                      <TableCell>
                        {s.activities?.name ?? s.organizers?.name ?? s.notes ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === "cancelled" ? "secondary" : "default"}>
                          {SCHEDULE_STATUS_LABEL_ID[s.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {s.status !== "cancelled" && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  Batalkan
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Batalkan jadwal ini?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Availability area akan terbuka kembali setelah jadwal dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => cancelSchedule(s)}>
                                    Ya, Batalkan
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && schedules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-ink">
                        Tidak ada jadwal pada tanggal ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <div className="space-y-3">
            {availability.map(({ area, slots }) => (
              <div key={area.id} className="glass rounded-[22px] p-4">
                <p className="mb-3 font-semibold">
                  {area.name} <span className="text-sm text-faint-ink">({area.code})</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium ${STATUS_BADGE_CLASS[slot.status]}`}
                    >
                      <div className="font-semibold">{slot.time}</div>
                      <div>{STATUS_LABEL_ID[slot.status]}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {availability.length === 0 && (
              <div className="glass rounded-[22px] p-6 text-center text-muted-ink">
                Tidak ada area aktif.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
