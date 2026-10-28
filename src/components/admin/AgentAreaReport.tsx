import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, MapPin, RefreshCw, User } from "lucide-react";
import { fetchAreaCommunities } from "@/lib/agentAreaReport";
import { communitiesInArea, periodRange, type AllocationPeriod } from "@/lib/commissionAllocation";
import { groupAllocationsByRole, roleLabel } from "@/lib/elifeAllocation";

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const PERIOD_LABELS: Record<AllocationPeriod, string> = {
  this_month: "This month",
  last_month: "Last month",
  all: "All time",
};

export default function AgentAreaReport() {
  const [period, setPeriod] = useState<AllocationPeriod>("this_month");
  const [people, setPeople] = useState<Awaited<ReturnType<typeof fetchAreaCommunities>>["people"]>([]);
  const [communities, setCommunities] = useState<Awaited<ReturnType<typeof fetchAreaCommunities>>["communities"]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const [agentId, setAgentId] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    const range = periodRange(period);
    try {
      const data = await fetchAreaCommunities(range.from, range.to);
      setPeople(data.people);
      setCommunities(data.communities);
      setBlocked(data.blockedTables);
    } catch (e) {
      setError((e as Error).message);
    }
    setRefreshing(false);
    setLoading(false);
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => groupAllocationsByRole(people), [people]);
  /** Default the role to the highest-ranked one so the picker is never blank after loading. */
  useEffect(() => {
    setRole((current) => (current && groups.some((g) => g.role === current) ? current : groups[0]?.role ?? ""));
  }, [groups]);
  useEffect(() => { setAgentId(""); }, [role]);

  const group = groups.find((g) => g.role === role) ?? null;
  const agent = group?.people.find((p) => p.id === agentId) ?? null;
  const areaCommunities = useMemo(() => (agent ? communitiesInArea(agent, communities) : []), [agent, communities]);
  const totals = useMemo(() => areaCommunities.reduce(
    (acc, c) => ({
      members: acc.members + c.member_count,
      orders: acc.orders + c.order_count,
      revenue: acc.revenue + c.revenue,
      profit: acc.profit + c.profit,
    }),
    { members: 0, orders: 0, revenue: 0, profit: 0 },
  ), [areaCommunities]);

  const busy = loading || refreshing;

  const exportCsv = () => {
    if (!agent) return;
    const header = ["Community", "Creator", "Panchayath", "Ward", "Members", "Orders", "Revenue", "Profit"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = areaCommunities.map((c) => [
      c.community_name, c.creator_name ?? "", c.local_body_name ?? "",
      c.ward_number != null ? String(c.ward_number) : "",
      String(c.member_count), String(c.order_count),
      c.revenue.toFixed(2), c.profit.toFixed(2),
    ].map(esc).join(","));
    const totalsLine = ["Total", "", "", "", String(totals.members), String(totals.orders), totals.revenue.toFixed(2), totals.profit.toFixed(2)].map(esc).join(",");
    const blob = new Blob([[header.join(","), ...lines, totalsLine].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-area-report-${(agent.name ?? "agent").replace(/\s+/g, "-").toLowerCase()}-${periodRange(period).key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Agent area report</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick a role, then an agent, to see every community under their allocated panchayaths with its details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="agent-report-period">Period</label>
          <select
            id="agent-report-period"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as AllocationPeriod)}
          >
            {(Object.keys(PERIOD_LABELS) as AllocationPeriod[]).map((p) => (
              <option key={p} value={p}>{PERIOD_LABELS[p]}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!agent || areaCommunities.length === 0}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={() => void load()} disabled={busy}>
            {refreshing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)]">
          <div className="space-y-1.5">
            <Label htmlFor="agent-report-role">Role</Label>
            <select
              id="agent-report-role"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {groups.length === 0 && <option value="">No e-Life roles loaded</option>}
              {groups.map((g) => (
                <option key={g.role} value={g.role}>{roleLabel(g.role)} ({g.people.length})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-report-agent">Agent</Label>
            <select
              id="agent-report-agent"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              disabled={!group}
            >
              <option value="">{group ? "Select an agent" : "Select a role first"}</option>
              {(group?.people ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name || "—"}{p.mobile ? ` · ${p.mobile}` : ""}</option>
              ))}
            </select>
          </div>
        </div>
        {blocked.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Some e-Life tables are not in the allowed list on the e-Life Bridge settings: {blocked.join(", ")}.
          </p>
        )}
        {error && people.length > 0 && <p className="text-xs text-destructive">{error}</p>}

        {busy && people.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading e-Life allocations...
          </div>
        ) : error && people.length === 0 ? (
          <div className="space-y-2 py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button size="sm" variant="outline" onClick={() => void load()}>Try again</Button>
          </div>
        ) : !agent ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Select an agent to see their area communities.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{agent.name || "—"}</p>
                <p className="text-xs text-muted-foreground">{agent.mobile || "—"} · {roleLabel(agent.role)}</p>
              </div>
              <div className="ml-auto flex flex-wrap gap-1">
                {agent.panchayaths.map((p) => (
                  <Badge key={p.id} variant="secondary" className="gap-1 font-normal">
                    <MapPin className="h-3 w-3" /> {p.name}{p.district ? ` · ${p.district}` : ""}
                  </Badge>
                ))}
                {((agent.wards ?? []).length > 0 || agent.ward) && (
                  <Badge variant="outline" className="font-normal">
                    {(() => { const w = agent.wards?.length ? agent.wards : [String(agent.ward)]; return `${w.length === 1 ? "Ward" : "Wards"} ${w.join(", ")}`; })()}
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { label: "Communities", value: String(areaCommunities.length) },
                { label: "Members", value: String(totals.members) },
                { label: "Orders", value: String(totals.orders) },
                { label: "Revenue", value: money(totals.revenue) },
                { label: "Profit", value: money(totals.profit) },
              ].map((s) => (
                <div key={s.label} className="rounded-md bg-muted/50 p-2 text-center">
                  <p className="text-sm font-bold sm:text-base">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            {areaCommunities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No communities in this agent's area for {PERIOD_LABELS[period].toLowerCase()}.
              </p>
            ) : (
              <div className="overflow-x-auto"><Table>
                <TableHeader><TableRow>
                  <TableHead>Community</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {areaCommunities.map((c) => (
                    <TableRow key={c.community_id}>
                      <TableCell className="font-medium">{c.community_name}</TableCell>
                      <TableCell className="text-sm">{c.creator_name ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {c.local_body_name ?? "—"}{c.ward_number != null ? ` · Ward ${c.ward_number}` : ""}
                      </TableCell>
                      <TableCell className="text-right">{c.member_count}</TableCell>
                      <TableCell className="text-right">{c.order_count}</TableCell>
                      <TableCell className="text-right">{money(c.revenue)}</TableCell>
                      <TableCell className="text-right font-medium">{money(c.profit)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="font-semibold">Total ({areaCommunities.length} communities)</TableCell>
                    <TableCell className="text-right font-semibold">{totals.members}</TableCell>
                    <TableCell className="text-right font-semibold">{totals.orders}</TableCell>
                    <TableCell className="text-right font-semibold">{money(totals.revenue)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(totals.profit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table></div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
