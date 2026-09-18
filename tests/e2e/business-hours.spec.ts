import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Business hours settings", () => {
  test("admin opens business hours settings and sees 7 day rows", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/settings/business-hours");
    await expect(page.getByRole("main").getByText("Jam Operasional")).toBeVisible();

    const dayNames = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    for (const day of dayNames) {
      await expect(page.getByText(day, { exact: true })).toBeVisible();
    }
  });
});
