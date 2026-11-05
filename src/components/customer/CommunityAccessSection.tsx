import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CommunityCard from "./CommunityCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AccessRequest { status: string; admin_notes: string | null }

export default function CommunityAccessSection({ userId }: { userId: string }) {
  const [access, setAccess] = useState<boolean | null>(null);
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    const [permission, result] = await Promise.all([
      supabase.rpc("can_use_community"),
      supabase.from("community_access_requests").select("status,admin_notes").eq("user_id", userId).maybeSingle(),
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
    setBusy(true);
    const { error: submitError } = await supabase.rpc("request_community_access");
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
        <p className="text-sm text-muted-foreground">Your request is awaiting administrator review.</p>
      ) : (
        <>
          {request?.status === "rejected" && <p className="text-sm text-muted-foreground">Request declined{request.admin_notes ? `: ${request.admin_notes}` : "."}</p>}
          <p className="text-sm text-muted-foreground">An administrator checks your account and assigns your community role. Once approved, you can create your community.</p>
          <Button onClick={submit} disabled={busy}>{busy ? "Sending…" : "Request access"}</Button>
        </>
      )}
    </section>
  );
}
