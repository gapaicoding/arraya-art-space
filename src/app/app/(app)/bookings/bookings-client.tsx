"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { bookingFormSchema, exceedsAreaCapacity } from "@/lib/booking-validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { TableSkeletonRows } from "@/components/skeletons/table-skeleton-rows";
import { createClient } from "@/lib/supabase/client";
import type { Activity, Area, Booking, BookingStatus, Organizer } from "@/lib/supabase/types";
import { formatDate, formatDateOnly, formatTime, localDateTimeToIso } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
const ALL = "__all__";

type BookingWithSchedule = Booking & {
  schedules?: {
    area_id: string;
    date: string;
    start_at: string;
    end_at: string;
    status: string;
    areas?: { name: string; code: string } | null;
  } | null;
};

const STATUS_LABEL_ID: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Konfirmasi",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

const STATUS_BADGE_VARIANT: Record<BookingStatus, "default" | "secondary" | "outline"> = {
  pending: "outline",
  confirmed: "default",
  cancelled: "secondary",
  completed: "secondary",
};

const schema = bookingFormSchema;

type FormValues = z.infer<typeof schema>;

export const PAGE_SIZE = 20;

export function BookingsClient({
  initialBookings,
  initialCount,
  areas,
  organizers,
  activities,
}: {
  initialBookings: BookingWithSchedule[];
  initialCount: number;
  areas: Area[];
  organizers: Organizer[];
  activities: Activity[];
}) {
  const [bookings, setBookings] = useState<BookingWithSchedule[]>(initialBookings);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<BookingWithSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Search and status filter are both server-side (with pagination) so the
  // whole bookings table never has to load into the browser at once. Note:
  // unlike before, search no longer matches against the joined area name
  // (that requires a fragile cross-table filter) — only booking number and
  // customer/organizer name.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(
      () => loadBookings(1, search, statusFilter),
      search === "" ? 0 : 300,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  async function loadBookings(targetPage: number, searchValue: string, status: string) {
    setLoading(true);
    const supabase = createClient();
    const from = (targetPage - 1) * PAGE_SIZE;
    let query = supabase
      .from("bookings")
      .select("*, schedules(area_id, date, start_at, end_at, status, areas(name, code))", {
        count: "exact",
      });
    if (status !== ALL) {
      query = query.eq("status", status);
    }
    if (searchValue) {
      query = query.or(
        `customer_organizer_name.ilike.%${searchValue}%,booking_number.ilike.%${searchValue}%`,
      );
    }
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      toast.error("Gagal memuat data: " + error.message);
      setLoading(false);
      return;
    }
    setBookings((data as any) ?? []);
    setTotalCount(count ?? 0);
    setPage(targetPage);
    setLoading(false);
  }

  function goToPage(targetPage: number) {
    if (targetPage < 1 || targetPage > totalPages) return;
    loadBookings(targetPage, search, statusFilter);
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customer_organizer_name: "",
      contact_person: "",
      phone: "",
      area_id: "",
      date: formatDate(new Date(), "yyyy-MM-dd"),
      start_time: "09:00",
      end_time: "10:00",
      purpose: "",
      activity_id: NONE,
      organizer_id: NONE,
      notes: "",
    },
  });

  function openCreate() {
    form.reset({
      customer_organizer_name: "",
      contact_person: "",
      phone: "",
      area_id: "",
      date: formatDate(new Date(), "yyyy-MM-dd"),
      start_time: "09:00",
      end_time: "10:00",
      purpose: "",
      activity_id: NONE,
      organizer_id: NONE,
      notes: "",
    });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    const area = areas.find((a) => a.id === values.area_id);
    if (area && exceedsAreaCapacity(values.participant_count, area.capacity)) {
      toast.error(`Jumlah peserta melebihi kapasitas area (${area.capacity}).`);
      return;
    }

    const start_at = localDateTimeToIso(values.date, values.start_time);
    const end_at = localDateTimeToIso(values.date, values.end_time);

    const supabase = createClient();
    const { error } = await supabase.rpc("create_booking", {
      p_area_id: values.area_id,
      p_date: values.date,
      p_start_at: start_at,
      p_end_at: end_at,
      p_customer_organizer_name: values.customer_organizer_name,
      p_contact_person: values.contact_person || null,
      p_phone: values.phone || null,
      p_participant_count: values.participant_count ?? null,
      p_purpose: values.purpose || null,
      p_notes: values.notes || null,
      p_organizer_id: values.organizer_id !== NONE ? values.organizer_id : null,
      p_activity_id: values.activity_id !== NONE ? values.activity_id : null,
    });

    if (error) {
      toast.error(mapBookingError(error));
      return;
    }

    toast.success("Booking berhasil dibuat");
    setOpen(false);
    loadBookings(1, search, statusFilter);
  }

  async function changeStatus(booking: BookingWithSchedule, status: BookingStatus) {
    const supabase = createClient();
    if (status === "cancelled") {
      const { error } = await supabase.rpc("cancel_booking", { p_booking_id: booking.id });
      if (error) {
        toast.error(mapBookingError(error));
        return;
      }
      toast.success("Booking dibatalkan, availability area terbuka kembali.");
    } else {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", booking.id);
      if (error) {
        toast.error(mapBookingError(error));
        return;
      }
      toast.success("Status booking diperbarui");
    }
    setDetail(null);
    loadBookings(page, search, statusFilter);
  }

  function mapBookingError(error: { code?: string; message?: string }) {
    const msg = error.message ?? "";
    if (error.code === "23P01" || error.code === "23505" || msg.toLowerCase().includes("overlap")) {
      return "Jadwal bertabrakan dengan jadwal lain di area ini.";
    }
    if (error.code === "57014") {
      // Statement timeout — under heavy lock contention on the same slot,
      // Postgres can time out waiting instead of returning a clean 23P01.
      // Most likely cause is the same conflict, just surfaced differently.
      return "Permintaan memakan waktu terlalu lama, kemungkinan karena ada booking lain yang sedang diproses di jam yang sama. Muat ulang halaman untuk memeriksa apakah booking sudah tersimpan sebelum mencoba lagi.";
    }
    if (error.code === "23514") {
      return "Data booking tidak valid (misalnya jam selesai harus setelah jam mulai, atau jumlah peserta melebihi kapasitas). Periksa kembali isian Anda.";
    }
    if (error.code === "23503") {
      return "Area, aktivitas, atau organizer yang dipilih sudah tidak tersedia (mungkin telah dihapus). Silakan pilih ulang.";
    }
    return "Gagal memproses booking. Silakan coba lagi atau hubungi admin jika berlanjut.";
  }

  return (
    <AppShell
      title="Booking"
      subtitle="Reservasi eksternal & pihak ketiga"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <PrimaryButton onClick={openCreate}>+ Booking Baru</PrimaryButton>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Buat Booking Baru</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="customer_organizer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Customer / Organizer</FormLabel>
                      <FormControl>
                        <Input placeholder="PT Kreasi Anak" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telepon</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                          {areas.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} ({a.code}) — kapasitas {a.capacity}
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
                  name="participant_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Peserta</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tujuan / Aktivitas</FormLabel>
                      <FormControl>
                        <Input placeholder="Birthday party" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="activity_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aktivitas Terkait (opsional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NONE}>Tidak ada</SelectItem>
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
                  Simpan Booking
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="glass rounded-[22px] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Cari nama customer/organizer atau no. booking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Konfirmasi</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass rounded-[22px] p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Booking</TableHead>
                <TableHead>Customer/Organizer</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Tanggal & Jam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableSkeletonRows columns={6} rows={4} />}
              {!loading && bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.booking_number}</TableCell>
                  <TableCell>{b.customer_organizer_name}</TableCell>
                  <TableCell>{b.schedules?.areas?.name ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {b.schedules ? (
                      <>
                        {formatDateOnly(b.schedules.date, "d MMM yyyy")}
                        <br />
                        {formatTime(b.schedules.start_at)}–{formatTime(b.schedules.end_at)}
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[b.status]}>{STATUS_LABEL_ID[b.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setDetail(b)}>
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-ink">
                    Tidak ada booking.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {totalCount > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-ink">
            <p>
              Halaman {page} dari {totalPages} ({totalCount} booking)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>Booking {detail.booking_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-ink">Customer/Organizer: </span>
                  {detail.customer_organizer_name}
                </p>
                <p>
                  <span className="text-muted-ink">Contact Person: </span>
                  {detail.contact_person ?? "-"}
                </p>
                <p>
                  <span className="text-muted-ink">Telepon: </span>
                  {detail.phone ?? "-"}
                </p>
                <p>
                  <span className="text-muted-ink">Area: </span>
                  {detail.schedules?.areas?.name ?? "-"}
                </p>
                <p>
                  <span className="text-muted-ink">Tanggal: </span>
                  {detail.schedules ? formatDateOnly(detail.schedules.date) : "-"}
                </p>
                <p>
                  <span className="text-muted-ink">Jam: </span>
                  {detail.schedules
                    ? `${formatTime(detail.schedules.start_at)}–${formatTime(detail.schedules.end_at)}`
                    : "-"}
                </p>
                <p>
                  <span className="text-muted-ink">Jumlah Peserta: </span>
                  {detail.participant_count ?? "-"}
                </p>
                <p>
                  <span className="text-muted-ink">Tujuan: </span>
                  {detail.purpose ?? "-"}
                </p>
                <p>
                  <span className="text-muted-ink">Catatan: </span>
                  {detail.notes ?? "-"}
                </p>
                <p>
                  <span className="text-muted-ink">Status: </span>
                  <Badge variant={STATUS_BADGE_VARIANT[detail.status]}>{STATUS_LABEL_ID[detail.status]}</Badge>
                </p>
              </div>
              {detail.status !== "cancelled" && detail.status !== "completed" && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {detail.status === "pending" && (
                    <Button size="sm" onClick={() => changeStatus(detail, "confirmed")}>
                      Konfirmasi
                    </Button>
                  )}
                  {detail.status === "confirmed" && (
                    <Button size="sm" onClick={() => changeStatus(detail, "completed")}>
                      Selesaikan
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        Batalkan Booking
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Batalkan booking ini?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Jadwal terkait juga akan dibatalkan sehingga area kembali tersedia.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => changeStatus(detail, "cancelled")}>
                          Ya, Batalkan
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
