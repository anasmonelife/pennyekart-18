import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import CommunityAccessRequests from "@/components/admin/CommunityAccessRequests";
import CommissionAllocationTab from "@/components/admin/CommissionAllocationTab";
import CommunityReportingTab from "@/components/admin/CommunityReportingTab";
import CommunityPayoutRequests from "@/components/admin/CommunityPayoutRequests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, IndianRupee, TrendingUp, Percent, Download, Loader2, Crown, Save, Pencil, Trash2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { commissionForProfit, isValidCommissionRule, type CommissionRule } from "@/lib/communityCommission";

const COMMISSION_KEY = "community_creator_commission_percent";
const COMMISSION_RULES_KEY = "community_creator_commission_rules";

interface SummaryRow {
  community_id: string;
  community_name: string;
  creator_user_id: string;
  creator_name: string | null;
  creator_mobile: string | null;
  creator_role_id: string | null;
  member_count: number;
  order_count: number;
  revenue: number;
  cost: number;
  profit: number;
  unmatched_items: number;
}

interface MemberRow {
  user_id: string;
  full_name: string | null;
  mobile_number: string | null;
  joined_at: string;
  is_creator: boolean;
  order_count: number;
  revenue: number;
  cost: number;
  profit: number;
  unmatched_items: number;
}

interface RoleRow {
  id: string;
  name: string;
}

type Period = "this_month" | "last_month" | "all" | "custom";

const rpc = (fn: string, args?: Record<string, unknown>) =>
  (supabase.rpc as unknown as (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);

const money = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

const resolveRange = (period: Period, from: string, to: string) => {
  const now = new Date();
  if (period === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString(), to: now.toISOString() };
  }
  if (period === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  if (period === "custom" && from && to) {
    return { from: new Date(`${from}T00:00:00`).toISOString(), to: new Date(`${to}T23:59:59`).toISOString() };
  }
  return { from: new Date("2000-01-01").toISOString(), to: new Date(now.getFullYear() + 1, 0, 1).toISOString() };
};

const CommunitiesPage = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [period, setPeriod] = useState<Period>("this_month");
  const [customFrom, setCustomFrom] = useState(toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customTo, setCustomTo] = useState(toISODate(new Date()));
  const [commission, setCommission] = useState("10");
  const [savingCommission, setSavingCommission] = useState(false);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [rules, setRules] = useState<Record<string, CommissionRule>>({});
  const [selectedRole, setSelectedRole] = useState("");
  const [minimum, setMinimum] = useState("0");
  const [maximum, setMaximum] = useState("100");
  const [rate, setRate] = useState("10");
  const [savingRule, setSavingRule] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);

  const range = useMemo(() => resolveRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const pct = Number(commission) || 0;
  const communityCommission = (row: SummaryRow) => commissionForProfit(row.profit, row.creator_role_id, rules, pct);
  const communityRate = (row: SummaryRow) => {
    const roleRule = row.creator_role_id ? rules[row.creator_role_id] : undefined;
    return roleRule && isValidCommissionRule(roleRule) ? roleRule.rate : pct;
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await rpc("get_community_revenue_summary", { _from: range.from, _to: range.to });
    if (error) toast.error(error.message.replace(/^.*?:\s*/, ""));
    const summaries = (data as SummaryRow[] | null) ?? [];
    const creatorIds = [...new Set(summaries.map((r) => r.creator_user_id).filter(Boolean))];
    const { data: creatorProfiles } = creatorIds.length
      ? await supabase.from("profiles").select("user_id, role_id").in("user_id", creatorIds)
      : { data: [] };
    const roleByCreator = new Map((creatorProfiles ?? []).map((profile) => [profile.user_id, profile.role_id]));
    setRows(summaries.map((r) => ({
      ...r,
      creator_role_id: roleByCreator.get(r.creator_user_id) ?? null,
      revenue: Number(r.revenue),
      cost: Number(r.cost),
      profit: Number(r.profit),
    })));
    setLoading(false);
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [COMMISSION_KEY, COMMISSION_RULES_KEY])
      .then(({ data }) => {
        const settings = (data ?? []) as { key: string; value: string | null }[];
        const savedFallback = settings.find((setting) => setting.key === COMMISSION_KEY)?.value;
        if (savedFallback) setCommission(savedFallback);
        const storedRules = settings.find((setting) => setting.key === COMMISSION_RULES_KEY)?.value;
        if (storedRules) {
          try {
            const parsed = JSON.parse(storedRules) as Record<string, CommissionRule>;
            setRules(Object.fromEntries(Object.entries(parsed).filter(([, rule]) => isValidCommissionRule(rule))));
          } catch {
            setRules({});
          }
        }
        setSettingsLoaded(true);
      });
    supabase.from("roles").select("id, name").order("name").then(({ data }) => {
      const availableRoles = (data ?? []) as RoleRow[];
      setRoles(availableRoles);
      setRolesLoaded(true);
      setSelectedRole((current) => current || availableRoles[0]?.id || "");
    });
  }, []);

  useEffect(() => {
    const rule = rules[selectedRole];
    setMinimum(rule ? String(rule.minimum) : "0");
    setMaximum(rule ? String(rule.maximum) : "100");
    setRate(rule ? String(rule.rate) : commission);
  }, [selectedRole, rules, commission]);

  const saveCommission = async () => {
    const value = Number(commission);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error("Enter a percentage between 0 and 100");
      return;
    }
    setSavingCommission(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: COMMISSION_KEY, value: String(value), description: "Creator commission percentage on community profit" },
        { onConflict: "key" },
      );
    setSavingCommission(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Commission percentage saved");
  };

  const saveRoleRule = async () => {
    const rule = { minimum: Number(minimum), maximum: Number(maximum), rate: Number(rate) };
    if (!selectedRole || !isValidCommissionRule(rule)) {
      toast.error("Set a valid range from 0 to 100%, with the rate inside that range");
      return;
    }
    const nextRules = { ...rules, [selectedRole]: rule };
    setSavingRule(true);
    const { error } = await supabase.from("app_settings").upsert(
      { key: COMMISSION_RULES_KEY, value: JSON.stringify(nextRules), description: "Community creator commission rules by role" },
      { onConflict: "key" },
    );
    setSavingRule(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRules(nextRules);
    toast.success("Role commission rule saved");
  };

  const removeRoleRule = async (roleId: string) => {
    const nextRules = { ...rules };
    delete nextRules[roleId];
    const { error } = await supabase.from("app_settings").upsert(
      { key: COMMISSION_RULES_KEY, value: JSON.stringify(nextRules), description: "Community creator commission rules by role" },
      { onConflict: "key" },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    setRules(nextRules);
    toast.success("Role commission rule removed");
  };

  const loadMembers = async (row: SummaryRow) => {
    setMemberLoading(true);
    const { data, error } = await rpc("get_community_member_revenue", {
      _community_id: row.community_id,
      _from: range.from,
      _to: range.to,
    });
    if (error) toast.error(error.message.replace(/^.*?:\s*/, ""));
    setMembers(((data as MemberRow[] | null) ?? []).map((m) => ({
      ...m,
      revenue: Number(m.revenue),
      cost: Number(m.cost),
      profit: Number(m.profit),
    })));
    setMemberLoading(false);
  };

  /** Collapse/expand a community row; members load the first time it is expanded. */
  const toggleDetail = (row: SummaryRow) => {
    if (expandedId === row.community_id) { setExpandedId(null); return; }
    setExpandedId(row.community_id);
    void loadMembers(row);
  };

  const totals = useMemo(() => {
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const profit = rows.reduce((s, r) => s + r.profit, 0);
    const memberCount = rows.reduce((s, r) => s + r.member_count, 0);
    const orderCount = rows.reduce((s, r) => s + r.order_count, 0);
    const commission = rows.reduce((sum, row) => sum + communityCommission(row), 0);
    return { revenue, profit, memberCount, orderCount, commission };
  }, [rows, pct, rules]);

  const exportMembers = (row: SummaryRow) => {

    const header = ["Member", "Mobile", "Role", "Orders", "Revenue", "Cost", "Profit"];
    const lines = members.map((m) => [
      m.full_name || "Member",
      m.mobile_number || "",
      m.is_creator ? "Creator" : "Member",
      m.order_count,
      m.revenue.toFixed(2),
      m.cost.toFixed(2),
      m.profit.toFixed(2),
    ].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.community_name}-members.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Community Management</h1>
          <p className="text-sm text-muted-foreground">
            Revenue and profit generated by each community, with creator commission.
          </p>
        </div>

        <Tabs defaultValue="communities" className="space-y-6">
          <TabsList>
            <TabsTrigger value="communities">Communities</TabsTrigger>
            <TabsTrigger value="allocation">Commission allocation</TabsTrigger>
            <TabsTrigger value="reporting">Reporting</TabsTrigger>
            <TabsTrigger value="payouts">Payout requests</TabsTrigger>
          </TabsList>
          <TabsContent value="allocation">
            <CommissionAllocationTab roles={roles} rules={rules} fallbackRate={pct} ready={settingsLoaded && rolesLoaded} />
          </TabsContent>
          <TabsContent value="reporting">
            <CommunityReportingTab />
          </TabsContent>
          <TabsContent value="payouts">
            <CommunityPayoutRequests ready={settingsLoaded && rolesLoaded} />
          </TabsContent>
          <TabsContent value="communities" className="space-y-6">

        <CommunityAccessRequests />

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="last_month">Last month</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period === "custom" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="from">From</Label>
                  <Input id="from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to">To</Label>
                  <Input id="to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="commission">Fallback commission (% of profit)</Label>
              <div className="flex gap-2">
                <Input
                  id="commission"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                />
                <Button variant="outline" onClick={saveCommission} disabled={savingCommission}>
                  {savingCommission ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Role commission rules</CardTitle>
            <p className="text-sm text-muted-foreground">Set an allowed range and active rate for each creator role. Community commissions use the creator’s assigned role.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.5fr)_repeat(3,minmax(120px,1fr))_auto] lg:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="commission-role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="commission-role"><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="commission-min">Minimum (%)</Label>
                <Input id="commission-min" type="number" min="0" max="100" step="0.1" value={minimum} onChange={(event) => setMinimum(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="commission-max">Maximum (%)</Label>
                <Input id="commission-max" type="number" min="0" max="100" step="0.1" value={maximum} onChange={(event) => setMaximum(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="commission-rate">Active rate (%)</Label>
                <Input id="commission-rate" type="number" min="0" max="100" step="0.1" value={rate} onChange={(event) => setRate(event.target.value)} />
              </div>
              <Button onClick={saveRoleRule} disabled={savingRule || !selectedRole}>
                {savingRule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save rule
              </Button>
            </div>
            {Object.keys(rules).length > 0 ? (
              <div className="divide-y rounded-md border">
                {roles.filter((role) => rules[role.id]).map((role) => (
                  <div key={role.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <span className="min-w-32 flex-1 font-medium">{role.name}</span>
                    <span className="text-sm text-muted-foreground">Range {rules[role.id].minimum}%–{rules[role.id].maximum}%</span>
                    <Badge variant="secondary">Rate {rules[role.id].rate}%</Badge>
                    <Button size="icon" variant="ghost" aria-label={`Edit ${role.name} rule`} title="Edit rule" onClick={() => setSelectedRole(role.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Remove ${role.name} rule`} title="Remove rule" onClick={() => removeRoleRule(role.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No role-specific commission rules saved. The fallback rate is used until a rule is added.</p>
            )}
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Communities", value: String(rows.length), icon: Users },
            { label: "Members", value: String(totals.memberCount), icon: Users },
            { label: "Revenue", value: money(totals.revenue), icon: IndianRupee },
            { label: "Profit", value: money(totals.profit), icon: TrendingUp },
            { label: "Creator commission", value: money(totals.commission), icon: Percent },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <c.icon className="h-3.5 w-3.5" /> {c.label}
                </div>
                <p className="text-xl font-bold mt-1">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Communities ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading communities...
              </div>
            ) : rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No communities with activity in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Community</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const expanded = expandedId === r.community_id;
                      return (
                      <Fragment key={r.community_id}>
                      <TableRow>
                        <TableCell className="font-medium">{r.community_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Crown className="h-3 w-3 text-primary" />
                            {r.creator_name || "Community owner"}
                          </div>
                          <p className="text-xs text-muted-foreground">{r.creator_mobile || "—"}</p>
                        </TableCell>
                        <TableCell className="text-right">{r.member_count}</TableCell>
                        <TableCell className="text-right">{r.order_count}</TableCell>
                        <TableCell className="text-right">{money(r.revenue)}</TableCell>
                        <TableCell className="text-right">{money(r.cost)}</TableCell>
                        <TableCell className="text-right font-medium">{money(r.profit)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary">{money(communityCommission(r))}</Badge>
                            <span className="text-xs text-muted-foreground">{communityRate(r)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-expanded={expanded}
                            aria-label={expanded ? `Collapse ${r.community_name} details` : `Expand ${r.community_name} details`}
                            onClick={() => toggleDetail(r)}
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-muted/30 p-0">
                            <div className="space-y-3 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm">Creator commission ({communityRate(r)}%): <strong>{money(communityCommission(r))}</strong></p>
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => exportMembers(r)}>
                                  <Download className="h-4 w-4" /> Export CSV
                                </Button>
                              </div>
                              {memberLoading ? (
                                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Loading members...
                                </div>
                              ) : members.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">No member activity in this period.</p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Member</TableHead>
                                        <TableHead className="text-right">Orders</TableHead>
                                        <TableHead className="text-right">Revenue</TableHead>
                                        <TableHead className="text-right">Profit</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {members.map((m) => (
                                        <TableRow key={m.user_id}>
                                          <TableCell>
                                            <p className="flex items-center gap-1 text-sm font-medium">
                                              {m.full_name || "Member"}
                                              {m.is_creator && <Crown className="h-3 w-3 text-primary" />}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{m.mobile_number || "—"}</p>
                                          </TableCell>
                                          <TableCell className="text-right">{m.order_count}</TableCell>
                                          <TableCell className="text-right">{money(m.revenue)}</TableCell>
                                          <TableCell className="text-right">{money(m.profit)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>

    </AdminLayout>
  );
};

export default CommunitiesPage;
