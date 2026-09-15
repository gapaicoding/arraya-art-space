import type { Page } from "@playwright/test";
import { ADMIN_EMAIL, STAFF_EMAIL, TEST_PASSWORD } from "./supabase-admin";

export { ADMIN_EMAIL, STAFF_EMAIL, TEST_PASSWORD };

export async function login(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto("/login");
  // WebKit has been observed to silently no-op a plain .fill() on this
  // email input (the value stays empty even though .fill() resolves) —
  // click-then-type via pressSequentially is reliable across engines.
  const emailInput = page.getByLabel("Email");
  await emailInput.click();
  await emailInput.pressSequentially(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /Masuk|Memproses/ }).click();
  await page.waitForURL("/", { timeout: 15_000 });
  // The login page calls router.push() *and* router.refresh() — WebKit can
  // still be mid-navigation from that refresh when the next test step
  // fires its own page.goto(), causing a "navigation interrupted" error.
  // Let it settle before returning.
  // Wait for an actual dashboard element instead of a load-state signal —
  // Next.js dev's HMR websocket keeps "networkidle" from ever firing, and
  // "load" fires before the router.refresh() navigation is done, so either
  // one lets a subsequent page.goto() race the in-flight refresh in WebKit.
  await page.getByText("Selamat datang").waitFor();
  // Even after that text is visible, the App Router's client-side
  // transition from router.push()+router.refresh() can still be settling
  // in the background — a hard page.goto() called immediately after can
  // get killed mid-flight ("interrupted by another navigation") in WebKit.
  // A short real wait avoids the race.
  await page.waitForTimeout(500);
}

export async function loginAsAdmin(page: Page) {
  await login(page, ADMIN_EMAIL);
}

export async function loginAsStaff(page: Page) {
  await login(page, STAFF_EMAIL);
}
