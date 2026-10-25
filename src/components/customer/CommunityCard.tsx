import { useCallback, useEffect, useState } from "react";
import { Users, UserPlus, Lock, Crown, Trash2, LogOut, Check, X, Loader2, ChevronDown, AlarmClock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { communityInviteLink, communityInviteWhatsAppMessage, whatsappShareUrl } from "@/lib/appLinks";

interface Props {
  userId: string;
}

interface CommunitySummary {
  community_id: string;
  name: string;
  creator_name: string;
  member_count: number;
  is_creator: boolean;
  created_at: string;
}

interface MemberRow {
  user_id: string;
  full_name: string | null;
  mobile_number: string | null;
  joined_at: string;
  is_creator: boolean;
  last_order_at: string | null;
  days_until_removal: number | null;
}

interface InviteRow {
  invite_id: string;
  invited_mobile: string;
  created_at: string;
}

interface IncomingInvite {
  invite_id: string;
  community_id: string;
  community_name: string;
  creator_name: string;
  created_at: string;
}

const rpc = (fn: string, args?: Record<string, unknown>) =>
  (supabase.rpc as unknown as (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);

const digitsOnly = (v: string) => v.replace(/\D/g, "");

const CommunityCard = ({ userId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [community, setCommunity] = useState<CommunitySummary | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [pending, setPending] = useState<InviteRow[]>([]);
  const [incoming, setIncoming] = useState<IncomingInvite[]>([]);
  const [newName, setNewName] = useState("");
  const [inviteMobile, setInviteMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    await rpc("prune_inactive_community_members");
    const { data: prof } = await supabase
      .from("profiles")
      .select("is_verified")
      .eq("user_id", userId)
      .maybeSingle();
    const verified = Boolean((prof as { is_verified?: boolean } | null)?.is_verified);
    setIsVerified(verified);

    const { data: summary } = await rpc("get_my_community");
    const row = (summary as CommunitySummary[] | null)?.[0] ?? null;
    setCommunity(row);

    if (row?.is_creator) {
      const [{ data: mem }, { data: inv }] = await Promise.all([
        rpc("get_community_members"),
        rpc("get_community_pending_invites"),
      ]);
      setMembers((mem as MemberRow[] | null) ?? []);
      setPending((inv as InviteRow[] | null) ?? []);
    } else {
      setMembers([]);
      setPending([]);
    }

    if (!row) {
      const { data: inc } = await rpc("get_my_community_invites");
      setIncoming((inc as IncomingInvite[] | null) ?? []);
    } else {
      setIncoming([]);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Enter a community name");
      return;
    }
    setBusy(true);
    const { error } = await rpc("create_community", { _name: newName.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    setNewName("");
    toast.success("Community created!");
    load();
  };

  const shareInvite = (inviteId: string) => {
    const link = communityInviteLink(window.location.origin, inviteId);
    const message = communityInviteWhatsAppMessage(community?.name ?? "our", link);
    window.open(whatsappShareUrl(message), "_blank", "noopener,noreferrer");
  };

  const handleInvite = async () => {
    const m = digitsOnly(inviteMobile);
    if (m.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }
    setBusy(true);
    const { data, error } = await rpc("invite_to_community", { _mobile: m });
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    setInviteMobile("");
    const inviteId = typeof data === "string" ? data : null;
    toast.success(
      "Invite sent",
      inviteId
        ? { action: { label: "Share via WhatsApp", onClick: () => shareInvite(inviteId) } }
        : undefined,
    );
    load();
  };

  const handleRespond = async (inviteId: string, accept: boolean) => {
    setBusy(true);
    const { error } = await rpc("respond_to_community_invite", { _invite_id: inviteId, _accept: accept });
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    toast.success(accept ? "You joined the community" : "Invite declined");
    load();
  };

  const handleRemove = async (memberUserId: string) => {
    setBusy(true);
    const { error } = await rpc("remove_community_member", { _user_id: memberUserId });
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    toast.success(memberUserId === userId ? "You left the community" : "Member removed");
    load();
  };

  const handleDeleteCommunity = async () => {
    const others = members.filter((m) => !m.is_creator).length;
    if (others > 0) {
      toast.error("Remove all members before deleting the community");
      return;
    }
    if (!window.confirm("Delete your community? This cannot be undone.")) return;
    setBusy(true);
    const { error } = await rpc("delete_my_community");
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    toast.success("Community deleted");
    load();
  };

  const handleCancelInvite = async (inviteId: string) => {
    setBusy(true);
    const { error } = await rpc("cancel_community_invite", { _invite_id: inviteId });
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*?:\s*/, ""));
      return;
    }
    load();
  };

  if (loading) {
    return (
      <Card className="border-neonblue/30">
        <div className="p-6 flex items-center justify-center text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading community...
        </div>
      </Card>
    );
  }

  const atRiskCount = community?.is_creator
    ? members.filter((m) => !m.is_creator && m.days_until_removal !== null && m.days_until_removal <= 7).length
    : 0;

  const headerSubtitle = community
    ? community.is_creator
      ? `${community.name} · ${community.member_count} member${community.member_count === 1 ? "" : "s"}${atRiskCount > 0 ? ` · ${atRiskCount} close to removal` : ""}`
      : `${community.name} · Member`
    : isVerified
      ? incoming.length > 0
        ? `${incoming.length} invitation${incoming.length === 1 ? "" : "s"} for you`
        : "Create or join a community"
      : "Verify to unlock";

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-xl border border-neonblue/30 overflow-hidden bg-gradient-to-br from-neonblue/15 via-card to-neonblue-bright/10 shadow-sm"
    >
      {/* Gradient header — clickable trigger */}
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full text-left bg-gradient-to-r from-neonblue via-neonblue to-neonblue-bright text-white px-4 py-3 flex items-center gap-3 hover:opacity-95 transition-opacity"
        >
          <span className="h-9 w-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-heading text-base font-bold leading-tight">My Community</span>
            <span className="block text-xs opacity-90 truncate">{headerSubtitle}</span>
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="p-4 space-y-4">
          {/* No community yet */}
          {!community && !isVerified && (
            <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
              <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Verify your account first</p>
                <p className="text-xs text-muted-foreground">
                  Only verified accounts can create or join a community. Use the verification card above to get your blue tick.
                </p>
              </div>
            </div>
          )}

          {!community && isVerified && (
            <>
              <div className="space-y-2">
                <Label htmlFor="community-name">Create your community</Label>
                <div className="flex gap-2">
                  <Input
                    id="community-name"
                    placeholder="Community name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={60}
                  />
                  <Button onClick={handleCreate} disabled={busy}>Create</Button>
                </div>
                <p className="text-xs text-muted-foreground">You can belong to only one community.</p>
              </div>

              {incoming.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Invitations for you</p>
                  {incoming.map((inv) => (
                    <div key={inv.invite_id} className="flex items-center gap-2 rounded-lg border p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inv.community_name}</p>
                        <p className="text-xs text-muted-foreground truncate">Invited by {inv.creator_name}</p>
                      </div>
                      <Button size="sm" disabled={busy} onClick={() => handleRespond(inv.invite_id, true)} className="gap-1">
                        <Check className="h-3.5 w-3.5" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => handleRespond(inv.invite_id, false)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* In a community */}
          {community && (
            <>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{community.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Created by {community.is_creator ? "you" : community.creator_name}
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1 shrink-0">
                    {community.is_creator && <Crown className="h-3 w-3" />}
                    {community.is_creator ? "Creator" : "Member"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {community.member_count} member{community.member_count === 1 ? "" : "s"}
                </p>
              </div>

              {community.is_creator ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="invite-mobile">Invite a member by mobile number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="invite-mobile"
                        inputMode="numeric"
                        placeholder="10-digit number"
                        value={inviteMobile}
                        onChange={(e) => setInviteMobile(digitsOnly(e.target.value).slice(0, 10))}
                      />
                      <Button onClick={handleInvite} disabled={busy} className="gap-1">
                        <UserPlus className="h-4 w-4" /> Invite
                      </Button>
                    </div>
                  </div>

                  {pending.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Pending invites</p>
                      {pending.map((inv) => (
                        <div key={inv.invite_id} className="flex items-center gap-2 rounded-lg border p-2.5">
                          <p className="text-sm flex-1">{inv.invited_mobile}</p>
                          <Badge variant="outline" className="text-xs">Pending</Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={busy}
                            aria-label={`Share invite to ${inv.invited_mobile} on WhatsApp`}
                            onClick={() => shareInvite(inv.invite_id)}
                          >
                            <Share2 className="h-4 w-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" disabled={busy} onClick={() => handleCancelInvite(inv.invite_id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(() => {
                    const atRisk = members.filter((m) => !m.is_creator && m.days_until_removal !== null && m.days_until_removal <= 7);
                    if (atRisk.length === 0) return null;
                    return (
                      <div className="flex gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                        <AlarmClock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-semibold text-amber-700">
                            {atRisk.length} member{atRisk.length === 1 ? "" : "s"} close to auto-removal
                          </p>
                          <p className="text-muted-foreground">
                            {atRisk.map((m) => `${m.full_name || "Member"} (${m.days_until_removal} day${m.days_until_removal === 1 ? "" : "s"} left)`).join(", ")} — removed after 30 days without an order.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Members ({members.length})</p>
                    {members.map((m) => (
                      <div key={m.user_id} className="flex items-center gap-2 rounded-lg border p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate flex items-center gap-1">
                            {m.full_name || "Member"}
                            {m.is_creator && <Crown className="h-3 w-3 text-primary" />}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {m.mobile_number || "—"} · joined {new Date(m.joined_at).toLocaleDateString()}
                          </p>
                          {!m.is_creator && m.days_until_removal !== null && (
                            <p className={`text-xs mt-0.5 ${m.days_until_removal <= 7 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                              {m.days_until_removal === 0
                                ? "Will be removed today (no order in 30 days)"
                                : `${m.days_until_removal} day${m.days_until_removal === 1 ? "" : "s"} left before auto-removal`}
                            </p>
                          )}
                        </div>
                        {!m.is_creator && (
                          <Button size="icon" variant="ghost" disabled={busy} onClick={() => handleRemove(m.user_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Members with no order in the last 30 days are removed automatically.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1"
                      disabled={busy || members.filter((m) => !m.is_creator).length > 0}
                      onClick={handleDeleteCommunity}
                    >
                      <Trash2 className="h-4 w-4" /> Delete community
                    </Button>
                    {members.filter((m) => !m.is_creator).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Remove all members first to enable deletion.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Only the community creator can view member details.
                  </p>
                  <Button variant="outline" size="sm" className="gap-1" disabled={busy} onClick={() => handleRemove(userId)}>
                    <LogOut className="h-4 w-4" /> Leave community
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default CommunityCard;
