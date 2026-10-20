import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, MapPin, Download, ChevronRight, ChevronDown, ShieldCheck } from "lucide-react";
import { commissionRateForRole, type CommissionRule } from "@/lib/communityCommission";
import { groupAllocationsByRole, normalizeRoleName, roleLabel, type AllocationPerson } from "@/lib/elifeAllocation";

interface Props {
  roles: { id: string; name: string }[];
  rules: Record<string, CommissionRule>;
  fallbackRate: number;
}

export default function CommissionAllocationTab({ roles, rules, fallbackRate }: Props) {
  const [people, setPeople] = useState<AllocationPerson[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [openRole, setOpenRole] = useState<string | null>(null);
  const [openPerson, setOpenPerson] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("elife-role-allocations");
    let message = data?.error as string | undefined;
    if (fnError && !message) {
      try { message = (await (fnError as { context?: Response }).context?.json())?.error; } catch { /* ignore */ }
      message = message || "Could not reach e-Life";
    }
    if (message) {
      setError(message);
      setPeople([]);
    } else {
      setPeople((data?.people ?? []) as AllocationPerson[]);
      setBlocked((data?.blocked_tables ?? []) as string[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pennyRoleId = useCallback(
    (role: string) => roles.find((r) => normalizeRoleName(r.name) === normalizeRoleName(role))?.id ?? null,
    [roles],
  );

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = people.filter((p) =>
      !q ||
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.mobile ?? "").includes(q) ||
      p.panchayaths.some((x) => x.name.toLowerCase().includes(q) || (x.district ?? "").toLowerCase().includes(q)),
    );
    return groupAllocationsByRole(filtered);
  }, [people, search]);

  const allGroups = useMemo(() => groupAllocationsByRole(people), [people]);
  const visible = roleFilter === "all" ? groups : groups.filter((g) => g.role === roleFilter);
  const openGroup = visible.find((g) => g.role === openRole) ?? null;

  const exportCsv = () => {
    const header = ["Role", "Name", "Mobile", "Panchayaths", "Wards", "Districts", "Commission %"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = visible.flatMap((g) => g.people.map((p) => [
      roleLabel(g.role),
      p.name ?? "",
      p.mobile ?? "",
      p.panchayaths.map((x) => x.name).join("; "),
      (p.wards ?? []).join("; "),
      [...new Set(p.panchayaths.map((x) => x.district).filter(Boolean))].join("; "),
      String(commissionRateForRole(pennyRoleId(g.role), rules, fallbackRate)),
    ].map(esc).join(",")));
    const url = URL.createObjectURL(new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "commission-allocation.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base">Commission allocation</CardTitle>
            <p className="text-sm text-muted-foreground">e-Life roles from Super Admin to Coordinator and the panchayaths allocated to each person.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={loading || !visible.length}>
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />} Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <Input placeholder="Search name, mobile, panchayath or district" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger aria-label="Filter by role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {allGroups.map((g) => <SelectItem key={g.role} value={g.role}>{roleLabel(g.role)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!loading && !error && allGroups.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allGroups.map((g) => (
                <Badge key={g.role} variant="secondary">{roleLabel(g.role)} · {g.people.length}</Badge>
              ))}
            </div>
          )}
          {blocked.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Some e-Life tables are not in the allowed list on the e-Life Bridge settings: {blocked.join(", ")}. Allow them to see full allocations.
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading e-Life allocations...
        </div>
      ) : error ? (
        <Card><CardContent className="space-y-2 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={load}>Try again</Button>
        </CardContent></Card>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No e-Life people found for these filters.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((g) => {
            const rate = commissionRateForRole(pennyRoleId(g.role), rules, fallbackRate);
            const allocated = new Set(g.people.flatMap((p) => p.panchayaths.map((x) => x.id))).size;
            return (
              <button
                key={g.role}
                type="button"
                onClick={() => setOpenRole(g.role)}
                className="group rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <h3 className="font-semibold">{roleLabel(g.role)}</h3>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{g.people.length}</p>
                    <p className="text-[11px] text-muted-foreground">People</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{allocated}</p>
                    <p className="text-[11px] text-muted-foreground">Panchayaths</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{rate}%</p>
                    <p className="text-[11px] text-muted-foreground">Commission</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!openGroup} onOpenChange={(o) => !o && setOpenRole(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{openGroup ? `${roleLabel(openGroup.role)} (${openGroup.people.length})` : ""}</DialogTitle>
            {openGroup && (
              <DialogDescription>
                Commission {commissionRateForRole(pennyRoleId(openGroup.role), rules, fallbackRate)}% of profit · tap a person to see their panchayaths
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-2">
            {openGroup?.people.map((p) => {
              const expanded = openPerson === p.id;
              return (
                <div key={p.id} className="rounded-lg border bg-card">
                  <button
                    type="button"
                    onClick={() => setOpenPerson(expanded ? null : p.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{p.mobile || "—"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!p.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                      <Badge variant="secondary" className="gap-1 font-normal">
                        <MapPin className="h-3 w-3" /> {p.panchayaths.length}
                      </Badge>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t p-3">
                      {p.panchayaths.length ? (
                        <div className="flex flex-wrap gap-1">
                          {p.panchayaths.map((x) => (
                            <Badge key={x.id} variant="secondary" className="gap-1 font-normal">
                              <MapPin className="h-3 w-3" />
                              {x.name}{x.district ? ` · ${x.district}` : ""}
                            </Badge>
                          ))}
                          {p.wards && p.wards.length > 0 && (
                            <Badge variant="outline" className="font-normal">
                              {p.wards.length === 1 ? "Ward" : "Wards"} {p.wards.join(", ")}
                            </Badge>
                          )}
                        </div>
                      ) : <p className="text-xs text-muted-foreground">Not allocated</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
