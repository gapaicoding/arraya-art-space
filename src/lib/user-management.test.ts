import { describe, expect, it } from "vitest";
import { wouldLeaveZeroActiveAdmins, type ManagedUserRow } from "./user-management";

const users: ManagedUserRow[] = [
  { id: "admin-1", role: "admin", is_active: true },
  { id: "staff-1", role: "staff", is_active: true },
];

describe("wouldLeaveZeroActiveAdmins", () => {
  it("blocks demoting the only active admin to staff", () => {
    expect(wouldLeaveZeroActiveAdmins(users, "admin-1", { role: "staff" })).toBe(true);
  });

  it("blocks deactivating the only active admin", () => {
    expect(wouldLeaveZeroActiveAdmins(users, "admin-1", { is_active: false })).toBe(true);
  });

  it("allows demoting an admin when another active admin remains", () => {
    const twoAdmins: ManagedUserRow[] = [
      { id: "admin-1", role: "admin", is_active: true },
      { id: "admin-2", role: "admin", is_active: true },
    ];
    expect(wouldLeaveZeroActiveAdmins(twoAdmins, "admin-1", { role: "staff" })).toBe(false);
  });

  it("allows promoting a staff member to admin", () => {
    expect(wouldLeaveZeroActiveAdmins(users, "staff-1", { role: "admin" })).toBe(false);
  });

  it("allows deactivating a staff member regardless of admin count", () => {
    expect(wouldLeaveZeroActiveAdmins(users, "staff-1", { is_active: false })).toBe(false);
  });

  it("ignores an already-inactive admin when counting", () => {
    const inactiveAdmin: ManagedUserRow[] = [
      { id: "admin-1", role: "admin", is_active: false },
      { id: "staff-1", role: "staff", is_active: true },
    ];
    // Promoting staff-1 to admin should be allowed and correctly counted.
    expect(wouldLeaveZeroActiveAdmins(inactiveAdmin, "staff-1", { role: "admin" })).toBe(false);
    // But nothing here has an active admin yet, so this reports true for a no-op change.
    expect(wouldLeaveZeroActiveAdmins(inactiveAdmin, "admin-1", {})).toBe(true);
  });
});
