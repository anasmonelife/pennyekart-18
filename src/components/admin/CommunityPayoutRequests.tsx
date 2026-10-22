import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { payoutReviewActions } from "@/lib/commissionPayout";
import { CheckCircle2, Loader2, RefreshCw, ThumbsUp, XCircle } from "lucide-react";
import { toast } from "sonner";

const db = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, a?: Record<string, unknown>) => any };

interface PayoutRequest {
  id: string; customer_user_id: string; requested_amount: number; commission_total: number;
  status: "pending" | "verified" | "approved" | "rejected"; admin_notes: string | null;
  created_at: string; verified_at: string | null; approved_at: string | null; rejected_at: string | null;
}
interface Requester { name: string | null; mobile: string | null }
type Row = PayoutRequest & Requester;

const money = (n: number) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STATUS_LABEL: Record<string, string> = { pending: "Pending", verified: "Verified", approved: "Approved", rejected: "Rejected" };

/** Admin review of customer sales-commission payout requests: verify, approve (pays wallet), or reject. */
export default function CommunityPayoutRequests({ ready }: { ready: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!ready) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error } = await db.from("commission_payout_requests").select("*").order("created_at", { ascending: false });
    if (error) { setError(error.message); setLoading(false); return; }
    const list = (data ?? []) as PayoutRequest[];
    const ids = [...new Set(list.map(r => r.customer_user_id))];
    const { data: profiles } = ids.length
      ? await db.from("profiles").select("user_id, full_name, mobile_number").in("user_id", ids)
      : { data: [] };
    const byId = new Map(((profiles ?? []) as any[]).map(p => [p.user_id, p]));
    setRows(list.map(r => ({
      ...r,
      name: byId.get(r.customer_user_id)?.full_name ?? null,
      mobile: byId.get(r.customer_user_id)?.mobile_number ?? null,
    })));
    setLoading(false);
  }, [ready]);
  useEffect(() => { void load(); }, [load]);

  const review = async (row: Row, action: "verify" | "approve" | "reject", note?: string) => {
    setBusy(true);
    const { error } = await db.rpc("review_commission_payout", { _id: row.id, _action: action, _notes: note ?? null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(action === "approve" ? "Approved — wallet credited" : action === "verify" ? "Request verified" : "Request rejected");
    setRejecting(null); setNotes("");
    await load();
  };

  const busyOrLoading = loading || busy;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Payout requests</h2>
          <p className="text-xs text-muted-foreground">Customer sales-commission payout requests. Verify a pending request, then approve to credit the wallet — or reject it.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={busyOrLoading}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <Loader2 aria-label="Loading payout requests" className="h-5 w-5 animate-spin" /> : (
        <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow>
            <TableHead>Customer</TableHead><TableHead className="text-right">Requested</TableHead>
            <TableHead className="text-right">Total commission</TableHead><TableHead>Status</TableHead>
            <TableHead>Requested on</TableHead><TableHead>Note</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name || "—"}<p className="text-xs text-muted-foreground">{r.mobile || ""}</p></TableCell>
                <TableCell className="text-right">{money(r.requested_amount)}</TableCell>
                <TableCell className="text-right">{money(r.commission_total)}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[180px]">{r.admin_notes || "—"}</TableCell>
                <TableCell className="space-x-1 whitespace-nowrap">
                  {payoutReviewActions(r.status).includes("verify") && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void review(r, "verify")}><CheckCircle2 className="mr-1 h-4 w-4" />Verify</Button>
                  )}
                  {payoutReviewActions(r.status).includes("approve") && (
                    <Button size="sm" disabled={busy} onClick={() => void review(r, "approve")}><ThumbsUp className="mr-1 h-4 w-4" />Approve</Button>
                  )}
                  {payoutReviewActions(r.status).includes("reject") && (
                    <Button size="sm" variant="destructive" disabled={busy} onClick={() => { setRejecting(r); setNotes(""); }}><XCircle className="mr-1 h-4 w-4" />Reject</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No payout requests yet.</TableCell></TableRow>}
          </TableBody>
        </Table></div>
      )}
      <Dialog open={!!rejecting} onOpenChange={o => { if (!o && !busy) setRejecting(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject payout request?</DialogTitle>
            <DialogDescription>{rejecting && <>Reject {money(rejecting.requested_amount)} requested by {rejecting.name || "this customer"}?</>}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="payout-reject-notes" className="text-sm font-medium">Note to the customer (optional)</label>
            <Input id="payout-reject-notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={busy} onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={() => rejecting && void review(rejecting, "reject", notes || undefined)}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reject request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
