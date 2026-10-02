import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { formatCurrency, formatDateOnly, formatTime } from "@/lib/format";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { ShareButton } from "./share-button";

type ScheduleDetail = {
  id: string;
  date: string;
  start_at: string;
  end_at: string;
  status: string;
  capacity: number | null;
  activities: {
    name: string;
    category: string | null;
    description: string | null;
    products: { name: string; price: number } | null;
  } | null;
  areas: { name: string; location: string | null } | null;
  organizers: { name: string; type: string; phone: string | null } | null;
};

function availabilityLabel(capacity: number | null, booked: number) {
  if (capacity === null) return { label: "Tersedia", tone: "default" as const };
  const remaining = capacity - booked;
  if (remaining <= 0) return { label: "Penuh", tone: "destructive" as const };
  if (remaining <= capacity * 0.2) return { label: "Hampir Penuh", tone: "secondary" as const };
  return { label: "Tersedia", tone: "default" as const };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = await params;
  const supabase = await createClient();

  const [{ data: schedule, error }, { data: availability, error: availError }] = await Promise.all([
    supabase
      .from("schedules")
      .select(
        "id, date, start_at, end_at, status, capacity, activities(name, category, description, products(name, price)), areas(name, location), organizers(name, type, phone)",
      )
      .eq("id", scheduleId)
      .maybeSingle(),
    supabase.rpc("get_schedule_availability", { p_schedule_id: scheduleId }).maybeSingle(),
  ]);
  if (error) logError("event-detail-fetch", error);
  if (availError) logError("event-detail-availability-fetch", availError);

  const event = schedule as unknown as ScheduleDetail | null;
  const availabilityRow = availability as unknown as { capacity: number | null; booked: number } | null;
  const waNumber = process.env.PUBLIC_WHATSAPP_NUMBER;

  if (!event) {
    return (
      <div className="relative min-h-screen w-full overflow-x-hidden bg-[linear-gradient(160deg,oklch(0.97_0.02_240)_0%,oklch(0.95_0.02_265)_45%,oklch(0.95_0.03_300)_100%)] font-body text-ink">
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8">
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
        </div>
      </div>
    );
  }

  const activityName = event.activities?.name ?? "Kegiatan";
  const category = event.activities?.category;
  const product = event.activities?.products;
  const isPast = new Date(event.date) < new Date(new Date().toDateString());
  const isCancelled = event.status === "cancelled";
  const availabilityStatus = availabilityRow
    ? availabilityLabel(availabilityRow.capacity, availabilityRow.booked)
    : null;

  const message = `Halo Admin, saya mau tanya soal event "${activityName}" pada ${formatDateOnly(event.date, "d MMMM yyyy")} pukul ${formatTime(event.start_at)}–${formatTime(event.end_at)}.`;
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` : null;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[linear-gradient(160deg,oklch(0.97_0.02_240)_0%,oklch(0.95_0.02_265)_45%,oklch(0.95_0.03_300)_100%)] font-body text-ink">
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-arayya.jpg"
              alt="Arayya Art & Space"
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-xl object-cover shadow-lg shadow-brand/30"
              priority
            />
            <div>
              <p className="font-display text-base font-bold leading-none">Arayya</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-faint-ink">
                Art &amp; Space
              </p>
            </div>
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-frost/70 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm"
          >
            ← Agenda
          </Link>
        </header>

        {/* Banner — generic brand placeholder, no per-event image upload yet */}
        <div className="gradient-brand relative flex h-40 items-end overflow-hidden rounded-[22px] p-5 shadow-lg shadow-brand/30">
          {category && (
            <span className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-frost backdrop-blur">
              {category}
            </span>
          )}
          <p className="font-display text-2xl font-bold text-frost drop-shadow-sm">
            {activityName}
          </p>
        </div>

        {/* Informasi utama */}
        <div className="glass rounded-[22px] p-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>📅</span>
            <span className="font-medium">{formatDateOnly(event.date, "EEEE, d MMMM yyyy")}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span>🕐</span>
            <span className="font-medium">
              {formatTime(event.start_at)}–{formatTime(event.end_at)} WIB
            </span>
          </div>
          {event.areas && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span>📍</span>
              <span className="font-medium">
                {event.areas.name}
                {event.areas.location ? ` — ${event.areas.location}` : ""}
              </span>
            </div>
          )}
          {(isCancelled || isPast) && (
            <p className="mt-3 text-sm font-semibold text-destructive">
              {isCancelled ? "Event ini telah dibatalkan." : "Event ini sudah berlalu."}
            </p>
          )}
        </div>

        {/* Call to action */}
        {!isCancelled && !isPast && (
          <div className="glass rounded-[22px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-ink">Harga</p>
                <p className="font-display text-xl font-bold">
                  {product ? formatCurrency(product.price) : "Hubungi untuk info harga"}
                </p>
              </div>
              {availabilityStatus && (
                <span
                  className={
                    availabilityStatus.tone === "destructive"
                      ? "rounded-full bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive"
                      : availabilityStatus.tone === "secondary"
                        ? "rounded-full bg-accentv/20 px-3 py-1 text-xs font-semibold text-ink"
                        : "rounded-full bg-mint/25 px-3 py-1 text-xs font-semibold text-ink"
                  }
                >
                  {availabilityStatus.label}
                </span>
              )}
            </div>
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="gradient-brand mt-4 flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-center text-sm font-semibold text-frost shadow-lg shadow-brand/30"
              >
                <WhatsAppIcon />
                Hubungi Admin via WhatsApp
              </a>
            )}
          </div>
        )}

        {/* Penyelenggara */}
        <div className="glass rounded-[22px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint-ink">
            Diselenggarakan Oleh
          </p>
          <p className="mt-1 font-display text-base font-bold">
            {event.organizers?.name ?? "Arayya Art & Space"}
          </p>
          {event.organizers?.phone && (
            <p className="mt-1 text-sm text-muted-ink">{event.organizers.phone}</p>
          )}
        </div>

        {/* Deskripsi */}
        <div className="glass rounded-[22px] p-5">
          <p className="font-display text-base font-bold">Tentang Event Ini</p>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-ink">
            {event.activities?.description ??
              "Belum ada deskripsi tambahan untuk event ini. Hubungi admin untuk info lebih lanjut."}
          </p>
        </div>

        {/* Syarat & Ketentuan */}
        <div className="glass rounded-[22px] p-5">
          <p className="font-display text-base font-bold">Syarat &amp; Ketentuan</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-ink">
            <li>Peserta wajib hadir tepat waktu sesuai jadwal yang tertera.</li>
            <li>Konfirmasi kehadiran dan pembayaran dilakukan langsung melalui admin.</li>
            <li>Kebijakan pembatalan/reschedule mengikuti ketentuan yang berlaku, hubungi admin untuk detail.</li>
          </ul>
        </div>

        <ShareButton title={activityName} />
      </div>
    </div>
  );
}
