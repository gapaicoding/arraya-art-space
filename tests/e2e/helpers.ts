import type { Page } from "@playwright/test";
import { ADMIN_EMAIL, STAFF_EMAIL, TEST_PASSWORD } from "./supabase-admin";

export { ADMIN_EMAIL, STAFF_EMAIL, TEST_PASSWORD };

export async function login(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /Masuk|Memproses/ }).click();
  await page.waitForURL("/", { timeout: 15_000 });
}

export async function loginAsAdmin(page: Page) {
  await login(page, ADMIN_EMAIL);
}

export async function loginAsStaff(page: Page) {
  await login(page, STAFF_EMAIL);
}
