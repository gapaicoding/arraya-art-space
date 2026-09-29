import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { formatDateOnly, formatTime } from "@/lib/format";
import { RegistrationForm } from "./registration-form";

export default async function EventRegistrationPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = await params;
  const supabase = await createClient();
  const { data: schedule, error } = await supabase
    .from("schedules")
    .select("id, date, start_at, end_at, activities(name), areas(name)")
    .eq("id", scheduleId)
    .maybeSingle();
  if (error) logError("event-registration-page-fetch", error);
  const scheduleRow = schedule as unknown as
    | {
        id: string;
        date: string;
        start_at: string;
        end_at: string;
        activities: { name: string } | null;
        areas: { name: string } | null;
      }
    | null;

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

        {!scheduleRow ? (
          <div className="glass rounded-[22px] p-8 text-center">
            <p className="font-display text-lg font-bold">Event Tidak Ditemukan</p>
            <p className="mt-2 text-sm text-muted-ink">
              Event ini mungkin sudah tidak tersedia. Kembali ke agenda untuk lihat event lain.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-xl bg-frost/70 px-4 py-2 text-sm font-semibold"
            >
              Lihat Agenda
            </Link>
          </div>
        ) : (
          <>
            <div className="glass rounded-[22px] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint-ink">
                Daftar Event
              </p>
              <p className="mt-1 font-display text-xl font-bold">
                {scheduleRow.activities?.name ?? "Kegiatan"}
              </p>
              <p className="mt-1 text-sm text-muted-ink">
                {formatDateOnly(scheduleRow.date)} · {formatTime(scheduleRow.start_at)}–
                {formatTime(scheduleRow.end_at)} · {scheduleRow.areas?.name ?? "-"}
              </p>
            </div>

            <RegistrationForm scheduleId={scheduleRow.id} />
          </>
        )}
      </div>
    </div>
  );
}
