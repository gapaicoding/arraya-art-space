"use client";

import Link from "next/link";
import { PageHeader } from "@/components/AppShell";
import { logoutAction } from "@/app/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { meetsMinRole } from "@/lib/permissions";

type LinkItem = { href: string; label: string; minRole?: "admin" | "super_admin" };

const linkGroups: { heading: string; items: LinkItem[] }[] = [
  {
    heading: "Operasional",
    items: [
      { href: "/app/sales", label: "Rekap Penjualan" },
      { href: "/app/expenses", label: "Rekap Pengeluaran" },
    ],
  },
  {
    heading: "Ringkasan & Analitik",
    items: [{ href: "/app/analytics", label: "Analytic", minRole: "admin" as const }],
  },
  {
    heading: "Pengaturan",
    items: [
      { href: "/app/settings/business-hours", label: "Jam Operasional", minRole: "admin" as const },
      { href: "/app/organizers", label: "Organizer & PIC", minRole: "admin" as const },
      { href: "/app/activities", label: "Jenis Kegiatan & Kategori", minRole: "admin" as const },
      { href: "/app/areas", label: "Area", minRole: "admin" as const },
      { href: "/app/settings/users", label: "Pengguna", minRole: "super_admin" as const },
    ],
  },
];

export default function MorePage() {
  const auth = useAuth();

  return (
    <>
      <PageHeader title="Lainnya" subtitle="Master data & pengaturan" />
      {linkGroups.map((group) => {
        const items = group.items.filter((l) => meetsMinRole(auth, l.minRole));
        if (items.length === 0) return null;
        return (
          <div key={group.heading} className="glass rounded-[22px] p-2">
            <p className="px-4 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint-ink">
              {group.heading}
            </p>
            {items.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium hover:bg-frost/40"
              >
                {l.label}
                <span>→</span>
              </Link>
            ))}
          </div>
        );
      })}
      <form action={logoutAction}>
        <Button type="submit" variant="outline" className="w-full">
          Keluar
        </Button>
      </form>
    </>
  );
}
