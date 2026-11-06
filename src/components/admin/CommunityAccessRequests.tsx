import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { isCommunityRole, canReviewCommunityRequest } from "@/lib/communityAccess";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search } from "lucide-react";
import { buildCommunityAccessRequestsCsv } from "@/lib/communityAccessRequestExport";
import { toast } from "sonner";

interface RequestRow { id: string; user_id: string; community_name: string; reason: string | null; status: string; admin_notes: string | null; created_at: string }
interface Applicant { full_name: string | null; mobile_number: string | null; local_body_id: string | null; ward_number: number | null }
interface Place { name: string; district: string | null }

/** "Panchayath: Kodur (Malappuram) · Ward 7" or a note that the profile has no area yet. */
const areaLine = (applicant: Applicant | undefined, places: Record<string, Place>) => {
  if (!applicant) return "";
  const body = applicant.local_body_id ? places[applicant.local_body_id] : undefined;
  const parts = [
    body ? `${body.name}${body.district ? ` (${body.district})` : ""}` : null,
    applicant.ward_number ? `Ward ${applicant.ward_number}` : null,
  ].filter(Boolean) as string[];
  return parts.length ? `Panchayath: ${parts.join(" · ")}` : "Panchayath/ward not set on profile";
};

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
  const [places, setPlaces] = useState<Record<string, Place>>({});
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");

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
      const { data } = await supabase.from("profiles").select("user_id,full_name,mobile_number,local_body_id,ward_number").in("user_id", ids);
      setPeople(Object.fromEntries((data || []).map(p => [p.user_id, p])));
      const bodyIds = [...new Set((data || []).map(p => p.local_body_id).filter(Boolean))] as string[];
      if (bodyIds.length) {
        const { data: bodies } = await supabase.from("locations_local_bodies")
          .select("id, name, locations_districts(name)").in("id", bodyIds);
        setPlaces(Object.fromEntries((bodies || []).map(b => [b.id, {
          name: b.name, district: (b as { locations_districts?: { name: string } | null }).locations_districts?.name ?? null,
        }])));
      }
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
    const query = search.trim().toLocaleLowerCase();
    return [...matched].filter(request => {
      if (!query) return true;
      const applicant = people[request.user_id];
      const searchable = [
        request.community_name, request.reason, request.admin_notes,
        applicant?.full_name, applicant?.mobile_number,
        areaLine(applicant, places),
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      return searchable.includes(query);
    }).sort((a, b) => {
      const aPending = a.status === "pending" ? 0 : 1;
      const bPending = b.status === "pending" ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [requests, filter, search, people, places]);

  const exportVisible = () => {
    const rows = visible.map(request => ({
      applicant: people[request.user_id]?.full_name || "Customer",
      mobile: people[request.user_id]?.mobile_number || "",
      community: request.community_name || "",
      area: areaLine(people[request.user_id], places),
      reason: request.reason || "",
      status: request.status,
      submittedAt: request.created_at,
      adminNotes: request.admin_notes || "",
    }));
    const blob = new Blob([buildCommunityAccessRequestsCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "community-access-requests.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

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
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Community access requests</h2><div className="flex gap-2"><Button variant="outline" size="sm" onClick={exportVisible} disabled={loading || failed || visible.length === 0}><Download className="mr-2 h-4 w-4" />Export CSV</Button><Button variant="outline" size="sm" onClick={load} disabled={loading}>Refresh</Button></div></div>
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
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Search access requests" placeholder="Search applicant, community, area…" className="pl-9" value={search} onChange={event => setSearch(event.target.value)} />
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading requests…</p>
        : failed ? <p className="text-sm text-destructive">Could not load requests. Please retry.</p>
        : <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Applicant</TableHead><TableHead>Community</TableHead><TableHead>Panchayath / ward</TableHead><TableHead>Reason</TableHead><TableHead>Submitted</TableHead><TableHead>Status</TableHead><TableHead className="min-w-[300px]">Review</TableHead></TableRow></TableHeader>
            <TableBody>
              {!visible.length ? <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No matching access requests.</TableCell></TableRow> : visible.map(request => {
                const applicant = people[request.user_id];
                return <TableRow key={request.id}>
                  <TableCell className="min-w-[170px]"><div className="font-medium">{applicant?.full_name || "Customer"}</div><div className="text-sm text-muted-foreground">{applicant?.mobile_number || "—"}</div></TableCell>
                  <TableCell className="min-w-[140px]">{request.community_name || "—"}</TableCell>
                  <TableCell className="min-w-[180px] text-sm">{areaLine(applicant, places) || "—"}</TableCell>
                  <TableCell className="max-w-[240px] whitespace-normal text-sm">{request.reason || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{new Date(request.created_at).toLocaleDateString()}</TableCell>
                  <TableCell><div className="space-y-1"><Badge variant={request.status === "pending" ? "secondary" : "outline"}>{request.status}</Badge>{request.admin_notes && <p className="max-w-[180px] whitespace-normal text-xs text-muted-foreground">{request.admin_notes}</p>}</div></TableCell>
                  <TableCell>
                    {canReviewCommunityRequest(isSuperAdmin, request.status) ? <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1"><Label htmlFor={`role-${request.id}`} className="text-xs">Assign role</Label><Select value={choices[request.id] || ""} onValueChange={v => setChoices(prev => ({ ...prev, [request.id]: v }))}><SelectTrigger id={`role-${request.id}`}><SelectValue placeholder="Choose role" /></SelectTrigger><SelectContent>{roles.map(role => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-1"><Label htmlFor={`notes-${request.id}`} className="text-xs">Review notes</Label><Input id={`notes-${request.id}`} value={notes[request.id] || ""} onChange={e => setNotes(prev => ({ ...prev, [request.id]: e.target.value }))} /></div>
                      </div>
                      <div className="flex gap-2"><Button size="sm" disabled={busy !== null} onClick={() => review(request, true)}>Accept & activate</Button><Button size="sm" disabled={busy !== null} variant="outline" onClick={() => review(request, false)}>Reject</Button></div>
                    </div> : !isSuperAdmin && request.status === "pending" ? <span className="text-xs text-muted-foreground">Super administrator review required</span> : "—"}
                  </TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </div>}
    </section>
  );
}
