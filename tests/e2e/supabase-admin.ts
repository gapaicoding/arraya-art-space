import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (Playwright config/global setup runs outside Next's env loading).
function loadEnvLocal() {
  const envPath = path.resolve(__dirname, "../../.env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

export function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const TEST_PREFIX = "E2E_TEST_";
export const ADMIN_EMAIL = "e2e-test-admin@arayya.test";
export const STAFF_EMAIL = "e2e-test-staff@arayya.test";
export const TEST_PASSWORD = "E2eTest!Str0ngPwd#9";

export async function seedTestUsers() {
  const supabase = adminClient();

  async function ensureUser(email: string, role: "admin" | "staff") {
    // Clean up any leftover user with this email first.
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users.find((u) => u.email === email);
    if (existing) {
      await supabase.auth.admin.deleteUser(existing.id);
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`Failed to create test user ${email}: ${error?.message}`);
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role, full_name: `${TEST_PREFIX}${role}` })
      .eq("id", data.user.id);
    if (profileError) {
      // profile row may need to be created if no trigger exists
      await supabase.from("profiles").upsert({ id: data.user.id, role, full_name: `${TEST_PREFIX}${role}` });
    }
    return data.user.id;
  }

  const adminId = await ensureUser(ADMIN_EMAIL, "admin");
  const staffId = await ensureUser(STAFF_EMAIL, "staff");
  return { adminId, staffId };
}

export async function cleanupTestData() {
  const supabase = adminClient();

  // Delete test users.
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  for (const u of list?.users ?? []) {
    if (u.email === ADMIN_EMAIL || u.email === STAFF_EMAIL) {
      await supabase.auth.admin.deleteUser(u.id);
    }
  }

  // Delete E2E_TEST_-prefixed rows. Order matters due to FKs: bookings -> schedules -> areas/activities/organizers.
  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, notes")
    .ilike("notes", `${TEST_PREFIX}%`);
  const { data: areas } = await supabase.from("areas").select("id").ilike("name", `${TEST_PREFIX}%`);
  const areaIds = (areas ?? []).map((a) => a.id);

  let scheduleIds = (schedules ?? []).map((s) => s.id);
  if (areaIds.length > 0) {
    const { data: schedulesByArea } = await supabase.from("schedules").select("id").in("area_id", areaIds);
    scheduleIds = [...new Set([...scheduleIds, ...(schedulesByArea ?? []).map((s) => s.id)])];
  }

  if (scheduleIds.length > 0) {
    await supabase.from("bookings").delete().in("schedule_id", scheduleIds);
    await supabase.from("schedules").delete().in("id", scheduleIds);
  }

  await supabase.from("bookings").delete().ilike("customer_organizer_name", `${TEST_PREFIX}%`);
  await supabase.from("areas").delete().ilike("name", `${TEST_PREFIX}%`);
  await supabase.from("activities").delete().ilike("name", `${TEST_PREFIX}%`);
  await supabase.from("organizers").delete().ilike("name", `${TEST_PREFIX}%`);
}
