import { BellOff, Check, CheckCircle2, MapPin, Phone, XCircle } from "lucide-react";
import OrderItemHighlight from "@/components/selling-partner/OrderItemHighlight";
import { NotificationDialogFrame } from "@/components/OrderNotificationDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusLabel, type UtilityRequest } from "@/lib/utilityServices";

export const UTILITY_UNFINISHED_STATUSES = ["assigned", "in_progress", "quoted"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: UtilityRequest[];
  serviceName: (id: string) => string;
  onAccept: (id: string) => void;
  onCancel?: (id: string) => void;
  onComplete?: (id: string) => void;
  onRemindLater?: () => void;
  /** Show only one group in its own window; omit for the combined list. */
  group?: "new" | "pending";
}

export default function UtilityRequestNotificationDialog({ open, onOpenChange, requests, serviceName, onAccept, onCancel, onComplete, onRemindLater, group }: Props) {
  const pending = requests.filter((request) => request.status === "pending");
  const unfinished = onComplete ? requests.filter((r) => UTILITY_UNFINISHED_STATUSES.includes(r.status)) : [];
  const list = group === "new" ? pending : group === "pending" ? unfinished : [...pending, ...unfinished];
  const onlyUnfinished = group ? group === "pending" : pending.length === 0 && unfinished.length > 0;
  const description = group === "new"
    ? <span className="block text-xl font-bold">{pending.length} new · awaiting action</span>
    : group === "pending"
      ? <span className="block text-xl font-bold">{unfinished.length} unfinished requests</span>
      : unfinished.length
        ? <span className="block text-xl font-bold">{pending.length} new · {unfinished.length} unfinished</span>
        : `${pending.length} new · awaiting action`;
  return (
    <NotificationDialogFrame open={open} onOpenChange={onOpenChange} pendingTheme={onlyUnfinished}
      title={group === "new" ? "New service requests" : onlyUnfinished ? "Pending request alert" : "Service requests"} description={description}>
      {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No pending requests</p>}
      {list.map((request) => {
        const isNew = request.status === "pending";
        return (
        <article key={request.id} className={`space-y-3 rounded-lg border bg-card p-3 ${isNew ? "" : "seller-pending-theme border-primary/40"}`}>
          {!isNew && <p className="rounded-md bg-secondary p-3 text-xl font-bold text-secondary-foreground">Pending · Unfinished request</p>}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold">#{request.id.slice(0, 8)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(request.created_at).toLocaleString()}</p>
            </div>
            {!!request.total_amount && <span className="shrink-0 text-base font-semibold text-primary">₹{Number(request.total_amount).toLocaleString("en-IN")}</span>}
          </div>
          <Badge variant="secondary" className="whitespace-normal">{isNew ? "Awaiting acceptance" : statusLabel(request.status)}</Badge>
          <div className="min-w-0 space-y-1">
            <p className="break-words font-semibold">{request.contact_name}</p>
            <p className="flex items-center gap-1 text-sm text-muted-foreground"><Phone className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{request.contact_phone}</span></p>
          </div>
          <OrderItemHighlight name={serviceName(request.service_id)} variant={request.variant_label} quantity={request.quantity ?? 1} />
          {request.address && <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{request.address}</span></p>}
          {request.latitude != null && request.longitude != null && (
            <a className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline" href={`https://www.google.com/maps/search/?api=1&query=${request.latitude},${request.longitude}`} target="_blank" rel="noreferrer"><MapPin className="h-4 w-4 shrink-0" />Open location on map</a>
          )}
          <div className="grid grid-cols-1 gap-2 border-t pt-3">
            {isNew
              ? <Button className="delivery-gradient h-11" onClick={() => onAccept(request.id)}><Check className="mr-2 h-4 w-4" />Accept request</Button>
              : <Button className="delivery-gradient h-11" onClick={() => onComplete?.(request.id)}><CheckCircle2 className="mr-2 h-4 w-4" />Mark completed</Button>}
            {onCancel && (
              <Button variant="outline" className="h-11 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => onCancel(request.id)}>
                <XCircle className="mr-2 h-4 w-4" />Cancel request
              </Button>
            )}
          </div>
        </article>
      );})}
      footer={<div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>Close</Button>
        <Button className="h-11" onClick={() => (onRemindLater ? onRemindLater() : onOpenChange(false))}><BellOff className="mr-2 h-4 w-4" />Not today</Button>
      </div>}
    </NotificationDialogFrame>
  );
}
