"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { logoutAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const links = [
  { href: "/areas", label: "Master Area" },
  { href: "/activities", label: "Master Aktivitas" },
  { href: "/organizers", label: "Organizer" },
  { href: "/settings/business-hours", label: "Jam Operasional" },
  { href: "/settings/users", label: "Manajemen Pengguna", adminOnly: true },
];

export default function MorePage() {
  const { isAdmin } = useAuth();
  const visibleLinks = links.filter((l) => !("adminOnly" in l && l.adminOnly) || isAdmin);

  return (
    <AppShell title="Lainnya" subtitle="Master data & pengaturan">
      <div className="glass rounded-[22px] p-2">
        {visibleLinks.map((l) => (
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
      <form action={logoutAction}>
        <Button type="submit" variant="outline" className="w-full">
          Keluar
        </Button>
      </form>
    </AppShell>
  );
}
