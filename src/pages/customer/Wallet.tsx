import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, ArrowDownLeft, ArrowUpRight, Percent, Banknote, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { committedPayoutAmount, payoutHeld, payoutRequestable, PAYOUT_HOLD_PERCENT, type CommissionPayoutRequest } from "@/lib/commissionPayout";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  order_id: string | null;
}

interface CommissionPayment {
  id: string;
  community_name: string;
  recipient_type: string;
  period_from: string;
  period_to: string;
  amount: number;
  allocated_at: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  creator: "Creator",
  coordinator: "Coordinator",
  team_leader: "Team leader",
  super_admin: "Super admin",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

const CustomerWallet = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState(0);
  const [minUsage, setMinUsage] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [commissions, setCommissions] = useState<CommissionPayment[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<CommissionPayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/customer/login");
      return;
    }
    if (user) fetchWallet();
  }, [user, authLoading]);

  const fetchWallet = async () => {
    const currentUser = user;
    if (!currentUser) return;
    setLoading(true);
    // Fetch wallet
    const { data: wallet } = await supabase
      .from("customer_wallets")
      .select("*")
      .eq("customer_user_id", currentUser.id)
      .maybeSingle();

    if (wallet) {
      setBalance(wallet.balance);
      setMinUsage(wallet.min_usage_amount);

      // Fetch transactions and sales commission payments together
      const [txns, commissionRows, payoutRows] = await Promise.all([
        supabase
          .from("customer_wallet_transactions")
          .select("*")
          .eq("wallet_id", wallet.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("community_commission_allocations")
          .select("id, community_name, recipient_type, period_from, period_to, amount, allocated_at, status")
          .eq("customer_user_id", currentUser.id)
          .eq("status", "allocated")
          .order("allocated_at", { ascending: false }),
        supabase
          .from("commission_payout_requests")
          .select("*")
          .eq("customer_user_id", currentUser.id)
          .order("created_at", { ascending: false }),
      ]);

      if (txns.data) setTransactions(txns.data as Transaction[]);
      if (commissionRows.data) setCommissions(commissionRows.data as CommissionPayment[]);
      if (payoutRows.data) setPayoutRequests(payoutRows.data as CommissionPayoutRequest[]);
    }
    setLoading(false);
  };

  const handlePayoutRequest = async () => {
    const amount = Number(payoutAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payout amount");
      return;
    }
    setPayoutSubmitting(true);
    const { error } = await supabase.rpc("request_commission_payout", { _amount: amount });
    setPayoutSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Payout request submitted");
    setPayoutDialogOpen(false);
    setPayoutAmount("");
    await fetchWallet();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  if (!user) return null;

  const totalCommission = commissions.reduce((sum, row) => sum + Number(row.amount), 0);
  const heldCommission = payoutHeld(totalCommission);
  const availableToRequest = payoutRequestable(totalCommission, committedPayoutAmount(payoutRequests));

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">My Wallet</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Balance Card */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="h-6 w-6" />
              <span className="text-sm font-medium opacity-90">Wallet Balance</span>
            </div>
            {loading ? (
              <Skeleton className="h-10 w-32 bg-primary-foreground/20" />
            ) : (
              <p className="text-3xl font-bold">₹{balance.toFixed(2)}</p>
            )}
            {minUsage > 0 && (
              <p className="text-xs mt-2 opacity-80">
                Min. order amount to use wallet: ₹{minUsage.toFixed(2)}
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="transactions">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="commission">Sales commission</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Transaction History</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : transactions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Wallet className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No transactions yet</p>
                  <p className="text-sm mt-1">Your wallet transactions will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {transactions.map(txn => (
                  <Card key={txn.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        txn.type === "credit" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      }`}>
                        {txn.type === "credit" ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {txn.description || (txn.type === "credit" ? "Credited" : "Debited")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                      <p className={`text-sm font-bold ${txn.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                        {txn.type === "credit" ? "+" : "-"}₹{txn.amount.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="commission" className="mt-4 space-y-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <div className="space-y-5">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total commission</p>
                        <p className="text-lg font-semibold">₹{totalCommission.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Held ({PAYOUT_HOLD_PERCENT}%)</p>
                        <p className="text-lg font-semibold">₹{heldCommission.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Available to request</p>
                        <p className="text-lg font-semibold">₹{availableToRequest.toFixed(2)}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => { setPayoutAmount(availableToRequest.toFixed(2)); setPayoutDialogOpen(true); }}
                      disabled={availableToRequest <= 0}
                    >
                      <Send className="h-4 w-4 mr-2" /> Request payout
                    </Button>
                  </CardContent>
                </Card>

                <section className="space-y-2">
                  <h2 className="text-sm font-semibold">Payout requests</h2>
                  {payoutRequests.length === 0 ? (
                    <Card><CardContent className="p-5 text-sm text-muted-foreground">No payout requests yet</CardContent></Card>
                  ) : payoutRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">₹{Number(request.requested_amount).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Requested {formatDate(request.created_at)}</p>
                          {request.admin_notes && <p className="text-xs text-muted-foreground mt-1">Note: {request.admin_notes}</p>}
                        </div>
                        <Badge variant={request.status === "approved" ? "default" : request.status === "rejected" ? "destructive" : "secondary"}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </section>

                <section className="space-y-2">
                  <h2 className="text-sm font-semibold">Commission history</h2>
                  {commissions.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        <Percent className="h-9 w-9 mx-auto mb-2 opacity-40" />
                        <p className="font-medium">No sales commission yet</p>
                        <p className="text-sm mt-1">Community commission payouts will appear here</p>
                      </CardContent>
                    </Card>
                  ) : commissions.map(row => (
                    <Card key={row.id}>
                      <CardContent className="p-3 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10 text-primary shrink-0">
                          <Percent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{row.community_name}</p>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {ROLE_LABEL[row.recipient_type] ?? row.recipient_type}
                            </Badge>
                            <p className="text-xs text-muted-foreground">{formatDate(row.period_from)} – {formatDate(row.period_to)}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Paid {row.allocated_at ? formatDate(row.allocated_at) : "—"}</p>
                        </div>
                        <p className="text-sm font-bold text-green-600">+₹{Number(row.amount).toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </section>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request sales commission payout</DialogTitle>
            <DialogDescription>Up to ₹{availableToRequest.toFixed(2)} is available. {PAYOUT_HOLD_PERCENT}% of total commission remains held.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="payout-amount" className="text-sm font-medium">Amount (₹)</label>
            <Input id="payout-amount" type="number" min="0.01" max={availableToRequest} step="0.01" value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePayoutRequest} disabled={payoutSubmitting || Number(payoutAmount) <= 0 || Number(payoutAmount) > availableToRequest}>
              {payoutSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerWallet;
