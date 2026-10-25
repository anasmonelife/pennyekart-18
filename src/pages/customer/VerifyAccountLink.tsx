import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, ShieldCheck, Clock, Link2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "@/lib/native";
import { resolveLinkDevice } from "@/lib/appLinks";
import AppStoreRedirect from "@/components/AppStoreRedirect";

type LinkState = "loading" | "ok" | "already" | "expired" | "mobile_changed" | "invalid" | "error";

const content: Record<Exclude<LinkState, "loading">, { icon: typeof BadgeCheck; iconClass: string; title: string; body: string }> = {
  ok: {
    icon: BadgeCheck,
    iconClass: "text-sky-500",
    title: "Account verified!",
    body: "Your mobile number is now verified. You can close this page and continue in the Pennyekart app.",
  },
  already: {
    icon: BadgeCheck,
    iconClass: "text-sky-500",
    title: "Already verified",
    body: "This account was already verified. Nothing more to do here.",
  },
  expired: {
    icon: Clock,
    iconClass: "text-amber-500",
    title: "Link expired",
    body: "This verification link is older than 24 hours. Please ask the person who sent it for a new link.",
  },
  mobile_changed: {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    title: "Number no longer matches",
    body: "This link was created for a different mobile number, so it can no longer be used. Please request a new link.",
  },
  invalid: {
    icon: Link2,
    iconClass: "text-muted-foreground",
    title: "Invalid link",
    body: "This verification link is not valid. Please ask the person who sent it for a new link.",
  },
  error: {
    icon: ShieldCheck,
    iconClass: "text-muted-foreground",
    title: "Something went wrong",
    body: "We could not verify your account right now. Please try opening the link again.",
  },
};

const VerifyAccountLink = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [proceed, setProceed] = useState(
    resolveLinkDevice(isNativeApp(), navigator.userAgent) !== "mobile_browser",
  );
  const [state, setState] = useState<LinkState>(token ? "loading" : "invalid");
  const started = useRef(false);

  useEffect(() => {
    if (!proceed || !token || started.current) return;
    started.current = true;
    supabase.functions
      .invoke("redeem-verification-link", { body: { token } })
      .then(({ data }) => {
        const status = (data as { status?: string } | null)?.status;
        const err = (data as { error?: string } | null)?.error;
        if (status === "ok") setState("ok");
        else if (status === "already_verified") setState("already");
        else if (err === "expired") setState("expired");
        else if (err === "mobile_changed") setState("mobile_changed");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [proceed, token]);

  if (!proceed) return <AppStoreRedirect onContinue={() => setProceed(true)} />;

  const view = content[state === "loading" ? "error" : state] ?? content.error;
  const Icon = view.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-primary/20">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            {state === "loading" ? (
              <Link2 className="h-7 w-7 text-muted-foreground animate-pulse" />
            ) : (
              <Icon className={`h-7 w-7 ${view.iconClass}`} />
            )}
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-lg">
              {state === "loading" ? "Verifying your account..." : view.title}
            </p>
            {state !== "loading" && <p className="text-sm text-muted-foreground">{view.body}</p>}
          </div>
          {state !== "loading" && (
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
              Go to Pennyekart
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyAccountLink;
