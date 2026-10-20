import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { commissionRateForRole, type CommissionRule } from "@/lib/communityCommission";
import { commissionAmount, commissionDate, commissionRange, overlapsCommissionPeriod, type CommissionPayment } from "@/lib/commissionPayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

interface Row {
  community_id: string;
  community_name: string;
  creator_user_id: string;
  creator_name: string | null;
  profit: number;
  rate: number;
}
interface Props { rules: Record<string, CommissionRule>; fallbackRate: number; ready: boolean }
const money = (n: number) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CommunityCommissionTable({ rules, fallbackRate, ready }: Props) {
  const today = commissionDate();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [payments, setPayments] = useState<CommissionPayment[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Row | null>(null);
  const [allocating, setAllocating] = useState(false);
  const validPeriod = !!from && !!to && from <= to && to <= today;

  const load = useCallback(async () => {
    if (!ready || !from || !to || from > to || to > commissionDate()) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    setEdits({});
    try {
      const range = commissionRange(from, to);
      const [summary, ledger] = await Promise.all([
        supabase.rpc("get_community_revenue_summary", { _from: range.from, _to: range.to }),
        supabase.from("community_commission_allocations").select("*").lte("period_from", to).gte("period_to", from).order("created_at", { ascending: false }),
      ]);
      if (summary.error) throw summary.error;
      if (ledger.error) throw ledger.error;
      const ids = [...new Set((summary.data ?? []).map(r => r.creator_user_id))];
      const [profiles, assigned] = ids.length ? await Promise.all([
        supabase.from("profiles").select("user_id, role_id").in("user_id", ids),
        supabase.from("user_roles").select("user_id, role_id, created_at").in("user_id", ids).order("created_at", { ascending: false }),
      ]) : [{ data: [], error: null }, { data: [], error: null }];
      if (profiles.error) throw profiles.error;
      if (assigned.error) throw assigned.error;
      const roleFor = (id: string) => assigned.data?.find(p => p.user_id === id)?.role_id ?? profiles.data?.find(p => p.user_id === id)?.role_id ?? null;
      setRows((summary.data ?? []).map(r => ({ ...r, profit: Number(r.profit), rate: commissionRateForRole(roleFor(r.creator_user_id), rules, fallbackRate) })));
      setPayments((ledger.data ?? []) as CommissionPayment[]);
    } catch (e) { setError((e as { message?: string }).message || "Could not load commission allocations"); }
    finally { setLoading(false); }
  }, [from, to, rules, fallbackRate, ready]);

  useEffect(() => { void load(); }, [load]);
  const amountFor = (row: Row) => edits[row.community_id] === undefined ? commissionAmount(row.profit, row.rate) : Number(edits[row.community_id]);
  const allocate = async () => {
    if (!confirm) return;
    const amount = amountFor(confirm);
    if (!Number.isFinite(amount) || amount <= 0 || !validPeriod) return;
    setAllocating(true);
    const { error } = await supabase.rpc("allocate_community_commission", { _community_id: confirm.community_id, _from: from, _to: to, _amount: amount });
    setAllocating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Sales commission credited to the creator's wallet");
    setConfirm(null);
    await load();
  };

  return (
    <section className="space-y-4 border-b pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Allocation table</h2>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || !ready || !validPeriod}><RefreshCw className="mr-2 h-4 w-4" />Refresh table</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1"><Label htmlFor="allocation-from">Period from</Label><Input id="allocation-from" type="date" value={from} max={to || today} onChange={e => setFrom(e.target.value)} disabled={allocating} /></div>
        <div className="space-y-1"><Label htmlFor="allocation-to">Period to</Label><Input id="allocation-to" type="date" value={to} min={from} max={today} onChange={e => setTo(e.target.value)} disabled={allocating} /></div>
      </div>
      {!validPeriod && <p className="text-sm text-destructive">Choose a valid period ending today or earlier.</p>}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : loading ? <Loader2 aria-label="Loading allocation table" className="h-5 w-5 animate-spin" /> : validPeriod && (
        <Table>
          <TableHeader><TableRow><TableHead>Community / recipient</TableHead><TableHead className="text-right">Total profit</TableHead><TableHead className="text-right">Role rate</TableHead><TableHead className="text-right">Calculated</TableHead><TableHead>Commission (₹)</TableHead><TableHead>Status / date</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {rows.map(row => {
              const paid = payments.find(p => p.community_id === row.community_id && overlapsCommissionPeriod(p, from, to));
              const amount = amountFor(row);
              return <TableRow key={row.community_id}>
                <TableCell><p className="font-medium">{row.community_name}</p><p className="text-xs text-muted-foreground">{row.creator_name || "Community creator"}</p></TableCell>
                <TableCell className="text-right">{money(row.profit)}</TableCell><TableCell className="text-right">{row.rate}%</TableCell><TableCell className="text-right">{money(commissionAmount(row.profit, row.rate))}</TableCell>
                <TableCell><Input type="number" min="0.01" step="0.01" aria-label={`Commission for ${row.community_name}`} className="w-32" value={paid ? paid.amount : edits[row.community_id] ?? commissionAmount(row.profit, row.rate).toFixed(2)} onChange={e => setEdits(prev => ({ ...prev, [row.community_id]: e.target.value }))} disabled={!!paid || allocating} /></TableCell>
                <TableCell>{paid ? <><Badge variant="secondary">Allocated {money(paid.amount)}</Badge><p className="mt-1 text-xs text-muted-foreground">{paid.period_from} – {paid.period_to}<br />{new Date(paid.created_at).toLocaleString("en-IN")}</p></> : <Badge variant="outline">Not allocated</Badge>}</TableCell>
                <TableCell><Button size="sm" disabled={!!paid || allocating || !Number.isFinite(amount) || amount <= 0} onClick={() => setConfirm(row)}><Wallet className="mr-1 h-4 w-4" />Allocate</Button></TableCell>
              </TableRow>;
            })}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No communities found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
      <Dialog open={!!confirm} onOpenChange={open => { if (!open && !allocating) setConfirm(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Allocate sales commission?</DialogTitle><DialogDescription>{confirm?.community_name} · {from} – {to}</DialogDescription></DialogHeader>
          {confirm && <p className="text-sm">Credit <strong>{money(amountFor(confirm))}</strong> to {confirm.creator_name || "the community creator"}'s wallet?</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={allocating} onClick={() => setConfirm(null)}>Cancel</Button><Button disabled={allocating} onClick={() => void allocate()}>{allocating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm allocation</Button></div>
        </DialogContent>
      </Dialog>
    </section>
  );
}