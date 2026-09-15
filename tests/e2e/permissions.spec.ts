import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsStaff } from "./helpers";

test.describe("Role-based permissions", () => {
  test("admin sees create/edit controls on Area page", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/areas");
    await expect(page.getByRole("button", { name: "+ Area Baru" })).toBeVisible();
  });

  test("staff does NOT see create/edit controls on Area page but CAN create a Schedule", async ({ page }) => {
    await loginAsStaff(page);
    await page.goto("/areas");
    await expect(page.getByRole("button", { name: "+ Area Baru" })).toHaveCount(0);
    // No Edit buttons either, since the Aksi column is admin-only.
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);

    await page.goto("/schedule");
    await expect(page.getByRole("button", { name: "+ Jadwal Baru" })).toBeVisible();
  });
});
