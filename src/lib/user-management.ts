export type ManagedUserRole = "super_admin" | "admin" | "staff";

export type ManagedUserRow = {
  id: string;
  role: ManagedUserRole;
  is_active: boolean;
};

/**
 * Guards against a super admin action (role change or deactivation) that
 * would leave the system with zero active super admins — which would lock
 * everyone out of user management (the only role that can reach it) with
 * no way back in short of a manual DB fix.
 */
export function wouldLeaveZeroActiveSuperAdmins(
  users: ManagedUserRow[],
  targetId: string,
  changes: Partial<Pick<ManagedUserRow, "role" | "is_active">>,
): boolean {
  const activeSuperAdminsAfter = users.filter((u) => {
    const role = u.id === targetId && changes.role !== undefined ? changes.role : u.role;
    const isActive =
      u.id === targetId && changes.is_active !== undefined ? changes.is_active : u.is_active;
    return role === "super_admin" && isActive;
  });
  return activeSuperAdminsAfter.length === 0;
}
