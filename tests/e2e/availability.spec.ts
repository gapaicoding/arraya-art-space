import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";
import { adminClient, TEST_PREFIX } from "./supabase-admin";

const AREA_NAME = `${TEST_PREFIX}AvailArea`;

let areaId: string;
let testDate: string;
let openTime: string;
let closeTime: string;
let scheduleStart: string;
let scheduleEnd: string;

test.describe("Availability grid", () => {
  test.beforeAll(async () => {
    const supabase = adminClient();
    const { data: hours } = await supabase.from("business_hours").select("*");
    const open = (hours ?? []).find((h: any) => !h.is_closed && h.open_time && h.close_time);
    if (!open) throw new Error("No open business hour found");

    const today = new Date();
    let d = new Date(today);
    d.setDate(d.getDate() + 15);
    while (d.getDay() !== open.day_of_week) {
      d.setDate(d.getDate() + 1);
    }
    testDate = d.toISOString().slice(0, 10);
    openTime = open.open_time.slice(0, 5);
    closeTime = open.close_time.slice(0, 5);

    const [h, m] = openTime.split(":").map(Number);
    scheduleStart = openTime;
    scheduleEnd = `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    const { data: area, error } = await supabase
      .from("areas")
      .insert({ name: AREA_NAME, code: "E2EAVL", capacity: 5, status: "active" })
      .select()
      .single();
    if (error) throw error;
    areaId = area.id;

    const { error: schedErr } = await supabase.from("schedules").insert({
      area_id: areaId,
      type: "internal_activity",
      date: testDate,
      start_at: `${testDate}T${scheduleStart}:00+07:00`,
      end_at: `${testDate}T${scheduleEnd}:00+07:00`,
      status: "confirmed",
      notes: `${TEST_PREFIX}avail_schedule`,
    });
    if (schedErr) throw schedErr;
  });

  test.afterAll(async () => {
    const supabase = adminClient();
    await supabase.from("schedules").delete().eq("area_id", areaId);
    await supabase.from("areas").delete().eq("id", areaId);
  });

  test("occupied hour shows correct badge, other hours show Tersedia", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/schedule");
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill(testDate);
    // Wait for the schedule row to actually render in the "Daftar Jadwal"
    // table before switching tabs — this proves React has committed the
    // refetched `schedules` state, not just that the network response
    // arrived (there's a real gap between the two: the Availability grid
    // is derived from the same state via useMemo, so switching tabs before
    // the commit lands renders it against stale data).
    await expect(page.getByRole("cell", { name: AREA_NAME })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("tab", { name: "Availability" }).click();

    const areaCard = page.locator(".glass", { hasText: AREA_NAME });
    await expect(areaCard).toBeVisible({ timeout: 10_000 });

    const occupiedSlot = areaCard.locator("div.rounded-xl", { hasText: scheduleStart });
    await expect(occupiedSlot).toContainText("Aktivitas Internal", { timeout: 10_000 });

    // Pick a different hour within business hours (open + 2h) and confirm it's available.
    const [h] = openTime.split(":").map(Number);
    const otherHour = `${String(h + 2).padStart(2, "0")}:${openTime.split(":")[1]}`;
    if (otherHour < closeTime) {
      const availableSlot = areaCard.locator("div.rounded-xl", { hasText: otherHour });
      await expect(availableSlot).toContainText("Tersedia");
    }
  });
});
