import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Truck, History, Warehouse, Store, RotateCcw, Eye, List, ArrowLeft } from "lucide-react";
import OrderDetailDialog from "@/components/OrderDetailDialog";
import DeliveryOrderContact from "@/components/delivery/DeliveryOrderContact";
import { useDeliveryContacts } from "@/hooks/useDeliveryContacts";

interface Order {
  id: string;
  status: string;
  total: number;
  shipping_address: string | null;
  created_at: string;
  items: any;
  user_id: string | null;
  seller_id?: string | null;
  delivery_contact_attempted_at?: string | null;
}

const STATUS_FLOW = ["pending", "accepted", "pickup", "shipped", "delivered"];
const SELLER_STATUS_FLOW = ["seller_confirmation_pending", "seller_accepted", "accepted", "pickup", "shipped", "delivered"];

interface Props {
  orders: Order[];
  userId: string;
  onRefresh: () => void;
  quickFilter?: { status: string; nonce: number } | null;
}

const DeliveryOrders = ({ orders, userId, onRefresh, quickFilter }: Props) => {
  const { toast } = useToast();
  const contacts = useDeliveryContacts(orders.map((order) => order.id), userId);
  const renderContact = (order: Order) => <DeliveryOrderContact
    contact={contacts.data?.[order.id]}
    loading={contacts.isLoading}
    error={contacts.isError}
    orderId={order.id}
    orderStatus={order.status}
    attemptedAt={order.delivery_contact_attempted_at ?? null}
    onAttemptSent={onRefresh}
  />;
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [allStatusFilter, setAllStatusFilter] = useState("all");
  const [tab, setTab] = useState("menu");

  useEffect(() => {
    if (!quickFilter) return;
    setAllStatusFilter(quickFilter.status);
    setTab("all");
  }, [quickFilter?.nonce]);

  // Push tap deep link: /delivery-staff/dashboard?order=<id>
  const [searchParams, setSearchParams] = useSearchParams();
  const orderParam = searchParams.get("order");
  useEffect(() => {
    if (!orderParam) return;
    const found = orders.find((o) => o.id === orderParam);
    if (!found) return;
    setTab("all");
    setDetailOrder(found);
    const next = new URLSearchParams(searchParams);
    next.delete("order");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderParam, orders]);

  // Separate orders by godown type
  const isAreaGodownOrder = (o: Order) => 
    o.seller_id != null || 
    o.status === "seller_confirmation_pending" || 
    o.status === "seller_accepted" ||
    (Array.isArray(o.items) && o.items.some((i: any) => i.source === "seller_product"));

  const microOrders = orders.filter(o => !isAreaGodownOrder(o));
  const areaOrders = orders.filter(o => isAreaGodownOrder(o));

  const CLOSED = ["delivered", "cancelled", "return_requested", "return_accepted", "return_collected", "return_confirmed"];
  const activeMicro = microOrders.filter(o => !CLOSED.includes(o.status));
  const activeArea = areaOrders.filter(o => !CLOSED.includes(o.status));

  const RETURN_FLOW = ["return_requested", "return_accepted", "return_collected", "return_confirmed"];
  const returnOrders = orders.filter(o => ["return_requested", "return_accepted", "return_collected"].includes(o.status));

  const activeOrders = orders.filter((o) => !["delivered", "cancelled", "return_requested", "return_accepted", "return_collected", "return_confirmed"].includes(o.status));
  const deliveredOrders = orders.filter((o) => {
    if (!["delivered", "cancelled", "return_confirmed"].includes(o.status)) return false;
    if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(o.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  // Feature cards shown when the Orders page opens (same card model as the home screen)
  const sectionCards = [
    { tab: "micro", label: "Micro Orders", icon: Warehouse, sub: `${activeMicro.length} pending` },
    { tab: "area", label: "Area Orders", icon: Store, sub: `${activeArea.length} pending` },
    { tab: "returns", label: "Returns", icon: RotateCcw, sub: `${returnOrders.length} to handle` },
    { tab: "all", label: "All Orders", icon: List, sub: `${orders.length} total` },
    { tab: "history", label: "History", icon: History, sub: `${deliveredOrders.length} finished` },
  ];

  // All orders tab: newest first, with optional status filter
  const ALL_STATUSES = [
    { value: "all", label: "All statuses" },
    { value: "seller_confirmation_pending", label: "Waiting for seller" },
    { value: "seller_accepted", label: "Seller accepted" },
    { value: "pickup_pending", label: "Pickup pending" },
    { value: "pending", label: "Pending" },
    { value: "accepted", label: "Accepted" },
    { value: "pickup", label: "Picked up" },
    { value: "shipped", label: "On the way" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
    { value: "return_requested", label: "Return requested" },
    { value: "return_accepted", label: "Return accepted" },
    { value: "return_collected", label: "Return collected" },
    { value: "return_confirmed", label: "Return finished" },
  ];
  const allSorted = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const PICKUP_PENDING_STATUSES = ["pending", "seller_accepted", "accepted"];
  const filteredAll = allStatusFilter === "all"
    ? allSorted
    : allStatusFilter === "pickup_pending"
    ? allSorted.filter((o) => PICKUP_PENDING_STATUSES.includes(o.status))
    : allSorted.filter((o) => o.status === allStatusFilter);

  const getNextStatus = (current: string, order: Order) => {
    // Determine if this is a seller order based on seller_id or status
    const isSeller = order.seller_id || SELLER_STATUS_FLOW.includes(current);
    const flow = isSeller ? SELLER_STATUS_FLOW : STATUS_FLOW;
    const idx = flow.indexOf(current);
    if (idx === -1 || idx >= flow.length - 1) return null;
    return flow[idx + 1];
  };

  const updateOrderStatus = async (order: Order, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", order.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (newStatus === "delivered") {
      await creditWallet(order);
      await deductSellerStock(order);
    }
    toast({ title: `Order ${newStatus.replace(/_/g, " ")}` });
    onRefresh();
  };

  const advanceReturn = async (order: Order) => {
    const idx = RETURN_FLOW.indexOf(order.status);
    const next = RETURN_FLOW[idx + 1];
    if (!next) return;
    if (next === "return_confirmed" && !window.confirm("Finish this return? Items will be added back to stock.")) return;
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", order.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: next === "return_accepted" ? "Return accepted" : next === "return_collected" ? "Items collected" : "Return finished — stock restored" });
    onRefresh();
  };

  const flowFor = (o: Order): string[] => {
    if (o.status.startsWith("return_")) return RETURN_FLOW;
    const isSeller = !!o.seller_id || SELLER_STATUS_FLOW.includes(o.status);
    return isSeller ? SELLER_STATUS_FLOW : STATUS_FLOW;
  };

  const Steps = ({ flow, current, labels }: { flow: string[]; current: string; labels: Record<string, string> }) => {
    const idx = flow.indexOf(current);
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {flow.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${i <= idx ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"}`}>{labels[s] ?? s.replace(/_/g, " ")}</span>
            {i < flow.length - 1 && <span className="text-muted-foreground text-[10px]">›</span>}
          </div>
        ))}
      </div>
    );
  };

  const STEP_LABELS: Record<string, string> = {
    pending: "Pending", seller_confirmation_pending: "Seller", seller_accepted: "Seller OK", accepted: "Accepted",
    pickup: "Picked", shipped: "On the way", delivered: "Delivered",
    return_requested: "Requested", return_accepted: "Accepted", return_collected: "Collected", return_confirmed: "Finished",
  };

  const TRACK_LABELS: Record<string, string> = {
    ...STEP_LABELS,
    cancelled: "Cancelled",
  };

  const actionLabel = (next: string) =>
    next === "accepted" ? "Accept" : next === "pickup" ? "Pickup" : next === "shipped" ? "Ship" : next === "delivered" ? "Mark Delivered" : next.replace(/_/g, " ");

  const ItemsList = ({ order }: { order: Order }) =>
    Array.isArray(order.items) && order.items.length > 0 ? (
      <div className="space-y-1 border-t pt-2">
        {order.items.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            {(item.image_url || item.image) && <img src={item.image_url || item.image} alt={item.name} className="h-9 w-9 rounded border object-cover shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{item.name || "Item"}</p>
              <p className="text-[10px] text-muted-foreground">Qty {item.quantity || 1} × ₹{item.price ?? 0}</p>
            </div>
            <span className="text-xs font-medium">₹{(item.quantity || 1) * (item.price ?? 0)}</span>
          </div>
        ))}
      </div>
    ) : null;

  const OrderCards = ({ items }: { items: Order[] }) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">No pending orders</p>
      ) : items.map((o) => {
        const isSeller = !!o.seller_id || SELLER_STATUS_FLOW.includes(o.status);
        const flow = isSeller ? SELLER_STATUS_FLOW : STATUS_FLOW;
        const next = getNextStatus(o.status, o);
        return (
          <div key={o.id} id={`order-${o.id}`} className="border rounded-lg p-3 space-y-2 bg-card scroll-mt-24">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-medium">#{o.id.slice(0, 8)}</span>
              <Badge variant="secondary">₹{o.total}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{o.shipping_address || "No address"}</p>
            {renderContact(o)}
            <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}{(o as any).delivery_charge ? ` · Delivery ₹${(o as any).delivery_charge}` : ""}</p>
            <Steps flow={flow} current={o.status} labels={STEP_LABELS} />
            <ItemsList order={o} />
            <div className="flex gap-2 pt-1">
              {o.status === "seller_confirmation_pending" ? (
                <span className="flex-1 text-xs text-muted-foreground self-center">Waiting for seller to accept</span>
              ) : next ? (
                <Button size="sm" className="flex-1" onClick={() => updateOrderStatus(o, next)}>{actionLabel(next)}</Button>
              ) : <span className="flex-1" />}
              <Button size="sm" variant="outline" onClick={() => setDetailOrder(o)}><Eye className="h-4 w-4 mr-1" />Details</Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const deductSellerStock = async (order: Order) => {
    if (!Array.isArray(order.items)) return;
    for (const item of order.items) {
      if (!item.id || !item.quantity) continue;
      // Check if this item is a seller product
      const { data: sellerProduct } = await supabase
        .from("seller_products")
        .select("id, stock")
        .eq("id", item.id)
        .maybeSingle();
      if (sellerProduct) {
        const newStock = Math.max(0, (sellerProduct.stock ?? 0) - item.quantity);
        await supabase.from("seller_products").update({ stock: newStock }).eq("id", sellerProduct.id);
      }
    }
  };

  const creditWallet = async (order: Order) => {
    let { data: wallet } = await supabase
      .from("delivery_staff_wallets").select("*").eq("staff_user_id", userId).maybeSingle();
    if (!wallet) {
      const { data: newWallet } = await supabase
        .from("delivery_staff_wallets").insert({ staff_user_id: userId, balance: 0 }).select().single();
      wallet = newWallet;
    }
    if (!wallet) return;

    // Get delivery type from profile
    const { data: profileData } = await supabase.from("profiles").select("delivery_type").eq("user_id", userId).maybeSingle();
    const deliveryType = (profileData as any)?.delivery_type ?? "fixed";

    // For both types: credit the order total to wallet balance (collection from customer)
    const collectionAmount = order.total;
    await supabase.from("delivery_staff_wallet_transactions").insert({
      wallet_id: (wallet as any).id, staff_user_id: userId, order_id: order.id,
      amount: collectionAmount, type: "credit",
      description: `Collection for order ${order.id.slice(0, 8)} — ₹${collectionAmount}`,
    });
    await supabase.from("delivery_staff_wallets")
      .update({ balance: ((wallet as any).balance ?? 0) + collectionAmount }).eq("id", (wallet as any).id);

    // For part-time: also add delivery earning to earning_balance
    if (deliveryType === "part_time") {
      const earningAmount = 30; // per-delivery earning
      await supabase.from("delivery_staff_wallet_transactions").insert({
        wallet_id: (wallet as any).id, staff_user_id: userId, order_id: order.id,
        amount: earningAmount, type: "earning_credit",
        description: `Delivery earning for order ${order.id.slice(0, 8)}`,
      });
      await supabase.from("delivery_staff_wallets")
        .update({ earning_balance: (((wallet as any).earning_balance ?? 0) + earningAmount) } as any)
        .eq("id", (wallet as any).id);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "delivered": return "default";
      case "accepted": return "secondary";
      case "shipped": case "pickup": return "outline";
      default: return "secondary";
    }
  };

  const OrderTable = ({ items, showAction }: { items: Order[]; showAction: boolean }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>View</TableHead>
            {showAction && <TableHead>Action</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={showAction ? 7 : 6} className="text-center text-muted-foreground">No orders</TableCell></TableRow>
          ) : items.map((o) => {
            return (
              <TableRow key={o.id} id={`order-${o.id}`}>
                <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}…</TableCell>
                <TableCell>₹{o.total}</TableCell>
                <TableCell className="text-sm min-w-[200px] max-w-[260px]"><p className="break-words">{o.shipping_address ?? "—"}</p>{renderContact(o)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={statusColor(o.status) as any}>{o.status.replace(/_/g, " ")}</Badge>
                    {(o as any).is_self_delivery && <Badge variant="outline" className="text-xs w-fit"><Truck className="h-3 w-3 mr-1" />Self Delivery</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => setDetailOrder(o)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
                {showAction && (
                  <TableCell>
                    {(() => {
                      const next = getNextStatus(o.status, o);
                      if (o.status === "seller_confirmation_pending") {
                        return <span className="text-xs text-muted-foreground">Awaiting seller</span>;
                      }
                      if (next) {
                        return (
                          <Button size="sm" onClick={() => updateOrderStatus(o, next)}>
                            {next === "accepted" ? "Accept" : next === "pickup" ? "Pickup" : next === "shipped" ? "Ship" : next === "delivered" ? "Delivered" : next.replace(/_/g, " ")}
                          </Button>
                        );
                      }
                      return <span className="text-xs text-muted-foreground">Done</span>;
                    })()}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
    <Tabs value={tab} onValueChange={setTab}>
      {tab === "menu" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Order features">
          {sectionCards.map((section) => (
            <Button
              key={section.tab}
              variant="outline"
              onClick={() => setTab(section.tab)}
              className="h-auto min-h-36 min-w-0 flex-col gap-2 whitespace-normal rounded-lg bg-card p-5 text-center shadow-sm hover:bg-muted/40"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <section.icon className="h-6 w-6 text-primary" />
              </span>
              <span className="text-sm font-semibold">{section.label}</span>
              <span className="text-xs font-normal text-muted-foreground">{section.sub}</span>
            </Button>
          ))}
        </div>
      ) : (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setTab("menu")} className="-ml-2 gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to features
          </Button>
          <h2 className="text-base font-semibold">{sectionCards.find((section) => section.tab === tab)?.label}</h2>
        </div>
      )}

      <TabsContent value="micro">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Micro Godown Orders — You accept first, then pick up & deliver</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <OrderCards items={activeMicro} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="area">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Area Godown Orders — Seller must accept first before you can proceed</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <OrderCards items={activeArea} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="returns">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Returns — Accept, collect items from customer, then finish</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {returnOrders.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">No return requests</p>
              ) : returnOrders.map((o) => {
                const next = RETURN_FLOW[RETURN_FLOW.indexOf(o.status) + 1];
                return (
                  <div key={o.id} id={`order-${o.id}`} className="border rounded-lg p-3 space-y-2 bg-card scroll-mt-24">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium">#{o.id.slice(0, 8)}</span>
                      <Badge variant="secondary">₹{o.total}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{o.shipping_address || "No address"}</p>
                    {renderContact(o)}
                    <Steps flow={RETURN_FLOW} current={o.status} labels={STEP_LABELS} />
                    <ItemsList order={o} />
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1" onClick={() => advanceReturn(o)}>
                        {next === "return_accepted" ? "Accept Return" : next === "return_collected" ? "Collected Items" : "Finish Return"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDetailOrder(o)}><Eye className="h-4 w-4 mr-1" />Details</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="all">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm text-muted-foreground">All Orders — full flow track, newest first</CardTitle>
              <select
                value={allStatusFilter}
                onChange={(e) => setAllStatusFilter(e.target.value)}
                className="text-sm border rounded-md px-2 py-1.5 bg-background text-foreground"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {filteredAll.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">No orders</p>
              ) : filteredAll.map((o) => {
                const flow = flowFor(o);
                const isReturn = o.status.startsWith("return_");
                const inReturnFlow = isReturn && RETURN_FLOW.includes(o.status);
                return (
                  <div key={o.id} id={`order-${o.id}`} className="border rounded-lg p-3 space-y-2 bg-card scroll-mt-24">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-medium">#{o.id.slice(0, 8)}</span>
                      <div className="flex items-center gap-2">
                        {o.status === "cancelled" && <Badge variant="destructive">Cancelled</Badge>}
                        {inReturnFlow && <Badge variant="outline">Return</Badge>}
                        <Badge variant="secondary">₹{o.total}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{o.shipping_address || "No address"}</p>
                    {renderContact(o)}
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                    {inReturnFlow ? (
                      <Steps flow={RETURN_FLOW} current={o.status} labels={TRACK_LABELS} />
                    ) : o.status === "cancelled" ? (
                      <Steps flow={flow} current={o.status} labels={TRACK_LABELS} />
                    ) : (
                      <Steps flow={flow} current={o.status} labels={TRACK_LABELS} />
                    )}
                    <div className="flex gap-2 pt-1">
                      <span className="flex-1 text-xs text-muted-foreground self-center">
                        {o.status === "cancelled"
                          ? "This order was cancelled"
                          : inReturnFlow
                           ? "Track this return in Returns"
                          : o.status === "delivered"
                          ? "Delivered"
                          : o.status === "seller_confirmation_pending"
                          ? "Waiting for seller to accept"
                           : "Track this order in Micro / Area Orders"}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setDetailOrder(o)}><Eye className="h-4 w-4 mr-1" />Details</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <OrderTable items={deliveredOrders} showAction={false} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    <OrderDetailDialog order={detailOrder} open={!!detailOrder} onOpenChange={(v) => { if (!v) setDetailOrder(null); }} deliveryStaffUserId={userId} />
    </>
  );
};

export default DeliveryOrders;
