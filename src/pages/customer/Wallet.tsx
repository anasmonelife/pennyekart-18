import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, ArrowDownLeft, ArrowUpRight, Percent, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { payoutHeld, payoutRequestable, PAYOUT_HOLD_PERCENT } from "@/lib/commissionPayout";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/customer/login");
      return;
    }
    if (user) fetchWallet();
  }, [user, authLoading]);

  const fetchWallet = async () => {
    setLoading(true);
    // Fetch wallet
    const { data: wallet } = await supabase
      .from("customer_wallets")
      .select("*")
      .eq("customer_user_id", user!.id)
      .maybeSingle();

    if (wallet) {
      setBalance(wallet.balance);
      setMinUsage(wallet.min_usage_amount);

      // Fetch transactions and sales commission payments together
      const [txns, commissions] = await Promise.all([
        supabase
          .from("customer_wallet_transactions")
          .select("*")
          .eq("wallet_id", wallet.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("community_commission_allocations")
          .select("id, community_name, recipient_type, period_from, period_to, amount, allocated_at, status")
          .eq("customer_user_id", user!.id)
          .eq("status", "allocated")
          .order("allocated_at", { ascending: false }),
      ]);

      if (txns.data) setTransactions(txns.data as Transaction[]);
      if (commissions.data) setCommissions(commissions.data as CommissionPayment[]);
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  if (!user) return null;

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
            ) : commissions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Percent className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No sales commission yet</p>
                  <p className="text-sm mt-1">Community commission payouts will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {commissions.map(row => (
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
                          <p className="text-xs text-muted-foreground">
                            {formatDate(row.period_from)} – {formatDate(row.period_to)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Paid {row.allocated_at ? formatDate(row.allocated_at) : "—"}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-green-600">+₹{Number(row.amount).toFixed(2)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerWallet;
