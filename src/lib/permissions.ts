import type { ProfileRole } from "@/lib/supabase/types";

export interface AppPermissions {
  isSuperAdmin: boolean;
  /** True for admin AND super_admin — super_admin inherits every admin permission. */
  isAdmin: boolean;
  isStaff: boolean;

  /** Booking analytics (`/app/analytics`) — occupancy, schedule trend. */
  canAccessAnalytics: boolean;
  /** Areas, Activities, Organizers, Business Hours. */
  canManageMasterData: boolean;
  /** `/app/settings/users` — role changes, activation/deactivation. Owner-only. */
  canManageUsers: boolean;
}

const NO_PERMISSIONS: AppPermissions = {
  isSuperAdmin: false,
  isAdmin: false,
  isStaff: false,
  canAccessAnalytics: false,
  canManageMasterData: false,
  canManageUsers: false,
};

export function isProfileRole(role: unknown): role is ProfileRole {
  return role === "super_admin" || role === "admin" || role === "staff";
}

export function getRolePermissions(role: ProfileRole | null | undefined): AppPermissions {
  if (!isProfileRole(role)) {
    return NO_PERMISSIONS;
  }

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const isStaff = role === "staff";

  return {
    isSuperAdmin,
    isAdmin,
    isStaff,
    canAccessAnalytics: isAdmin,
    canManageMasterData: isAdmin,
    canManageUsers: isSuperAdmin,
  };
}

/** Nav item visibility: no `minRole` = everyone; otherwise role must meet or exceed it. */
export function meetsMinRole(permissions: AppPermissions, minRole?: "admin" | "super_admin") {
  if (!minRole) return true;
  return minRole === "super_admin" ? permissions.isSuperAdmin : permissions.isAdmin;
}
