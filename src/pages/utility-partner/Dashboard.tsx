import AccountSettingsSection from "@/components/AccountSettingsSection";
import NotificationToggle from "@/components/NotificationToggle";
import NotificationBell from "@/components/NotificationBell";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wrench, LogOut, Phone, Home, Package, Check, CheckCircle2, Bell, BellOff, CircleDot, PauseCircle, User, ArrowLeft } from "lucide-react";
import VariantManager from "@/components/utility/VariantManager";
import AvailabilityDialog, { type AvailabilityUnit } from "@/components/utility/AvailabilityDialog";
import UtilityRequestNotificationDialog, { UTILITY_UNFINISHED_STATUSES } from "@/components/utility/UtilityRequestNotificationDialog";
import { SELLER_REMINDER_INTERVAL } from "@/lib/sellerOrderReminders";
import OrderItemHighlight from "@/components/selling-partner/OrderItemHighlight";
import PartnerAvatar from "@/components/partner/PartnerAvatar";
import logo from "@/assets/logo.png";
import { useUtilityReminderPause } from "@/lib/utilityReminderPause";
import {
  PRICE_UNITS, REQUEST_STATUSES, formatServicePrice, statusLabel, unitsForCategoryType, isAutoCancelledRequest, showUtilityPartnerContact,
  type UtilityCategory, type UtilityService, type UtilityRequest,
} from "@/lib/utilityServices";

const emptyService = {
  name: "", description: "", image_url: "", category_id: "", price: 0, price_unit: "fixed",
  contact_phone: "", contact_whatsapp: "", coverage_area: "", is_active: true,
};

const UtilityPartnerDashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [categories, setCategories] = useState<UtilityCategory[]>([]);
  const [services, setServices] = useState<UtilityService[]>([]);
  const [requests, setRequests] = useState<UtilityRequest[]>([]);
  const [form, setForm] = useState(emptyService);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [packsFor, setPacksFor] = useState<UtilityService | null>(null);
  const [alertGroup, setAlertGroup] = useState<"new" | "pending" | null>(null);
  const [available, setAvailable] = useState<boolean>((profile as any)?.is_available ?? true);
  useEffect(() => { setAvailable((profile as any)?.is_available ?? true); }, [(profile as any)?.is_available]);
  const prevPendingRef = useRef(-1);
  const [profileForm, setProfileForm] = useState({ full_name: "", mobile_number: "", date_of_birth: "", local_body_id: "", ward_number: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [editLocalBodies, setEditLocalBodies] = useState<{ id: string; name: string; body_type: string; ward_count: number; district_id: string }[]>([]);
  const [districtId, setDistrictId] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [focusedRequestId, setFocusedRequestId] = useState<string | null>(null);
  const { paused: remindersPaused, pausedUntil, setPaused: setRemindersPaused } = useUtilityReminderPause(profile?.user_id);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const requestId = searchParams.get("request");
    if (tab === "requests") setActiveTab("requests");
    if (requestId) setFocusedRequestId(requestId);
  }, [searchParams]);

  useEffect(() => {
    supabase.from("locations_districts").select("id, name").eq("is_active", true).order("sort_order")
      .then(({ data }) => setDistricts((data as { id: string; name: string }[]) ?? []));
    supabase.from("locations_local_bodies").select("id, name, body_type, ward_count, district_id").eq("is_active", true).order("name")
      .then(({ data }) => setEditLocalBodies((data as { id: string; name: string; body_type: string; ward_count: number; district_id: string }[]) ?? []));
  }, []);

  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    setProfileForm({
      full_name: p.full_name ?? "",
      mobile_number: p.mobile_number ?? "",
      date_of_birth: p.date_of_birth ?? "",
      local_body_id: p.local_body_id ?? "",
      ward_number: p.ward_number ? String(p.ward_number) : "",
    });
  }, [profile]);

  // Default the district dropdown from the saved panchayath
  useEffect(() => {
    if (!profile?.local_body_id || editLocalBodies.length === 0) return;
    const lb = editLocalBodies.find((l) => l.id === profile.local_body_id);
    if (lb) setDistrictId(lb.district_id);
  }, [profile?.local_body_id, editLocalBodies.length]);

  const districtLocalBodies = editLocalBodies.filter((l) => l.district_id === districtId);
  const wardOptions = Array.from({ length: editLocalBodies.find((l) => l.id === profileForm.local_body_id)?.ward_count ?? 0 }, (_, i) => i + 1);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.user_id) return;
    setProfileSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profileForm.full_name.trim() || null,
      mobile_number: profileForm.mobile_number.trim() || null,
      date_of_birth: profileForm.date_of_birth || null,
      local_body_id: profileForm.local_body_id || null,
      ward_number: profileForm.ward_number ? Number(profileForm.ward_number) : null,
    }).eq("user_id", profile.user_id);
    setProfileSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated successfully!" });
  };



  const isProductService = (s: UtilityService) =>
    categories.find((c) => c.id === s.category_id)?.category_type === "product";

  const selectedCategory = categories.find((c) => c.id === form.category_id);
  const unitOptions = form.category_id ? unitsForCategoryType(selectedCategory?.category_type) : PRICE_UNITS;

  const fetchAll = async () => {
    if (!profile?.user_id) return;
    // Sweep bookings that waited past their category's auto-cancel limit.
    await supabase.rpc("auto_cancel_stale_utility_requests" as never);
    const [cats, svcs] = await Promise.all([
      supabase.from("utility_service_categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("utility_services").select("*").eq("provider_user_id", profile.user_id).order("created_at", { ascending: false }),
    ]);
    setCategories((cats.data as UtilityCategory[]) ?? []);
    const list = (svcs.data as UtilityService[]) ?? [];
    setServices(list);
    if (list.length) {
      const { data } = await supabase
        .from("utility_service_requests").select("*")
        .in("service_id", list.map((s) => s.id))
        .order("created_at", { ascending: false });
      setRequests((data as UtilityRequest[]) ?? []);
    } else {
      setRequests([]);
    }
  };

  useEffect(() => { fetchAll(); }, [profile?.user_id]);

  useEffect(() => {
    if (!focusedRequestId || !requests.some((request) => request.id === focusedRequestId)) return;
    const scrollTimer = window.setTimeout(() => {
      document.getElementById(`utility-request-${focusedRequestId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    const focusTimer = window.setTimeout(() => setFocusedRequestId(null), 5000);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(focusTimer);
    };
  }, [focusedRequestId, requests]);

  // Poll + realtime so new requests pop up immediately
  useEffect(() => {
    if (!profile?.user_id) return;
    const interval = setInterval(fetchAll, 30000);
    const channel = supabase
      .channel(`utility-requests-${profile.user_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "utility_service_requests" }, (payload) => {
        const row = payload.new as { id?: string; status?: string; cancelled_by?: string } | undefined;
        if (payload.eventType === "UPDATE" && row?.status === "cancelled" && row.cancelled_by === "customer") {
          toast({ title: "Booking cancelled by customer", description: `Request #${String(row.id).slice(0, 8)} was cancelled.`, variant: "destructive" });
          try { navigator.vibrate?.(300); } catch { /* ignore */ }
        }
        fetchAll();
      })
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [profile?.user_id, services.length]);

  // Popup when a new pending request arrives, and on every page load/refresh
  // while pending requests exist — unless the seller tapped "Remind me later" today.
  // New requests and unfinished requests open in separate windows.
  const dismissedToday = () => localStorage.getItem("utility_popup_dismissed_date") === new Date().toDateString();
  const remindLater = () => {
    localStorage.setItem("utility_popup_dismissed_date", new Date().toDateString());
    setAlertGroup(null);
  };
  const newAlertIdsRef = useRef<Set<string>>(new Set());
  const pendingAlertIdsRef = useRef<Set<string>>(new Set());
  const lastAlertRef = useRef(0);
  useEffect(() => {
    if (!profile?.user_id || remindersPaused) return;
    const fresh = requests.filter((r) => r.status === "pending");
    const unfinished = requests.filter((r) => UTILITY_UNFINISHED_STATUSES.includes(r.status));
    const hasNewId = fresh.some((r) => !newAlertIdsRef.current.has(r.id));
    const hasNewUnfinishedId = unfinished.some((r) => !pendingAlertIdsRef.current.has(r.id));
    newAlertIdsRef.current = new Set(fresh.map((r) => r.id));
    pendingAlertIdsRef.current = new Set(unfinished.map((r) => r.id));
    const count = fresh.length + unfinished.length;
    if (count === 0) { prevPendingRef.current = count; return; }
    const due = Date.now() - lastAlertRef.current >= SELLER_REMINDER_INTERVAL;
    if (hasNewId || (prevPendingRef.current === -1 && fresh.length > 0)) {
      setAlertGroup("new");
      lastAlertRef.current = Date.now();
    } else if (unfinished.length > 0 && (hasNewUnfinishedId || due) && !(dismissedToday() && !hasNewUnfinishedId)) {
      setAlertGroup("pending");
      lastAlertRef.current = Date.now();
    }
    prevPendingRef.current = count;
  }, [requests, remindersPaused, profile?.user_id]);


  const save = async () => {
    if (!profile?.user_id) return;
    if (!form.name.trim()) { toast({ title: "Service name is required", variant: "destructive" }); return; }
    const payload = {
      ...form,
      provider_user_id: profile.user_id,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
      description: form.description || null,
      contact_phone: form.contact_phone || null,
      contact_whatsapp: form.contact_whatsapp || null,
      coverage_area: form.coverage_area || null,
    };
    const { error } = editId
      ? await supabase.from("utility_services").update(payload).eq("id", editId)
      : await supabase.from("utility_services").insert(payload);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: editId ? "Service updated" : "Service submitted for approval" });
    setOpen(false); setForm(emptyService); setEditId(null); fetchAll();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("utility_services").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from("utility_services").update({ is_active: value }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const setRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("utility_service_requests").update({ status }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Request updated" }); fetchAll(); }
  };

  const cancelRequest = async (id: string) => {
    if (!window.confirm("Cancel this service request? The customer will see it as cancelled.")) return;
    await setRequestStatus(id, "cancelled");
  };

  const [acceptId, setAcceptId] = useState<string | null>(null);
  const acceptWithAvailability = async (unit: AvailabilityUnit, value: number) => {
    if (!acceptId) return;
    const { error } = await supabase.from("utility_service_requests")
      .update({ status: "assigned", availability_unit: unit, availability_value: value } as never).eq("id", acceptId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Request accepted" });
    setAcceptId(null); fetchAll();
  };

  const openEdit = (s: UtilityService) => {
    setForm({
      name: s.name, description: s.description ?? "", image_url: s.image_url ?? "",
      category_id: s.category_id ?? "", price: Number(s.price ?? 0), price_unit: s.price_unit ?? "fixed",
      contact_phone: s.contact_phone ?? "", contact_whatsapp: s.contact_whatsapp ?? "",
      coverage_area: s.coverage_area ?? "", is_active: s.is_active,
    });
    setEditId(s.id); setOpen(true);
  };

  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "—";
  const pending = requests.filter((r) => r.status === "pending").length;
  const OPEN_STATUSES = ["pending", "assigned", "in_progress", "quoted"];
  const openRequests = requests.filter((r) => OPEN_STATUSES.includes(r.status));
  const closedRequests = requests.filter((r) => !OPEN_STATUSES.includes(r.status));

  // Simple launcher cards shown on the home screen
  const homeCards = [
    { tab: "services", label: "Services", icon: Wrench, sub: `${services.length} listed` },
    { tab: "requests", label: "Requests", icon: Bell, sub: `${pending} pending` },
    { tab: "profile", label: "Profile", icon: User, sub: profile?.full_name || "Your details" },
  ];

  const toggleAvailability = async (v: boolean) => {
    if (!profile?.user_id) return;
    setAvailable(v);
    const { error } = await supabase.from("profiles").update({ is_available: v }).eq("user_id", profile.user_id);
    if (error) { setAvailable(!v); toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else toast({ title: v ? "You're now Available" : "You're now Busy" });
  };

  const renderRequest = (r: UtilityRequest) => (
    <Card
      key={r.id}
      id={`utility-request-${r.id}`}
      className={`min-w-0 rounded-lg ${r.id === focusedRequestId ? "ring-2 ring-primary" : ""}`}
    >
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="break-words font-semibold">{showUtilityPartnerContact(r) ? r.contact_name : `Request #${r.id.slice(0, 8)}`}</p>
            {showUtilityPartnerContact(r) && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3 shrink-0" /><span className="min-w-0 break-words">{r.contact_phone}</span></p>}
          </div>
          <Badge variant={isAutoCancelledRequest(r) ? "destructive" : "outline"} className="max-w-[55%] shrink-0 whitespace-normal break-words">{isAutoCancelledRequest(r) ? "Auto-cancelled · Acceptance delayed" : statusLabel(r.status)}</Badge>
        </div>
        <OrderItemHighlight name={serviceName(r.service_id)} variant={r.variant_label} quantity={r.quantity ?? 1}>
          {!!r.total_amount && <p className="text-sm font-semibold text-primary">₹{Number(r.total_amount)}</p>}
        </OrderItemHighlight>
        {showUtilityPartnerContact(r) && r.address && <p className="break-words text-sm">{r.address}</p>}
        {showUtilityPartnerContact(r) && r.latitude != null && r.longitude != null && (
          <a
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline"
            href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            Open location on map
          </a>
        )}
        {r.preferred_date && <p className="text-xs text-muted-foreground">Preferred: {r.preferred_date}</p>}
        {showUtilityPartnerContact(r) && r.notes && <p className="break-words text-xs text-muted-foreground">{r.notes}</p>}
        <div className="grid grid-cols-2 items-center gap-2 pt-2 sm:flex sm:flex-wrap">
          {showUtilityPartnerContact(r) && r.contact_phone?.replace(/\D/g, "") && (
            <Button asChild size="sm" variant="outline" className="h-11">
              <a href={`tel:${r.contact_phone.replace(/\D/g, "")}`}>
                <Phone className="mr-1.5 h-3.5 w-3.5" /> Call
              </a>
            </Button>
          )}
          {r.status === "pending" && (
            <>
              <Button size="sm" className="h-11" onClick={() => setAcceptId(r.id)}>
                <Check className="mr-1.5 h-3.5 w-3.5" /> Accept
              </Button>
              <Button size="sm" variant="outline" className="h-11 text-destructive border-destructive/40" onClick={() => cancelRequest(r.id)}>
                Cancel
              </Button>
            </>
          )}
          {["assigned", "in_progress"].includes(r.status) && (
            <Button size="sm" className="h-11" onClick={() => setRequestStatus(r.id, "completed")}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Finish
            </Button>
          )}
          <Select value={r.status} onValueChange={(v) => setRequestStatus(r.id, v)}>
            <SelectTrigger className="col-span-2 h-11 w-full min-w-0 sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{REQUEST_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );



  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logo} alt="Pennyekart" className="h-8 w-auto shrink-0" />
            <span className="font-semibold text-foreground">Utility Partner</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <PartnerAvatar />
            <Button size="sm" variant={available ? "default" : "outline"} onClick={() => toggleAvailability(!available)}>
              {available ? <CircleDot className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
              {available ? "Available" : "Busy"}
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Go to homepage" title="Go to homepage" onClick={() => navigate("/")}>
              <Home className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Sign out" title="Sign out" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex min-w-0 items-center gap-2">
            {remindersPaused ? <BellOff className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Bell className="h-4 w-4 shrink-0 text-primary" />}
            <div className="min-w-0">
              <Label htmlFor="utility-reminders">Order reminders {remindersPaused ? "off" : "on"}</Label>
              {remindersPaused && <p className="text-xs text-muted-foreground">Until {new Date(pausedUntil).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{remindersPaused ? "Resume" : "Off for 12 hrs"}</span>
            <Switch id="utility-reminders" aria-label="Order reminders" checked={!remindersPaused} onCheckedChange={(enabled) => { setRemindersPaused(!enabled); if (!enabled) setAlertGroup(null); }} />
          </div>
        </div>
        {/* Greeting */}
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground">
          <p className="text-sm opacity-90">Hi {profile?.full_name?.split(" ")[0] || "Partner"} 👋</p>
          <h2 className="text-xl font-bold">
            {pending > 0 ? `${pending} service request${pending > 1 ? "s" : ""} need your attention` : "All service requests are up to date"}
          </h2>
          <p className="mt-1 text-xs opacity-90">
            Status: {available ? "Available for new bookings" : "Busy — new bookings may be delayed"}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {activeTab === "home" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {homeCards.map((c) => (
                <Button key={c.tab} variant="outline" onClick={() => setActiveTab(c.tab)} className="h-auto min-w-0 flex-col gap-2 whitespace-normal rounded-lg bg-card p-5 text-center shadow-sm hover:bg-muted/40">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <c.icon className="h-6 w-6 text-primary" />
                      </span>
                      <span className="text-sm font-semibold">{c.label}</span>
                       <span className="max-w-full truncate text-xs text-muted-foreground">{c.sub}</span>
                </Button>
              ))}
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setActiveTab("home")} className="mb-3 -ml-2 gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Home
            </Button>
          )}


          <TabsContent value="profile" className="mt-4 space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><User className="h-5 w-5" /> My Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="up_name">Full Name</Label>
                    <Input id="up_name" value={profileForm.full_name} onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))} maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="up_mobile">Mobile Number</Label>
                    <Input id="up_mobile" type="tel" value={profileForm.mobile_number} onChange={(e) => setProfileForm((f) => ({ ...f, mobile_number: e.target.value.replace(/\D/g, "").slice(0, 10) }))} maxLength={10} />
                  </div>
                  <div>
                    <Label htmlFor="up_dob">Date of Birth</Label>
                    <Input id="up_dob" type="date" value={profileForm.date_of_birth} onChange={(e) => setProfileForm((f) => ({ ...f, date_of_birth: e.target.value }))} max={new Date().toISOString().split("T")[0]} />
                  </div>
                  <div>
                    <Label>District</Label>
                    <Select value={districtId} onValueChange={(v) => { setDistrictId(v); setProfileForm((f) => ({ ...f, local_body_id: "", ward_number: "" })); }}>
                      <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                      <SelectContent>
                        {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Panchayath / Municipality</Label>
                    <Select value={profileForm.local_body_id} onValueChange={(v) => setProfileForm((f) => ({ ...f, local_body_id: v, ward_number: "" }))} disabled={!districtId}>
                      <SelectTrigger><SelectValue placeholder="Select panchayath" /></SelectTrigger>
                      <SelectContent>
                        {districtLocalBodies.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.body_type})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ward</Label>
                    <Select value={profileForm.ward_number} onValueChange={(v) => setProfileForm((f) => ({ ...f, ward_number: v }))} disabled={!profileForm.local_body_id}>
                      <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                      <SelectContent>
                        {wardOptions.map((w) => <SelectItem key={w} value={String(w)}>Ward {w}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={profileSaving}>{profileSaving ? "Saving..." : "Save Profile"}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">Get alerts on your phone when a customer books your service.</p>
              <NotificationToggle />
            </div>
            <AccountSettingsSection className="space-y-3" />
          </TabsContent>

          <TabsContent value="services" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyService); setEditId(null); } }}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Service</Button></DialogTrigger>
                <DialogContent className="w-[calc(100%-2rem)] max-h-[85dvh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editId ? "Edit Service" : "New Service"}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Service Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div>
                      <Label>Category</Label>
                      <Select value={form.category_id || "none"} onValueChange={(v) => {
                        const id = v === "none" ? "" : v;
                        const nextUnits = id ? unitsForCategoryType(categories.find((c) => c.id === id)?.category_type) : PRICE_UNITS;
                        const keep = nextUnits.some((u) => u.value === form.price_unit);
                        setForm({ ...form, category_id: id, price_unit: keep ? form.price_unit : nextUnits[0].value });
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                    <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><Label>Price (₹)</Label><Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
                      <div>
                        <Label>Price Type</Label>
                        <Select value={form.price_unit} onValueChange={(v) => setForm({ ...form, price_unit: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{unitOptions.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><Label>Contact Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
                      <div><Label>WhatsApp</Label><Input value={form.contact_whatsapp} onChange={(e) => setForm({ ...form, contact_whatsapp: e.target.value })} /></div>
                    </div>
                    <div><Label>Coverage Area</Label><Input value={form.coverage_area} onChange={(e) => setForm({ ...form, coverage_area: e.target.value })} /></div>
                    <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
                    <p className="text-xs text-muted-foreground">New services stay hidden until an admin approves them.</p>
                    <Button className="w-full" onClick={save}>Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {services.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No services added yet</CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="flex flex-wrap gap-3 p-4">
                      {s.image_url && <img src={s.image_url} alt={s.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" loading="lazy" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                           <h3 className="min-w-0 break-words font-semibold">{s.name}</h3>
                           <Badge className="shrink-0" variant={s.is_approved ? "default" : "outline"}>{s.is_approved ? "Approved" : "Pending"}</Badge>
                        </div>
                        <p className="text-sm text-primary">{formatServicePrice(Number(s.price), s.price_unit)}</p>
                        {s.description && <p className="line-clamp-2 text-xs text-muted-foreground">{s.description}</p>}
                         <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Switch checked={s.is_active} onCheckedChange={(v) => toggleActive(s.id, v)} />
                          <span className="text-xs text-muted-foreground">Active</span>
                          {isProductService(s) && (
                            <Button variant="outline" size="sm" onClick={() => setPacksFor(s)}>
                              <Package className="mr-1 h-3.5 w-3.5" /> Packs
                            </Button>
                          )}
                           <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Edit ${s.name}`} title="Edit service" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                           <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Delete ${s.name}`} title="Delete service" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-4">
            <Tabs defaultValue="pending">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending">Pending ({openRequests.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({closedRequests.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-3 space-y-3">
                {openRequests.length === 0 ? (
                  <Card><CardContent className="py-10 text-center text-muted-foreground">No pending requests</CardContent></Card>
                ) : openRequests.map(renderRequest)}
              </TabsContent>
              <TabsContent value="completed" className="mt-3 space-y-3">
                {closedRequests.length === 0 ? (
                  <Card><CardContent className="py-10 text-center text-muted-foreground">Nothing completed yet</CardContent></Card>
                ) : closedRequests.map(renderRequest)}
              </TabsContent>
            </Tabs>
          </TabsContent>

        </Tabs>
      </main>

      {packsFor && (
        <VariantManager
          serviceId={packsFor.id}
          serviceName={packsFor.name}
          open={!!packsFor}
          onOpenChange={(v) => !v && setPacksFor(null)}
        />
      )}

      {/* New request popup */}
      <UtilityRequestNotificationDialog
        open={alertGroup !== null} onOpenChange={(v) => { if (!v) setAlertGroup(null); }}
        group={alertGroup ?? undefined}
        requests={requests}
        serviceName={serviceName} onAccept={(id) => setAcceptId(id)}
        onComplete={(id) => setRequestStatus(id, "completed")}
        onCancel={cancelRequest} onRemindLater={remindLater}
      />
      <AvailabilityDialog open={!!acceptId} onOpenChange={(v) => !v && setAcceptId(null)} onConfirm={acceptWithAvailability} />

      {/* Floating bell */}
      {(() => {
        const unfinishedCount = requests.filter((r) => UTILITY_UNFINISHED_STATUSES.includes(r.status)).length;
        const total = pending + unfinishedCount;
         if (total === 0 || alertGroup !== null || remindersPaused) return null;
        return (
          <Button
            aria-label={`Open service request notifications (${total})`}
            onClick={() => setAlertGroup(pending > 0 ? "new" : "pending")}
            className={`${pending > 0 ? "delivery-blue motion-safe:animate-bounce" : "seller-pending-theme"} delivery-gradient fixed bottom-20 right-4 z-50 flex h-16 w-auto items-center justify-center gap-2 rounded-lg px-4 text-primary-foreground shadow-lg`}
          >
            <Bell className="h-6 w-6" />
            <span className="text-base font-bold">{pending > 0 ? "New requests" : "Pending requests"}</span>
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
              {total}
            </span>
          </Button>
        );
      })()}
    </div>

  );
};

export default UtilityPartnerDashboard;