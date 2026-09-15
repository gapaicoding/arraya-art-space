import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { BookingsClient } from "./bookings-client";

export default async function BookingsPage() {
  const supabase = await createClient();

  const [
    { data: bookings, error: bookingsError },
    { data: areas },
    { data: organizers },
    { data: activities },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, schedules(area_id, date, start_at, end_at, status, areas(name, code))")
      .order("created_at", { ascending: false }),
    supabase.from("areas").select("*").eq("status", "active").order("name", { ascending: true }),
    supabase.from("organizers").select("*").eq("status", "active").order("name", { ascending: true }),
    supabase.from("activities").select("*").eq("status", "active").order("name", { ascending: true }),
  ]);
  if (bookingsError) logError("bookings-page-fetch", bookingsError);

  return (
    <BookingsClient
      initialBookings={(bookings as any) ?? []}
      areas={areas ?? []}
      organizers={organizers ?? []}
      activities={activities ?? []}
    />
  );
}
