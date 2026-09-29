import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin, loginAsStaff, logout, TEST_PREFIX } from "./helpers";

/**
 * Fills the mandatory "Siapa yang input data sekarang?" prompt that
 * blocks Rekap Penjualan/Pengeluaran until an inputter name is set for
 * this browser context (fresh per test, so it always appears here).
 */
async function setInputterName(page: Page, name: string) {
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog.getByText("Siapa yang input data sekarang?")).toBeVisible();
  await dialog.getByPlaceholder("Nama penginput").fill(name);
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(dialog).toBeHidden();
}

test.describe("Stage 9 — Rekap Penjualan & Pengeluaran", () => {
  test("staff can record a sale and sees it in today's recap", async ({ page }) => {
    await loginAsStaff(page);
    await page.goto("/app/sales");
    await setInputterName(page, `${TEST_PREFIX}Staff`);

    await page.getByRole("button", { name: "+ Catat Penjualan" }).click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Melukis Kanvas Polos", exact: false }).first().click();
    await dialog.getByLabel("Jumlah").fill("2");
    await dialog.getByLabel("Catatan (opsional)").fill(`${TEST_PREFIX}sale`);
    await dialog.getByRole("button", { name: "Simpan" }).click();

    await expect(page.getByText("Penjualan dicatat")).toBeVisible({ timeout: 10_000 });
    const row = page.locator("tr", { hasText: `${TEST_PREFIX}sale` });
    await expect(row).toBeVisible();
    await expect(row.getByText("2", { exact: true })).toBeVisible();
    await expect(row.getByText(`${TEST_PREFIX}Staff`)).toBeVisible();
  });

  test("staff can record an expense and sees it in today's recap", async ({ page }) => {
    await loginAsStaff(page);
    await page.goto("/app/expenses");
    await setInputterName(page, `${TEST_PREFIX}Staff`);

    await page.getByRole("button", { name: "+ Catat Pengeluaran" }).click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Kuas", exact: false }).first().click();
    await dialog.getByLabel("Jumlah").fill("5");
    await dialog.getByLabel("Catatan (opsional)").fill(`${TEST_PREFIX}expense`);
    await dialog.getByRole("button", { name: "Simpan" }).click();

    await expect(page.getByText("Pengeluaran dicatat")).toBeVisible({ timeout: 10_000 });
    const row = page.locator("tr", { hasText: `${TEST_PREFIX}expense` });
    await expect(row).toBeVisible();
    await expect(row.getByText(`${TEST_PREFIX}Staff`)).toBeVisible();
  });

  test("inputter name is remembered across entries and can be changed via 'Ganti'", async ({
    page,
  }) => {
    await loginAsStaff(page);
    await page.goto("/app/sales");
    await setInputterName(page, `${TEST_PREFIX}First`);
    await expect(page.getByText(`Penginput saat ini: ${TEST_PREFIX}First`)).toBeVisible();

    // Reload — the dialog should NOT reappear, the name is remembered
    // for this browser context (localStorage), not re-prompted per visit.
    await page.reload();
    await expect(page.getByText(`Penginput saat ini: ${TEST_PREFIX}First`)).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toBeHidden();

    // "Ganti" opens the same dialog to switch names mid-session.
    await page.getByRole("button", { name: "Ganti" }).click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByText("Siapa yang input data sekarang?")).toBeVisible();
    await dialog.getByPlaceholder("Nama penginput").fill(`${TEST_PREFIX}Second`);
    await dialog.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(`Penginput saat ini: ${TEST_PREFIX}Second`)).toBeVisible();
  });

  test("all roles see the financial summary on Dashboard", async ({ page }) => {
    await loginAsStaff(page);
    await page.goto("/app");
    await expect(page.getByText("Ringkasan Finansial Hari Ini")).toBeVisible();
    await expect(page.getByText("Omzet")).toBeVisible();
    await expect(page.getByText("Estimasi Profit")).toBeVisible();
  });

  test("staff cannot manage Produk master data; admin can", async ({ page }) => {
    await loginAsStaff(page);
    await page.goto("/app/products");
    await expect(page.getByRole("button", { name: "+ Produk Baru" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    await logout(page);

    await loginAsAdmin(page);
    await page.goto("/app/products");
    await page.getByRole("button", { name: "+ Produk Baru" }).click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.getByLabel("Nama").fill(`${TEST_PREFIX}Produk Preview`);
    await dialog.getByLabel("Harga Jual").fill("15000");
    await dialog.getByLabel("Satuan").fill("paket");
    await dialog.getByRole("button", { name: "Simpan" }).click();

    await expect(page.getByText("Produk ditambahkan")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("tr", { hasText: `${TEST_PREFIX}Produk Preview` })).toBeVisible();
  });

  test("staff cannot manage Katalog Bahan master data; admin can", async ({ page }) => {
    await loginAsStaff(page);
    await page.goto("/app/expense-items");
    await expect(page.getByRole("button", { name: "+ Bahan Baru" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    await logout(page);

    await loginAsAdmin(page);
    await page.goto("/app/expense-items");
    await page.getByRole("button", { name: "+ Bahan Baru" }).click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.getByLabel("Nama").fill(`${TEST_PREFIX}Bahan Preview`);
    await dialog.getByLabel("Satuan").fill("pcs");
    await dialog.getByRole("button", { name: "Simpan" }).click();

    await expect(page.getByText("Bahan ditambahkan")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("tr", { hasText: `${TEST_PREFIX}Bahan Preview` })).toBeVisible();
  });
});
