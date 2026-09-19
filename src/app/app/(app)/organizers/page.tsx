import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { OrganizersClient, PAGE_SIZE } from "./organizers-client";

export default async function OrganizersPage() {
  const supabase = await createClient();
  const { data: organizers, count, error } = await supabase
    .from("organizers")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(0, PAGE_SIZE - 1);
  if (error) logError("organizers-page-fetch", error);

  // TEMP: isolate whether .range() itself is the problem in prod.
  const noRange = await supabase
    .from("organizers")
    .select("*", { count: "exact" })
    .order("name", { ascending: true });

  // TEMP: raw fetch bypassing supabase-js entirely, from inside this
  // exact Vercel runtime, to see the true HTTP response.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const rawUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/organizers?select=%2A&order=name.asc&offset=0&limit=20`;
  const rawRes = await fetch(rawUrl, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      Prefer: "count=exact",
    },
    cache: "no-store",
  });
  const rawText = await rawRes.text();
  const rawContentRange = rawRes.headers.get("content-range");

  return (
    <>
      {/* TEMP DEBUG — remove after diagnosing prod empty-list bug */}
      <div
        data-debug-marker
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          background: "yellow",
          color: "black",
          fontSize: 10,
          padding: 4,
        }}
      >
        DEBUG rows={JSON.stringify(organizers?.length ?? null)} count=
        {JSON.stringify(count)} err={JSON.stringify(error?.message ?? null)} | noRange rows=
        {JSON.stringify(noRange.data?.length ?? null)} count={JSON.stringify(noRange.count)} err=
        {JSON.stringify(noRange.error?.message ?? null)} | raw status=
        {JSON.stringify(rawRes.status)} contentRange={JSON.stringify(rawContentRange)} body=
        {JSON.stringify(rawText.slice(0, 300))}
      </div>
      <OrganizersClient initialOrganizers={organizers ?? []} initialCount={count ?? 0} />
    </>
  );
}
