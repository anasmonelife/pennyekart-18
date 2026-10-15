import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import OrderNotificationDialog from "@/components/OrderNotificationDialog";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Eye, CheckCircle2 } from "lucide-react";
import OrderDetailDialog from "@/components/OrderDetailDialog";
import DeliveryOrderNotificationDialog from "@/components/delivery/DeliveryOrderNotificationDialog";
import { useToast } from "@/hooks/use-toast";
import { sellerReminderGroup, SELLER_REMINDER_INTERVAL } from "@/lib/sellerOrderReminders";
import { areDailyRemindersDismissed, dismissDailyReminders } from "@/lib/dailyReminderDismissal";

interface PendingOrder {
  id: string;
  status: string;
  total: number;
  shipping_address: string | null;
  created_at: string;
  items: any;
}

interface Props {
  userId: string;
  /** 'delivery' polls orders assigned to this staff; 'seller' polls orders for seller */
  role: "delivery" | "seller";
  onAccept?: (orderId: string) => void;
  onRefresh?: () => void;
}

const POLL_INTERVAL = 30 * 1000; // 30 seconds

const PENDING_STATUSES: Record<Props["role"], string[]> = {
  delivery: ["pending", "seller_accepted"],
  seller: ["seller_confirmation_pending", "pending"],
};

/** Accepted but not yet finished — these get a "Finish" button. */
const IN_PROGRESS_STATUSES: Record<Props["role"], string[]> = {
  delivery: ["accepted", "pickup", "shipped", "out_for_delivery"],
  seller: ["seller_accepted", "self_delivery_pickup", "self_delivery_shipped"],
};

const NewOrderNotification = ({ userId, role, onAccept, onRefresh }: Props) => {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [inProgressOrders, setInProgressOrders] = useState<PendingOrder[]>([]);
  const [open, setOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [detailOrder, setDetailOrder] = useState<PendingOrder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const prevCountRef = useRef(0);
  const reminderDateRef = useRef(new Date().toDateString());
  const lastSellerAlertRef = useRef(0);
  const previousSellerIdsRef = useRef<Set<string>>(new Set());
  const previousNewIdsRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const beep = (freq: number, delay: number) => {
        setTimeout(() => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          } catch {}
        }, delay);
      };
      beep(800, 0);
      beep(1000, 400);
    } catch {}
  };

  const applyOrders = useCallback(
    (all: PendingOrder[]) => {
      const today = new Date().toDateString();
      if (reminderDateRef.current !== today) {
        reminderDateRef.current = today;
        prevCountRef.current = 0;
        lastSellerAlertRef.current = 0;
        previousSellerIdsRef.current.clear();
        previousNewIdsRef.current.clear();
      }
      const pending = all.filter((o) => PENDING_STATUSES[role].includes(o.status));
      const active = all.filter((o) => role === "seller" ? sellerReminderGroup(o.status) === "unfinished" : IN_PROGRESS_STATUSES[role].includes(o.status));
      const fresh = pending.filter((o) => !dismissedIds.has(o.id));
      const now = Date.now();
      const remindersDismissed = areDailyRemindersDismissed(role, userId);
      if (role === "seller") {
        // New orders and unfinished orders alert in separate windows.
        const newOrderAlert = fresh.some((o) => !previousNewIdsRef.current.has(o.id));
        const pendingAlert = active.length > 0 && (
          active.some((o) => !previousSellerIdsRef.current.has(o.id)) ||
          now - lastSellerAlertRef.current >= SELLER_REMINDER_INTERVAL
        );
        if (!remindersDismissed && newOrderAlert) { playSound(); setNewOpen(true); }
        if (!remindersDismissed && pendingAlert) { playSound(); setPendingOpen(true); lastSellerAlertRef.current = now; }
        previousNewIdsRef.current = new Set(fresh.map((o) => o.id));
        previousSellerIdsRef.current = new Set(active.map((o) => o.id));
      } else if (!remindersDismissed && fresh.length > 0 && fresh.length > prevCountRef.current) {
        playSound();
        setOpen(true);
      }
      prevCountRef.current = fresh.length;
      setPendingOrders(pending);
      setInProgressOrders(active);
    },
    [role, userId, dismissedIds]
  );

  const fetchPending = useCallback(async () => {
    try {
      if (role === "seller") {
        const { data, error } = await supabase.rpc("get_orders_for_seller", { seller_user_id: userId });
        if (error) return;
        applyOrders((data as PendingOrder[]) ?? []);
        return;
      }
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total, shipping_address, created_at, items")
        .eq("assigned_delivery_staff_id", userId)
        .in("status", [...PENDING_STATUSES.delivery, ...IN_PROGRESS_STATUSES.delivery])
        .order("created_at", { ascending: false });
      if (error) return;
      applyOrders((data as PendingOrder[]) ?? []);
    } catch {
      // silent
    }
  }, [userId, role, applyOrders]);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPending]);

  // Realtime: react instantly to new / changed orders
  useEffect(() => {
    const channel = supabase
      .channel(`order-notify-${role}-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchPending();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, userId, fetchPending]);

  const updateStatus = async (orderId: string, status: string) => {
    setBusyId(orderId);
    const { error } = await supabase.from("orders").update({ status } as any).eq("id", orderId);
    setBusyId(null);
    if (error) {
      toast({ title: "Order not updated", description: "Please try again.", variant: "destructive" });
      return false;
    }
    onRefresh?.();
    await fetchPending();
    return true;
  };

  const handleAccept = async (orderId: string) => {
    const newStatus = role === "delivery" ? "accepted" : "seller_accepted";
    const ok = await updateStatus(orderId, newStatus);
    if (ok) {
      setDismissedIds((prev) => new Set([...prev, orderId]));
      if (role === "seller") {
        supabase.functions.invoke("send-delivery-order-push", { body: { order_id: orderId } }).catch(() => {});
      }
      onAccept?.(orderId);
    }
  };

  const handleFinish = async (orderId: string) => {
    await updateStatus(orderId, "delivered");
  };

  const handleDismiss = (orderId: string) => {
    setDismissedIds((prev) => new Set([...prev, orderId]));
  };

  const handleNotToday = () => {
    dismissDailyReminders(role, userId);
    setOpen(false);
    setNewOpen(false);
    setPendingOpen(false);
  };

  const reminderFooter = (onClose: () => void) => <div className="grid grid-cols-2 gap-2">
    <Button variant="outline" className="h-11" onClick={onClose}>Close</Button>
    <Button className="h-11" onClick={handleNotToday}><BellOff className="mr-2 h-4 w-4" />Not today</Button>
  </div>;

  const undismissedOrders = pendingOrders.filter((o) => !dismissedIds.has(o.id));
  const totalBadge = (role === "seller" ? pendingOrders.length : undismissedOrders.length) + inProgressOrders.length;

  if (pendingOrders.length === 0 && inProgressOrders.length === 0) return null;

  const sellerActions = (order: PendingOrder, isNew: boolean) => <div className="grid grid-cols-[1fr_auto] gap-2">
    {isNew && !dismissedIds.has(order.id) && <Button className="h-11 delivery-gradient" disabled={busyId !== null} onClick={() => handleAccept(order.id)}>
      <CheckCircle2 className="mr-2 h-4 w-4" />{busyId === order.id ? "Accepting…" : "Accept order"}
    </Button>}
    <Button variant="outline" className={isNew && !dismissedIds.has(order.id) ? "h-11 w-11 p-0" : "col-span-2 h-11"} aria-label={`View order ${order.id.slice(0, 8)}`} title="View order" onClick={() => setDetailOrder(order)}><Eye className="h-4 w-4" />{(!isNew || dismissedIds.has(order.id)) && "View order"}</Button>
    {isNew && !dismissedIds.has(order.id) && <Button variant="ghost" className="col-span-2 h-10" onClick={() => handleDismiss(order.id)}>Later</Button>}
  </div>;

  return (
    <>
      {/* Floating notification bells — separate windows for new vs pending orders */}
      {role === "seller" ? (
        <>
          {pendingOrders.length > 0 && (
            <Button
              aria-label={`Open new order notifications (${pendingOrders.length})`}
              onClick={() => setNewOpen(true)}
              className={`fixed bottom-20 right-4 z-50 flex h-16 w-auto items-center justify-center gap-2 rounded-lg px-4 bg-primary text-primary-foreground shadow-lg transition-all delivery-blue delivery-gradient ${
                undismissedOrders.length > 0 ? "motion-safe:animate-bounce hover:animate-none" : ""
              }`}
            >
              <Bell className="h-6 w-6" />
              <span className="text-base font-bold">New orders</span>
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {pendingOrders.length}
              </span>
            </Button>
          )}
          {inProgressOrders.length > 0 && (
            <Button
              aria-label={`Open pending order notifications (${inProgressOrders.length})`}
              onClick={() => setPendingOpen(true)}
              className={`fixed ${pendingOrders.length > 0 ? "bottom-40" : "bottom-20"} right-4 z-50 flex h-16 w-auto items-center justify-center gap-2 rounded-lg px-4 bg-primary text-primary-foreground shadow-lg transition-all seller-pending-theme delivery-gradient`}
            >
              <Bell className="h-6 w-6" />
              <span className="text-base font-bold">Pending orders</span>
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {inProgressOrders.length}
              </span>
            </Button>
          )}
        </>
      ) : totalBadge > 0 && (
        <Button
          aria-label={`Open order notifications (${totalBadge})`}
          onClick={() => setOpen(true)}
          className={`fixed bottom-20 right-4 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg transition-all delivery-blue delivery-gradient ${
            undismissedOrders.length > 0 ? "motion-safe:animate-bounce hover:animate-none" : ""
          }`}
        >
          <Bell className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
            {totalBadge}
          </span>
        </Button>
      )}

      {role === "delivery" ? <DeliveryOrderNotificationDialog
        open={open} onOpenChange={setOpen} userId={userId} pending={pendingOrders} active={inProgressOrders}
        dismissedIds={dismissedIds} busyId={busyId} onAccept={handleAccept} onFinish={handleFinish}
        onLater={handleDismiss} onDetail={setDetailOrder} onNotToday={handleNotToday}
      /> : <>
        <OrderNotificationDialog
          highlightItems
          sellerReminders
          showTabs={false}
          open={newOpen} onOpenChange={setNewOpen} title="New orders"
          pending={pendingOrders} dismissedIds={dismissedIds}
          renderActions={sellerActions}
          footer={reminderFooter(() => setNewOpen(false))}
        />
        <OrderNotificationDialog
          highlightItems
          sellerReminders
          showTabs={false}
          forceActive
          open={pendingOpen} onOpenChange={setPendingOpen} title="Pending orders"
          pending={inProgressOrders} dismissedIds={dismissedIds}
          renderActions={sellerActions}
          footer={reminderFooter(() => setPendingOpen(false))}
        />
      </>}
      <OrderDetailDialog highlightItems={role === "seller"} order={detailOrder} open={!!detailOrder} onOpenChange={(v) => { if (!v) setDetailOrder(null); }} />
    </>
  );
};

export default NewOrderNotification;
