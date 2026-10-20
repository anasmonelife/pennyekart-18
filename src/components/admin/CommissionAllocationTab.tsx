import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, MapPin, Download, ChevronRight, ChevronDown, ShieldCheck, Users } from "lucide-react";
import { commissionRateForRole, type CommissionRule } from "@/lib/communityCommission";
import CommunityCommissionTable from "./CommunityCommissionTable";
import { groupAllocationsByRole, isAllocationRole, normalizeRoleName, roleLabel, type AllocationPerson } from "@/lib/elifeAllocation";
import {
  buildAllocation, periodRange, type AllocatedPerson, type AllocationPeriod, type AreaCommunity,
} from "@/lib/commissionAllocation";

interface Props {
  roles: { id: string; name: string }[];
  rules: Record<string, CommissionRule>;
  fallbackRate: number;
  /** False until the saved commission rules have loaded, so a fresh calculation never uses placeholder rates. */
  ready?: boolean;
}

const SNAPSHOTS = "commission_allocation_snapshots";
// The snapshots table is newer than the generated client types.
const db = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, a?: Record<string, unknown>) => any };

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const PERIOD_LABELS: Record<AllocationPeriod, string> = {
  this_month: "This month",
  last_month: "Last month",
  all: "All time",
};

export default function CommissionAllocationTab({ roles, rules, fallbackRate, ready = true }: Props) {
  const [people, setPeople] = useState<AllocatedPerson[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [period, setPeriod] = useState<AllocationPeriod>("this_month");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [openRole, setOpenRole] = useState<string | null>(null);
  const [openPerson, setOpenPerson] = useState<string | null>(null);

  const pennyRoleId = useCallback(
    (role: string) => roles.find((r) => normalizeRoleName(r.name) === normalizeRoleName(role))?.id ?? null,
    [roles],
  );

  /** Fetch live e-Life allocations and community profits, calculate commission and save the result. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    const range = periodRange(period);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("elife-role-allocations");
      let message = data?.error as string | undefined;
      if (fnError && !message) {
        try { message = (await (fnError as { context?: Response }).context?.json())?.error; } catch { /* ignore */ }
        message = message || "Could not reach e-Life";
      }
      if (message) throw new Error(message);
      const elifePeople = ((data?.people ?? []) as AllocationPerson[]).filter((p) => isAllocationRole(p.role));
      const blockedTables = (data?.blocked_tables ?? []) as string[];

      const { data: summary, error: sumError } = await db.rpc("get_community_revenue_summary", { _from: range.from, _to: range.to });
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

      const allocated = buildAllocation(elifePeople, communities, (role) => commissionRateForRole(pennyRoleId(role), rules, fallbackRate));
      const seen = new Set<string>();
      let profitSum = 0;
      for (const p of allocated) for (const c of p.communities) {
        if (!seen.has(c.community_id)) { seen.add(c.community_id); profitSum += c.profit; }
      }
      const total_commission = allocated.reduce((s, p) => s + p.commission, 0);

      const { data: saved, error: saveError } = await db.from(SNAPSHOTS).insert({
        period_key: range.key,
        period_from: range.from,
        period_to: range.to,
        people: allocated,
        blocked_tables: blockedTables,
        total_profit: profitSum,
        total_commission,
      }).select("created_at").maybeSingle();
      if (saveError) throw new Error(`Calculated but could not save: ${saveError.message}`);

      setPeople(allocated);
      setBlocked(blockedTables);
      setSavedAt(saved?.created_at ?? new Date().toISOString());
    } catch (e) {
      setError((e as Error).message);
    }
    setRefreshing(false);
    setLoading(false);
  }, [period, pennyRoleId, rules, fallbackRate]);

  /** Show the last saved allocation for the period; calculate one when nothing is saved yet. */
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data } = await db.from(SNAPSHOTS)
        .select("people, blocked_tables, created_at")
        .eq("period_key", periodRange(period).key)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setPeople((data.people ?? []) as AllocatedPerson[]);
        setBlocked((data.blocked_tables ?? []) as string[]);
        setSavedAt(data.created_at);
        setLoading(false);
      } else {
        setPeople([]);
        setSavedAt(null);
        void refresh();
      }
    })().catch((e: unknown) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : "Could not load saved commission allocation");
      setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, ready]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = people.filter((p) =>
      !q ||
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.mobile ?? "").includes(q) ||
      p.panchayaths.some((x) => x.name.toLowerCase().includes(q) || (x.district ?? "").toLowerCase().includes(q)) ||
      (p.communities ?? []).some((c) => c.community_name.toLowerCase().includes(q)),
    );
    return groupAllocationsByRole(filtered);
  }, [people, search]);

  const allGroups = useMemo(() => groupAllocationsByRole(people), [people]);
  const visible = roleFilter === "all" ? groups : groups.filter((g) => g.role === roleFilter);
  const openGroup = visible.find((g) => g.role === openRole) ?? null;
  const totalCommission = people.reduce((s, p) => s + (p.commission ?? 0), 0);
  const areaCommunities = new Set(people.flatMap((p) => (p.communities ?? []).map((c) => c.community_id))).size;

  const exportCsv = () => {
    const header = ["Role", "Name", "Mobile", "Panchayaths", "Wards", "Districts", "Communities", "Area profit", "Commission %", "Commission"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = visible.flatMap((g) => g.people.map((p) => [
      roleLabel(g.role),
      p.name ?? "",
      p.mobile ?? "",
      p.panchayaths.map((x) => x.name).join("; "),
      (p.wards ?? []).join("; "),
      [...new Set(p.panchayaths.map((x) => x.district).filter(Boolean))].join("; "),
      (p.communities ?? []).map((c) => c.community_name).join("; "),
      (p.profit ?? 0).toFixed(2),
      String(p.rate ?? 0),
      (p.commission ?? 0).toFixed(2),
    ].map(esc).join(",")));
    const url = URL.createObjectURL(new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `commission-allocation-${periodRange(period).key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const busy = loading || refreshing;

  return (
    <div className="space-y-4">
      <CommunityCommissionTable rules={rules} fallbackRate={fallbackRate} ready={ready} />
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base">Commission allocation</CardTitle>
            <p className="text-sm text-muted-foreground">
              Communities in each person's allocated area, their profit and the commission from the role commission rules.
            </p>
            {savedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Saved {new Date(savedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · Refresh to fetch the latest
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as AllocationPeriod)}>
              <SelectTrigger className="h-9 w-[140px]" aria-label="Period"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PERIOD_LABELS) as AllocationPeriod[]).map((p) => (
                  <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={busy || !visible.length}>
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
            <Button size="sm" onClick={() => void refresh()} disabled={busy || !ready}>
              {refreshing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!busy && people.length > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-lg font-bold">{people.length}</p>
                <p className="text-[11px] text-muted-foreground">People</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-lg font-bold">{areaCommunities}</p>
                <p className="text-[11px] text-muted-foreground">Communities</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-lg font-bold">{money(totalCommission)}</p>
                <p className="text-[11px] text-muted-foreground">Total commission</p>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <Input placeholder="Search name, mobile, panchayath or community" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger aria-label="Filter by role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {allGroups.map((g) => <SelectItem key={g.role} value={g.role}>{roleLabel(g.role)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {blocked.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Some e-Life tables are not in the allowed list on the e-Life Bridge settings: {blocked.join(", ")}. Allow them to see full allocations.
            </p>
          )}
          {error && people.length > 0 && <p className="text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {busy && people.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading commission allocation...
        </div>
      ) : error && people.length === 0 ? (
        <Card><CardContent className="space-y-2 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>Try again</Button>
        </CardContent></Card>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No e-Life people found for these filters.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((g) => {
            const rate = g.people[0]?.rate ?? commissionRateForRole(pennyRoleId(g.role), rules, fallbackRate);
            const allocated = new Set(g.people.flatMap((p) => p.panchayaths.map((x) => x.id))).size;
            const comms = new Set(g.people.flatMap((p) => (p.communities ?? []).map((c) => c.community_id))).size;
            const commission = g.people.reduce((s, p) => s + (p.commission ?? 0), 0);
            return (
              <button
                key={g.role}
                type="button"
                onClick={() => setOpenRole(g.role)}
                className="group rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-semibold">{roleLabel(g.role)}</h3>
                      <p className="text-xs text-muted-foreground">{rate}% of area profit</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{g.people.length}</p>
                    <p className="text-[11px] text-muted-foreground">People</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{allocated}</p>
                    <p className="text-[11px] text-muted-foreground">Panchayaths</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{comms}</p>
                    <p className="text-[11px] text-muted-foreground">Communities</p>
                  </div>
                  <div className="rounded-md bg-primary/10 p-2">
                    <p className="text-lg font-bold text-primary">{money(commission)}</p>
                    <p className="text-[11px] text-muted-foreground">Commission</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!openGroup} onOpenChange={(o) => !o && setOpenRole(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openGroup ? `${roleLabel(openGroup.role)} (${openGroup.people.length})` : ""}</DialogTitle>
            {openGroup && (
              <DialogDescription>
                Commission {openGroup.people[0]?.rate ?? 0}% of the profit from communities in each person's area · {PERIOD_LABELS[period]}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2">
            {openGroup?.people.map((p) => {
              const expanded = openPerson === p.id;
              const list = p.communities ?? [];
              return (
                <div key={p.id} className="rounded-lg border bg-card">
                  <button
                    type="button"
                    onClick={() => setOpenPerson(expanded ? null : p.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{p.mobile || "—"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!p.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                      <Badge variant="secondary" className="gap-1 font-normal">
                        <MapPin className="h-3 w-3" /> {p.panchayaths.length}
                      </Badge>
                      <Badge variant="secondary" className="gap-1 font-normal">
                        <Users className="h-3 w-3" /> {list.length}
                      </Badge>
                      <span className="text-sm font-semibold text-primary">{money(p.commission ?? 0)}</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {expanded && (
                    <div className="space-y-3 border-t p-3">
                      {p.panchayaths.length ? (
                        <div className="flex flex-wrap gap-1">
                          {p.panchayaths.map((x) => (
                            <Badge key={x.id} variant="secondary" className="gap-1 font-normal">
                              <MapPin className="h-3 w-3" />
                              {x.name}{x.district ? ` · ${x.district}` : ""}
                            </Badge>
                          ))}
                          {p.wards && p.wards.length > 0 && (
                            <Badge variant="outline" className="font-normal">
                              {p.wards.length === 1 ? "Ward" : "Wards"} {p.wards.join(", ")}
                            </Badge>
                          )}
                        </div>
                      ) : <p className="text-xs text-muted-foreground">Not allocated</p>}
                      {list.length ? (
                        <div className="divide-y rounded-md border">
                          {list.map((c) => (
                            <div key={c.community_id} className="flex items-center justify-between gap-3 p-2 text-sm">
                              <div className="min-w-0">
                                <p className="truncate font-medium">{c.community_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {c.local_body_name ?? "—"}{c.ward_number != null ? ` · Ward ${c.ward_number}` : ""} · {c.member_count} members · {c.order_count} orders
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-xs text-muted-foreground">Profit {money(c.profit)}</p>
                                <p className="font-semibold">{money((c.profit * (p.rate ?? 0)) / 100)}</p>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between p-2 text-sm font-semibold">
                            <span>Total · profit {money(p.profit ?? 0)}</span>
                            <span className="text-primary">{money(p.commission ?? 0)}</span>
                          </div>
                        </div>
                      ) : <p className="text-xs text-muted-foreground">No communities in this area yet</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
