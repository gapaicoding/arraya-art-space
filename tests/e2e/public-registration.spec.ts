import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsStaff, logout, TEST_PREFIX } from "./helpers";
import { adminClient } from "./supabase-admin";
import { localDateTimeToIso } from "../../src/lib/format";

const AREA_NAME = `${TEST_PREFIX}RegArea`;
const ACTIVITY_NAME = `${TEST_PREFIX}RegActivity`;
const CUSTOMER_NAME = `${TEST_PREFIX}Registrant`;

let scheduleId: string;
let areaId: string;
let activityId: string;

test.describe("Stage 8.1 — Registrasi Publik", () => {
  test.beforeAll(async () => {
    const supabase = adminClient();

    const { data: area, error: areaError } = await supabase
      .from("areas")
      .insert({ name: AREA_NAME, code: "E2EREG", capacity: 10, status: "active" })
      .select()
      .single();
    if (areaError) throw areaError;
    areaId = area.id;

    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .insert({ name: ACTIVITY_NAME, default_duration_minutes: 60, status: "active" })
      .select()
      .single();
    if (activityError) throw activityError;
    activityId = activity.id;

    const today = new Date().toISOString().slice(0, 10);
    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .insert({
        area_id: areaId,
        activity_id: activityId,
        type: "internal_activity",
        date: today,
        start_at: localDateTimeToIso(today, "09:00"),
        end_at: localDateTimeToIso(today, "10:00"),
        status: "confirmed",
        notes: `${TEST_PREFIX}public-registration-fixture`,
      })
      .select()
      .single();
    if (scheduleError) throw scheduleError;
    scheduleId = schedule.id;
  });

  test.afterAll(async () => {
    const supabase = adminClient();
    await supabase.from("event_registrations").delete().eq("schedule_id", scheduleId);
    await supabase.from("schedules").delete().eq("id", scheduleId);
    await supabase.from("activities").delete().eq("id", activityId);
    await supabase.from("areas").delete().eq("id", areaId);
  });

  test("anonymous visitor sees the event on the public agenda and can register", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText(ACTIVITY_NAME)).toBeVisible();

    const row = page.locator("div.flex.items-center.justify-between", { hasText: ACTIVITY_NAME });
    await row.getByRole("link", { name: "Daftar" }).click();
    await expect(page).toHaveURL(`/daftar/${scheduleId}`);
    await expect(page.getByText(ACTIVITY_NAME)).toBeVisible();

    await page.getByLabel("Nama").fill(CUSTOMER_NAME);
    await page.getByLabel("No. HP / WhatsApp").fill("081234567890");
    await page.getByLabel("Jumlah Peserta").fill("2");
    await page.getByLabel("Catatan (opsional)").fill("Anak usia 5 tahun");
    await page.getByRole("button", { name: "Kirim Pendaftaran" }).click();

    await expect(page.getByText("Pendaftaran Terkirim")).toBeVisible({ timeout: 10_000 });
  });

  test("anonymous visitor gets a clear error for an invalid phone number", async ({ page }) => {
    await page.goto(`/daftar/${scheduleId}`);
    await page.getByLabel("Nama").fill(`${TEST_PREFIX}BadPhone`);
    await page.getByLabel("No. HP / WhatsApp").fill("12345");
    await page.getByLabel("Jumlah Peserta").fill("1");
    await page.getByRole("button", { name: "Kirim Pendaftaran" }).click();
    await expect(page.getByText(/Nomor HP tidak valid/)).toBeVisible();
  });

  test("admin sees the registration and can accept it; staff cannot access the page", async ({
    page,
  }) => {
    await loginAsStaff(page);
    await page.goto("/app/registrations");
    // RLS blocks the select for non-admin, so the table renders empty
    // rather than erroring — and the nav link is hidden entirely.
    await expect(page.getByRole("link", { name: "Pendaftaran" })).toHaveCount(0);
    await logout(page);

    await loginAsAdmin(page);
    await page.goto("/app/registrations");
    const row = page.locator("tr", { hasText: CUSTOMER_NAME });
    await expect(row).toBeVisible();
    await expect(row.getByText("Menunggu")).toBeVisible();

    await row.getByRole("button", { name: "Terima" }).click();
    await expect(page.getByText("Pendaftaran diterima")).toBeVisible({ timeout: 10_000 });
    // Default filter is "Menunggu" (pending) — an accepted row correctly
    // drops out of that view, so switch to "Semua" to see its new status.
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Semua" }).click();
    await expect(row.getByText("Diterima")).toBeVisible();
  });
});
