import { test, expect } from "@playwright/test";
import { loginAsAdmin, logout, TEST_PREFIX } from "./helpers";
import { adminClient } from "./supabase-admin";
import { localDateTimeToIso } from "../../src/lib/format";

const AREA_NAME = `${TEST_PREFIX}EventArea`;
const ACTIVITY_NAME = `${TEST_PREFIX}EventActivity`;
const PRODUCT_NAME = `${TEST_PREFIX}EventProduct`;

let scheduleId: string;
let areaId: string;
let activityId: string;
let productId: string;

test.describe("Halaman Detail Event Publik", () => {
  test.beforeAll(async () => {
    const supabase = adminClient();

    const { data: area, error: areaError } = await supabase
      .from("areas")
      .insert({ name: AREA_NAME, code: "E2EEVT", capacity: 10, location: "Lantai 2", status: "active" })
      .select()
      .single();
    if (areaError) throw areaError;
    areaId = area.id;

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({ name: PRODUCT_NAME, category: "Melukis", price: 45000, status: "active" })
      .select()
      .single();
    if (productError) throw productError;
    productId = product.id;

    const { data: activity, error: activityError } = await supabase
      .from("activities")
      .insert({
        name: ACTIVITY_NAME,
        category: "Melukis",
        description: `${TEST_PREFIX}Deskripsi kegiatan melukis bersama.`,
        default_duration_minutes: 60,
        product_id: productId,
        status: "active",
      })
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
        start_at: localDateTimeToIso(today, "10:00"),
        end_at: localDateTimeToIso(today, "11:00"),
        status: "confirmed",
        notes: `${TEST_PREFIX}event-detail-fixture`,
      })
      .select()
      .single();
    if (scheduleError) throw scheduleError;
    scheduleId = schedule.id;
  });

  test.afterAll(async () => {
    const supabase = adminClient();
    await supabase.from("schedules").delete().eq("id", scheduleId);
    await supabase.from("activities").delete().eq("id", activityId);
    await supabase.from("products").delete().eq("id", productId);
    await supabase.from("areas").delete().eq("id", areaId);
  });

  test("anonymous visitor clicks an event and sees full detail + WhatsApp CTA", async ({
    page,
  }) => {
    await page.goto("/");
    const row = page.locator("a", { hasText: ACTIVITY_NAME });
    await row.click();
    await expect(page).toHaveURL(`/event/${scheduleId}`);

    await expect(page.getByText(ACTIVITY_NAME)).toBeVisible();
    await expect(page.getByText("Melukis", { exact: true })).toBeVisible();
    await expect(page.getByText(AREA_NAME, { exact: false })).toBeVisible();
    await expect(page.getByText(/Rp\s?45\.000/)).toBeVisible();
    await expect(page.getByText("Tersedia")).toBeVisible();
    await expect(page.getByText(/Deskripsi kegiatan melukis bersama/)).toBeVisible();

    const waLink = page.getByRole("link", { name: "Hubungi Admin via WhatsApp" }).first();
    await expect(waLink).toHaveAttribute("href", new RegExp(`wa\\.me/\\d+\\?text=`));
  });

  test("event with no linked product shows a generic price prompt", async ({ page }) => {
    const supabase = adminClient();
    const { data: noProductActivity } = await supabase
      .from("activities")
      .insert({ name: `${TEST_PREFIX}NoProduct`, default_duration_minutes: 30, status: "active" })
      .select()
      .single();
    const today = new Date().toISOString().slice(0, 10);
    const { data: noProductSchedule } = await supabase
      .from("schedules")
      .insert({
        area_id: areaId,
        activity_id: noProductActivity!.id,
        type: "internal_activity",
        date: today,
        start_at: localDateTimeToIso(today, "14:00"),
        end_at: localDateTimeToIso(today, "14:30"),
        status: "confirmed",
        notes: `${TEST_PREFIX}no-product-fixture`,
      })
      .select()
      .single();

    await page.goto(`/event/${noProductSchedule!.id}`);
    await expect(page.getByText("Hubungi untuk info harga")).toBeVisible();

    await supabase.from("schedules").delete().eq("id", noProductSchedule!.id);
    await supabase.from("activities").delete().eq("id", noProductActivity!.id);
  });

  test("admin can link a product to an activity from master data", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/activities");
    await page.getByRole("button", { name: "+ Aktivitas Baru" }).click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.getByLabel("Nama Aktivitas").fill(`${TEST_PREFIX}LinkedActivity`);
    await dialog.getByLabel("Durasi Default (menit)").fill("45");
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: PRODUCT_NAME, exact: false }).click();
    await dialog.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Aktivitas ditambahkan")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("tr", { hasText: `${TEST_PREFIX}LinkedActivity` })).toBeVisible();

    // Cleanup this test's own activity (not tied to the shared fixture).
    const supabase = adminClient();
    await supabase.from("activities").delete().eq("name", `${TEST_PREFIX}LinkedActivity`);
    await logout(page);
  });
});
