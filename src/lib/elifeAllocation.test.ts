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

  it("orders groups from Super Admin to Coordinator", () => {
    const groups = groupAllocationsByRole([
      person("coordinator"), person("pro"), person("team_leader"), person("super_admin"), person("admin"),
    ]);
    expect(groups.map((g) => g.role)).toEqual(["super admin", "admin", "team leader", "coordinator"]);
  });
});
