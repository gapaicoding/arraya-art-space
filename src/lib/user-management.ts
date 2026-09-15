export type ManagedUserRole = "admin" | "staff";

export type ManagedUserRow = {
  id: string;
  role: ManagedUserRole;
  is_active: boolean;
};

/**
 * Guards against an admin action (role change or deactivation) that would
 * leave the system with zero active admins — which would lock everyone out
 * of admin-only features with no way back in short of a manual DB fix.
 */
export function wouldLeaveZeroActiveAdmins(
  users: ManagedUserRow[],
  targetId: string,
  changes: Partial<Pick<ManagedUserRow, "role" | "is_active">>,
): boolean {
  const activeAdminsAfter = users.filter((u) => {
    const role = u.id === targetId && changes.role !== undefined ? changes.role : u.role;
    const isActive =
      u.id === targetId && changes.is_active !== undefined ? changes.is_active : u.is_active;
    return role === "admin" && isActive;
  });
  return activeAdminsAfter.length === 0;
}
