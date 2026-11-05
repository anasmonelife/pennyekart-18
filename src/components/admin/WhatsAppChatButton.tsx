import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { whatsappChatLink, whatsappDigits } from "@/lib/appLinks";

const TEMPLATES: { label: string; text: (name: string) => string }[] = [
  { label: "Greeting", text: (n) => `Hello ${n}, greetings from Pennyekart! How can we help you today?` },
  { label: "Special offer", text: (n) => `Hi ${n}, we have a special offer just for you on Pennyekart! Open the app to check today's deals: https://www.pennyekart.com` },
  { label: "Order follow-up", text: (n) => `Hi ${n}, this is Pennyekart. We wanted to check on your recent order. Is everything okay?` },
  { label: "We miss you", text: (n) => `Hi ${n}, we miss you at Pennyekart! Come back and shop your daily essentials with home delivery.` },
];

interface Props { name: string | null; mobile: string | null; }

const WhatsAppChatButton = ({ name, mobile }: Props) => {
  const digits = whatsappDigits(mobile);
  const [open, setOpen] = useState(false);
  const display = name?.trim() || "there";
  const [message, setMessage] = useState("");

  if (!digits) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-primary"
        title="Chat on WhatsApp"
        aria-label={`Chat with ${display} on WhatsApp`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMessage(TEMPLATES[0].text(display)); setOpen(true); }}
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>WhatsApp {display} ({mobile})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <Button key={t.label} type="button" size="sm" variant="outline" onClick={() => setMessage(t.text(display))}>
                  {t.label}
                </Button>
              ))}
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { window.open(whatsappChatLink(digits, message.trim()), "_blank", "noopener"); setOpen(false); }}>
              <MessageCircle className="h-4 w-4 mr-2" /> Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsAppChatButton;
