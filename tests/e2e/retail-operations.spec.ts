import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin, loginAsStaff, logout, TEST_PREFIX } from "./helpers";

/**
 * Fills the inline "Nama Penginput" field at the top of Rekap
 * Penjualan/Pengeluaran and saves it. Not a dialog — this is a standard
 * page field, remembered per browser context (localStorage) once saved.
 */
async function setInputterName(page: Page, name: string) {
  const input = page.getByLabel("Nama Penginput");
  await input.fill(name);
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(input).toHaveValue(name);
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

  test("inputter name is remembered across visits and can be edited inline", async ({ page }) => {
    await loginAsStaff(page);
    await page.goto("/app/sales");
    await setInputterName(page, `${TEST_PREFIX}First`);

    // Reload — remembered for this browser context (localStorage), no
    // re-prompt needed.
    await page.reload();
    await expect(page.getByLabel("Nama Penginput")).toHaveValue(`${TEST_PREFIX}First`);

    // Edited directly inline — no dialog involved.
    await setInputterName(page, `${TEST_PREFIX}Second`);
    await expect(page.getByLabel("Nama Penginput")).toHaveValue(`${TEST_PREFIX}Second`);
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
