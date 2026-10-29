import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { isCommunityRole, canReviewCommunityRequest } from "@/lib/communityAccess";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface RequestRow { id: string; user_id: string; community_name: string; reason: string | null; status: string; admin_notes: string | null; created_at: string }
interface Applicant { full_name: string | null; mobile_number: string | null }

type StatusFilter = "pending" | "approved" | "declined" | "all";
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "All" },
];

export default function CommunityAccessRequests() {
  const { isSuperAdmin } = usePermissions();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [people, setPeople] = useState<Record<string, Applicant>>({});
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("pending");

  const load = useCallback(async () => {
    setLoading(true);
    const [result, roleResult] = await Promise.all([
      supabase.from("community_access_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("roles").select("id,name"),
    ]);
    if (result.error || roleResult.error) {
      toast.error(result.error?.message || roleResult.error?.message || "Could not load access requests");
      setFailed(true); setLoading(false); return;
    }
    setFailed(false);
    setRequests(result.data || []);
    setRoles((roleResult.data || []).filter(r => isCommunityRole(r.name)));
    const ids = [...new Set((result.data || []).map(r => r.user_id))];
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("user_id,full_name,mobile_number").in("user_id", ids);
      setPeople(Object.fromEntries((data || []).map(p => [p.user_id, p])));
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const pending = requests.filter(r => r.status === "pending").length;
    const approved = requests.filter(r => r.status === "approved").length;
    const declined = requests.filter(r => r.status === "declined").length;
    return { pending, approved, declined, all: requests.length };
  }, [requests]);

  /** Pending requests first, newest within each group. */
  const visible = useMemo(() => {
    const matched = filter === "all" ? requests : requests.filter(r => r.status === filter);
    return [...matched].sort((a, b) => {
      const aPending = a.status === "pending" ? 0 : 1;
      const bPending = b.status === "pending" ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [requests, filter]);

  const review = async (request: RequestRow, approve: boolean) => {
    if (!canReviewCommunityRequest(isSuperAdmin, request.status)) return;
    const roleId = choices[request.id];
    if (approve && !roleId) { toast.error("Choose Coordinator, Group Leader, or Pro"); return; }
    setBusy(request.id);
    const { error } = await supabase.rpc("review_community_access", { _request_id: request.id, _approve: approve, _role_id: approve ? roleId : undefined, _notes: notes[request.id] || undefined });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Role assigned and community access activated" : "Request declined");
    await load();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-semibold">Community access requests</h2><Button variant="outline" size="sm" onClick={load} disabled={loading}>Refresh</Button></div>
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(({ value, label }) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {label} ({counts[value]})
          </Button>
        ))}
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading requests…</p>
        : failed ? <p className="text-sm text-destructive">Could not load requests. Please retry.</p>
        : !visible.length ? <p className="text-sm text-muted-foreground">No {filter === "all" ? "" : filter + " "}access requests.</p> : visible.map(request => (
        <article key={request.id} className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap justify-between gap-2"><div className="min-w-0"><h3 className="font-semibold break-words">{request.community_name}</h3><p className="text-sm text-muted-foreground">{people[request.user_id]?.full_name || "Customer"} · {people[request.user_id]?.mobile_number || "—"}</p></div><Badge variant={request.status === "pending" ? "secondary" : "outline"}>{request.status}</Badge></div>
          {request.reason && <p className="text-sm break-words">{request.reason}</p>}
          {request.admin_notes && <p className="text-sm text-muted-foreground">{request.admin_notes}</p>}
          {canReviewCommunityRequest(isSuperAdmin, request.status) && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor={`role-${request.id}`}>Assign role</Label><Select value={choices[request.id] || ""} onValueChange={v => setChoices(prev => ({ ...prev, [request.id]: v }))}><SelectTrigger id={`role-${request.id}`}><SelectValue placeholder="Choose role" /></SelectTrigger><SelectContent>{roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label htmlFor={`notes-${request.id}`}>Review notes (optional)</Label><Input id={`notes-${request.id}`} value={notes[request.id] || ""} onChange={e => setNotes(prev => ({ ...prev, [request.id]: e.target.value }))} /></div>
              </div>
              <div className="flex flex-wrap gap-2"><Button disabled={busy !== null} onClick={() => review(request, true)}>Accept & activate</Button><Button disabled={busy !== null} variant="outline" onClick={() => review(request, false)}>Reject</Button></div>
            </div>
          )}
          {!isSuperAdmin && request.status === "pending" && <p className="text-xs text-muted-foreground">A super administrator must assign the role and activate access.</p>}
        </article>
      ))}
    </section>
  );
}
