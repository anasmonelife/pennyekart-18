import { Fragment, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { commissionRateForRole, type CommissionRule } from "@/lib/communityCommission";
import { commissionAmount, commissionDate, commissionRange } from "@/lib/commissionPayout";
import { buildHierarchyRows, groupAllocationRows, rateRoleName, type AreaCommunity, type PayoutRow } from "@/lib/commissionAllocation";
import { isAllocationRole, normalizeRoleName, type AllocationPerson } from "@/lib/elifeAllocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

const db = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, a?: Record<string, unknown>) => any; functions: typeof supabase.functions };

interface SavedRow {
  id: string; community_id: string; community_name: string; customer_user_id: string | null;
  recipient_type: string; recipient_name: string | null; recipient_mobile: string | null;
  total_profit: number; commission_rate: number; calculated_commission: number; amount: number;
  share_count: number; period_from: string; period_to: string; status: "pending" | "verified" | "allocated"; allocated_at: string | null; created_at: string;
}
interface Props { roles?: { id: string; name: string }[]; rules: Record<string, CommissionRule>; fallbackRate: number; ready: boolean }
const money = (n: number) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const TYPE_LABEL: Record<string, string> = { creator: "Creator", coordinator: "Coordinator", team_leader: "Team leader", super_admin: "Super admin partner" };

export default function CommunityCommissionTable({ roles = [], rules, fallbackRate, ready }: Props) {
  const today = commissionDate();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<SavedRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified" | "allocated">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const validPeriod = !!from && !!to && from <= to && to <= today;

  const load = useCallback(async () => {
    if (!ready || !validPeriod) { setLoading(false); return; }
    setLoading(true); setError(null); setEdits({});
    const { data, error } = await db.from("community_commission_allocations").select("*")
      .lte("period_from", to).gte("period_to", from).order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows(((data ?? []) as SavedRow[]).filter(r => r.status === "allocated" || (r.period_from === from && r.period_to === to)));
    setLoading(false);
  }, [from, to, ready, validPeriod]);
  useEffect(() => { void load(); }, [load]);

  const roleId = (name: string) => roles.find(r => normalizeRoleName(r.name) === normalizeRoleName(name))?.id ?? null;

  /** Calculate creator + hierarchy shares for the period and save them as pending rows. */
  const calculate = async () => {
    setBusy(true); setError(null);
    try {
      const range = commissionRange(from, to);
      const summary = await db.rpc("get_community_revenue_summary", { _from: range.from, _to: range.to });
      if (summary.error) throw summary.error;
      const list = (summary.data ?? []) as Record<string, any>[];
      const ids = [...new Set(list.map(r => r.creator_user_id).filter(Boolean))];
      const [profiles, assigned] = ids.length ? await Promise.all([
        db.from("profiles").select("user_id, role_id, local_body_id, ward_number").in("user_id", ids),
        db.from("user_roles").select("user_id, role_id, created_at").in("user_id", ids).order("created_at", { ascending: false }),
      ]) : [{ data: [] }, { data: [] }];
      const prof = new Map(((profiles.data ?? []) as any[]).map(p => [p.user_id, p]));
      const bodyIds = [...new Set(((profiles.data ?? []) as any[]).map(p => p.local_body_id).filter(Boolean))];
      const bodies = bodyIds.length ? await db.from("locations_local_bodies").select("id, name").in("id", bodyIds) : { data: [] };
      const bodyName = new Map(((bodies.data ?? []) as any[]).map(b => [b.id, b.name]));
      const roleOf = (id: string) => (assigned.data as any[])?.find(a => a.user_id === id)?.role_id ?? prof.get(id)?.role_id ?? null;

      const communities: AreaCommunity[] = list.map(r => ({
        community_id: r.community_id, community_name: r.community_name, creator_name: r.creator_name ?? null,
        local_body_name: bodyName.get(prof.get(r.creator_user_id)?.local_body_id) ?? null,
        ward_number: prof.get(r.creator_user_id)?.ward_number ?? null,
        member_count: Number(r.member_count) || 0, order_count: Number(r.order_count) || 0,
        revenue: Number(r.revenue) || 0, profit: Number(r.profit) || 0,
      }));
      const creatorRows: PayoutRow[] = list.filter(r => Number(r.profit) > 0).map(r => {
        const rate = commissionRateForRole(roleOf(r.creator_user_id), rules, fallbackRate);
        return { community_id: r.community_id, community_name: r.community_name, recipient_type: "creator",
          recipient_name: r.creator_name ?? null, recipient_mobile: r.creator_mobile ?? null, elife_person_id: null,
          customer_user_id: r.creator_user_id, total_profit: Number(r.profit), commission_rate: rate, share_count: 1,
          calculated_commission: commissionAmount(Number(r.profit), rate) };
      });

      const { data: el, error: fnError } = await supabase.functions.invoke("elife-role-allocations");
      if (fnError || el?.error) throw new Error(el?.error || "Could not reach e-Life");
      const people = ((el?.people ?? []) as AllocationPerson[]).filter(p => isAllocationRole(p.role) && p.is_active !== false);
      const hierarchy = buildHierarchyRows(people, communities, role => commissionRateForRole(roleId(rateRoleName(role)), rules, fallbackRate));

      const { error: saveError } = await db.rpc("save_commission_allocation_rows", { _from: from, _to: to, _rows: [...creatorRows, ...hierarchy] });
      if (saveError) throw saveError;
      toast.success("Allocation table saved — verify rows before allocating");
      await load();
    } catch (e) { setError((e as { message?: string }).message || "Could not calculate allocations"); }
    setBusy(false);
  };

  const amountOf = (r: SavedRow) => edits[r.id] === undefined ? Number(r.amount) : Number(edits[r.id]);
  const verify = async (r: SavedRow) => {
    setBusy(true);
    const { error } = await db.rpc("verify_commission_allocation", { _id: r.id, _amount: amountOf(r) });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Verified"); await load();
  };
  const allocate = async () => {
    if (!confirm) return;
    setBusy(true);
    const { error } = await db.rpc("allocate_commission_row", { _id: confirm.id });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Sales commission credited to wallet");
    setConfirm(null); await load();
  };

  /** One row per community: creator + hierarchy allocations of the same period stay together. */
  const groups = groupAllocationRows(rows).filter(g => {
    if (statusFilter !== "all" && !g.rows.some(r => r.status === statusFilter)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return g.community_name.toLowerCase().includes(q)
      || g.rows.some(r => (r.recipient_name ?? "").toLowerCase().includes(q) || (r.recipient_mobile ?? "").includes(q));
  });

  const recipientLine = (r: SavedRow) => (
    <div key={`name-${r.id}`}>
      <Badge variant={r.recipient_type === "creator" ? "default" : "secondary"}>{TYPE_LABEL[r.recipient_type] ?? r.recipient_type}</Badge>
      <p className="text-xs mt-1">{r.recipient_name || "—"}{r.share_count > 1 ? ` · 1/${r.share_count} share` : ""}</p>
      {!r.customer_user_id && <p className="text-xs text-destructive">No account</p>}
    </div>
  );
  const statusLine = (r: SavedRow) => (
    <div key={`status-${r.id}`}>
      {r.status === "allocated" ? <>
        <Badge variant="secondary">Allocated</Badge>
        <p className="text-xs text-muted-foreground mt-1">{r.allocated_at && new Date(r.allocated_at).toLocaleString("en-IN")}</p>
      </> : <Badge variant="outline">{r.status === "verified" ? "Verified" : "Pending verification"}</Badge>}
    </div>
  );
  const actionLine = (r: SavedRow) => {
    const done = r.status === "allocated";
    const amount = amountOf(r);
    return (
      <div key={`action-${r.id}`} className="space-x-1 whitespace-nowrap">
        {!done && <>
          <Button size="sm" variant="outline" disabled={busy || !(amount > 0)} onClick={() => void verify(r)}><CheckCircle2 className="mr-1 h-4 w-4" />Verify</Button>
          <Button size="sm" disabled={busy || r.status !== "verified" || !r.customer_user_id || edits[r.id] !== undefined} onClick={() => setConfirm(r)}><Wallet className="mr-1 h-4 w-4" />Allocate</Button>
        </>}
      </div>
    );
  };

  return (
    <section className="space-y-4 border-b pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Allocation table</h2>
          <p className="text-xs text-muted-foreground">Community profit shared to creator, coordinator (wards), team leader and super admin partner (panchayaths). Tap a community to expand its allocations. Sales outside communities are not shared.</p></div>
        <Button size="sm" onClick={() => void calculate()} disabled={busy || !ready || !validPeriod}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Calculate &amp; save</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1"><Label htmlFor="allocation-from">Period from</Label><Input id="allocation-from" type="date" value={from} max={to || today} onChange={e => setFrom(e.target.value)} disabled={busy} /></div>
        <div className="space-y-1"><Label htmlFor="allocation-to">Period to</Label><Input id="allocation-to" type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} disabled={busy} /></div>
        <div className="space-y-1 min-w-[220px] flex-1 max-w-xs"><Label htmlFor="allocation-search">Search</Label><Input id="allocation-search" placeholder="Community or recipient" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="allocation-status">Status</Label>
          <select id="allocation-status" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending verification</option>
            <option value="verified">Verified</option>
            <option value="allocated">Allocated</option>
          </select>
        </div>
      </div>
      {!validPeriod && <p className="text-sm text-destructive">Choose a valid period ending today or earlier.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <Loader2 aria-label="Loading allocation table" className="h-5 w-5 animate-spin" /> : validPeriod && (
        <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow>
            <TableHead>Community</TableHead><TableHead className="text-right">Profit</TableHead>
            <TableHead>Recipients</TableHead><TableHead className="text-right">Rate · Calculated</TableHead>
            <TableHead>Commission (₹)</TableHead><TableHead>Status</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {groups.map(g => {
              const key = `${g.community_id}|${g.period_from}|${g.period_to}`;
              const open = !!expanded[key];
              const total = g.rows.reduce((s, r) => s + Number(r.amount), 0);
              const counts = g.rows.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});
              const statusText = (["allocated", "verified", "pending"] as const)
                .filter(s => counts[s]).map(s => `${counts[s]} ${s === "pending" ? "pending" : s}`).join(" · ");
              return (
                <Fragment key={key}>
                  <TableRow className={open ? "bg-muted/40" : "cursor-pointer"} onClick={() => setExpanded(p => ({ ...p, [key]: !p[key] }))}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-6 w-6 shrink-0 p-0"
                          aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${g.community_name}`}
                          onClick={e => { e.stopPropagation(); setExpanded(p => ({ ...p, [key]: !p[key] })); }}>
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <div>
                          <p>{g.community_name}</p>
                          {(g.period_from !== from || g.period_to !== to) && (
                            <p className="text-xs text-muted-foreground">{g.period_from} – {g.period_to}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{money(g.rows[0]?.total_profit ?? 0)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{g.rows.length} recipient{g.rows.length === 1 ? "" : "s"}</TableCell>
                    <TableCell className="text-right text-xs">Total {money(total)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{statusText || "—"}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                  {open && g.rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell />
                      <TableCell />
                      <TableCell className="align-top">{recipientLine(r)}</TableCell>
                      <TableCell className="text-right align-top text-xs">{r.commission_rate}% · {money(r.calculated_commission)}</TableCell>
                      <TableCell className="align-top">
                        <Input type="number" min="0.01" step="0.01" aria-label={`Commission for ${r.recipient_name ?? r.community_name}`} className="w-28" value={edits[r.id] ?? Number(r.amount).toFixed(2)} onChange={e => setEdits(p => ({ ...p, [r.id]: e.target.value }))} disabled={r.status === "allocated" || busy} />
                      </TableCell>
                      <TableCell className="align-top">{statusLine(r)}</TableCell>
                      <TableCell className="align-top">{actionLine(r)}</TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              );
            })}
            {groups.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">{rows.length > 0 ? "No rows match the current filters." : "Nothing saved for this period. Click “Calculate & save”."}</TableCell></TableRow>}
          </TableBody>
        </Table></div>
      )}
      <Dialog open={!!confirm} onOpenChange={o => { if (!o && !busy) setConfirm(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Allocate sales commission?</DialogTitle><DialogDescription>{confirm?.community_name} · {from} – {to}</DialogDescription></DialogHeader>
          {confirm && <p className="text-sm">Credit <strong>{money(confirm.amount)}</strong> to {confirm.recipient_name || "this person"} ({TYPE_LABEL[confirm.recipient_type]})'s wallet?</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button><Button disabled={busy} onClick={() => void allocate()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm allocation</Button></div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
