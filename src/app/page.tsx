import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { currentWeekRangeJakarta, groupAgendaByDate, type PublicAgendaRow } from "@/lib/agenda";
import { formatDateOnly } from "@/lib/format";

export default async function PublicAgendaPage() {
  const supabase = await createClient();
  const { start, end } = currentWeekRangeJakarta();

  const { data, error } = await supabase
    .from("schedules")
    .select("date, start_at, end_at, activities(name), areas(name)")
    .gte("date", start)
    .lte("date", end)
    .neq("status", "cancelled")
    .neq("type", "blocked")
    .order("date", { ascending: true })
    .order("start_at", { ascending: true });
  if (error) logError("public-agenda-fetch", error);

  const days = groupAgendaByDate((data ?? []) as unknown as PublicAgendaRow[]);
  const waNumber = process.env.PUBLIC_WHATSAPP_NUMBER;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[linear-gradient(160deg,oklch(0.97_0.02_240)_0%,oklch(0.95_0.02_265)_45%,oklch(0.95_0.03_300)_100%)] font-body text-ink">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-arayya.jpg"
              alt="Arayya Art & Space"
              width={48}
              height={48}
              className="size-12 shrink-0 rounded-xl object-cover shadow-lg shadow-brand/30"
              priority
            />
            <div>
              <p className="font-display text-lg font-bold leading-none">Arayya</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint-ink">
                Art &amp; Space
              </p>
            </div>
          </div>
          {/* Middleware redirects an already-authenticated visitor from
              /login straight to /app, so this link works as "go to
              dashboard" for staff/admin without needing separate logic here. */}
          <Link
            href="/login"
            className="rounded-xl bg-frost/70 px-4 py-2 text-sm font-semibold text-ink shadow-sm"
          >
            Login
          </Link>
        </header>

        <div className="glass rounded-[22px] p-5">
          <p className="font-display text-xl font-bold">Agenda Minggu Ini</p>
          <p className="mt-1 text-sm text-muted-ink">
            {formatDateOnly(start, "d MMMM")} – {formatDateOnly(end, "d MMMM yyyy")}
          </p>
        </div>

        {days.length === 0 ? (
          <div className="glass rounded-[22px] p-8 text-center text-sm text-muted-ink">
            Belum ada agenda minggu ini.
          </div>
        ) : (
          days.map((day) => (
            <div key={day.date} className="glass rounded-[22px] p-5">
              <p className="font-display text-base font-bold">{formatDateOnly(day.date)}</p>
              <div className="mt-3 divide-y divide-frost/60">
                {day.items.map((item, i) => {
                  const message = `Halo Admin, saya mau tanya soal event "${item.activityName}" pada ${formatDateOnly(day.date, "d MMMM yyyy")} pukul ${item.timeRange}.`;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-sm font-semibold">{item.activityName}</p>
                        <p className="text-xs text-muted-ink">{item.areaName}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <p className="whitespace-nowrap text-sm font-medium text-muted-ink">
                          {item.timeRange}
                        </p>
                        {waNumber && (
                          <a
                            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-xl bg-brand/15 px-3 py-1.5 text-xs font-semibold text-brand-ink"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.8 14.02c-.24.68-1.4 1.3-1.93 1.35-.5.05-1.02.24-3.42-.71-2.9-1.15-4.75-4.1-4.9-4.29-.14-.19-1.17-1.56-1.17-2.97 0-1.41.74-2.1 1-2.39.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.53.33.07.12.07.68-.17 1.36z" />
                            </svg>
                            Hubungi Admin
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="gradient-brand block rounded-2xl px-5 py-3.5 text-center text-sm font-semibold text-frost shadow-lg shadow-brand/30"
          >
            Hubungi Admin via WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
