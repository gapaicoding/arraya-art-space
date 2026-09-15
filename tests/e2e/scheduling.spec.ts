import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";
import { adminClient, TEST_PREFIX } from "./supabase-admin";

const AREA_NAME = `${TEST_PREFIX}SchedArea`;

let areaId: string;
let testDate: string;
let openTime: string;

test.describe("Scheduling & conflict rules", () => {
  test.beforeAll(async () => {
    const supabase = adminClient();
    const { data: hours } = await supabase.from("business_hours").select("*");
    const open = (hours ?? []).find((h: any) => !h.is_closed && h.open_time && h.close_time);
    if (!open) throw new Error("No open business hour found to schedule against");

    // Find the next date matching that day_of_week, at least 7 days out to avoid
    // clashing with any other concurrently-running test data.
    const today = new Date();
    let d = new Date(today);
    d.setDate(d.getDate() + 14);
    while (d.getDay() !== open.day_of_week) {
      d.setDate(d.getDate() + 1);
    }
    testDate = d.toISOString().slice(0, 10);
    openTime = open.open_time.slice(0, 5);

    const { data: area, error } = await supabase
      .from("areas")
      .insert({ name: AREA_NAME, code: "E2ESCH", capacity: 5, status: "active" })
      .select()
      .single();
    if (error) throw error;
    areaId = area.id;
  });

  test.afterAll(async () => {
    const supabase = adminClient();
    await supabase.from("schedules").delete().eq("area_id", areaId);
    await supabase.from("areas").delete().eq("id", areaId);
  });

  test("create schedule, detect conflict on overlap, then allow after cancel", async ({ page }) => {
    test.setTimeout(60_000);
    await loginAsAdmin(page);
    await page.goto("/schedule");

    // Navigate to the test date first so the created schedule shows up immediately.
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill(testDate);
    await page.waitForTimeout(500);

    async function openScheduleForm() {
      await page.getByRole("button", { name: "+ Jadwal Baru" }).click();
    }

    async function fillScheduleForm(start: string, end: string) {
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input[type="date"]').fill(testDate);
      await dialog.getByLabel("Area").click();
      await page.getByRole("option", { name: new RegExp(AREA_NAME) }).click();
      await dialog.getByLabel("Jam Mulai").fill(start);
      await dialog.getByLabel("Jam Selesai").fill(end);
      await dialog.getByLabel("Aktivitas").click();
      await page.getByRole("option").first().click();
      await dialog.getByRole("button", { name: "Simpan" }).click();
    }

    const startA = openTime;
    const [h, m] = openTime.split(":").map(Number);
    const endA = `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    await openScheduleForm();
    await fillScheduleForm(startA, endA);
    await expect(page.getByText("Jadwal ditambahkan")).toBeVisible({ timeout: 10_000 });

    // Overlapping second schedule for the same area/time -> conflict error, not created.
    await openScheduleForm();
    await fillScheduleForm(startA, endA);
    await expect(page.getByText("Jadwal bertabrakan dengan jadwal lain di area ini.")).toBeVisible({
      timeout: 10_000,
    });
    await page.keyboard.press("Escape");

    const supabase = adminClient();
    const { data: schedulesAfterConflict } = await supabase
      .from("schedules")
      .select("id")
      .eq("area_id", areaId)
      .neq("status", "cancelled");
    expect(schedulesAfterConflict?.length).toBe(1);

    // Cancel the first schedule via the UI. No reload needed — the selected
    // date lives only in client state (not the URL), so a reload would lose
    // it and bounce the list back to today's date instead of testDate.
    const row = page.locator("tr", { hasText: `${startA}` });
    await row.getByRole("button", { name: "Batalkan" }).click();
    const confirmCancel = page.getByRole("button", { name: "Ya, Batalkan" });
    await expect(confirmCancel).toBeVisible();
    await page.waitForTimeout(300);
    await confirmCancel.click();
    await expect(page.getByText("Jadwal dibatalkan")).toBeVisible({ timeout: 10_000 });

    // Now the same slot should succeed since the first schedule is cancelled.
    await openScheduleForm();
    await fillScheduleForm(startA, endA);
    await expect(page.getByText("Jadwal ditambahkan")).toBeVisible({ timeout: 10_000 });

    const { data: finalSchedules } = await supabase
      .from("schedules")
      .select("id, status")
      .eq("area_id", areaId);
    const active = (finalSchedules ?? []).filter((s) => s.status !== "cancelled");
    expect(active.length).toBe(1);
  });
});
