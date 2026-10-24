import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { commissionDate } from "@/lib/commissionPayout";
import { shareOrDownload } from "@/lib/exportFile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const db = supabase as unknown as { from: (t: string) => any };

interface ReportRow {
  id: string; community_id: string; community_name: string;
  recipient_type: string; recipient_name: string | null; recipient_mobile: string | null;
  total_profit: number; commission_rate: number; calculated_commission: number; amount: number;
  share_count: number; period_from: string; period_to: string;
  status: "pending" | "verified" | "allocated"; allocated_at: string | null; created_at: string;
}

const TYPE_LABEL: Record<string, string> = { creator: "Creator", coordinator: "Coordinator", team_leader: "Team leader", super_admin: "Super admin partner" };
const STATUS_LABEL: Record<string, string> = { pending: "Pending", verified: "Verified", allocated: "Allocated" };
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
      (status === "all" || r.status === status) &&
      (!q || r.community_name.toLowerCase().includes(q)
        || (r.recipient_name ?? "").toLowerCase().includes(q)
        || (r.recipient_mobile ?? "").includes(q)));
  }, [rows, role, status, search]);

  const kpi = useMemo(() => {
    const profit = new Map<string, number>();
    const communities = new Set<string>();
    let total = 0, pending = 0, verified = 0, allocated = 0;
    for (const r of filtered) {
      const key = `${r.community_id}|${r.period_from}|${r.period_to}`;
      communities.add(key);
      if (!profit.has(key)) profit.set(key, Number(r.total_profit) || 0);
      const amt = Number(r.amount) || 0;
      total += amt;
      if (r.status === "pending") pending += amt;
      else if (r.status === "verified") verified += amt;
      else allocated += amt;
    }
    const totalProfit = [...profit.values()].reduce((s, v) => s + v, 0);
    return { rows: filtered.length, communities: communities.size, totalProfit, total, pending, verified, allocated };
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

  const exportCsv = async () => {
    setExporting(true);
    try {
      const header = ["Community", "Period from", "Period to", "Role", "Recipient", "Mobile", "Rate %", "Calculated", "Commission", "Status"];
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const lines = filtered.map(r => [
        r.community_name, r.period_from, r.period_to,
        TYPE_LABEL[r.recipient_type] ?? r.recipient_type, r.recipient_name ?? "", r.recipient_mobile ?? "",
        String(r.commission_rate), Number(r.calculated_commission).toFixed(2), Number(r.amount).toFixed(2), STATUS_LABEL[r.status],
      ].map(esc).join(","));
      const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
      const result = await shareOrDownload(blob, `community-commission-report-${from}-to-${to}.csv`, { title: "Community commission report" });
      toast.success(result === "shared" ? "Report shared" : "Report downloaded");
    } catch {
      toast.error("Could not export the report");
    }
    setExporting(false);
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Commission reporting</h2>
        <p className="text-xs text-muted-foreground">Saved allocation rows by period, role and status — pending, verified and allocated commission.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1"><Label htmlFor="report-from">Period from</Label><Input id="report-from" type="date" value={from} max={to || today} onChange={e => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="report-to">Period to</Label><Input id="report-to" type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="report-role">Role</Label>
          <select id="report-role" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={role} onChange={e => setRole(e.target.value)}>
            <option value="all">All roles</option>
            <option value="creator">Creator</option>
            <option value="coordinator">Coordinator</option>
            <option value="team_leader">Team leader</option>
            <option value="super_admin">Super admin partner</option>
          </select>
        </div>
        <div className="space-y-1"><Label htmlFor="report-status">Status</Label>
          <select id="report-status" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending verification</option>
            <option value="verified">Verified</option>
            <option value="allocated">Allocated</option>
          </select>
        </div>
        <div className="space-y-1 min-w-[200px] flex-1 max-w-xs"><Label htmlFor="report-search">Search</Label><Input id="report-search" placeholder="Community or recipient" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="report-export" className="opacity-0">Export</Label>
          <Button id="report-export" size="sm" variant="outline" onClick={() => void exportCsv()} disabled={exporting || !validPeriod || filtered.length === 0}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export CSV
          </Button>
        </div>
      </div>
      {!validPeriod && <p className="text-sm text-destructive">Choose a valid period ending today or earlier.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <Loader2 aria-label="Loading report" className="h-5 w-5 animate-spin" /> : validPeriod && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { label: "Communities", value: String(kpi.communities) },
              { label: "Allocation rows", value: String(kpi.rows) },
              { label: "Profit shared", value: money(kpi.totalProfit) },
              { label: "Total commission", value: money(kpi.total) },
              { label: "Pending", value: money(kpi.pending) },
              { label: "Verified", value: money(kpi.verified) },
              { label: "Allocated", value: money(kpi.allocated) },
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
                    <Badge variant={r.status === "allocated" ? "secondary" : "outline"}>{STATUS_LABEL[r.status]}</Badge>
                    {r.status === "allocated" && r.allocated_at && (
                      <p className="text-xs text-muted-foreground mt-1">{new Date(r.allocated_at).toLocaleString("en-IN")}</p>
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
    </section>
  );
}
