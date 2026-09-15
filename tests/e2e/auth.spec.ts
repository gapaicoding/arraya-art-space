import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, TEST_PASSWORD } from "./helpers";

test.describe("Authentication", () => {
  test("wrong password shows an Indonesian error message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill("wrong-password-xyz");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByText("Email atau password salah.")).toBeVisible();
  });

  test("correct admin login reaches the dashboard with the app shell", async ({ page }) => {
    // The desktop sidebar has no "Lainnya" link (it links straight to
    // Area/Aktivitas/Organizer/Pengaturan) — "Lainnya" only exists in the
    // mobile bottom nav per PRD's mobile-first bottom navigation. Use a
    // phone-sized viewport so this assertion tests the real mobile nav.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();
    await page.waitForURL("/", { timeout: 30_000 });

    // Bottom nav (mobile) items should be present in the DOM.
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Jadwal" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Booking" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Lainnya" })).toBeVisible();
  });
});
