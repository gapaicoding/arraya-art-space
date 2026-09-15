import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsStaff, login, logout, ADMIN_EMAIL } from "./helpers";
import { adminClient } from "./supabase-admin";

const NEW_USER_EMAIL = "e2e-test-um-newuser@arayya.test";
const NEW_USER_PASSWORD = "E2eTestNewUser1!";
const NEW_USER_NAME = "E2E_TEST_UM_NewUser";

async function findAuthUser(email: string) {
  const supabase = adminClient();
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  return data?.users.find((u) => u.email === email) ?? null;
}

async function attemptLogin(email: string, password: string) {
  return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

/** Auth state changes (ban/unban, password reset) can take a moment to
 * propagate — retry a login check briefly instead of asserting instantly. */
async function attemptLoginWithRetry(
  email: string,
  password: string,
  expectedStatus: number,
  retries = 5,
) {
  let res: Response;
  for (let attempt = 0; attempt < retries; attempt++) {
    res = await attemptLogin(email, password);
    if (res.status === expectedStatus) return res;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return res!;
}

test.describe("User management", () => {
  test.afterEach(async () => {
    const created = await findAuthUser(NEW_USER_EMAIL);
    if (created) {
      const supabase = adminClient();
      await supabase.auth.admin.deleteUser(created.id);
    }
  });

  test("staff cannot access the users settings page", async ({ page }) => {
    await loginAsStaff(page);
    await page.goto("/settings/users");
    await expect(page).toHaveURL("/");
  });

  test("admin creates a new user who can log in immediately", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/settings/users");

    await page.getByRole("button", { name: "+ User Baru" }).click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.getByLabel("Nama").fill(NEW_USER_NAME);
    await dialog.getByLabel("Email").fill(NEW_USER_EMAIL);
    await dialog.getByLabel("Password Sementara").fill(NEW_USER_PASSWORD);
    await dialog.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(new RegExp(`User dibuat.*${NEW_USER_NAME}`))).toBeVisible({
      timeout: 10_000,
    });

    const row = page.locator("tr", { hasText: NEW_USER_EMAIL });
    await expect(row).toBeVisible();
    await expect(row.getByRole("combobox")).toContainText("Staff");

    // The new user can log in with the temp password right away — no
    // email verification/invite step was involved.
    await logout(page);
    await login(page, NEW_USER_EMAIL, NEW_USER_PASSWORD);
    await expect(page).toHaveURL("/");
  });

  test("admin can change another user's role, deactivate, and reset password via the UI", async ({
    page,
  }) => {
    // Seed the target user directly (not through the UI) so this test is
    // focused on the role/status/reset controls, not creation.
    const supabase = adminClient();
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: NEW_USER_EMAIL,
      password: NEW_USER_PASSWORD,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(`Failed to seed test user: ${error?.message}`);
    await supabase
      .from("profiles")
      .update({ full_name: NEW_USER_NAME, role: "staff" })
      .eq("id", created.user.id);

    await loginAsAdmin(page);
    await page.goto("/settings/users");
    const row = page.locator("tr", { hasText: NEW_USER_EMAIL });
    await expect(row).toBeVisible();

    // Promote to admin, then demote back to staff.
    await row.getByRole("combobox").click();
    await page.getByRole("option", { name: "Admin" }).click();
    await expect(row.getByRole("combobox")).toContainText("Admin", { timeout: 5_000 });
    const { data: afterPromote } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", created.user.id)
      .single();
    expect(afterPromote?.role).toBe("admin");

    await row.getByRole("combobox").click();
    await page.getByRole("option", { name: "Staff" }).click();
    await expect(row.getByRole("combobox")).toContainText("Staff", { timeout: 5_000 });

    // Deactivate — the account can no longer log in (verified directly
    // against Supabase Auth, not through a second browser session).
    await row.getByRole("switch").click();
    await expect(row.getByText("Nonaktif")).toBeVisible({ timeout: 5_000 });

    const bannedLogin = await attemptLoginWithRetry(NEW_USER_EMAIL, NEW_USER_PASSWORD, 400);
    expect(bannedLogin.status).toBe(400);
    const bannedBody = await bannedLogin.json();
    expect(bannedBody.error_code).toBe("user_banned");

    // Reactivate — login works again. The unban can take a moment to
    // propagate on Supabase's side, so retry the login check briefly
    // instead of asserting on the very first attempt.
    await row.getByRole("switch").click();
    await expect(row.getByText("Aktif")).toBeVisible({ timeout: 5_000 });

    const reactivatedLogin = await attemptLoginWithRetry(NEW_USER_EMAIL, NEW_USER_PASSWORD, 200);
    expect(reactivatedLogin.status).toBe(200);

    // Reset password via the UI, verify the new password works and the
    // old one no longer does.
    const resetPassword = "E2eTestReset2!";
    await row.getByRole("button", { name: "Reset Password" }).click();
    const resetDialog = page.locator('[role="alertdialog"]');
    await resetDialog.getByRole("textbox").fill(resetPassword);
    await resetDialog.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByText(new RegExp(`Password baru untuk ${NEW_USER_NAME}`))).toBeVisible({
      timeout: 10_000,
    });

    const newPasswordLogin = await attemptLoginWithRetry(NEW_USER_EMAIL, resetPassword, 200);
    expect(newPasswordLogin.status).toBe(200);

    const oldPasswordLogin = await attemptLogin(NEW_USER_EMAIL, NEW_USER_PASSWORD);
    expect(oldPasswordLogin.status).toBe(400);
  });

  test("admin cannot change their own role or deactivate themselves", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/settings/users");

    const selfRow = page.locator("tr", { hasText: ADMIN_EMAIL });
    await expect(selfRow.getByRole("combobox")).toBeDisabled();
    await expect(selfRow.getByRole("switch")).toBeDisabled();
  });
});
