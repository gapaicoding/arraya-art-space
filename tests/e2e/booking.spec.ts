import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";
import { adminClient, TEST_PREFIX } from "./supabase-admin";

const AREA_NAME = `${TEST_PREFIX}BookArea`;
const CUSTOMER_NAME = `${TEST_PREFIX}Customer1`;

let areaId: string;
let testDate: string;
let openTime: string;

test.describe("Booking flow", () => {
  test.beforeAll(async () => {
    const supabase = adminClient();
    const { data: hours } = await supabase.from("business_hours").select("*");
    const open = (hours ?? []).find((h: any) => !h.is_closed && h.open_time && h.close_time);
    if (!open) throw new Error("No open business hour found");

    const today = new Date();
    let d = new Date(today);
    d.setDate(d.getDate() + 16);
    while (d.getDay() !== open.day_of_week) {
      d.setDate(d.getDate() + 1);
    }
    testDate = d.toISOString().slice(0, 10);
    openTime = open.open_time.slice(0, 5);

    const { data: area, error } = await supabase
      .from("areas")
      .insert({ name: AREA_NAME, code: "E2EBOOK", capacity: 2, status: "active" })
      .select()
      .single();
    if (error) throw error;
    areaId = area.id;
  });

  test.afterAll(async () => {
    const supabase = adminClient();
    const { data: schedules } = await supabase.from("schedules").select("id").eq("area_id", areaId);
    const scheduleIds = (schedules ?? []).map((s) => s.id);
    if (scheduleIds.length) {
      await supabase.from("bookings").delete().in("schedule_id", scheduleIds);
      await supabase.from("schedules").delete().in("id", scheduleIds);
    }
    await supabase.from("areas").delete().eq("id", areaId);
  });

  test("create booking within capacity, over-capacity rejected, cancel frees availability", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/bookings");

    const [h, m] = openTime.split(":").map(Number);
    const endTime = `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    async function openForm() {
      await page.getByRole("button", { name: "+ Booking Baru" }).click();
    }
    const dialog = page.locator('[role="dialog"]');

    // Over-capacity attempt first (capacity is 2).
    await openForm();
    await dialog.getByLabel("Nama Customer / Organizer").fill(CUSTOMER_NAME);
    await dialog.getByLabel("Area").click();
    await page.getByRole("option", { name: new RegExp(AREA_NAME) }).click();
    await dialog.getByLabel("Tanggal").fill(testDate);
    await dialog.getByLabel("Jam Mulai").fill(openTime);
    await dialog.getByLabel("Jam Selesai").fill(endTime);
    await dialog.getByLabel("Jumlah Peserta").fill("5");
    await dialog.getByRole("button", { name: "Simpan Booking" }).click();
    await expect(page.getByText("Jumlah peserta melebihi kapasitas area (2).")).toBeVisible({
      timeout: 10_000,
    });
    // Escape has been observed to not reliably close a Radix Dialog in
    // WebKit — click the explicit close button instead. A short wait first
    // avoids WebKit's click landing during the dialog's open animation,
    // when it can be visually/a11y "stable" but not yet accepting clicks.
    await page.waitForTimeout(300);
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();

    // Valid booking within capacity.
    await openForm();
    await dialog.getByLabel("Nama Customer / Organizer").fill(CUSTOMER_NAME);
    await dialog.getByLabel("Area").click();
    await page.getByRole("option", { name: new RegExp(AREA_NAME) }).click();
    await dialog.getByLabel("Tanggal").fill(testDate);
    await dialog.getByLabel("Jam Mulai").fill(openTime);
    await dialog.getByLabel("Jam Selesai").fill(endTime);
    await dialog.getByLabel("Jumlah Peserta").fill("2");
    await dialog.getByRole("button", { name: "Simpan Booking" }).click();
    await expect(page.getByText("Booking berhasil dibuat")).toBeVisible({ timeout: 10_000 });

    const row = page.locator("tr", { hasText: CUSTOMER_NAME });
    await expect(row).toBeVisible();
    await expect(row.getByText("Pending")).toBeVisible();

    // Check the linked schedule shows booked in availability.
    await page.goto("/schedule");
    await page.locator('input[type="date"]').first().fill(testDate);
    // Wait for the "Daftar Jadwal" row to actually render before switching
    // tabs, since the Availability grid is derived from the same React
    // state via useMemo — switching tabs right after the fill can race
    // ahead of the state commit and render stale data.
    await expect(page.getByRole("cell", { name: AREA_NAME })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("tab", { name: "Availability" }).click();
    const areaCard = page.locator(".glass", { hasText: AREA_NAME });
    const occupiedSlot = areaCard.locator("div.rounded-xl", { hasText: openTime });
    await expect(occupiedSlot).toContainText("Booking");

    // Cancel the booking, verify availability frees up.
    await page.goto("/bookings");
    await row.getByRole("button", { name: "Detail" }).click();
    await page.getByRole("button", { name: "Batalkan Booking" }).click();
    const confirmButton = page.getByRole("button", { name: "Ya, Batalkan" });
    await expect(confirmButton).toBeVisible();
    // Let the AlertDialog's open animation settle before clicking, otherwise
    // Playwright's actionability check can flag it as "not stable" mid-transition.
    await page.waitForTimeout(300);
    await confirmButton.click();
    await expect(page.getByText("Booking dibatalkan, availability area terbuka kembali.")).toBeVisible({
      timeout: 10_000,
    });
    // Wait for the AlertDialog to fully close (Radix unmounts it after its
    // exit animation) before navigating away, otherwise a leftover overlay
    // can intercept pointer events on the next page for a moment.
    await expect(confirmButton).toBeHidden({ timeout: 5_000 });

    await page.goto("/schedule");
    await page.locator('input[type="date"]').first().fill(testDate);
    await expect(page.getByRole("cell", { name: AREA_NAME })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("tab", { name: "Availability" }).click();
    const areaCardAfter = page.locator(".glass", { hasText: AREA_NAME });
    const freedSlot = areaCardAfter.locator("div.rounded-xl", { hasText: openTime });
    await expect(freedSlot).toContainText("Tersedia");
  });
});
