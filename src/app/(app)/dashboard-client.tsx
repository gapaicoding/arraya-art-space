"use client";

import Link from "next/link";
import { AppShell, PrimaryButton } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { formatTime } from "@/lib/format";

const TYPE_LABEL_ID: Record<string, string> = {
  internal_activity: "Aktivitas Internal",
  external_booking: "Booking Eksternal",
  blocked: "Blocked",
};

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-[22px] p-5">
      <p className="text-sm text-muted-ink">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

type ScheduleRow = {
  id: string;
  date: string;
  start_at: string;
  end_at: string;
  type: string;
  areas?: { name: string; code: string } | null;
  activities?: { name: string } | null;
  organizers?: { name: string } | null;
};

export function DashboardClient({
  areaCount,
  activeAreaCount,
  areasInUseCount,
  areasAvailableCount,
  todayScheduleCount,
  todayBookingCount,
  todayLabel,
  todaySchedules,
  upcomingSchedules,
  conflicts,
}: {
  areaCount: number;
  activeAreaCount: number;
  areasInUseCount: number;
  areasAvailableCount: number;
  todayScheduleCount: number;
  todayBookingCount: number;
  todayLabel: string;
  todaySchedules: ScheduleRow[];
  upcomingSchedules: ScheduleRow[];
  conflicts: { a: ScheduleRow; b: ScheduleRow }[];
}) {
  const { fullName } = useAuth();

  return (
    <AppShell title="Dashboard" subtitle={todayLabel}>
      <div className="glass rounded-[22px] p-5">
        <p className="text-lg font-semibold">Selamat datang, {fullName ?? "Staff"} 👋</p>
        <p className="mt-1 text-sm text-muted-ink">
          Berikut ringkasan operasional Arayya Art &amp; Space hari ini.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/schedule">
            <PrimaryButton className="h-10">+ Buat Jadwal</PrimaryButton>
          </Link>
          <Link href="/bookings">
            <Button variant="outline" className="h-10">
              + Buat Booking
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="outline" className="h-10">
              Lihat Availability Area
            </Button>
          </Link>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="glass rounded-[22px] border-2 border-destructive bg-destructive/10 p-5">
          <p className="font-semibold text-destructive">🚨 Peringatan Konflik Jadwal</p>
          <p className="mt-1 text-sm text-destructive/90">
            Ditemukan {conflicts.length} pasangan jadwal yang bertabrakan pada area yang sama
            hari ini. Ini seharusnya tidak pernah terjadi — segera periksa dan sesuaikan di
            halaman Jadwal.
          </p>
          <Link href="/schedule" className="mt-3 inline-block">
            <Button size="sm" variant="destructive">
              Buka Halaman Jadwal
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Jadwal Hari Ini" value={todayScheduleCount} />
        <StatCard label="Booking Hari Ini" value={todayBookingCount} />
        <StatCard label="Area Digunakan" value={areasInUseCount} />
        <StatCard label="Area Tersedia" value={areasAvailableCount} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-[22px] p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Jadwal Hari Ini</p>
            <Link href="/schedule" className="text-sm text-brand-ink hover:underline">
              Lihat semua
            </Link>
          </div>
          {todaySchedules.length === 0 ? (
            <p className="text-sm text-muted-ink">Belum ada jadwal untuk hari ini.</p>
          ) : (
            <ul className="space-y-2">
              {todaySchedules.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {formatTime(s.start_at)}–{formatTime(s.end_at)} · {s.areas?.name ?? "-"}
                    </p>
                    <p className="text-xs text-muted-ink">
                      {s.activities?.name ?? s.organizers?.name ?? "-"}
                    </p>
                  </div>
                  <Badge variant="secondary">{TYPE_LABEL_ID[s.type] ?? s.type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-[22px] p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Aktivitas Mendatang</p>
            <Link href="/schedule" className="text-sm text-brand-ink hover:underline">
              Lihat semua
            </Link>
          </div>
          {upcomingSchedules.length === 0 ? (
            <p className="text-sm text-muted-ink">Belum ada jadwal mendatang.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingSchedules.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {s.date} · {formatTime(s.start_at)} · {s.areas?.name ?? "-"}
                    </p>
                    <p className="text-xs text-muted-ink">
                      {s.activities?.name ?? s.organizers?.name ?? "-"}
                    </p>
                  </div>
                  <Badge variant="secondary">{TYPE_LABEL_ID[s.type] ?? s.type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Area" value={areaCount} />
        <StatCard label="Area Aktif" value={activeAreaCount} />
      </div>
    </AppShell>
  );
}
