import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (currentProfile?.role !== "admin") redirect("/app");

  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) logError("users-page-fetch", error);

  return <UsersClient initialUsers={users ?? []} currentUserId={auth.user.id} />;
}
