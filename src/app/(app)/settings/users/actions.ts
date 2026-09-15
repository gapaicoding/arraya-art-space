"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { wouldLeaveZeroActiveAdmins, type ManagedUserRow } from "@/lib/user-management";
import { logError } from "@/lib/logger";

type ActionResult = { error?: string };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false as const, error: "Sesi tidak valid." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", auth.user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { ok: false as const, error: "Hanya admin yang bisa mengelola pengguna." };
  }
  return { ok: true as const, userId: auth.user.id };
}

async function getAllUsers(): Promise<ManagedUserRow[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, role, is_active");
  return (data ?? []) as ManagedUserRow[];
}

export async function createUserAction(
  fullName: string,
  email: string,
  password: string,
  role: "admin" | "staff",
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    logError("user-management-create", error);
    return { error: "Gagal membuat user: " + error.message };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: fullName, role, email })
    .eq("id", data.user.id);
  if (profileError) {
    logError("user-management-create-profile", profileError);
    return { error: "User dibuat, tapi gagal menyimpan nama/role: " + profileError.message };
  }

  revalidatePath("/settings/users");
  return {};
}

export async function updateUserRoleAction(
  userId: string,
  role: "admin" | "staff",
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  if (userId === auth.userId) {
    return { error: "Tidak bisa mengubah role Anda sendiri." };
  }

  const users = await getAllUsers();
  if (wouldLeaveZeroActiveAdmins(users, userId, { role })) {
    return { error: "Aksi ini akan membuat sistem tanpa admin aktif sama sekali." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) {
    logError("user-management-update-role", error);
    return { error: "Gagal mengubah role: " + error.message };
  }

  revalidatePath("/settings/users");
  return {};
}

export async function toggleUserActiveAction(
  userId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  if (userId === auth.userId) {
    return { error: "Tidak bisa menonaktifkan diri Anda sendiri." };
  }

  const users = await getAllUsers();
  if (wouldLeaveZeroActiveAdmins(users, userId, { is_active: isActive })) {
    return { error: "Aksi ini akan membuat sistem tanpa admin aktif sama sekali." };
  }

  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: isActive ? "none" : "876000h", // ~100 years, effectively indefinite
  });
  if (banError) {
    logError("user-management-toggle-active-ban", banError);
    return { error: "Gagal mengubah status login: " + banError.message };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);
  if (profileError) {
    logError("user-management-toggle-active-profile", profileError);
    return { error: "Gagal menyimpan status: " + profileError.message };
  }

  revalidatePath("/settings/users");
  return {};
}

export async function resetUserPasswordAction(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) {
    logError("user-management-reset-password", error);
    return { error: "Gagal reset password: " + error.message };
  }

  return {};
}
