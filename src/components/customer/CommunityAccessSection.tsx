import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CommunityCard from "./CommunityCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AccessRequest { status: string; admin_notes: string | null; community_name: string }

export default function CommunityAccessSection({ userId }: { userId: string }) {
  const [access, setAccess] = useState<boolean | null>(null);
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    const [permission, result] = await Promise.all([
      supabase.rpc("can_use_community"),
      supabase.from("community_access_requests").select("status,admin_notes,community_name").eq("user_id", userId).maybeSingle(),
    ]);
    if (permission.error || result.error) { setError(true); return; }
    setError(false);
    setAccess(permission.data === true);
    setRequest(result.data);
  }, [userId]);
  useEffect(() => {
    setAccess(null);
    setRequest(null);
    void load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);

  const submit = async () => {
    if (!name.trim()) { toast.error("Enter a community name"); return; }
    setBusy(true);
    const { error: submitError } = await supabase.rpc("request_community_access", { _community_name: name.trim(), _reason: reason.trim() || undefined });
    setBusy(false);
    if (submitError) { toast.error(submitError.message); return; }
    toast.success("Community access request sent");
    await load();
  };

  if (error) return <div className="space-y-2"><p className="text-sm text-destructive">Could not load community access.</p><Button variant="outline" onClick={load}>Retry</Button></div>;
  if (access === null) return <p className="text-sm text-muted-foreground">Loading community access…</p>;
  if (access) return <CommunityCard userId={userId} />;
  return (
    <section className="space-y-3 border-t pt-4">
      <h2 className="font-semibold">Request community access</h2>
      {request?.status === "pending" ? (
        <p className="text-sm text-muted-foreground">Your request for {request.community_name} is awaiting administrator review.</p>
      ) : (
        <>
          {request?.status === "rejected" && <p className="text-sm text-muted-foreground">Request declined{request.admin_notes ? `: ${request.admin_notes}` : "."}</p>}
          <div className="space-y-1.5"><Label htmlFor="access-community-name">Community name</Label><Input id="access-community-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} /></div>
          <div className="space-y-1.5"><Label htmlFor="community-access-reason">Reason (optional)</Label><Textarea id="community-access-reason" value={reason} onChange={e => setReason(e.target.value)} /></div>
          <Button onClick={submit} disabled={busy}>{busy ? "Sending…" : "Request access"}</Button>
        </>
      )}
    </section>
  );
}