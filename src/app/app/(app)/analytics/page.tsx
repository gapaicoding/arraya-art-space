import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (currentProfile?.role !== "admin") redirect("/app");

  return (
    <AppShell title="Analytic" subtitle="Laporan & metrik operasional">
      <div className="glass rounded-[22px] p-8 text-center">
        <p className="font-display text-lg font-bold">Coming Soon</p>
        <p className="mt-1 text-sm text-muted-ink">
          Fitur analitik (okupansi area, aktivitas terpopuler, tren booking) sedang disiapkan.
        </p>
      </div>
    </AppShell>
  );
}
