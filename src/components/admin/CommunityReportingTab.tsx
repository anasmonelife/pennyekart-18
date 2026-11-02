import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { commissionDate, reviseCommissionChange } from "@/lib/commissionPayout";
import { shareOrDownload } from "@/lib/exportFile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, PencilLine, Undo2 } from "lucide-react";
import { toast } from "sonner";

const db = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, a?: Record<string, unknown>) => any };

interface ReportRow {
  id: string; community_id: string; community_name: string; customer_user_id: string | null;
  recipient_type: string; recipient_name: string | null; recipient_mobile: string | null;
  total_profit: number; commission_rate: number; calculated_commission: number; amount: number;
  original_amount: number | null; revision_count: number; revised_at: string | null;
  share_count: number; period_from: string; period_to: string;
  status: "pending" | "verified" | "allocated"; allocated_at: string | null; created_at: string;
}

const TYPE_LABEL: Record<string, string> = { creator: "Creator", group_leader: "Group leader", coordinator: "Coordinator", team_leader: "Team leader", super_admin: "Super admin partner" };
const STATUS_LABEL: Record<string, string> = { pending: "Pending", verified: "Verified", allocated: "Allocated" };
const isRevised = (r: ReportRow) => (r.revision_count ?? 0) > 0;
const rowStatusLabel = (r: ReportRow) => (isRevised(r) ? "Revised" : STATUS_LABEL[r.status]);
const rowCategory = (r: ReportRow): "pending" | "allocated" | "revised" => (isRevised(r) ? "revised" : r.status === "allocated" ? "allocated" : "pending");
const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CommunityReportingTab() {
  const today = commissionDate();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [verifyAmount, setVerifyAmount] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocateId, setAllocateId] = useState<string | null>(null);
  const [allocateBusy, setAllocateBusy] = useState(false);
  const validPeriod = !!from && !!to && from <= to && to <= today;

  /** Same period rules as the allocation table: saved rows for this period, plus allocated history that overlaps it. */
  const load = useCallback(async () => {
    if (!validPeriod) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error } = await db.from("community_commission_allocations").select("*")
      .lte("period_from", to).gte("period_to", from).order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows(((data ?? []) as ReportRow[]).filter(r => r.status === "allocated" || (r.period_from === from && r.period_to === to)));
    setLoading(false);
  }, [from, to, validPeriod]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r =>
      (role === "all" || r.recipient_type === role) &&
      (status === "all" || rowCategory(r) === status) &&
      (!q || r.community_name.toLowerCase().includes(q)
        || (r.recipient_name ?? "").toLowerCase().includes(q)
        || (r.recipient_mobile ?? "").includes(q)));
  }, [rows, role, status, search]);

  const kpi = useMemo(() => {
    const profit = new Map<string, number>();
    const communities = new Set<string>();
    let total = 0, pending = 0, pendingCount = 0, allocated = 0, allocatedCount = 0;
    let revised = 0, revisedCount = 0, revisedOriginal = 0;
    for (const r of filtered) {
      const key = `${r.community_id}|${r.period_from}|${r.period_to}`;
      communities.add(key);
      if (!profit.has(key)) profit.set(key, Number(r.total_profit) || 0);
      const amt = Number(r.amount) || 0;
      total += amt;
      const category = rowCategory(r);
      if (category === "revised") {
        revised += amt; revisedCount += 1;
        revisedOriginal += Number(r.original_amount) || 0;
      } else if (category === "allocated") { allocated += amt; allocatedCount += 1; }
      else { pending += amt; pendingCount += 1; }
    }
    const totalProfit = [...profit.values()].reduce((s, v) => s + v, 0);
    return { rows: filtered.length, communities: communities.size, totalProfit, total, pending, pendingCount, allocated, allocatedCount, revised, revisedCount, revisedOriginal };
  }, [filtered]);

  /** Commission total per role for the filtered rows. */
  const roleBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const r of filtered) {
      const e = map.get(r.recipient_type) ?? { count: 0, amount: 0 };
      e.count += 1; e.amount += Number(r.amount) || 0;
      map.set(r.recipient_type, e);
    }
    return [...map.entries()].sort((a, b) => b[1].amount - a[1].amount);
  }, [filtered]);

  /** Allocated history for the period: the transactions that can be revised or undone. */
  const allocatedRows = useMemo(() => rows.filter(r => r.status === "allocated"), [rows]);
  const pendingRows = useMemo(() => rows.filter(r => r.status === "pending"), [rows]);
  const verifiedRows = useMemo(() => rows.filter(r => r.status === "verified"), [rows]);
  const selected = allocatedRows.find(r => r.id === selectedId) ?? null;
  const change = selected && newAmount.trim() !== "" ? reviseCommissionChange(Number(selected.amount), Number(newAmount)) : null;
  const cancelTarget = allocatedRows.find(r => r.id === cancelId) ?? null;
  const verifyTarget = pendingRows.find(r => r.id === verifyId) ?? null;
  const allocateTarget = verifiedRows.find(r => r.id === allocateId) ?? null;

  const openRevise = (id?: string) => { setSelectedId(id ?? null); setNewAmount(""); setReviseOpen(true); };
  const openCancel = (id?: string) => { setCancelId(id ?? null); setCancelOpen(true); };
  const openVerify = (id?: string) => {
    const row = id ? pendingRows.find(r => r.id === id) : null;
    setVerifyId(row?.id ?? null);
    setVerifyAmount(row ? String(row.amount) : "");
    setVerifyOpen(true);
  };
  const openAllocate = (id?: string) => { setAllocateId(id ?? null); setAllocateOpen(true); };

  const submitRevise = async () => {
    if (!selected || !change) return;
    setBusy(true);
    const { error } = await db.rpc("revise_commission_allocation", { _id: selected.id, _new_amount: change.amount });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Commission revised to ${money(change.amount)} — listed under Revised`);
    setReviseOpen(false); setSelectedId(null); setNewAmount("");
    await load();
  };

  /** Undo an allocated commission: wallet debit recorded server-side, the row returns to Verified for a corrected re-allocation. */
  const submitCancel = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    const { error } = await db.rpc("cancel_commission_allocation", { _id: cancelTarget.id });
    setCancelBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Transaction cancelled — ${money(cancelTarget.amount)} debited from the wallet. Allocate a corrected amount when ready.`);
    setCancelOpen(false); setCancelId(null);
    await load();
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const header = ["Community", "Period from", "Period to", "Role", "Recipient", "Mobile", "Rate %", "Calculated", "Commission", "Status"];
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const lines = filtered.map(r => [
        r.community_name, r.period_from, r.period_to,
        TYPE_LABEL[r.recipient_type] ?? r.recipient_type, r.recipient_name ?? "", r.recipient_mobile ?? "",
        String(r.commission_rate), Number(r.calculated_commission).toFixed(2), Number(r.amount).toFixed(2), rowStatusLabel(r),
      ].map(esc).join(","));
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
      const result = await shareOrDownload(blob, `community-commission-report-${from}-to-${to}.csv`, { title: "Community commission report" });
      toast.success(result === "shared" ? "Report shared" : "Report downloaded");
    } catch {
      toast.error("Could not export the report");
    }
    setExporting(false);
  };

  const transactionPicker = (
    name: string,
    checkedId: string | null,
    onSelect: (id: string) => void,
  ) => (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Allocated transactions · {from} – {to}</p>
      <div className="max-h-56 divide-y overflow-y-auto rounded-md border">
        {allocatedRows.map(r => (
          <label key={r.id} className="flex cursor-pointer items-center justify-between gap-3 p-2 text-sm hover:bg-muted/50">
            <div className="flex min-w-0 items-center gap-2">
              <input type="radio" name={name} className="accent-primary" checked={checkedId === r.id}
                onChange={() => onSelect(r.id)}
                aria-label={`Select ${r.community_name} · ${r.recipient_name || "recipient"}`} />
              <div className="min-w-0">
                <p className="truncate font-medium">{r.community_name}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABEL[r.recipient_type] ?? r.recipient_type} · {r.recipient_name || "—"} · {r.period_from} – {r.period_to}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold">{money(r.amount)}</p>
              {isRevised(r) && <p className="text-xs text-muted-foreground">was {money(Number(r.original_amount) || 0)}</p>}
            </div>
          </label>
        ))}
        {allocatedRows.length === 0 && (
          <p className="p-3 text-xs text-muted-foreground">No allocated transactions for this period yet.</p>
        )}
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Commission reporting</h2>
        <p className="text-xs text-muted-foreground">Saved allocation rows by period, role and status — pending, allocated and revised commission.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1"><Label htmlFor="report-from">Period from</Label><Input id="report-from" type="date" value={from} max={to || today} onChange={e => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="report-to">Period to</Label><Input id="report-to" type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="report-role">Role</Label>
          <select id="report-role" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={role} onChange={e => setRole(e.target.value)}>
            <option value="all">All roles</option>
            <option value="creator">Creator</option>
            <option value="group_leader">Group leader</option>
            <option value="coordinator">Coordinator</option>
            <option value="team_leader">Team leader</option>
            <option value="super_admin">Super admin partner</option>
          </select>
        </div>
        <div className="space-y-1"><Label htmlFor="report-status">Status</Label>
          <select id="report-status" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending (incl. verified)</option>
            <option value="allocated">Allocated</option>
            <option value="revised">Revised</option>
          </select>
        </div>
        <div className="space-y-1 min-w-[200px] flex-1 max-w-xs"><Label htmlFor="report-search">Search</Label><Input id="report-search" placeholder="Community or recipient" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="space-y-1"><Label className="opacity-0">Revise</Label>
          <Button id="report-revise" size="sm" variant="outline" onClick={() => openRevise()} disabled={!validPeriod || allocatedRows.length === 0}>
            <PencilLine className="mr-2 h-4 w-4" />Revise transaction
          </Button>
        </div>
        <div className="space-y-1"><Label className="opacity-0">Cancel</Label>
          <Button id="report-cancel" size="sm" variant="outline" onClick={() => openCancel()} disabled={!validPeriod || allocatedRows.length === 0}>
            <Undo2 className="mr-2 h-4 w-4" />Cancel &amp; undo
          </Button>
        </div>
        <div className="space-y-1"><Label className="opacity-0">Export</Label>
          <Button id="report-export" size="sm" variant="outline" onClick={() => void exportCsv()} disabled={exporting || !validPeriod || filtered.length === 0}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export CSV
          </Button>
        </div>
      </div>
      {!validPeriod && <p className="text-sm text-destructive">Choose a valid period ending today or earlier.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <Loader2 aria-label="Loading report" className="h-5 w-5 animate-spin" /> : validPeriod && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              { key: "pending" as const, label: "Pending", count: kpi.pendingCount, amount: kpi.pending,
                note: "Calculated but not yet paid — includes verified rows" },
              { key: "allocated" as const, label: "Allocated", count: kpi.allocatedCount, amount: kpi.allocated,
                note: "Paid out as originally calculated" },
              { key: "revised" as const, label: "Revised", count: kpi.revisedCount, amount: kpi.revised,
                note: kpi.revisedCount > 0 ? `${money(kpi.revisedOriginal)} → ${money(kpi.revised)}` : "Allocated, then adjusted later" },
            ]).map(card => {
              const active = status === card.key;
              return (
                <button key={card.key} type="button" onClick={() => setStatus(active ? "all" : card.key)}
                  aria-pressed={active} aria-label={`Filter report to ${card.label} commission`}
                  className={`rounded-lg border p-4 text-left transition-colors ${active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card hover:bg-muted/50"}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{card.label}</p>
                    <Badge variant={active ? "default" : "secondary"}>{card.count} row{card.count === 1 ? "" : "s"}</Badge>
                  </div>
                  <p className="mt-1 text-xl font-bold sm:text-2xl">{money(card.amount)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.note}</p>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Communities", value: String(kpi.communities) },
              { label: "Allocation rows", value: String(kpi.rows) },
              { label: "Profit shared", value: money(kpi.totalProfit) },
              { label: "Total commission", value: money(kpi.total) },
            ].map(s => (
              <div key={s.label} className="rounded-md bg-muted/50 p-2 text-center">
                <p className="text-sm font-bold sm:text-base">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          {roleBreakdown.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">By role:</span>
              {roleBreakdown.map(([type, e]) => (
                <Badge key={type} variant="secondary" className="gap-1 font-normal">
                  {TYPE_LABEL[type] ?? type}: {e.count} · {money(e.amount)}
                </Badge>
              ))}
            </div>
          )}
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow>
              <TableHead>Community</TableHead><TableHead>Period</TableHead><TableHead>Role · Recipient</TableHead>
              <TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Calculated</TableHead>
              <TableHead className="text-right">Commission</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.community_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.period_from} – {r.period_to}</TableCell>
                  <TableCell>
                    <Badge variant={r.recipient_type === "creator" ? "default" : "secondary"}>{TYPE_LABEL[r.recipient_type] ?? r.recipient_type}</Badge>
                    <p className="text-xs mt-1">{r.recipient_name || "—"}{r.share_count > 1 ? ` · 1/${r.share_count} share` : ""}{!r.customer_user_id && " · no account"}</p>
                  </TableCell>
                  <TableCell className="text-right text-xs">{r.commission_rate}%</TableCell>
                  <TableCell className="text-right text-xs">{money(r.calculated_commission)}</TableCell>
                  <TableCell className="text-right font-medium">{money(r.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "allocated" ? "secondary" : "outline"}>{rowStatusLabel(r)}</Badge>
                    {isRevised(r) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {money(Number(r.original_amount) || 0)} → {money(r.amount)} · {r.revision_count} revision{r.revision_count === 1 ? "" : "s"}
                        {r.revised_at ? ` · ${new Date(r.revised_at).toLocaleString("en-IN")}` : ""}
                      </p>
                    )}
                    {!isRevised(r) && r.status === "allocated" && r.allocated_at && (
                      <p className="text-xs text-muted-foreground mt-1">{new Date(r.allocated_at).toLocaleString("en-IN")}</p>
                    )}
                    {r.status === "allocated" && (
                      <div className="mt-1 flex gap-1">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => openRevise(r.id)}>
                          <PencilLine className="mr-1 h-3 w-3" />Revise
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => openCancel(r.id)}>
                          <Undo2 className="mr-1 h-3 w-3" />Undo
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {rows.length > 0 ? "No rows match the current filters." : "No commission saved for this period yet — calculate it in the Commission allocation tab."}
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table></div>
        </>
      )}
      <Dialog open={reviseOpen} onOpenChange={o => { if (!o && !busy) setReviseOpen(false); }}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revise transaction</DialogTitle>
            <DialogDescription>
              Pick one of the allocated transactions, then set the corrected commission. The wallet adjusts by the difference immediately and the revised transaction stays listed under Revised.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {transactionPicker("revise-tx", selectedId, id => { setSelectedId(id); setNewAmount(""); })}
            {selected && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Current commission</p><p className="font-semibold">{money(selected.amount)}</p></div>
                  <div><p className="text-muted-foreground">Originally allocated</p><p className="font-semibold">{money(selected.original_amount ?? selected.amount)}</p></div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="revise-amount">New commission (₹)</Label>
                  <Input id="revise-amount" type="number" min="0.01" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)} disabled={busy} />
                </div>
                <p className="text-xs">
                  {!change ? "Enter a different positive amount to see the wallet effect."
                    : change.delta > 0
                      ? <>Wallet credit of <strong>{money(change.delta)}</strong> to {selected.recipient_name || "the recipient"}.</>
                      : <>Wallet debit of <strong>{money(Math.abs(change.delta))}</strong> from {selected.recipient_name || "the recipient"}.</>}
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => setReviseOpen(false)}>Cancel</Button>
                  <Button size="sm" disabled={busy || !change} onClick={() => void submitRevise()}>
                    {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PencilLine className="mr-1 h-4 w-4" />}Save revision
                  </Button>
                </div>
              </div>
            )}
            {!selected && <p className="text-xs text-muted-foreground">Select a transaction above to revise it. Revised ones stay in the list and under the Revised card.</p>}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={cancelOpen} onOpenChange={o => { if (!o && !cancelBusy) setCancelOpen(false); }}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cancel &amp; undo transaction</DialogTitle>
            <DialogDescription>
              Undo an allocated commission: the amount is debited back from the wallet, the undo is recorded, and the row returns to Verified so a corrected amount can be re-allocated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {transactionPicker("cancel-tx", cancelId, id => setCancelId(id))}
            {cancelTarget && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Wallet debit</p><p className="font-semibold text-destructive">−{money(cancelTarget.amount)}</p></div>
                  <div><p className="text-muted-foreground">Recipient</p><p className="font-semibold">{cancelTarget.recipient_name || "—"} · {TYPE_LABEL[cancelTarget.recipient_type] ?? cancelTarget.recipient_type}</p></div>
                </div>
                <p className="text-xs text-muted-foreground">If the wallet balance has already been spent, the cancellation is refused with the current balance shown.</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={cancelBusy} onClick={() => setCancelOpen(false)}>Keep allocation</Button>
                  <Button size="sm" variant="destructive" disabled={cancelBusy || !cancelTarget} onClick={() => void submitCancel()}>
                    {cancelBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Undo2 className="mr-1 h-4 w-4" />}Cancel transaction
                  </Button>
                </div>
              </div>
            )}
            {!cancelTarget && <p className="text-xs text-muted-foreground">Select a transaction above to undo it.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
