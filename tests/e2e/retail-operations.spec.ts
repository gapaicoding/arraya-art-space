import { test, expect, type Page } from "@playwright/test";
import { loginAsSuperAdmin, loginAsAdmin, loginAsStaff, logout, TEST_PREFIX } from "./helpers";

/**
 * Reveals and fills the inline inputter-name editor (via the "Isi/Ganti
 * Nama Penginput" button) at the top of Rekap Penjualan/Pengeluaran, then
 * saves it. Not a dialog — remembered per browser context (localStorage)
 * once saved.
 */
async function setInputterName(page: Page, name: string) {
  await page.getByRole("button", { name: /Nama Penginput/ }).click();
  await page.getByPlaceholder("Ketik nama penginput...").fill(name);
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
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
    await expect(page.getByText(`${TEST_PREFIX}First`, { exact: true })).toBeVisible();

    // Reload — remembered for this browser context (localStorage), no
    // re-prompt needed.
    await page.reload();
    await expect(page.getByText(`${TEST_PREFIX}First`, { exact: true })).toBeVisible();

    // Edited directly inline via "Ganti Nama Penginput" — no dialog involved.
    await setInputterName(page, `${TEST_PREFIX}Second`);
    await expect(page.getByText(`${TEST_PREFIX}Second`, { exact: true })).toBeVisible();
  });

  test("staff can edit their own sale, but archive/restore/hard-delete are hidden", async ({
    page,
  }) => {
    await loginAsStaff(page);
    await page.goto("/app/sales");
    await setInputterName(page, `${TEST_PREFIX}EditFlow`);

    await page.getByRole("button", { name: "+ Catat Penjualan" }).click();
    let dialog = page.locator('[role="dialog"]');
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Melukis Kanvas Polos", exact: false }).first().click();
    await dialog.getByLabel("Jumlah").fill("1");
    await dialog.getByLabel("Catatan (opsional)").fill(`${TEST_PREFIX}editme`);
    await dialog.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Penjualan dicatat")).toBeVisible({ timeout: 10_000 });

    const row = page.locator("tr", { hasText: `${TEST_PREFIX}editme` });
    await expect(row).toBeVisible();
    // Staff sees Edit but not Arsipkan/Pulihkan/Hapus Permanen on this row.
    await expect(row.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Arsipkan" })).toHaveCount(0);

    await row.getByRole("button", { name: "Edit" }).click();
    dialog = page.locator('[role="dialog"]');
    await expect(dialog.getByText("Edit Penjualan")).toBeVisible();
    await dialog.getByLabel("Jumlah").fill("3");
    await dialog.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Penjualan diperbarui")).toBeVisible({ timeout: 10_000 });
    await expect(row.getByText("3", { exact: true })).toBeVisible();
  });

  test("admin can archive/restore a sale; super admin can hard-delete it", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/sales");
    await setInputterName(page, `${TEST_PREFIX}ArchiveFlow`);

    await page.getByRole("button", { name: "+ Catat Penjualan" }).click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Melukis Kanvas Polos", exact: false }).first().click();
    await dialog.getByLabel("Jumlah").fill("1");
    await dialog.getByLabel("Catatan (opsional)").fill(`${TEST_PREFIX}archiveme`);
    await dialog.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText("Penjualan dicatat")).toBeVisible({ timeout: 10_000 });

    let row = page.locator("tr", { hasText: `${TEST_PREFIX}archiveme` });
    await row.getByRole("button", { name: "Arsipkan" }).click();
    await expect(page.getByText("Penjualan diarsipkan")).toBeVisible({ timeout: 10_000 });
    // Archived rows drop out of the default (non-archived) view.
    await expect(row).toHaveCount(0);

    await page.getByRole("checkbox", { name: "Tampilkan yang diarsipkan" }).check();
    row = page.locator("tr", { hasText: `${TEST_PREFIX}archiveme` });
    await expect(row).toBeVisible();
    await expect(row.getByText("Diarsipkan")).toBeVisible();
    // Admin cannot hard-delete — no super_admin-only button on this row.
    await expect(row.getByRole("button", { name: "Hapus Permanen" })).toHaveCount(0);

    await row.getByRole("button", { name: "Pulihkan" }).click();
    await expect(page.getByText("Penjualan dipulihkan")).toBeVisible({ timeout: 10_000 });
    await logout(page);

    await loginAsSuperAdmin(page);
    await page.goto("/app/sales");
    await page.getByRole("checkbox", { name: "Tampilkan yang diarsipkan" }).check();
    row = page.locator("tr", { hasText: `${TEST_PREFIX}archiveme` });
    await row.getByRole("button", { name: "Arsipkan" }).click();
    await expect(page.getByText("Penjualan diarsipkan")).toBeVisible({ timeout: 10_000 });
    row = page.locator("tr", { hasText: `${TEST_PREFIX}archiveme` });
    await row.getByRole("button", { name: "Hapus Permanen" }).click();
    const confirmDialog = page.locator('[role="alertdialog"]');
    await confirmDialog.getByRole("button", { name: "Hapus Permanen" }).click();
    await expect(page.getByText("Penjualan dihapus permanen")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("tr", { hasText: `${TEST_PREFIX}archiveme` })).toHaveCount(0);
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
