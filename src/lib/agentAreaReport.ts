import { supabase } from "@/integrations/supabase/client";
import { isAllocationRole, type AllocationPerson } from "@/lib/elifeAllocation";
import type { AreaCommunity } from "@/lib/commissionAllocation";

/** Snapshots/table reads use the untyped client until the generated types cover them. */
const db = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, a?: Record<string, unknown>) => any };

export interface AreaReportData {
  people: AllocationPerson[];
  communities: AreaCommunity[];
  blockedTables: string[];
}

/**
 * Shared e-Life area data for the commission allocation and reporting screens:
 * people with their allocated panchayaths (super-admin-checked elife-role-allocations
 * Edge Function) plus communities with the creator's area (panchayath + ward) and
 * period profit (get_community_revenue_summary). Null from/to means all time.
 */
export const fetchAreaCommunities = async (from: string | null, to: string | null): Promise<AreaReportData> => {
  const { data, error: fnError } = await supabase.functions.invoke("elife-role-allocations");
  let message = data?.error as string | undefined;
  if (fnError && !message) {
    try { message = (await (fnError as { context?: Response }).context?.json())?.error; } catch { /* ignore */ }
    message = message || "Could not reach e-Life";
  }
  if (message) throw new Error(message);
  const people = ((data?.people ?? []) as AllocationPerson[]).filter((p) => isAllocationRole(p.role));
  const blockedTables = (data?.blocked_tables ?? []) as string[];

  const { data: summary, error: sumError } = await db.rpc("get_community_revenue_summary", { _from: from, _to: to });
  if (sumError) throw new Error(sumError.message);
  const rows = (summary ?? []) as Record<string, any>[];
  const creatorIds = [...new Set(rows.map((r) => r.creator_user_id).filter(Boolean))];
  const { data: profiles } = creatorIds.length
    ? await db.from("profiles").select("user_id, local_body_id, ward_number").in("user_id", creatorIds)
    : { data: [] };
  const profileBy = new Map(((profiles ?? []) as any[]).map((p) => [p.user_id, p]));
  const bodyIds = [...new Set(((profiles ?? []) as any[]).map((p) => p.local_body_id).filter(Boolean))];
  const { data: bodies } = bodyIds.length
    ? await db.from("locations_local_bodies").select("id, name").in("id", bodyIds)
    : { data: [] };
  const bodyName = new Map(((bodies ?? []) as any[]).map((b) => [b.id, b.name as string]));

  const communities: AreaCommunity[] = rows.map((r) => {
    const profile = profileBy.get(r.creator_user_id);
    return {
      community_id: r.community_id,
      community_name: r.community_name,
      creator_name: r.creator_name ?? null,
      local_body_name: profile?.local_body_id ? bodyName.get(profile.local_body_id) ?? null : null,
      ward_number: profile?.ward_number ?? null,
      member_count: Number(r.member_count) || 0,
      order_count: Number(r.order_count) || 0,
      revenue: Number(r.revenue) || 0,
      profit: Number(r.profit) || 0,
    };
  });

  return { people, communities, blockedTables };
};
