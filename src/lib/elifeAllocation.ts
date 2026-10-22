export interface AllocationPanchayath { id: string; name: string; district: string | null }
export interface AllocationPerson {
  id: string;
  source: string;
  name: string | null;
  mobile: string | null;
  role: string;
  ward: string | number | null;
  /** Coordinators only: wards they cover inside their single panchayath. */
  wards?: string[];
  is_active: boolean;
  panchayaths: AllocationPanchayath[];
}

export const normalizeRoleName = (raw: string | null | undefined) =>
  String(raw ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

/** Top-down hierarchy shown on the commission allocation tab: Super Admin down to Coordinator. */
export const ALLOCATION_ROLE_ORDER = [
  "super admin partner",
  "super admin",
  "admin",
  "state coordinator",
  "district coordinator",
  "manager",
  "team leader",
  "coordinator",
] as const;

export const allocationRoleRank = (role: string) => {
  const r = normalizeRoleName(role);
  const i = (ALLOCATION_ROLE_ORDER as readonly string[]).indexOf(r);
  if (i >= 0) return i;
  // Other admin-level roles sit just below Admin
  return r.startsWith("super admin") ? 0 : r.includes("admin") ? 1.5 : -1;
};

/** Group Leader, Pro and other roles below Coordinator are excluded. */
export const isAllocationRole = (role: string) => allocationRoleRank(role) >= 0;

export const roleLabel = (role: string) =>
  normalizeRoleName(role).replace(/\b\w/g, (c) => c.toUpperCase());

export const groupAllocationsByRole = <T extends AllocationPerson>(people: T[]) => {
  const groups = new Map<string, T[]>();
  for (const p of people) {
    if (!isAllocationRole(p.role)) continue;
    const key = normalizeRoleName(p.role);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => allocationRoleRank(a) - allocationRoleRank(b))
    .map(([role, list]) => ({
      role,
      people: list.sort((x, y) => (x.name ?? "").localeCompare(y.name ?? "")),
    }));
};
