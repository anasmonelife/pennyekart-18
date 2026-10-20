import type { AllocationPerson } from "@/lib/elifeAllocation";
import { normalizeRoleName } from "@/lib/elifeAllocation";

/** A Pennyekart community with its profit and the creator's area (panchayath + ward). */
export interface AreaCommunity {
  community_id: string;
  community_name: string;
  creator_name: string | null;
  local_body_name: string | null;
  ward_number: number | null;
  member_count: number;
  order_count: number;
  revenue: number;
  profit: number;
}

export interface AllocatedPerson extends AllocationPerson {
  rate: number;
  communities: AreaCommunity[];
  profit: number;
  commission: number;
}

export type AllocationPeriod = "this_month" | "last_month" | "all";

/** e-Life uses "Pandikkad" while Pennyekart stores "Pandikkad (പാണ്ടിക്കാട്)": compare on the plain name. */
export const normalizeAreaName = (raw: string | null | undefined) =>
  String(raw ?? "")
    .replace(/\(.*?\)/g, "")
    .toLowerCase()
    .replace(/\b(grama\s*)?panchayath?\b|\bmunicipality\b|\bcorporation\b/g, "")
    .replace(/[^a-z0-9]/g, "");

/**
 * Communities belong to the area of their creator.
 * Coordinators cover only their responsible wards inside their panchayath (or their own ward when none are set);
 * every other role covers all wards of each allocated panchayath.
 */
export const communitiesInArea = (person: AllocationPerson, communities: AreaCommunity[]) => {
  const areas = new Set(person.panchayaths.map((p) => normalizeAreaName(p.name)).filter(Boolean));
  const isCoordinator = normalizeRoleName(person.role) === "coordinator";
  const wardList = person.wards?.length ? person.wards : person.ward != null && person.ward !== "" ? [String(person.ward)] : [];
  const wards = new Set(wardList.map((w) => String(w).trim()));
  return communities.filter((c) => {
    if (!areas.has(normalizeAreaName(c.local_body_name))) return false;
    if (!isCoordinator || wards.size === 0) return true;
    return c.ward_number != null && wards.has(String(c.ward_number));
  });
};

export const buildAllocation = (
  people: AllocationPerson[],
  communities: AreaCommunity[],
  rateForRole: (role: string) => number,
): AllocatedPerson[] =>
  people.map((person) => {
    const list = communitiesInArea(person, communities);
    const profit = list.reduce((sum, c) => sum + c.profit, 0);
    const rate = rateForRole(person.role);
    return { ...person, rate, communities: list, profit, commission: (profit * rate) / 100 };
  });

export const periodRange = (period: AllocationPeriod, now = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (period === "all") return { key: "all", from: null as string | null, to: null as string | null };
  const offset = period === "last_month" ? -1 : 0;
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = period === "last_month" ? new Date(now.getFullYear(), now.getMonth(), 1) : now;
  return {
    key: `${start.getFullYear()}-${pad(start.getMonth() + 1)}`,
    from: start.toISOString(),
    to: end.toISOString(),
  };
};
