"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { logoutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { computeScheduleConflicts } from "@/lib/conflicts";
import { formatDate } from "@/lib/format";

const nav = [
  { to: "/", label: "Dashboard", glyph: "▦" },
  { to: "/schedule", label: "Jadwal", glyph: "≡" },
  { to: "/bookings", label: "Booking", glyph: "▤" },
  { to: "/areas", label: "Area", glyph: "◫" },
  { to: "/activities", label: "Aktivitas", glyph: "◈" },
  { to: "/organizers", label: "Organizer", glyph: "◍" },
  { to: "/settings/business-hours", label: "Pengaturan", glyph: "⚙" },
] as const;

const mobileNav = [
  { to: "/", label: "Dashboard", glyph: "▦" },
  { to: "/schedule", label: "Jadwal", glyph: "≡" },
  { to: "/bookings", label: "Booking", glyph: "▤" },
  { to: "/more", label: "Lainnya", glyph: "⋯" },
] as const;

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const path = usePathname();
  const { fullName, role } = useAuth();
  const initials = (fullName ?? "Staff")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Surface today's schedule conflicts (should never happen — the DB
  // exclusion constraint prevents them — but if it ever does, this makes
  // it visible from every page via a badge on "Dashboard", not just when
  // someone happens to open the dashboard itself).
  const [conflictCount, setConflictCount] = useState(0);
  useEffect(() => {
    const supabase = createClient();
    const today = formatDate(new Date(), "yyyy-MM-dd");
    supabase
      .from("schedules")
      .select("id, area_id, start_at, end_at")
      .eq("date", today)
      .neq("status", "cancelled")
      .then(({ data }) => {
        if (data) setConflictCount(computeScheduleConflicts(data).length);
      });
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden font-body text-ink">
      <div className="pointer-events-none fixed inset-0 -z-30 bg-[linear-gradient(160deg,oklch(0.97_0.02_240)_0%,oklch(0.95_0.02_265)_45%,oklch(0.95_0.03_300)_100%)]" />
      <div className="blob-a pointer-events-none fixed -z-20 left-[-8%] top-[-12%] size-[42rem] rounded-full bg-brand/40 blur-[120px]" />
      <div className="blob-b pointer-events-none fixed -z-20 right-[-10%] top-[18%] size-[36rem] rounded-full bg-accentv/35 blur-[130px]" />
      <div className="blob-c pointer-events-none fixed -z-20 left-[30%] bottom-[-16%] size-[34rem] rounded-full bg-mint/30 blur-[120px]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] gap-5 p-4 pb-24 lg:gap-6 lg:p-6 lg:pb-6">
        <aside className="glass hidden w-64 shrink-0 flex-col rounded-[26px] p-5 lg:flex">
          <div className="flex items-center gap-3">
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
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-faint-ink">
                Art &amp; Space
              </p>
            </div>
          </div>
          <nav className="mt-8 flex flex-col gap-1">
            {nav.map((item) => {
              const active = item.to === path;
              const showBadge = item.to === "/" && conflictCount > 0;
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={
                    active
                      ? "flex items-center justify-between rounded-xl bg-frost/70 px-4 py-2.5 text-sm font-semibold text-ink shadow-sm"
                      : "flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium text-muted-ink transition-colors hover:bg-frost/40"
                  }
                >
                  {item.label}
                  {showBadge && (
                    <span className="grid size-5 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {conflictCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto space-y-3 rounded-2xl border border-frost/60 bg-frost/40 p-3">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-accentv/30 font-display text-sm font-bold text-accentv-ink">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{fullName ?? "Staff"}</p>
                <p className="text-[11px] capitalize text-faint-ink">{role ?? "staff"}</p>
              </div>
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm" className="w-full">
                Keluar
              </Button>
            </form>
          </div>
        </aside>

        <main className="flex w-full min-w-0 flex-col gap-5">
          <header className="glass flex flex-wrap items-center justify-between gap-3 rounded-[22px] px-5 py-3">
            <div className="min-w-0">
              <p className="font-display text-lg font-bold leading-tight">{title}</p>
              <p className="mt-1 text-sm text-muted-ink">{subtitle}</p>
            </div>
            {action}
          </header>

          {children}
        </main>
      </div>

      <nav className="glass-strong fixed inset-x-3 bottom-3 z-20 flex items-center justify-around rounded-2xl px-2 py-2 lg:hidden">
        {mobileNav.map((item) => {
          const active = item.to === "/more" ? path.startsWith("/more") || path.startsWith("/areas") || path.startsWith("/activities") || path.startsWith("/organizers") || path.startsWith("/settings") : item.to === path;
          const showBadge = item.to === "/" && conflictCount > 0;
          return (
            <Link
              key={item.to}
              href={item.to}
              aria-label={item.label}
              className={
                active
                  ? "relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl bg-frost/70 px-4 py-1.5 text-ink shadow-sm"
                  : "relative flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-4 py-1.5 text-faint-ink"
              }
            >
              {showBadge && (
                <span className="absolute right-1 top-0.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {conflictCount}
                </span>
              )}
              <span className="text-lg leading-none">{item.glyph}</span>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PrimaryButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className="gradient-brand text-frost shadow-lg shadow-brand/30"
      {...props}
    >
      {children}
    </Button>
  );
}
