import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Loader2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isNativeApp } from "@/lib/native";
import { resolveLinkDevice } from "@/lib/appLinks";
import AppStoreRedirect from "@/components/AppStoreRedirect";
import { toast } from "sonner";

interface PendingInvite {
  invite_id: string;
  community_id: string;
  community_name: string;
  creator_name: string;
  created_at: string;
}

const rpc = (fn: string, args?: Record<string, unknown>) =>
  (supabase.rpc as unknown as (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);

/** Landing page for community invites shared through WhatsApp. */
const CommunityInvite = () => {
  const { inviteId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [proceed, setProceed] = useState(resolveLinkDevice(isNativeApp(), navigator.userAgent) !== "mobile_browser");
  const [invites, setInvites] = useState<PendingInvite[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!proceed || !user || !inviteId) return;
    let alive = true;
    rpc("get_my_community_invites").then(({ data, error }) => {
      if (!alive) return;
      if (error) setLoadError(error.message.replace(/^.*?:\s*/, ""));
      setInvites((data as PendingInvite[] | null) ?? []);
    });
    return () => { alive = false; };
  }, [proceed, user, inviteId]);

  const invite = invites?.find((i) => i.invite_id === inviteId) ?? null;

  const respond = async (accept: boolean) => {
    setBusy(true);
    const { error } = await rpc("respond_to_community_invite", { _invite_id: inviteId, _accept: accept });
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    toast.success(accept ? "You joined the community" : "Invite declined");
    navigate("/customer/profile?tab=profile");
  };

  if (!proceed) return <AppStoreRedirect onContinue={() => setProceed(true)} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-primary/20">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-lg">Community invitation</p>
            {!user ? (
              <p className="text-sm text-muted-foreground">
                Sign in with the invited mobile number to accept this community invite.
              </p>
            ) : invites === null ? (
              <p className="text-sm text-muted-foreground">Checking the invitation…</p>
            ) : loadError ? (
              <p className="text-sm text-destructive">{loadError}</p>
            ) : invite ? (
              <p className="text-sm text-muted-foreground">
                You're invited to join <strong>{invite.community_name}</strong> by {invite.creator_name}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                This invite isn't waiting for your number. It may already be used, or it was sent to a
                different mobile number. Sign in with the invited number and check My Community.
              </p>
            )}
          </div>
          {!user ? (
            <Button className="w-full" onClick={() => navigate(`/customer/login?next=/community/invite/${inviteId}`)}>
              Sign in to continue
            </Button>
          ) : invite ? (
            <div className="flex gap-2">
              <Button className="flex-1 gap-1" disabled={busy} onClick={() => void respond(true)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept
              </Button>
              <Button variant="outline" className="flex-1 gap-1" disabled={busy} onClick={() => void respond(false)}>
                <X className="h-4 w-4" /> Decline
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => navigate("/customer/profile?tab=profile")}>
              Go to My Community
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunityInvite;
