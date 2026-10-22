import { describe, expect, it } from "vitest";
import { groupAllocationsByRole, isAllocationRole, type AllocationPerson } from "./elifeAllocation";

const person = (role: string, name = role): AllocationPerson => ({
  id: name, source: "pennyekart_agents", name, mobile: null, role, ward: null, is_active: true, panchayaths: [],
});

describe("commission allocation roles", () => {
  it("includes roles from Super Admin down to Coordinator", () => {
    expect(isAllocationRole("super_admin")).toBe(true);
    expect(isAllocationRole("Admin")).toBe(true);
    expect(isAllocationRole("team-leader")).toBe(true);
    expect(isAllocationRole("coordinator")).toBe(true);
  });

  it("excludes roles below Coordinator", () => {
    expect(isAllocationRole("group_leader")).toBe(false);
    expect(isAllocationRole("pro")).toBe(false);
  });

  it("orders groups from Super Admin Partner to Coordinator", () => {
    const groups = groupAllocationsByRole([
      person("coordinator"), person("pro"), person("team_leader"), person("super_admin"), person("admin"),
      person("super_admin_partner"),
    ]);
    expect(groups.map((g) => g.role)).toEqual(["super admin partner", "super admin", "admin", "team leader", "coordinator"]);
  });

  it("treats Super Admin Partner as an allocation role at the top of the hierarchy", () => {
    expect(isAllocationRole("super_admin_partner")).toBe(true);
    expect(isAllocationRole("Super Admin Partner")).toBe(true);
  });
});
