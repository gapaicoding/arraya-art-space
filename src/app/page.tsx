import Image from "next/image";
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
        <header className="flex items-center gap-3">
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
                {day.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold">{item.activityName}</p>
                      <p className="text-xs text-muted-ink">{item.areaName}</p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-medium text-muted-ink">
                      {item.timeRange}
                    </p>
                  </div>
                ))}
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
