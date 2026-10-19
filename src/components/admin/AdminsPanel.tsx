import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Search, ShieldCheck, Trash2 } from "lucide-react";

interface AdminRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  role_id: string | null;
  is_super_admin: boolean;
  is_blocked: boolean;
  last_login_at?: string | null;
}

interface Props {
  users: AdminRow[];
  roles: { id: string; name: string }[];
  canEdit: boolean;
  onChanged: () => void;
}

// Accounts created via "Add Admin": have a role and a real email.
// Mobile-login users get auto emails (@pennyekart.in / @pennyekart.local) and are excluded.
export const isAddedAdmin = (u: { is_super_admin: boolean; role_id: string | null; email: string | null }) =>
  !u.is_super_admin && !!u.role_id && !!u.email && !/@pennyekart\.(in|local)$/i.test(u.email.trim());

const AdminsPanel = ({ users, roles, canEdit, onChanged }: Props) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", mobile_number: "", role_id: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<AdminRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const callManage = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-admin", { body });
    let msg = (data as any)?.error || error?.message;
    if (error) {
      try { msg = (await (error as any)?.context?.json())?.error ?? msg; } catch { /* ignore */ }
    }
    return msg as string | undefined;
  };

  const openEdit = (u: AdminRow) => {
    setForm({ full_name: u.full_name ?? "", email: u.email ?? "", mobile_number: u.mobile_number ?? "", role_id: u.role_id ?? "" });
    setEditing(u);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const err = await callManage({ action: "update", user_id: editing.user_id, ...form });
    setSaving(false);
    if (err) return toast({ title: "Could not save", description: err, variant: "destructive" });
    toast({ title: "Admin updated" });
    setEditing(null);
    onChanged();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const err = await callManage({ action: "delete", user_id: deleting.user_id });
    setDeleteBusy(false);
    if (err) return toast({ title: "Could not delete", description: err, variant: "destructive" });
    toast({ title: "Admin deleted" });
    setDeleting(null);
    onChanged();
  };

  const admins = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users
      .filter(isAddedAdmin)
      .filter((u) => !s || [u.full_name, u.email, u.mobile_number].some((v) => v?.toLowerCase().includes(s)))
      .sort((a, b) => Number(b.is_super_admin) - Number(a.is_super_admin) || (a.full_name ?? "").localeCompare(b.full_name ?? ""));
  }, [users, q]);

  const update = async (u: AdminRow, fields: Record<string, unknown>, okMsg: string) => {
    setBusy(u.id);
    const { error } = await supabase.from("profiles").update(fields as any).eq("id", u.id);
    setBusy(null);
    if (error) return toast({ title: "Could not update", description: error.message, variant: "destructive" });
    toast({ title: okMsg });
    onChanged();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search admins by name, email or mobile..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="space-y-2 md:hidden">
        {admins.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No admins found</p>}
        {admins.map((u) => {
          const isSelf = u.user_id === user?.id;
          const locked = !canEdit || u.is_super_admin || isSelf || busy === u.id;
          return (
            <details key={u.id} className="group rounded-lg border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{u.full_name || "—"}{isSelf && " (You)"}</div>
                  <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                </div>
                <Badge variant={u.is_blocked ? "destructive" : "secondary"}>{u.is_blocked ? "Blocked" : "Active"}</Badge>
              </summary>
              <div className="space-y-2 border-t p-3 text-xs">
                <div className="text-muted-foreground">{u.mobile_number || "—"} · Last login {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}</div>
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm capitalize"
                  value={u.role_id ?? ""}
                  disabled={locked}
                  onChange={(e) => {
                    const v = e.target.value || null;
                    if (!v && !window.confirm("Remove admin access for this user?")) return;
                    update(u, { role_id: v }, v ? "Role updated" : "Admin access removed");
                  }}
                >
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  <option value="">— Remove admin access —</option>
                </select>
                <div className="flex items-center gap-2">
                  <Switch checked={!u.is_blocked} disabled={locked} onCheckedChange={(on) => update(u, { is_blocked: !on }, on ? "Admin unblocked" : "Admin blocked")} />
                  <span>Active</span>
                </div>
                {!locked && (
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(u)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                    <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={() => setDeleting(u)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
      <div className="hidden md:block rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email / Mobile</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No admins found</TableCell></TableRow>
            )}
            {admins.map((u) => {
              const isSelf = u.user_id === user?.id;
              const locked = !canEdit || u.is_super_admin || isSelf || busy === u.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.full_name || "—"}
                    {u.is_super_admin && <Badge className="ml-2"><ShieldCheck className="mr-1 h-3 w-3" />Super admin</Badge>}
                    {isSelf && <Badge variant="outline" className="ml-2">You</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{u.email || "—"}</div>
                    <div className="text-muted-foreground">{u.mobile_number}</div>
                  </TableCell>
                  <TableCell>
                    {u.is_super_admin ? (
                      <span className="text-sm text-muted-foreground">Full access</span>
                    ) : (
                      <select
                        className="h-9 rounded-md border bg-background px-2 text-sm capitalize"
                        value={u.role_id ?? ""}
                        disabled={locked}
                        onChange={(e) => {
                          const v = e.target.value || null;
                          if (!v && !window.confirm("Remove admin access for this user?")) return;
                          update(u, { role_id: v }, v ? "Role updated" : "Admin access removed");
                        }}
                      >
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        <option value="">— Remove admin access —</option>
                      </select>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!u.is_blocked}
                      disabled={locked}
                      onCheckedChange={(on) => update(u, { is_blocked: !on }, on ? "Admin unblocked" : "Admin blocked")}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {!locked && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)} aria-label={`Edit ${u.full_name ?? "admin"}`}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleting(u)} aria-label={`Delete ${u.full_name ?? "admin"}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {!canEdit && <p className="text-xs text-muted-foreground">Only super admins can edit, block or delete admins.</p>}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit admin</DialogTitle>
            <DialogDescription>Changing the email also changes the address they sign in with.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Full name</Label><Input maxLength={100} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Mobile</Label><Input maxLength={16} value={form.mobile_number} onChange={(e) => setForm({ ...form, mobile_number: e.target.value })} /></div>
            <div>
              <Label>Role</Label>
              <select className="h-10 w-full rounded-md border bg-background px-2 text-sm capitalize" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
                <option value="" disabled>Select a role</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete admin</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{deleting?.full_name || deleting?.email}</strong>? Their admin login will be removed and they will no longer be able to sign in. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleteBusy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteBusy ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminsPanel;
