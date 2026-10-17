import { useState, type ReactNode } from "react";
import { Bell, Clock, MapPin, Package } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HighlightedOrderItems } from "@/components/selling-partner/OrderItemHighlight";

export interface NotificationOrder {
  id: string; status: string; total: number; shipping_address: string | null;
  created_at: string; items: unknown; delivery_contact_attempted_at?: string | null;
}

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void; title: string;
  pending: NotificationOrder[]; active?: NotificationOrder[];
  dismissedIds?: Set<string>; showTabs?: boolean;
  renderContact?: (order: NotificationOrder) => ReactNode;
  renderActions: (order: NotificationOrder, isNew: boolean) => ReactNode;
  footer?: ReactNode;
  highlightItems?: boolean;
  sellerReminders?: boolean;
  /** Treat every listed order as an unfinished/pending-reminder order (separate pending window). */
  forceActive?: boolean;
}

export function NotificationDialogFrame({ open, onOpenChange, title, description, tabs, footer, children, pendingTheme = false }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string;
  description: ReactNode; tabs?: ReactNode; footer?: ReactNode; children: ReactNode;
  pendingTheme?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${pendingTheme ? "seller-pending-theme" : "delivery-blue"} w-[calc(100%-1.5rem)] max-w-md max-h-[calc(100dvh-2rem)] flex flex-col gap-0 overflow-hidden rounded-lg p-0 [&>button]:text-primary-foreground [&>button]:h-8 [&>button]:w-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center`}>
        <DialogHeader className="delivery-gradient shrink-0 px-4 py-5 pr-14 text-left text-primary-foreground">
          <DialogTitle className="flex items-center gap-2 font-body text-xl tracking-normal"><Bell className="h-5 w-5 shrink-0" />{title}</DialogTitle>
          <DialogDescription className="text-primary-foreground/90">{description}</DialogDescription>
        </DialogHeader>
        {tabs}
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
        {footer && <div className="shrink-0 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}

export default function OrderNotificationDialog({ open, onOpenChange, title, pending, active = [], dismissedIds, showTabs = true, renderContact, renderActions, footer, highlightItems = false, sellerReminders = false, forceActive = false }: Props) {
  const [tab, setTab] = useState("new");
  const selectedTab = forceActive ? "active" : tab === "new" && !pending.length && active.length ? "active" : tab;
  const orders = forceActive ? pending : !showTabs || selectedTab === "new" ? pending : active;
  return (
    <NotificationDialogFrame open={open} onOpenChange={onOpenChange} title={sellerReminders ? selectedTab === "active" ? "Pending order alert" : "New order reminder" : title}
      pendingTheme={sellerReminders && selectedTab === "active"}
      description={sellerReminders ? <span className="block text-xl font-bold">{selectedTab === "new" ? `${pending.length} orders awaiting acceptance` : `${orders.length} unfinished orders`}</span> : <>{pending.length} new{showTabs ? ` · ${active.length} in progress` : " · awaiting action"}</>}
      footer={footer}
      tabs={showTabs && <Tabs value={selectedTab} onValueChange={setTab} className="shrink-0 border-b px-4 py-3">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="new" className="h-9 gap-2"><Package className="h-4 w-4" />New ({pending.length})</TabsTrigger>
            <TabsTrigger value="active" className={`h-9 gap-2 ${sellerReminders ? "seller-pending-theme text-primary data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground" : ""}`}><Clock className="h-4 w-4" />{sellerReminders ? "Unfinished" : "In progress"} ({active.length})</TabsTrigger>
          </TabsList>
        </Tabs>}
    >
          {!orders.length && <p className="py-8 text-center text-sm text-muted-foreground">No {selectedTab === "new" ? "new orders" : "orders in progress"}</p>}
          {orders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const isNew = !forceActive && (!showTabs || selectedTab === "new");
            const unfinishedAlert = sellerReminders && (!isNew || dismissedIds?.has(order.id));
            return <article key={order.id} className={`rounded-lg border bg-card p-3 space-y-3 ${unfinishedAlert ? "seller-pending-theme border-primary/40" : ""}`}>
              {unfinishedAlert && <p className="rounded-md bg-secondary p-3 text-xl font-bold text-secondary-foreground">Pending · Unfinished order</p>}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="font-mono text-sm font-semibold">#{order.id.slice(0, 8)}</p><p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString()}</p></div>
                <span className="shrink-0 text-base font-semibold text-primary">₹{order.total.toLocaleString("en-IN")}</span>
              </div>
              <Badge variant="secondary" className="whitespace-normal">{isNew ? dismissedIds?.has(order.id) ? "Saved for later" : "Awaiting acceptance" : order.status.replace(/_/g, " ")}</Badge>
              {renderContact?.(order)}
              <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 shrink-0 mt-0.5" /><span className="break-words min-w-0">{order.shipping_address || "No delivery address"}</span></p>
              {!!items.length && <div className="border-t pt-3 space-y-2">
                {highlightItems ? <HighlightedOrderItems items={items} /> : <>{items.slice(0, 3).map((item, index) => <div key={index} className="flex gap-2 items-center">
                  {item?.image_url && <img src={item.image_url} alt={item.name || "Product"} className="h-10 w-10 shrink-0 rounded border object-cover" />}
                  <div className="min-w-0"><p className="text-sm font-medium break-words">{item?.name || item?.product_name || "Product"}</p><p className="text-xs text-muted-foreground break-words">Qty: {item?.quantity || 1} · ₹{item?.price ?? 0}{item?.variant ? ` · ${item.variant}` : ""}</p></div>
                </div>)}
                {items.length > 3 && <p className="text-xs text-muted-foreground">+{items.length - 3} more items</p>}</>}
              </div>}
              <div className="border-t pt-3">{renderActions(order, isNew)}</div>
            </article>;
          })}
    </NotificationDialogFrame>
  );
}