import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import CommunityAccessRequests from "@/components/admin/CommunityAccessRequests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, IndianRupee, TrendingUp, Percent, Download, Loader2, Crown, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COMMISSION_KEY = "community_creator_commission_percent";

interface SummaryRow {
  community_id: string;
  community_name: string;
  creator_user_id: string;
  creator_name: string | null;
  creator_mobile: string | null;
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

  const [detail, setDetail] = useState<SummaryRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);

  const range = useMemo(() => resolveRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const pct = Number(commission) || 0;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await rpc("get_community_revenue_summary", { _from: range.from, _to: range.to });
    if (error) toast.error(error.message.replace(/^.*?:\s*/, ""));
    setRows(((data as SummaryRow[] | null) ?? []).map((r) => ({
      ...r,
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
      .select("value")
      .eq("key", COMMISSION_KEY)
      .maybeSingle()
      .then(({ data }) => {
        const v = (data as { value?: string } | null)?.value;
        if (v) setCommission(v);
      });
  }, []);

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

  const openDetail = async (row: SummaryRow) => {
    setDetail(row);
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

  const totals = useMemo(() => {
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const profit = rows.reduce((s, r) => s + r.profit, 0);
    const memberCount = rows.reduce((s, r) => s + r.member_count, 0);
    const orderCount = rows.reduce((s, r) => s + r.order_count, 0);
    return { revenue, profit, memberCount, orderCount, commission: (profit * pct) / 100 };
  }, [rows, pct]);

  const exportMembers = () => {
    if (!detail) return;
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
    a.download = `${detail.community_name}-members.csv`;
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
              <Label htmlFor="commission">Creator commission (% of profit)</Label>
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
                    {rows.map((r) => (
                      <TableRow key={r.community_id}>
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
                          <Badge variant="secondary">{money((r.profit * pct) / 100)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openDetail(r)}>
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Member detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.community_name} — members</DialogTitle>
          </DialogHeader>
          {memberLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading members...
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" className="gap-1" onClick={exportMembers}>
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
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
                          <p className="text-sm font-medium flex items-center gap-1">
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default CommunitiesPage;
