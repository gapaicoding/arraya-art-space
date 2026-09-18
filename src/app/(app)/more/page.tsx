"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { logoutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const linkGroups = [
  {
    heading: "Operasional",
    items: [{ href: "/analytics", label: "Analytic", adminOnly: true }],
  },
  {
    heading: "Pengaturan",
    items: [
      { href: "/settings/business-hours", label: "Jam Operasional", adminOnly: true },
      { href: "/organizers", label: "Organizer & PIC", adminOnly: true },
      { href: "/activities", label: "Jenis Kegiatan & Kategori", adminOnly: true },
      { href: "/areas", label: "Area", adminOnly: true },
      { href: "/settings/users", label: "Pengguna", adminOnly: true },
    ],
  },
];

export default function MorePage() {
  const { isAdmin } = useAuth();

  return (
    <AppShell title="Lainnya" subtitle="Master data & pengaturan">
      {linkGroups.map((group) => {
        const items = group.items.filter((l) => !("adminOnly" in l && l.adminOnly) || isAdmin);
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
    </AppShell>
  );
}
