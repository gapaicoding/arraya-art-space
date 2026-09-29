import { describe, expect, it } from "vitest";
import { wouldLeaveZeroActiveSuperAdmins, type ManagedUserRow } from "./user-management";

const users: ManagedUserRow[] = [
  { id: "super-1", role: "super_admin", is_active: true },
  { id: "staff-1", role: "staff", is_active: true },
];

describe("wouldLeaveZeroActiveSuperAdmins", () => {
  it("blocks demoting the only active super admin to staff", () => {
    expect(wouldLeaveZeroActiveSuperAdmins(users, "super-1", { role: "staff" })).toBe(true);
  });

  it("blocks deactivating the only active super admin", () => {
    expect(wouldLeaveZeroActiveSuperAdmins(users, "super-1", { is_active: false })).toBe(true);
  });

  it("allows demoting a super admin when another active super admin remains", () => {
    const twoSuperAdmins: ManagedUserRow[] = [
      { id: "super-1", role: "super_admin", is_active: true },
      { id: "super-2", role: "super_admin", is_active: true },
    ];
    expect(wouldLeaveZeroActiveSuperAdmins(twoSuperAdmins, "super-1", { role: "staff" })).toBe(
      false,
    );
  });

  it("allows promoting a staff member to super admin", () => {
    expect(wouldLeaveZeroActiveSuperAdmins(users, "staff-1", { role: "super_admin" })).toBe(
      false,
    );
  });

  it("allows deactivating a staff member regardless of super admin count", () => {
    expect(wouldLeaveZeroActiveSuperAdmins(users, "staff-1", { is_active: false })).toBe(false);
  });

  it("ignores an already-inactive super admin when counting", () => {
    const inactiveSuperAdmin: ManagedUserRow[] = [
      { id: "super-1", role: "super_admin", is_active: false },
      { id: "staff-1", role: "staff", is_active: true },
    ];
    // Promoting staff-1 to super admin should be allowed and correctly counted.
    expect(
      wouldLeaveZeroActiveSuperAdmins(inactiveSuperAdmin, "staff-1", { role: "super_admin" }),
    ).toBe(false);
    // But nothing here has an active super admin yet, so this reports true for a no-op change.
    expect(wouldLeaveZeroActiveSuperAdmins(inactiveSuperAdmin, "super-1", {})).toBe(true);
  });

  it("demoting the only active super admin to plain admin still counts as losing the only super admin", () => {
    expect(wouldLeaveZeroActiveSuperAdmins(users, "super-1", { role: "admin" })).toBe(true);
  });
});
