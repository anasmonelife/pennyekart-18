import { useState, useEffect, useCallback } from "react";
import { BadgeCheck, ShieldCheck, MessageCircle, AlertTriangle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  buildVerificationLink,
  canSendVerificationLink,
  normalizeVerificationMobile,
  verificationWhatsAppMessage,
} from "@/lib/accountVerification";

interface Props {
  userId: string;
  profileMobile: string | null;
  isSuperAdmin?: boolean;
}

const CODE_TTL_MINUTES = 10;

const VerifyAccountCard = ({ userId, profileMobile, isSuperAdmin = false }: Props) => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  // WhatsApp verification link option (super admin, team leader, coordinator)
  const [roleName, setRoleName] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkMobile, setLinkMobile] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [sentLink, setSentLink] = useState<{ mobile: string; waUrl: string } | null>(null);

  const loadStatus = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("is_verified")
      .eq("user_id", userId)
      .maybeSingle();
    setIsVerified(Boolean((data as { is_verified?: boolean } | null)?.is_verified));
  }, [userId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (cancelled) return;
        const names = ((data ?? []) as { roles?: { name?: string } | null }[])
          .map((r) => r?.roles?.name ?? null)
          .filter(Boolean) as string[];
        setRoleName(names[0] ?? null);
      });
    return () => { cancelled = true; };
  }, [userId]);

  const digitsOnly = (v: string) => v.replace(/\D/g, "");
  const normalize = (v: string | null) => (v ? digitsOnly(v).slice(-10) : "");

  const canSend = canSendVerificationLink(isSuperAdmin, roleName);

  const openSelfVerify = () => {
    setMobile("");
    setMismatch(false);
    setStep("mobile");
    setOpen(true);
  };

  const openLinkDialog = () => {
    setLinkMobile("");
    setSentLink(null);
    setLinkOpen(true);
  };

  const handleSendCode = async () => {
    setMismatch(false);
    const entered = normalize(mobile);
    if (entered.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    if (!profileMobile || entered !== normalize(profileMobile)) {
      setMismatch(true);
      return;
    }

    setBusy(true);
    const { data, error } = await supabase.functions.invoke("send-verification", { body: { mobile: entered } });
    setBusy(false);
    const serverErr = (data as { error?: string } | null)?.error;
    if (serverErr === "mismatch") { setMismatch(true); return; }
    if (error || serverErr || !(data as { code?: string })?.code) {
      toast.error(serverErr || "Could not start verification. Please try again.");
      return;
    }
    const generated = (data as { code: string }).code;

    const text = encodeURIComponent(
      `Pennyekart account verification\n\nYour verification code is: ${generated}\n\nValid for ${CODE_TTL_MINUTES} minutes. Do not share this code with anyone.`,
    );
    window.open(`https://wa.me/91${entered}?text=${text}`, "_blank");
    setStep("code");
    toast.success("Verification code sent to your WhatsApp");
  };

  const handleVerify = async () => {
    const entered = digitsOnly(code);
    if (entered.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("check-verification", { body: { code: entered } });
    setBusy(false);
    const serverErr = (data as { error?: string } | null)?.error;
    if (serverErr === "expired") {
      toast.error("Code expired. Please request a new code.");
      setStep("mobile");
      return;
    }
    if (error || serverErr || !(data as { ok?: boolean })?.ok) {
      toast.error(serverErr || "Verification failed. Please try again.");
      return;
    }

    setIsVerified(true);
    setOpen(false);
    setCode("");
    setStep("mobile");
    toast.success("Account verified!");
  };

  const handleCreateLink = async () => {
    const entered = normalizeVerificationMobile(linkMobile);
    if (entered.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setLinkBusy(true);
    const { data, error } = await supabase.functions.invoke("create-verification-link", { body: { mobile: entered } });
    setLinkBusy(false);
    const serverErr = (data as { error?: string } | null)?.error;
    const token = (data as { token?: string } | null)?.token;
    if ((data as { status?: string } | null)?.status === "already_verified") {
      toast.info("This customer is already verified — no link needed.");
      openLinkDialog();
      return;
    }
    if (error || serverErr || !token) {
      toast.error(serverErr || "Could not create the verification link. Please try again.");
      return;
    }
    const link = buildVerificationLink(window.location.origin, token);
    const waUrl = `https://wa.me/91${entered}?text=${encodeURIComponent(verificationWhatsAppMessage(link))}`;
    window.open(waUrl, "_blank");
    setSentLink({ mobile: entered, waUrl });
    toast.success("Verification link created — WhatsApp opened");
  };

  if (isVerified === null) return null;

  return (
    <>
      <Card className="border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isVerified ? "bg-sky-500/10" : "bg-muted"}`}>
            {isVerified ? <BadgeCheck className="h-5 w-5 text-sky-500" /> : <ShieldCheck className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm flex items-center gap-1.5">
              {isVerified ? "Verified Account" : "Account not verified"}
              {isVerified && <BadgeCheck className="h-4 w-4 text-sky-500" />}
            </p>
            <p className="text-xs text-muted-foreground">
              {isVerified
                ? "Your mobile number is verified on WhatsApp."
                : "Verify your mobile number on WhatsApp to get the blue tick."}
            </p>
          </div>
          {(canSend || !isVerified) && (
            <div className="flex shrink-0 gap-2">
              {!isVerified && (
                <Button size="sm" onClick={openSelfVerify}>
                  Verify
                </Button>
              )}
              {canSend && (
                <Button size="sm" variant="outline" onClick={openLinkDialog} className="gap-1.5">
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Verify a customer</span>
                  <span className="sm:hidden">Link</span>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Self verification with a 6-digit code */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{step === "mobile" ? "Verify your mobile number" : "Enter verification code"}</DialogTitle>
            <DialogDescription>
              {step === "mobile"
                ? "Enter the mobile number you used to sign up. We'll send a code to that number on WhatsApp."
                : "Open WhatsApp, send the pre-filled message to yourself, then type the 6-digit code below."}
            </DialogDescription>
          </DialogHeader>

          {step === "mobile" ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="verify-mobile">Mobile Number</Label>
                <Input
                  id="verify-mobile"
                  inputMode="numeric"
                  placeholder="10-digit number"
                  value={mobile}
                  onChange={(e) => { setMobile(digitsOnly(e.target.value).slice(0, 10)); setMismatch(false); }}
                />
              </div>
              {mismatch && (
                <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">
                    This number does not match your registered mobile number. Please enter the number you used to sign up.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="verify-code">6-digit code</Label>
              <Input
                id="verify-code"
                inputMode="numeric"
                placeholder="000000"
                className="tracking-[0.5em] text-center text-lg"
                value={code}
                onChange={(e) => setCode(digitsOnly(e.target.value).slice(0, 6))}
              />
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setStep("mobile")}>
                Didn't get it? Resend code
              </Button>
            </div>
          )}

          <DialogFooter>
            {step === "mobile" ? (
              <Button onClick={handleSendCode} disabled={busy} className="gap-2 w-full">
                <MessageCircle className="h-4 w-4" />
                {busy ? "Please wait..." : "Send code on WhatsApp"}
              </Button>
            ) : (
              <Button onClick={handleVerify} disabled={busy} className="w-full">
                {busy ? "Verifying..." : "Verify"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-tap verification link for a customer (authorized roles only) */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{sentLink ? "Link sent" : "Verify a customer"}</DialogTitle>
            <DialogDescription>
              {sentLink
                ? `WhatsApp opened for ${sentLink.mobile}. The account is verified automatically as soon as the customer taps the link (valid for 24 hours).`
                : "Create a one-tap verification link for a customer's account and send it to their WhatsApp. The account verifies as soon as the customer taps the link."}
            </DialogDescription>
          </DialogHeader>

          {!sentLink ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="verify-link-mobile">Customer's mobile number</Label>
                <Input
                  id="verify-link-mobile"
                  inputMode="numeric"
                  placeholder="10-digit number"
                  value={linkMobile}
                  onChange={(e) => setLinkMobile(digitsOnly(e.target.value).slice(0, 10))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The link works only for the account registered with this number and expires after 24 hours.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => window.open(sentLink.waUrl, "_blank")}
              >
                <MessageCircle className="h-4 w-4" />
                Open WhatsApp again
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={openLinkDialog}>
                Create another link
              </Button>
            </div>
          )}

          <DialogFooter>
            {!sentLink && (
              <Button onClick={handleCreateLink} disabled={linkBusy} className="gap-2 w-full">
                <Link2 className="h-4 w-4" />
                {linkBusy ? "Creating link..." : "Create link & open WhatsApp"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VerifyAccountCard;
