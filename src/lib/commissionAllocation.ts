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

export type RecipientType = "creator" | "coordinator" | "team_leader" | "super_admin";
/** Creator first, then the hierarchy roles — the order allocation rows are shown in. */
export const RECIPIENT_TYPE_ORDER: RecipientType[] = ["creator", "coordinator", "team_leader", "super_admin"];

export interface AllocationRowGroup<T> {
  community_id: string;
  community_name: string;
  period_from: string;
  period_to: string;
  rows: T[];
}

/** All allocations of one community for one period share a single table row. */
export const groupAllocationRows = <T extends { community_id: string; period_from: string; period_to: string; recipient_type?: string }>(
  rows: T[],
): AllocationRowGroup<T>[] => {
  const map = new Map<string, AllocationRowGroup<T>>();
  for (const r of rows) {
    const key = `${r.community_id}|${r.period_from}|${r.period_to}`;
    let g = map.get(key);
    if (!g) {
      g = { community_id: r.community_id, community_name: r.community_id, period_from: r.period_from, period_to: r.period_to, rows: [] };
      map.set(key, g);
    }
    g.rows.push(r);
  }
  const typeRank = (t?: string) => {
    const i = RECIPIENT_TYPE_ORDER.indexOf((t ?? "") as RecipientType);
    return i < 0 ? RECIPIENT_TYPE_ORDER.length : i;
  };
  for (const g of map.values()) g.rows.sort((a, b) => typeRank(a.recipient_type) - typeRank(b.recipient_type));
  return [...map.values()].sort((a, b) =>
    a.community_name.localeCompare(b.community_name) || (a.period_from < b.period_from ? -1 : 1));
};


const HIERARCHY: Record<string, RecipientType> = {
  coordinator: "coordinator", "team leader": "team_leader", "super admin": "super_admin",
};

/**
 * Coordinators earn on communities in their wards, team leaders and super admins on communities in their panchayaths.
 * Each role's share of a community is split equally among everyone of that role covering it.
 * Only community profit is shared, so sales outside communities never appear.
 */
export const buildHierarchyRows = (
  people: AllocationPerson[],
  communities: AreaCommunity[],
  rateForRole: (role: string) => number,
): PayoutRow[] => {
  const rows: PayoutRow[] = [];
  for (const [roleName, type] of Object.entries(HIERARCHY)) {
    const holders = people.filter((p) => normalizeRoleName(p.role) === roleName);
    const covering = new Map<string, AllocationPerson[]>();
    for (const p of holders) for (const c of communitiesInArea(p, communities)) {
      covering.set(c.community_id, [...(covering.get(c.community_id) ?? []), p]);
    }
    for (const c of communities) {
      const list = covering.get(c.community_id);
      if (!list?.length || c.profit <= 0) continue;
      const rate = rateForRole(roleName);
      const share = Math.round((c.profit * rate) / list.length) / 100;
      for (const p of list) rows.push({
        community_id: c.community_id, community_name: c.community_name, recipient_type: type,
        recipient_name: p.name, recipient_mobile: p.mobile, elife_person_id: `${p.source}:${p.id}`,
        customer_user_id: null, total_profit: c.profit, commission_rate: rate, share_count: list.length,
        calculated_commission: share,
      });
    }
  }
  return rows;
};
