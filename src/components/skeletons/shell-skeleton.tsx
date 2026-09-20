import { Skeleton } from "@/components/ui/skeleton";

/**
 * Content-only skeleton for route-level loading.tsx files. AppShell (sidebar,
 * background, mobile nav) now lives in (app)/layout.tsx and stays mounted
 * across navigations, so loading.tsx only ever needs to fill the page slot
 * inside it — never the chrome around it.
 */
export function ShellSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="glass flex flex-wrap items-center justify-between gap-3 rounded-[22px] px-5 py-3">
        <div className="min-w-0 space-y-2">
          <span className="sr-only">Memuat halaman…</span>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
      </header>

      {children}
    </>
  );
}
