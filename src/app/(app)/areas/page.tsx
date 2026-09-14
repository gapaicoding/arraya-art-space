import { createClient } from "@/lib/supabase/server";
import { AreasClient } from "./areas-client";

export default async function AreasPage() {
  const supabase = await createClient();
  const { data: areas } = await supabase
    .from("areas")
    .select("*")
    .order("name", { ascending: true });

  return <AreasClient initialAreas={areas ?? []} />;
}
