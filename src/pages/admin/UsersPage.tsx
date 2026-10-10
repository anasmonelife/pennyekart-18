import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import CustomerList from "@/components/admin/CustomerList";
import AddAdminDialog from "@/components/admin/AddAdminDialog";
import AdminsPanel, { isAddedAdmin } from "@/components/admin/AdminsPanel";
import { Search, ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2, KeyRound, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  role_id: string | null;
  is_super_admin: boolean;
  is_approved: boolean;
  is_blocked: boolean;
  user_type: string;
  local_body_id: string | null;
  ward_number: number | null;
  local_body_name?: string | null;
  local_body_type?: string | null;
  district_name?: string | null;
  created_at?: string;
  last_login_at?: string | null;
  customer_id?: string | null;
  seller_type?: string | null;
}

interface Role {
  id: string;
  name: string;
}

interface LocalBody {
  id: string;
  name: string;
  body_type: string;
  district_id: string;
  ward_count?: number | null;
}

interface District {
  id: string;
  name: string;
}

const USER_TYPE_LABELS: Record<string, string> = {
  all: "All Users",
  customer: "Customers",
  delivery_staff: "Delivery Staff",
  selling_partner: "Selling Partners",
};

const UsersPage = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterApproval, setFilterApproval] = useState("all");
  const [filterBlocked, setFilterBlocked] = useState("all");
  const [filterDistrict, setFilterDistrict] = useState("all");
  const [filterLocalBody, setFilterLocalBody] = useState("all");
  const [filterWard, setFilterWard] = useState("all");
  const [filterSellerType, setFilterSellerType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [localBodies, setLocalBodies] = useState<LocalBody[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { isSuperAdmin } = usePermissions();
  const { toast } = useToast();

  const [orderSummaries, setOrderSummaries] = useState<Map<string, { user_id: string; order_count: number; total_spent: number; last_order_date: string | null }>>(new Map());
  const [walletSummaries, setWalletSummaries] = useState<Map<string, { user_id: string; balance: number }>>(new Map());

  // Edit dialog state
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "", email: "", mobile_number: "",
    user_type: "customer", seller_type: "normal", role_id: "none",
    is_approved: false, is_blocked: false, is_super_admin: false,
    local_body_id: "none", ward_number: "none",
  });
  const [editSaving, setEditSaving] = useState(false);

  // Delete dialog state
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password dialog state
  const [resetUser, setResetUser] = useState<Profile | null>(null);
  const [resetForm, setResetForm] = useState({ new_password: "", confirm_password: "" });
  const [resetting, setResetting] = useState(false);

  const fetchData = async () => {
    const [usersRes, rolesRes, localBodiesRes, districtsRes, ordersRes, walletsRes] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("roles").select("*"),
      supabase.from("locations_local_bodies").select("id, name, body_type, district_id, ward_count"),
      supabase.from("locations_districts").select("id, name"),
      supabase.from("orders").select("user_id, total, status, created_at"),
      supabase.from("customer_wallets").select("customer_user_id, balance"),
    ]);

    const localBodies = (localBodiesRes.data ?? []) as LocalBody[];
    const districts = (districtsRes.data ?? []) as District[];
    setLocalBodies(localBodies);
    setDistricts(districts);

    const allProfiles = (usersRes.data ?? []) as unknown as Profile[];
    
    const profileIdToMobile = new Map<string, string>();
    allProfiles.forEach((p) => {
      if (p.id && p.mobile_number) profileIdToMobile.set(p.id, p.mobile_number);
    });

    const enrichedUsers = allProfiles.map((u) => {
      const enriched: any = { ...u };
      if (u.local_body_id) {
        const lb = localBodies.find((l) => l.id === u.local_body_id);
        if (lb) {
          const dist = districts.find((d) => d.id === lb.district_id);
          enriched.local_body_name = lb.name;
          enriched.local_body_type = lb.body_type;
          enriched.district_name = dist?.name ?? null;
        }
      }
      if ((u as any).referred_by) {
        enriched.referrer_name = profileIdToMobile.get((u as any).referred_by) || null;
      }
      return enriched;
    });

    const oMap = new Map<string, { user_id: string; order_count: number; total_spent: number; last_order_date: string | null }>();
    (ordersRes.data ?? []).forEach((o: any) => {
      if (!o.user_id) return;
      const existing = oMap.get(o.user_id);
      if (existing) {
        existing.order_count++;
        if (o.status === "delivered") existing.total_spent += Number(o.total ?? 0);
        if (!existing.last_order_date || o.created_at > existing.last_order_date) existing.last_order_date = o.created_at;
      } else {
        oMap.set(o.user_id, {
          user_id: o.user_id,
          order_count: 1,
          total_spent: o.status === "delivered" ? Number(o.total ?? 0) : 0,
          last_order_date: o.created_at,
        });
      }
    });
    setOrderSummaries(oMap);

    const wMap = new Map<string, { user_id: string; balance: number }>();
    (walletsRes.data ?? []).forEach((w: any) => {
      wMap.set(w.customer_user_id, { user_id: w.customer_user_id, balance: Number(w.balance ?? 0) });
    });
    setWalletSummaries(wMap);

    setUsers(enrichedUsers);
    setRoles((rolesRes.data as Role[]) ?? []);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = useMemo(() => {
    let result = filterType === "all" ? users : users.filter(u => u.user_type === filterType);
    if (filterRole !== "all") {
      result = filterRole === "none"
        ? result.filter(u => !u.role_id)
        : result.filter(u => u.role_id === filterRole);
    }
    if (filterApproval !== "all") {
      result = result.filter(u => (filterApproval === "approved" ? u.is_approved : !u.is_approved));
    }
    if (filterBlocked !== "all") {
      result = result.filter(u => (filterBlocked === "blocked" ? u.is_blocked : !u.is_blocked));
    }
    if (filterDistrict !== "all") {
      result = result.filter(u => u.district_name === filterDistrict);
    }
    if (filterLocalBody !== "all") {
      result = filterLocalBody === "none"
        ? result.filter(u => !u.local_body_id)
        : result.filter(u => u.local_body_id === filterLocalBody);
    }
    if (filterWard !== "all") {
      result = filterWard === "none"
        ? result.filter(u => u.ward_number == null)
        : result.filter(u => u.ward_number === Number(filterWard));
    }
    if (filterSellerType !== "all") {
      result = result.filter(u => u.user_type === "selling_partner" && (u.seller_type ?? "normal") === filterSellerType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        (u.full_name?.toLowerCase().includes(q)) ||
        (u.email?.toLowerCase().includes(q)) ||
        (u.mobile_number?.includes(q))
      );
    }
    return result;
  }, [users, filterType, filterRole, filterApproval, filterBlocked, filterDistrict, filterLocalBody, filterWard, filterSellerType, searchQuery]);

  useMemo(() => { setCurrentPage(1); }, [filterType, filterRole, filterApproval, filterBlocked, filterDistrict, filterLocalBody, filterWard, filterSellerType, searchQuery]);

  const availableWards = useMemo(() => {
    const wards = new Set<number>();
    users.forEach(u => {
      if (u.ward_number != null && (filterLocalBody === "all" || u.local_body_id === filterLocalBody)) wards.add(u.ward_number);
    });
    return Array.from(wards).sort((a, b) => a - b);
  }, [users, filterLocalBody]);

  const activeFilterCount = [filterRole, filterApproval, filterBlocked, filterDistrict, filterLocalBody, filterWard, filterSellerType].filter(f => f !== "all").length;

  const clearFilters = () => {
    setFilterRole("all"); setFilterApproval("all"); setFilterBlocked("all");
    setFilterDistrict("all"); setFilterLocalBody("all"); setFilterWard("all"); setFilterSellerType("all");
  };

  const isCustomerTab = filterType === "customer";
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const updateRole = async (userId: string, roleId: string) => {
    const { error } = await supabase.from("profiles").update({ role_id: roleId === "none" ? null : roleId }).eq("user_id", userId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Role updated" }); fetchData(); }
  };

  const toggleSuperAdmin = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_super_admin: !current }).eq("user_id", userId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Super admin toggled" }); fetchData(); }
  };

  const toggleApproval = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_approved: !current }).eq("user_id", userId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: !current ? "User approved" : "User unapproved" }); fetchData(); }
  };

  const updateSellerType = async (userId: string, sellerType: string) => {
    const { error } = await supabase.from("profiles").update({ seller_type: sellerType }).eq("user_id", userId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Marked as ${sellerType === "utility" ? "utility seller" : "normal seller"}` }); fetchData(); }
  };

  const openEditDialog = (user: Profile) => {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name ?? "",
      email: user.email ?? "",
      mobile_number: user.mobile_number ?? "",
      user_type: user.user_type ?? "customer",
      seller_type: user.seller_type ?? "normal",
      role_id: user.role_id ?? "none",
      is_approved: user.is_approved,
      is_blocked: user.is_blocked,
      is_super_admin: user.is_super_admin,
      local_body_id: user.local_body_id ?? "none",
      ward_number: user.ward_number != null ? String(user.ward_number) : "none",
    });
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setEditSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: editForm.full_name || null,
      email: editForm.email || null,
      mobile_number: editForm.mobile_number || null,
      user_type: editForm.user_type,
      seller_type: editForm.user_type === "selling_partner" ? editForm.seller_type : null,
      role_id: editForm.role_id === "none" ? null : editForm.role_id,
      is_approved: editForm.is_approved,
      is_blocked: editForm.is_blocked,
      is_super_admin: editForm.is_super_admin,
      local_body_id: editForm.local_body_id === "none" ? null : editForm.local_body_id,
      ward_number: editForm.ward_number === "none" ? null : Number(editForm.ward_number),
    }).eq("user_id", editUser.user_id);
    setEditSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User updated" });
      setEditUser(null);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    const { error } = await supabase.from("profiles").delete().eq("user_id", deleteUser.user_id);
    setDeleting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User deleted" });
      setDeleteUser(null);
      fetchData();
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    if (resetForm.new_password !== resetForm.confirm_password) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (resetForm.new_password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("reset-password", {
      body: {
        action: "reset_by_admin",
        user_id: resetUser.user_id,
        new_password: resetForm.new_password,
      },
    });
    setResetting(false);
    if (error || !data?.success) {
      toast({ title: "Reset failed", description: data?.message || "Could not reset password.", variant: "destructive" });
    } else {
      toast({ title: "Password reset successful!" });
      setResetUser(null);
      setResetForm({ new_password: "", confirm_password: "" });
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "delivery_staff": return "default";
      case "selling_partner": return "secondary";
      default: return "outline";
    }
  };

  const exportCsv = () => {
    const rows = filterType === "admins" ? users.filter(isAddedAdmin) : filteredUsers;
    if (rows.length === 0) {
      toast({ title: "Nothing to export", description: "No users match the current filters." });
      return;
    }
    const roleName = (id: string | null) => (id ? roles.find((r) => r.id === id)?.name ?? "" : "");
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = [
      "Name", "Customer ID", "Email", "Mobile", "User Type", "Seller Type",
      "District", "Local Body", "Ward", "Approved", "Blocked", "Role",
      "Orders", "Total Spent", "Wallet Balance", "Joined On", "Last Login",
    ];
    const lines = rows.map((u) => {
      const o = orderSummaries.get(u.user_id);
      const w = walletSummaries.get(u.user_id);
      return [
        u.full_name, u.customer_id, u.email, u.mobile_number,
        USER_TYPE_LABELS[u.user_type] ?? u.user_type,
        u.user_type === "selling_partner" ? (u.seller_type === "utility" ? "Utility Seller" : "Normal Seller") : "",
        u.district_name, u.local_body_name, u.ward_number,
        u.is_approved ? "Yes" : "No", u.is_blocked ? "Yes" : "No", roleName(u.role_id),
        o?.order_count ?? 0, o?.total_spent ?? 0, w?.balance ?? 0,
        u.created_at ? new Date(u.created_at).toLocaleString() : "",
        u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "",
      ].map(esc).join(",");
    });
    const csv = "\uFEFF" + [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${filterType}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export ready", description: `${rows.length} users exported to CSV.` });
  };

  const otherColSpan = isSuperAdmin ? 8 : 7;

  return (
    <AdminLayout>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
          {isSuperAdmin && <AddAdminDialog roles={roles} onCreated={fetchData} />}
        </div>
      </div>

      <Tabs value={filterType} onValueChange={setFilterType} className="mb-4">
        <TabsList>
          {Object.entries(USER_TYPE_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key}>
              {label}
              <Badge variant="outline" className="ml-2 text-xs">
                {key === "all" ? users.length : users.filter(u => u.user_type === key).length}
              </Badge>
            </TabsTrigger>
          ))}
          <TabsTrigger value="admins">
            Admins
            <Badge variant="outline" className="ml-2 text-xs">
              {users.filter(isAddedAdmin).length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filterType === "admins" ? (
        <AdminsPanel users={users} roles={roles} canEdit={isSuperAdmin} onChanged={fetchData} />
      ) : (
      <>
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="none">No Role</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Select value={filterApproval} onValueChange={setFilterApproval}>
          <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="Approval" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending Approval</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBlocked} onValueChange={setFilterBlocked}>
          <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="Blocked" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDistrict} onValueChange={setFilterDistrict}>
          <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="District" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Districts</SelectItem>
            {districts.map((d) => (
              <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterLocalBody} onValueChange={(v) => { setFilterLocalBody(v); setFilterWard("all"); }}>
          <SelectTrigger className="w-full sm:w-48 h-9"><SelectValue placeholder="Panchayath" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Panchayaths</SelectItem>
            <SelectItem value="none">No Panchayath</SelectItem>
            {localBodies
              .filter(lb => filterDistrict === "all" || districts.find(d => d.id === lb.district_id)?.name === filterDistrict)
              .map((lb) => (
                <SelectItem key={lb.id} value={lb.id}>{lb.name}</SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={filterWard} onValueChange={setFilterWard}>
          <SelectTrigger className="w-full sm:w-32 h-9"><SelectValue placeholder="Ward" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wards</SelectItem>
            <SelectItem value="none">No Ward</SelectItem>
            {availableWards.map((w) => (
              <SelectItem key={w} value={String(w)}>Ward {w}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterType === "all" || filterType === "selling_partner") && (
          <Select value={filterSellerType} onValueChange={setFilterSellerType}>
            <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue placeholder="Seller Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seller Types</SelectItem>
              <SelectItem value="normal">Normal Seller</SelectItem>
              <SelectItem value="utility">Utility Seller</SelectItem>
            </SelectContent>
          </Select>
        )}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            Clear filters ({activeFilterCount})
          </Button>
        )}
      </div>

      {isCustomerTab ? (
        <CustomerList customers={filteredUsers} orderSummaries={orderSummaries} walletSummaries={walletSummaries} onRefresh={fetchData} />
      ) : (
        <>
          <div className="admin-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email / Mobile</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Seller Type</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Role</TableHead>
                  {isSuperAdmin && <TableHead>Super Admin</TableHead>}
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>{u.full_name ?? "—"}</div>
                      {u.customer_id && <div className="text-[10px] font-mono text-primary">{u.customer_id}</div>}
                    </TableCell>
                    <TableCell>
                      <div>{u.email ?? "—"}</div>
                      {u.mobile_number && <div className="text-xs text-muted-foreground">{u.mobile_number}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(u.user_type)}>
                        {USER_TYPE_LABELS[u.user_type] ?? u.user_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.user_type === "selling_partner" ? (
                        <Select value={u.seller_type ?? "normal"} onValueChange={(v) => updateSellerType(u.user_id, v)}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal Seller</SelectItem>
                            <SelectItem value="utility">Utility Seller</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch checked={u.is_approved} onCheckedChange={() => toggleApproval(u.user_id, u.is_approved)} />
                    </TableCell>
                    <TableCell>
                      {isSuperAdmin ? (
                        <Select value={u.role_id ?? "none"} onValueChange={(v) => updateRole(u.user_id, v)}>
                          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No role</SelectItem>
                            {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary">{roles.find((r) => r.id === u.role_id)?.name ?? "No role"}</Badge>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Switch checked={u.is_super_admin} onCheckedChange={() => toggleSuperAdmin(u.user_id, u.is_super_admin)} />
                      </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(u)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          {u.user_type !== "customer" && (
                            <DropdownMenuItem onClick={() => { setResetUser(u); setResetForm({ new_password: "", confirm_password: "" }); }}>
                              <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                            </DropdownMenuItem>
                          )}
                          {isSuperAdmin && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteUser(u)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={otherColSpan} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredUsers.length > 0 && (
             <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) page = i + 1;
                  else if (currentPage <= 3) page = i + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                  else page = currentPage - 2 + i;
                  return (
                    <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(page)}>
                      {page}
                    </Button>
                  );
                })}
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span>of {filteredUsers.length} users</span>
              </div>
            </div>
          )}
        </>
      )}
      </>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input value={editForm.mobile_number} onChange={(e) => setEditForm(f => ({ ...f, mobile_number: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>User Type</Label>
                <Select value={editForm.user_type} onValueChange={(v) => setEditForm(f => ({ ...f, user_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="delivery_staff">Delivery Staff</SelectItem>
                    <SelectItem value="selling_partner">Selling Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.user_type === "selling_partner" && (
                <div className="space-y-2">
                  <Label>Seller Type</Label>
                  <Select value={editForm.seller_type} onValueChange={(v) => setEditForm(f => ({ ...f, seller_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal Seller</SelectItem>
                      <SelectItem value="utility">Utility Seller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editForm.role_id} onValueChange={(v) => setEditForm(f => ({ ...f, role_id: v }))} disabled={!isSuperAdmin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No role</SelectItem>
                    {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Panchayath / Municipality</Label>
                <Select value={editForm.local_body_id} onValueChange={(v) => setEditForm(f => ({ ...f, local_body_id: v, ward_number: "none" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {localBodies.map((lb) => <SelectItem key={lb.id} value={lb.id}>{lb.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ward</Label>
                <Select value={editForm.ward_number} onValueChange={(v) => setEditForm(f => ({ ...f, ward_number: v }))} disabled={editForm.local_body_id === "none"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Ward</SelectItem>
                    {Array.from({ length: localBodies.find(lb => lb.id === editForm.local_body_id)?.ward_count ?? 0 }, (_, i) => i + 1).map((w) => (
                      <SelectItem key={w} value={String(w)}>Ward {w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={editForm.is_approved} onCheckedChange={(v) => setEditForm(f => ({ ...f, is_approved: v }))} />
                <Label>Approved</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editForm.is_blocked} onCheckedChange={(v) => setEditForm(f => ({ ...f, is_blocked: v }))} />
                <Label>Blocked</Label>
              </div>
              {isSuperAdmin && (
                <div className="flex items-center gap-2">
                  <Switch checked={editForm.is_super_admin} onCheckedChange={(v) => setEditForm(f => ({ ...f, is_super_admin: v }))} />
                  <Label>Super Admin</Label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteUser?.full_name ?? deleteUser?.email ?? "this user"}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Reset password for <strong>{resetUser?.full_name ?? resetUser?.mobile_number ?? "this user"}</strong>
          </p>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={resetForm.new_password} onChange={(e) => setResetForm(f => ({ ...f, new_password: e.target.value }))} minLength={6} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-2">
              <Label>Repeat Password</Label>
              <Input type="password" value={resetForm.confirm_password} onChange={(e) => setResetForm(f => ({ ...f, confirm_password: e.target.value }))} minLength={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUser(null)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={resetting || !resetForm.new_password || !resetForm.confirm_password}>
              {resetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default UsersPage;
