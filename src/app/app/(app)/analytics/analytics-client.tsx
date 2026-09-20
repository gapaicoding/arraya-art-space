"use client";

import { useEffect, useRef, useState } from "react";
import { differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import type { Area, BookingStatus } from "@/lib/supabase/types";
import {
  summarizeBookingStatus,
  calculateOperationalMinutes,
  calculateOccupancyRate,
  buildBookingTrend,
  type BusinessHourRow,
} from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_AREAS = "__all__";

const STATUS_LABEL_ID: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Konfirmasi",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

type ScheduleRow = {
  id: string;
  date: string;
  start_at: string;
  end_at: string;
  area_id: string;
  bookings: { status: BookingStatus }[];
};

export function AnalyticsClient({
  initialStart,
  initialEnd,
  initialAreaId,
  areas,
  businessHours,
  initialSchedules,
}: {
  initialStart: string;
  initialEnd: string;
  initialAreaId: string | null;
  areas: Area[];
  businessHours: BusinessHourRow[];
  initialSchedules: ScheduleRow[];
}) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [areaId, setAreaId] = useState<string>(initialAreaId ?? ALL_AREAS);
  const [schedules, setSchedules] = useState<ScheduleRow[]>(initialSchedules);
  const [loading, setLoading] = useState(false);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadSchedules(start, end, areaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, areaId]);

  async function loadSchedules(rangeStart: string, rangeEnd: string, area: string) {
    if (rangeStart > rangeEnd) {
      toast.error("Tanggal mulai harus sebelum atau sama dengan tanggal akhir.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("schedules")
      .select("id, date, start_at, end_at, area_id, bookings(status)")
      .gte("date", rangeStart)
      .lte("date", rangeEnd)
      .neq("status", "cancelled");
    if (area !== ALL_AREAS) {
      query = query.eq("area_id", area);
    }
    const { data, error } = await query;
    if (error) {
      toast.error("Gagal memuat data: " + error.message);
      setLoading(false);
      return;
    }
    setSchedules((data as any) ?? []);
    setLoading(false);
  }

  const bookingRows = schedules.flatMap((s) => s.bookings ?? []);
  const statusSummary = summarizeBookingStatus(bookingRows);
  const totalBookings = bookingRows.length;

  const operationalMinutes = calculateOperationalMinutes(businessHours, start, end);
  const scheduleDurations = schedules.map((s) =>
    Math.max(0, differenceInMinutes(new Date(s.end_at), new Date(s.start_at))),
  );
  const occupancyRate = calculateOccupancyRate(scheduleDurations, operationalMinutes);

  const trend = buildBookingTrend(
    schedules
      .filter((s) => (s.bookings?.length ?? 0) > 0)
      .map((s) => ({ date: s.date })),
    start,
    end,
  );
  const maxTrendCount = Math.max(1, ...trend.map((t) => t.count));

  return (
    <>
      <PageHeader title="Analytic" subtitle="Laporan & metrik operasional" />
      <div className="glass rounded-[22px] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-ink">Tanggal mulai</label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-ink">Tanggal akhir</label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-ink">Area</label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_AREAS}>Semua Area</SelectItem>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Booking" value={loading ? "…" : String(totalBookings)} />
        <StatCard label="Pending" value={loading ? "…" : String(statusSummary.pending)} />
        <StatCard label="Konfirmasi" value={loading ? "…" : String(statusSummary.confirmed)} />
        <StatCard label="Selesai" value={loading ? "…" : String(statusSummary.completed)} />
        <StatCard label="Okupansi Area" value={loading ? "…" : `${occupancyRate}%`} />
      </div>

      <div className="glass rounded-[22px] p-4">
        <p className="font-display text-base font-bold">Tren Booking</p>
        <p className="mt-1 text-sm text-muted-ink">
          Jumlah booking per hari pada periode {start} – {end}.
        </p>
        <div className="mt-4 overflow-x-auto">
          {trend.length === 0 || loading ? (
            <p className="py-8 text-center text-sm text-muted-ink">
              {loading ? "Memuat…" : "Tidak ada data pada periode ini."}
            </p>
          ) : (
            <div className="flex h-40 min-w-full gap-1">
              {trend.map((point) => (
                <div
                  key={point.date}
                  className="group relative h-full flex-1 min-w-[6px]"
                  title={`${point.date}: ${point.count} booking`}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-t-[4px] bg-primary/70 transition-colors group-hover:bg-primary"
                    style={{
                      height: `${Math.max(2, (point.count / maxTrendCount) * 100)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-[22px] p-4">
        <p className="font-display text-base font-bold">Rincian Status Booking</p>
        <div className="mt-3 space-y-2 text-sm">
          {(Object.keys(STATUS_LABEL_ID) as BookingStatus[]).map((status) => (
            <div key={status} className="flex items-center justify-between">
              <span className="text-muted-ink">{STATUS_LABEL_ID[status]}</span>
              <span className="font-medium">{statusSummary[status]}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-[22px] p-4">
      <p className="text-xs uppercase tracking-wide text-muted-ink">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
