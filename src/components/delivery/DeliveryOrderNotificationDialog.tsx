import { BellOff, CheckCircle2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderNotificationDialog, { type NotificationOrder } from "@/components/OrderNotificationDialog";
import DeliveryOrderContact from "./DeliveryOrderContact";
import { useDeliveryContacts } from "@/hooks/useDeliveryContacts";

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void; userId: string;
  pending: NotificationOrder[]; active: NotificationOrder[]; dismissedIds: Set<string>; busyId: string | null;
  onAccept: (id: string) => void; onFinish: (id: string) => void;
  onLater: (id: string) => void; onDetail: (order: NotificationOrder) => void; onNotToday: () => void;
}

export default function DeliveryOrderNotificationDialog(props: Props) {
  const contacts = useDeliveryContacts([...props.pending, ...props.active].map((o) => o.id), props.userId, props.open);
  return <OrderNotificationDialog
    open={props.open} onOpenChange={props.onOpenChange} title="Delivery orders"
    pending={props.pending} active={props.active} dismissedIds={props.dismissedIds}
    renderContact={(order) => <>
      <DeliveryOrderContact contact={contacts.data?.[order.id]} loading={contacts.isLoading || contacts.isFetching} error={contacts.isError} />
      {contacts.isError && <Button variant="outline" size="sm" onClick={() => contacts.refetch()}>Retry contact</Button>}
    </>}
    renderActions={(order, isNew) => <div className="grid grid-cols-[1fr_auto] gap-2">
      <Button className="h-11 delivery-gradient" disabled={props.busyId !== null} onClick={() => isNew ? props.onAccept(order.id) : props.onFinish(order.id)}>
        <CheckCircle2 className="mr-2 h-4 w-4" />{props.busyId === order.id ? "Updating…" : isNew ? "Accept order" : "Finish delivery"}
      </Button>
      <Button variant="outline" className="h-11 w-11 p-0" aria-label={`View order ${order.id.slice(0, 8)}`} title="View order" onClick={() => props.onDetail(order)}><Eye className="h-4 w-4" /></Button>
      {isNew && !props.dismissedIds.has(order.id) && <Button variant="ghost" className="col-span-2 h-10" onClick={() => props.onLater(order.id)}>Later</Button>}
    </div>}
    footer={<div className="grid grid-cols-2 gap-2">
      <Button variant="outline" className="h-11" onClick={() => props.onOpenChange(false)}>Close</Button>
      <Button className="h-11" onClick={props.onNotToday}><BellOff className="mr-2 h-4 w-4" />Not today</Button>
    </div>}
  />;
}
