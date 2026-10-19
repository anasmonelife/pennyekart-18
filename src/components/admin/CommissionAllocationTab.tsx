import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, MapPin, Download } from "lucide-react";
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

  const exportCsv = () => {
    const header = ["Role", "Name", "Mobile", "Panchayaths", "Districts", "Commission %"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = visible.flatMap((g) => g.people.map((p) => [
      roleLabel(g.role),
      p.name ?? "",
      p.mobile ?? "",
      p.panchayaths.map((x) => x.name).join("; "),
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
      ) : visible.map((g) => {
        const rate = commissionRateForRole(pennyRoleId(g.role), rules, fallbackRate);
        return (
          <Card key={g.role}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
              <CardTitle className="text-base">{roleLabel(g.role)} ({g.people.length})</CardTitle>
              <Badge variant="outline">Commission {rate}% of profit</Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Allocated panchayaths</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.people.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="min-w-40 align-top">
                          <p className="text-sm font-medium">{p.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{p.mobile || "—"}</p>
                          {!p.is_active && <Badge variant="outline" className="mt-1 text-[10px]">Inactive</Badge>}
                        </TableCell>
                        <TableCell className="align-top">
                          {p.panchayaths.length ? (
                            <div className="flex flex-wrap gap-1">
                              {p.panchayaths.map((x) => (
                                <Badge key={x.id} variant="secondary" className="gap-1 font-normal">
                                  <MapPin className="h-3 w-3" />
                                  {x.name}{x.district ? ` · ${x.district}` : ""}
                                </Badge>
                              ))}
                              {p.ward != null && p.ward !== "" && <Badge variant="outline" className="font-normal">Ward {String(p.ward)}</Badge>}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">Not allocated</span>}
                        </TableCell>
                        <TableCell className="text-right align-top">{p.panchayaths.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
