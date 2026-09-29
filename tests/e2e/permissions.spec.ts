import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin, loginAsAdmin, loginAsStaff, logout } from "./helpers";

test.describe("Role-based permissions", () => {
  test("admin sees create/edit controls on Area page", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/areas");
    await expect(page.getByRole("button", { name: "+ Area Baru" })).toBeVisible();
  });

  test("super admin sees create/edit controls on Area page (inherits admin)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/app/areas");
    await expect(page.getByRole("button", { name: "+ Area Baru" })).toBeVisible();
  });

  test("staff does NOT see create/edit controls on Area page but CAN create a Schedule", async ({ page }) => {
    await loginAsStaff(page);
    await page.goto("/app/areas");
    await expect(page.getByRole("button", { name: "+ Area Baru" })).toHaveCount(0);
    // No Edit buttons either, since the Aksi column is admin-only.
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);

    await page.goto("/app/schedule");
    await expect(page.getByRole("button", { name: "+ Jadwal Baru" })).toBeVisible();
  });

  test("admin and super admin can access Analytic; staff is redirected", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/analytics");
    await expect(page).toHaveURL("/app/analytics");
    await logout(page);

    await loginAsSuperAdmin(page);
    await page.goto("/app/analytics");
    await expect(page).toHaveURL("/app/analytics");
    await logout(page);

    await loginAsStaff(page);
    await page.goto("/app/analytics");
    await expect(page).toHaveURL("/app");
  });

  test("only super admin can access Manajemen Pengguna; admin and staff are redirected", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/app/settings/users");
    await expect(page).toHaveURL("/app");
    await logout(page);

    await loginAsStaff(page);
    await page.goto("/app/settings/users");
    await expect(page).toHaveURL("/app");
    await logout(page);

    await loginAsSuperAdmin(page);
    await page.goto("/app/settings/users");
    await expect(page).toHaveURL("/app/settings/users");
  });
});
