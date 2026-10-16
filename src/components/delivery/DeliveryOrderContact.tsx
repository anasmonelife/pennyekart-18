import { useEffect, useState } from "react";
import { BellRing, Check, LoaderCircle, Phone, MessageCircle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { DeliveryContact } from "@/hooks/useDeliveryContacts";
import { canNotifyCustomerAboutDelivery } from "@/lib/deliveryContactAttempt";

export default function DeliveryOrderContact({ contact, loading, error, orderId, orderStatus, attemptedAt, onAttemptSent }: {
  contact?: DeliveryContact; loading?: boolean; error?: boolean;
  orderId: string; orderStatus: string; attemptedAt: string | null; onAttemptSent: () => void;
}) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(Boolean(attemptedAt));
  useEffect(() => setSent(Boolean(attemptedAt)), [attemptedAt]);
  const digits = contact?.phone?.replace(/\D/g, "") ?? "";
  const whatsapp = digits.length === 10 ? `91${digits}` : digits;

  const notifyCustomer = async () => {
    if (sending || sent) return;
    setSending(true);
    const { data, error: invokeError } = await supabase.functions.invoke("send-delivery-contact-alert", {
      body: { order_id: orderId },
    });
    setSending(false);
    if (invokeError || data?.error) {
      toast({ title: "Could not notify customer", description: data?.error || invokeError?.message || "Please try again.", variant: "destructive" });
      return;
    }
    if (data?.sent) {
      setSent(true);
      onAttemptSent();
      toast({ title: "Customer notified", description: data.push_sent === false ? "The in-app order notice is saved. Phone notification could not be delivered." : "The customer will see this notice on their order and receive a phone notification if available." });
      return;
    }
    if (data?.reason === "already_sent") {
      setSent(true);
      onAttemptSent();
      toast({ title: "Already notified", description: "A contact notice was already sent for this order." });
      return;
    }
    toast({ title: "Could not notify customer", description: "This order can no longer receive a contact notice.", variant: "destructive" });
  };

  return (
    <div className="space-y-2 border-t pt-2">
      <div className="flex items-start gap-2 min-w-0">
        <UserRound className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
        <div className="min-w-0 text-sm">
          <p className="font-medium break-words">{contact?.name || (loading ? "Loading contact…" : error ? "Contact unavailable" : "Customer")}</p>
          <p className="text-muted-foreground break-all">{contact?.phone || (!loading && !error ? "No phone number available" : "")}</p>
        </div>
      </div>
      {digits && <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm" className="h-10"><a href={`tel:${digits}`}><Phone />Call</a></Button>
        <Button asChild variant="outline" size="sm" className="h-10"><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle />WhatsApp</a></Button>
      </div>}
      {canNotifyCustomerAboutDelivery(orderStatus, attemptedAt) && (
        <Button size="sm" variant={sent ? "secondary" : "default"} className="h-10 w-full" disabled={sending || sent} onClick={notifyCustomer}>
          {sending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : sent ? <Check className="mr-2 h-4 w-4" /> : <BellRing className="mr-2 h-4 w-4" />}
          {sending ? "Sending…" : sent ? "Customer notified" : "Notify customer"}
        </Button>
      )}
    </div>
  );
}