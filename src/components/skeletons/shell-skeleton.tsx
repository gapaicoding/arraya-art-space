import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";

const navGroups = [
  {
    heading: "Operasional",
    items: ["Dashboard", "Jadwal", "Booking", "Analytic"],
  },
  {
    heading: "Pengaturan",
    items: ["Jam Operasional", "Organizer & PIC", "Jenis Kegiatan & Kategori", "Area", "Pengguna"],
  },
];

/**
 * Static shell used by route-level loading.tsx files. AppShell itself only
 * renders once a page's client component receives its server-fetched data,
 * so without this, Next's automatic Suspense fallback would blank out the
 * sidebar/header instead of just the content area.
 */
export function ShellSkeleton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden font-body text-ink">
      <div className="pointer-events-none fixed inset-0 -z-30 bg-[linear-gradient(160deg,oklch(0.97_0.02_240)_0%,oklch(0.95_0.02_265)_45%,oklch(0.95_0.03_300)_100%)]" />
      <div className="pointer-events-none fixed -z-20 left-[-8%] top-[-12%] size-[42rem] rounded-full bg-brand/40 blur-[120px]" />
      <div className="pointer-events-none fixed -z-20 right-[-10%] top-[18%] size-[36rem] rounded-full bg-accentv/35 blur-[130px]" />
      <div className="pointer-events-none fixed -z-20 left-[30%] bottom-[-16%] size-[34rem] rounded-full bg-mint/30 blur-[120px]" />

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
          <nav className="mt-8 flex flex-col gap-4">
            {navGroups.map((group) => (
              <div key={group.heading} className="flex flex-col gap-1">
                <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint-ink">
                  {group.heading}
                </p>
                {group.items.map((label) => (
                  <div
                    key={label}
                    className="flex items-center rounded-xl px-4 py-2.5 text-sm font-medium text-faint-ink/70"
                  >
                    {label}
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-3 rounded-2xl border border-frost/60 bg-frost/40 p-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          </div>
        </aside>

        <main className="flex w-full min-w-0 flex-col gap-5">
          <header className="glass flex flex-wrap items-center justify-between gap-3 rounded-[22px] px-5 py-3">
            <div className="min-w-0 space-y-2">
              <span className="sr-only">Memuat halaman…</span>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-56" />
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
