import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { AreasClient } from "./areas-client";

export default async function AreasPage() {
  const supabase = await createClient();
  const { data: areas, error } = await supabase
    .from("areas")
    .select("*")
    .order("name", { ascending: true });
  if (error) logError("areas-page-fetch", error);

  return <AreasClient initialAreas={areas ?? []} />;
}
