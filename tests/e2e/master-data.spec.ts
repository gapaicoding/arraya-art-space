import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";
import { adminClient, TEST_PREFIX } from "./supabase-admin";

const AREA_NAME = `${TEST_PREFIX}Area_1`;
const ACTIVITY_NAME = `${TEST_PREFIX}Activity_1`;
const ORGANIZER_NAME = `${TEST_PREFIX}Organizer_1`;

test.describe("Master data CRUD", () => {
  test.afterAll(async () => {
    const supabase = adminClient();
    await supabase.from("areas").delete().eq("name", AREA_NAME);
    await supabase.from("activities").delete().eq("name", ACTIVITY_NAME);
    await supabase.from("organizers").delete().eq("name", ORGANIZER_NAME);
  });
                                                                                                 
  test("admin creates, sees, edits, and persists an Area", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/areas");

    await page.getByRole("button", { name: "+ Area Baru" }).click();
    await page.getByLabel("Nama Area").fill(AREA_NAME);
    await page.getByLabel("Kode").fill("E2E1");
    await page.getByLabel("Kapasitas").fill("5");
    await page.getByRole("button", { name: "Simpan" }).click();

    await expect(page.getByRole("cell", { name: AREA_NAME })).toBeVisible();

    // Edit it.
    const row = page.locator("tr", { has: page.getByRole("cell", { name: AREA_NAME }) });
    await row.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Lokasi").fill("Lantai 2 E2E");
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByRole("cell", { name: AREA_NAME })).toBeVisible();

    await page.reload();
    const rowAfterReload = page.locator("tr", { has: page.getByRole("cell", { name: AREA_NAME }) });
    await expect(rowAfterReload.getByRole("cell", { name: "Lantai 2 E2E" })).toBeVisible();
  });

  test("admin creates and sees an Activity", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/activities");
    await page.getByRole("button", { name: "+ Aktivitas Baru" }).click();
    await page.getByLabel("Nama Aktivitas").fill(ACTIVITY_NAME);
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByRole("cell", { name: ACTIVITY_NAME })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("cell", { name: ACTIVITY_NAME })).toBeVisible();
  });

  test("admin creates and sees an Organizer", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/organizers");
    await page.getByRole("button", { name: "+ Organizer Baru" }).click();
    await page.getByLabel("Nama").fill(ORGANIZER_NAME);
    await page.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByRole("cell", { name: ORGANIZER_NAME })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("cell", { name: ORGANIZER_NAME })).toBeVisible();
  });
});
