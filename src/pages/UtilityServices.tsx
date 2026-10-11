import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Wrench, MapPin, Phone, Search, Building2, ChevronRight, Package, Minus, Plus, ShoppingCart, History, RefreshCw, CheckCircle2, Circle } from "lucide-react";
import { bookingGroup, isAutoCancelledRequest, formatServicePrice, statusLabel, type UtilityCategory, type UtilityRequest, type UtilityService, type UtilityVariant } from "@/lib/utilityServices";
import { formatAvailability } from "@/components/utility/AvailabilityDialog";
import AddressFormFields, {
  emptyAddressForm,
  formatAddressText,
  validateAddressForm,
  type AddressFormValues,
} from "@/components/customer/AddressFormFields";

interface SavedAddress {
  id: string;
  label: string;
  contact_name: string;
  contact_phone: string;
  address_line1: string;
  address_line2: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

interface ProviderInfo {
  provider_user_id: string;
  display_name: string | null;
  company_name: string | null;
  mobile_number: string | null;
  business_address: string | null;
  local_body_name: string | null;
  ward_number: number | null;
  avatar_url?: string | null;
}

const DIRECT_KEY = "__direct__";
const UTILITY_TRACKING_STEPS = [
  { status: "pending", label: "Request received" },
  { status: "assigned", label: "Accepted by supplier" },
  { status: "in_progress", label: "In progress" },
  { status: "completed", label: "Completed" },
];

const UtilityServices = () => {
  const [categories, setCategories] = useState<UtilityCategory[]>([]);
  const [services, setServices] = useState<UtilityService[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [activeCat, setActiveCat] = useState<UtilityCategory | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<UtilityService | null>(null);
  const [form, setForm] = useState({ contact_name: "", contact_phone: "", address: "" });
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addrMode, setAddrMode] = useState<"saved" | "new">("saved");
  const [addrForm, setAddrForm] = useState<AddressFormValues>(emptyAddressForm);
  const [submitting, setSubmitting] = useState(false);
  const [variants, setVariants] = useState<UtilityVariant[]>([]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [historyMode, setHistoryMode] = useState(false);
  const [requestHistory, setRequestHistory] = useState<UtilityRequest[]>([]);
  const [historyServiceNames, setHistoryServiceNames] = useState<Record<string, string>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [trackingRequestId, setTrackingRequestId] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<"pending" | "completed" | "cancelled">("pending");
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadRequestHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    setHistoryError(null);
    // Sweep bookings that waited past their category's auto-cancel limit.
    await supabase.rpc("auto_cancel_stale_utility_requests" as never);
    const { data, error } = await supabase
      .from("utility_service_requests")
      .select("*")
      .eq("customer_user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setHistoryError("Your bookings could not be loaded. Please try again.");
      setHistoryLoading(false);
      return;
    }

    const requests = (data as UtilityRequest[]) ?? [];
    setRequestHistory(requests);
    const serviceIds = [...new Set(requests.map((request) => request.service_id))];
    if (serviceIds.length > 0) {
      const { data: servicesData } = await supabase
        .from("utility_services")
        .select("id, name")
        .in("id", serviceIds);
      setHistoryServiceNames(Object.fromEntries(
        ((servicesData as { id: string; name: string }[]) ?? []).map((service) => [service.id, service.name])
      ));
    } else {
      setHistoryServiceNames({});
    }
    setHistoryLoading(false);
  }, [user]);

  const bookingGroups = useMemo(() => ({
    pending: requestHistory.filter((request) => bookingGroup(request.status) === "pending"),
    completed: requestHistory.filter((request) => bookingGroup(request.status) === "completed"),
    cancelled: requestHistory.filter((request) => bookingGroup(request.status) === "cancelled"),
  }), [requestHistory]);
  const bookingTabs = [
    { key: "pending" as const, label: "Pending", count: bookingGroups.pending.length },
    { key: "completed" as const, label: "Completed", count: bookingGroups.completed.length },
    ...(bookingGroups.cancelled.length > 0
      ? [{ key: "cancelled" as const, label: "Cancelled", count: bookingGroups.cancelled.length }]
      : []),
  ];
  const activeBookingTab = bookingTabs.some((tab) => tab.key === historyTab) ? historyTab : "pending";
  const visibleBookings = bookingGroups[activeBookingTab];

  useEffect(() => {
    if (!historyMode || !user) return;
    void loadRequestHistory();
    const channel = supabase
      .channel(`customer-utility-history-${user.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "utility_service_requests",
        filter: `customer_user_id=eq.${user.id}`,
      }, () => { void loadRequestHistory(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [historyMode, user, loadRequestHistory]);

  const openRequestHistory = () => {
    if (!user) {
      toast({ title: "Please log in", description: "Log in to view your utility bookings." });
      navigate("/customer/login");
      return;
    }
    setTrackingRequestId(null);
    setHistoryTab("pending");
    setHistoryMode(true);
  };

  useEffect(() => {
    const load = async () => {
      const [cats, svcs, provs, areas] = await Promise.all([
        supabase.from("utility_service_categories").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("utility_services").select("*").eq("is_active", true).eq("is_approved", true).order("sort_order"),
        (supabase as any).rpc("get_utility_providers"),
        supabase.from("utility_seller_areas").select("seller_user_id, local_body_id, ward_number"),
      ]);
      setCategories((cats.data as UtilityCategory[]) ?? []);
      // Area scoping: a service is shown to customers of the panchayath/ward it is
      // pinned to, OR to customers in any panchayath/ward allocated to its provider
      // (utility_seller_areas; a null ward there means the whole local body).
      // Services with no panchayath and no allocated areas are shown to everyone.
      const myLb = (profile as any)?.local_body_id ?? null;
      const myWard = (profile as any)?.ward_number ?? null;
      const areaRows = (areas.data as { seller_user_id: string; local_body_id: string; ward_number: number | null }[]) ?? [];
      const matchesCustomer = (lb: string | null, ward: number | null) => {
        if (!lb) return true;
        if (!myLb || lb !== myLb) return false;
        if (ward && myWard && ward !== myWard) return false;
        return true;
      };
      const visible = ((svcs.data as UtilityService[]) ?? []).filter((s) => {
        if (matchesCustomer(s.local_body_id, s.ward_number)) return true;
        if (!myLb || !s.provider_user_id) return false;
        return areaRows.some(
          (a) =>
            a.seller_user_id === s.provider_user_id &&
            a.local_body_id === myLb &&
            (a.ward_number == null || !myWard || a.ward_number === myWard)
        );
      });
      setServices(visible);
      setProviders((provs?.data as ProviderInfo[]) ?? []);
      setLoading(false);
    };
    load();
  }, [profile?.local_body_id, profile?.ward_number]);

  const isProductCat = activeCat?.category_type === "product";

  // Packs for the listing being ordered
  useEffect(() => {
    const loadVariants = async () => {
      if (!booking) { setVariants([]); setVariantId(null); return; }
      const { data } = await supabase
        .from("utility_service_variants")
        .select("*")
        .eq("service_id", booking.id)
        .eq("is_active", true)
        .order("sort_order")
        .order("pack_size");
      const list = (data as UtilityVariant[]) ?? [];
      setVariants(list);
      setVariantId(list[0]?.id ?? null);
      setQty(1);
    };
    loadVariants();
  }, [booking]);

  const selectedVariant = variants.find((v) => v.id === variantId) ?? null;
  const unitPrice = selectedVariant ? Number(selectedVariant.price) : Number(booking?.price ?? 0);
  const orderTotal = unitPrice * qty;

  const providerMap = useMemo(() => {
    const m = new Map<string, ProviderInfo>();
    providers.forEach((p) => m.set(p.provider_user_id, p));
    return m;
  }, [providers]);

  // Services inside the selected category
  const catServices = useMemo(
    () => (activeCat ? services.filter((s) => s.category_id === activeCat.id) : []),
    [services, activeCat]
  );

  // Suppliers/companies inside the selected category
  const catSuppliers = useMemo(() => {
    const groups = new Map<string, { key: string; name: string; info?: ProviderInfo; items: UtilityService[] }>();
    catServices.forEach((s) => {
      const key = s.provider_user_id ?? DIRECT_KEY;
      const info = s.provider_user_id ? providerMap.get(s.provider_user_id) : undefined;
      const name = info?.display_name || (key === DIRECT_KEY ? "Pennyekart Direct" : "Service Provider");
      if (!groups.has(key)) groups.set(key, { key, name, info, items: [] });
      groups.get(key)!.items.push(s);
    });
    let list = Array.from(groups.values());
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (g) => g.name.toLowerCase().includes(q) || g.items.some((s) => s.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [catServices, providerMap, query]);

  const selectedSupplier = useMemo(
    () => catSuppliers.find((g) => g.key === activeProvider) ?? null,
    [catSuppliers, activeProvider]
  );

  const filteredCategories = useMemo(() => {
    const counts = new Map<string, number>();
    services.forEach((s) => s.category_id && counts.set(s.category_id, (counts.get(s.category_id) ?? 0) + 1));
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .map((c) => ({ ...c, serviceCount: counts.get(c.id) ?? 0 }));
  }, [categories, services, query]);

  const goBack = () => {
    if (activeProvider) return setActiveProvider(null);
    if (activeCat) return setActiveCat(null);
    navigate("/");
  };

  const needsLocation = booking?.requires_location !== false;
  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId) ?? null;

  const openBooking = async (s: UtilityService) => {
    if (!user) {
      toast({ title: "Please log in", description: "Log in to request a service." });
      navigate("/customer/login");
      return;
    }
    const name = profile?.full_name ?? "";
    const phone = String((profile as any)?.mobile_number ?? "").replace(/\D/g, "").slice(-10);
    setForm({ contact_name: name, contact_phone: phone, address: "" });
    setBooking(s);

    const { data } = await supabase
      .from("customer_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    const list = (data as SavedAddress[]) ?? [];
    setSavedAddresses(list);
    const first = list[0] ?? null;
    setSelectedAddressId(first?.id ?? null);
    setAddrMode(first ? "saved" : "new");
    setAddrForm({
      ...emptyAddressForm,
      contact_name: name,
      contact_phone: phone,
      is_default: list.length === 0,
    });
    if (first) {
      setForm({ contact_name: first.contact_name, contact_phone: first.contact_phone, address: formatAddressText(first) });
    }
  };

  // keep the contact fields in sync with the chosen saved address
  useEffect(() => {
    if (addrMode !== "saved" || !selectedAddress) return;
    setForm({
      contact_name: selectedAddress.contact_name,
      contact_phone: selectedAddress.contact_phone,
      address: formatAddressText(selectedAddress),
    });
  }, [selectedAddressId, addrMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitRequest = async () => {
    if (!booking || !user) return;
    if (variants.length > 0 && !selectedVariant) {
      toast({ title: "Please choose a pack", variant: "destructive" });
      return;
    }

    let addressText = form.address;
    let addressId: string | null = null;
    let lat: number | null = null;
    let lng: number | null = null;
    let contactName = form.contact_name.trim();
    let contactPhone = form.contact_phone;

    if (needsLocation) {
      if (addrMode === "new" || savedAddresses.length === 0) {
        const invalid = validateAddressForm(addrForm);
        if (invalid) {
          toast({ title: invalid, variant: "destructive" });
          return;
        }
        setSubmitting(true);
        const { data: inserted, error: addrErr } = await supabase
          .from("customer_addresses")
          .insert({
            user_id: user.id,
            label: addrForm.label,
            contact_name: addrForm.contact_name.trim(),
            contact_phone: addrForm.contact_phone.replace(/\D/g, "").slice(-10),
            address_line1: addrForm.address_line1.trim(),
            address_line2: addrForm.address_line2.trim() || null,
            landmark: addrForm.landmark.trim() || null,
            city: addrForm.city.trim() || null,
            state: addrForm.state.trim() || null,
            pincode: addrForm.pincode.trim() || null,
            latitude: addrForm.latitude,
            longitude: addrForm.longitude,
            is_default: addrForm.is_default || savedAddresses.length === 0,
          })
          .select("*")
          .single();
        if (addrErr || !inserted) {
          setSubmitting(false);
          toast({ title: "Could not save your location", description: addrErr?.message, variant: "destructive" });
          return;
        }
        const saved = inserted as SavedAddress;
        addressId = saved.id;
        addressText = formatAddressText(saved);
        lat = saved.latitude;
        lng = saved.longitude;
        contactName = saved.contact_name;
        contactPhone = saved.contact_phone;
      } else {
        if (!selectedAddress) {
          toast({ title: "Please choose a delivery location", variant: "destructive" });
          return;
        }
        addressId = selectedAddress.id;
        addressText = formatAddressText(selectedAddress);
        lat = selectedAddress.latitude;
        lng = selectedAddress.longitude;
        contactName = selectedAddress.contact_name;
        contactPhone = selectedAddress.contact_phone;
      }
    }

    if (!contactName || !/^\d{10}$/.test(contactPhone)) {
      setSubmitting(false);
      toast({ title: "Enter your name and a valid 10-digit phone", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { data: request, error } = await supabase.from("utility_service_requests").insert({
      service_id: booking.id,
      customer_user_id: user.id,
      contact_name: contactName,
      contact_phone: contactPhone,
      address: addressText || null,
      address_id: addressId,
      latitude: lat,
      longitude: lng,
      variant_id: selectedVariant?.id ?? null,
      variant_label: selectedVariant?.label ?? null,
      quantity: qty,
      unit_price: unitPrice || null,
      total_amount: orderTotal || null,
    }).select("id").single();
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not send request", description: error.message, variant: "destructive" });
    } else {
      void supabase.functions.invoke("send-utility-request-push", { body: { request_id: request.id } })
        .then(({ error: pushError }) => {
          if (pushError) console.error("Utility request push failed:", pushError.message);
        })
        .catch((pushError) => console.error("Utility request push failed:", pushError));
      toast({
        title: variants.length ? "Order placed!" : "Request sent!",
        description: "The supplier will contact you shortly.",
      });
      setBooking(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b bg-primary">
        <div className="container flex items-center gap-3 py-3">
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => historyMode ? setHistoryMode(false) : goBack()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <Wrench className="h-5 w-5 text-primary-foreground" />
            <h1 className="truncate text-lg font-bold text-primary-foreground">
              {selectedSupplier ? selectedSupplier.name : activeCat ? activeCat.name : "Utility Services"}
            </h1>
          </div>
          {historyMode ? (
            <Button variant="ghost" size="sm" className="ml-auto text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setHistoryMode(false)}>
              Browse services
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="ml-auto gap-1.5 text-primary-foreground hover:bg-primary-foreground/10" onClick={openRequestHistory}>
              <History className="h-4 w-4" /> My bookings
            </Button>
          )}
        </div>
      </header>

      <main className="container py-5">
        {!historyMode && !activeCat && !selectedSupplier && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">Offer your service on Pennyekart</p>
                <p className="text-xs text-muted-foreground">Register as a Utility Service Partner</p>
              </div>
              <Button size="sm" onClick={() => navigate("/utility-partner/signup")}>Register</Button>
            </CardContent>
          </Card>
        )}
        {!historyMode && (activeCat || selectedSupplier) && (
          <div className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
            <button className="hover:text-foreground" onClick={() => { setActiveCat(null); setActiveProvider(null); }}>Categories</button>
            {activeCat && (
              <>
                <ChevronRight className="h-3 w-3" />
                <button className="hover:text-foreground" onClick={() => setActiveProvider(null)}>{activeCat.name}</button>
              </>
            )}
            {selectedSupplier && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">{selectedSupplier.name}</span>
              </>
            )}
          </div>
        )}

        {!historyMode && <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={activeCat ? "Search suppliers or services..." : "Search categories..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>}

        {historyMode ? (
          <section className="space-y-4" aria-labelledby="booking-history-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="booking-history-title" className="text-xl font-semibold">My bookings</h2>
                <p className="text-sm text-muted-foreground">View your utility orders and service request updates.</p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadRequestHistory()} disabled={historyLoading} aria-label="Refresh bookings">
                <RefreshCw className={`h-4 w-4 ${historyLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
            {!historyError && requestHistory.length > 0 && (
              <div role="tablist" aria-label="Booking status" className="flex gap-1 rounded-lg border bg-muted/40 p-1">
                {bookingTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={activeBookingTab === tab.key}
                    onClick={() => { setHistoryTab(tab.key); setTrackingRequestId(null); }}
                    className={`min-h-11 flex-1 rounded-md px-3 text-sm font-medium transition-colors ${activeBookingTab === tab.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {tab.label}
                    <span className="ml-1.5 text-xs text-muted-foreground">{tab.count}</span>
                  </button>
                ))}
              </div>
            )}
            {historyError ? (
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <p>{historyError}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadRequestHistory()}>Try again</Button>
              </div>
            ) : historyLoading && requestHistory.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading your bookings…</p>
            ) : visibleBookings.length === 0 ? (
              <div className="flex flex-col items-center gap-3 border-y py-12 text-center">
                <Package className="h-10 w-10 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">
                    {activeBookingTab === "pending" ? "No pending bookings" : activeBookingTab === "completed" ? "No completed bookings yet" : "No cancelled bookings"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activeBookingTab === "pending"
                      ? "Your open utility orders and service requests will appear here."
                      : activeBookingTab === "completed"
                        ? "Bookings the supplier marks as finished will appear here."
                        : "Bookings you or the supplier cancelled will appear here."}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setHistoryMode(false)}>Browse services</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleBookings.map((request) => {
                  const currentStep = request.status === "quoted"
                    ? 0
                    : UTILITY_TRACKING_STEPS.findIndex((step) => step.status === request.status);
                  const cancelled = request.status === "cancelled";
                  const expanded = trackingRequestId === request.id;
                  return (
                    <Card key={request.id} className="overflow-hidden">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">Booking #{request.id.slice(0, 8)}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {new Date(request.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                          </div>
                          <Badge className="max-w-full whitespace-normal" variant={request.status === "completed" ? "default" : cancelled ? "destructive" : "secondary"}>
                            {isAutoCancelledRequest(request) ? "Auto-cancelled · Acceptance delayed" : statusLabel(request.status)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-start justify-between gap-2 border-t pt-3">
                          <div className="min-w-0">
                            <p className="break-words font-semibold">{historyServiceNames[request.service_id] ?? "Utility service"}</p>
                            {(request.variant_label || request.quantity) && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {[request.variant_label, `Qty: ${request.quantity ?? 1}`].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                          {(request.total_amount != null || request.quoted_amount != null) && (
                            <p className="shrink-0 font-semibold">₹{Number(request.quoted_amount ?? request.total_amount).toLocaleString("en-IN")}</p>
                          )}
                        </div>
                        {!cancelled && formatAvailability((request as any).availability_unit, (request as any).availability_value) && (
                          <p className="rounded-md bg-secondary p-2 text-sm font-medium text-secondary-foreground">
                            Service available within {formatAvailability((request as any).availability_unit, (request as any).availability_value)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => setTrackingRequestId(expanded ? null : request.id)}>
                            <History className="h-4 w-4" />{expanded ? "Hide status" : "Track status"}
                          </Button>
                          {["pending", "assigned", "quoted"].includes(request.status) && (
                            <Button variant="outline" size="sm" className="text-destructive border-destructive/40" onClick={async () => {
                              if (!window.confirm("Cancel this booking? The service partner will be notified.")) return;
                              const { data, error } = await supabase.rpc("cancel_my_utility_request" as never, { _request_id: request.id } as never);
                              if (error || !data) toast({ title: "Could not cancel", description: error?.message ?? "This booking can no longer be cancelled.", variant: "destructive" });
                              else { toast({ title: "Booking cancelled" }); void loadRequestHistory(); }
                            }}>Cancel booking</Button>
                          )}
                        </div>
                        {expanded && (
                          <div className="space-y-3 border-t pt-3" aria-label={`Status tracking for booking ${request.id.slice(0, 8)}`}>
                            {cancelled ? (
                              <p className="text-sm font-medium text-destructive">
                                {isAutoCancelledRequest(request)
                                  ? "This booking was cancelled automatically — the service partner was not available in time. Please try booking again later."
                                  : "This booking was cancelled."}
                              </p>
                            ) : (
                              <>
                                {request.status === "quoted" && (
                                  <p className="rounded-md border bg-muted/40 p-3 text-sm">The supplier provided a quote. Contact them if you need to discuss it.</p>
                                )}
                                <ol className="space-y-3">
                                  {UTILITY_TRACKING_STEPS.map((step, index) => {
                                    const complete = currentStep >= index;
                                    const current = currentStep === index;
                                    return (
                                      <li key={step.status} className="flex items-start gap-3">
                                        {complete ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40" />}
                                        <span className={`text-sm ${complete ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                                          {step.label}{current && <span className="ml-2 text-xs text-primary">Current status</span>}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ol>
                              </>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        ) : loading ? (
          <p className="text-center text-muted-foreground">Loading services...</p>
        ) : !activeCat ? (
          filteredCategories.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <Wrench className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">No categories yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setActiveCat(c); setActiveProvider(null); setQuery(""); }}
                  className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                >
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} loading="lazy" className="h-28 w-full object-cover" />
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center bg-primary/10">
                      <Wrench className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div className="space-y-1 p-3">
                    <h2 className="line-clamp-1 font-semibold text-foreground">{c.name}</h2>
                    {c.description && <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
                    <p className="text-xs font-medium text-primary">{c.serviceCount} listing{c.serviceCount === 1 ? "" : "s"}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : !selectedSupplier ? (
          catSuppliers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <Building2 className="h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">No suppliers in this category yet</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catSuppliers.map((g) => (
                <button
                  key={g.key}
                  onClick={() => { setActiveProvider(g.key); setQuery(""); }}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md"
                >
                  {g.info?.avatar_url ? (
                    <img
                      src={g.info.avatar_url}
                      alt={g.name}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold text-foreground">{g.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {g.items.length} service{g.items.length === 1 ? "" : "s"} available
                    </p>
                    {(g.info?.local_body_name || g.info?.business_address) && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {g.info?.local_body_name
                          ? `${g.info.local_body_name}${g.info.ward_number ? ` · Ward ${g.info.ward_number}` : ""}`
                          : g.info?.business_address}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )
        ) : selectedSupplier.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <Package className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No listings from this supplier yet</p>
          </div>
        ) : (
          <>
            {selectedSupplier.info && (
              <Card className="mb-4">
                <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    {selectedSupplier.info.avatar_url ? (
                      <img
                        src={selectedSupplier.info.avatar_url}
                        alt={selectedSupplier.name}
                        className="h-8 w-8 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <Building2 className="h-4 w-4 text-primary" />
                    )}
                    {selectedSupplier.name}
                  </div>
                  {selectedSupplier.info.local_body_name && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />{selectedSupplier.info.local_body_name}
                      {selectedSupplier.info.ward_number ? ` · Ward ${selectedSupplier.info.ward_number}` : ""}
                    </span>
                  )}
                  {selectedSupplier.info.mobile_number && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${selectedSupplier.info.mobile_number}`}>
                        <Phone className="mr-1 h-3 w-3" />Call supplier
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedSupplier.items.map((s) => (
              <Card key={s.id} className="overflow-hidden transition-shadow hover:shadow-md">
                {s.image_url && <img src={s.image_url} alt={s.name} className="h-36 w-full object-cover" loading="lazy" />}
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-foreground">{s.name}</h2>
                    <Badge variant="secondary">{formatServicePrice(Number(s.price), s.price_unit)}</Badge>
                  </div>
                  {s.description && <p className="line-clamp-3 text-sm text-muted-foreground">{s.description}</p>}
                  {s.coverage_area && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{s.coverage_area}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={() => openBooking(s)}>
                      {isProductCat ? (<><ShoppingCart className="mr-1 h-3.5 w-3.5" />Order Now</>) : "Request Service"}
                    </Button>
                    {s.contact_phone && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${s.contact_phone}`} aria-label={`Call ${s.name}`}><Phone className="h-4 w-4" /></a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </>
        )}
      </main>

      <Dialog open={!!booking} onOpenChange={(v) => !v && setBooking(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{variants.length ? "Order" : "Request"}: {booking?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {variants.length > 0 && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div>
                  <Label>Choose pack</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVariantId(v.id)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                          v.id === variantId ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"
                        }`}
                      >
                        <span className="font-medium">{v.label}</span>
                        <span className="ml-2 text-xs opacity-80">₹{Number(v.price)}</span>
                      </button>
                    ))}
                  </div>
                  {selectedVariant && selectedVariant.stock <= 0 && (
                    <p className="mt-1 text-xs text-destructive">Out of stock — supplier will confirm availability.</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Label>Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{qty}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Increase quantity">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-primary">₹{orderTotal}</span>
                </div>
              </div>
            )}
            {!needsLocation ? (
              <>
                <div><Label>Your Name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit number" /></div>
                <p className="text-xs text-muted-foreground">This listing does not need your address.</p>
              </>
            ) : addrMode === "saved" && savedAddresses.length > 0 ? (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" />Delivery location</Label>
                  <Button size="sm" variant="ghost" onClick={() => setAddrMode("new")}>Add new</Button>
                </div>
                {savedAddresses.length > 1 ? (
                  <div className="space-y-2">
                    {savedAddresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSelectedAddressId(a.id)}
                        className={`w-full rounded-lg border p-2 text-left text-sm transition-colors ${
                          a.id === selectedAddressId ? "border-primary bg-primary/5" : "hover:border-primary"
                        }`}
                      >
                        <span className="font-medium">{a.label}</span>
                        {a.is_default && <Badge className="ml-2 text-[10px]">Default</Badge>}
                        <div className="text-xs text-muted-foreground">{a.contact_name} · {a.contact_phone}</div>
                        <div className="text-xs text-muted-foreground">{formatAddressText(a)}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm">
                    <div className="font-medium">{selectedAddress?.contact_name} · {selectedAddress?.contact_phone}</div>
                    <div className="text-xs text-muted-foreground">{selectedAddress ? formatAddressText(selectedAddress) : ""}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" />Add your delivery location</Label>
                  {savedAddresses.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setAddrMode("saved")}>Use saved</Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">We will save this to your profile addresses for next time.</p>
                <AddressFormFields form={addrForm} setForm={setAddrForm} />
              </div>
            )}
            <Button className="w-full" onClick={submitRequest} disabled={submitting}>
              {submitting ? "Sending..." : variants.length ? `Place Order · ₹${orderTotal}` : "Send Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UtilityServices;