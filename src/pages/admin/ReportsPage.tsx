import { useEffect, useMemo, useState, type ReactNode, type KeyboardEvent } from "react";
import { format, subDays, subMonths, startOfDay, endOfDay, isWithinInterval, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, Filter, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, Package, Users, Wallet,
  Store, Truck, BarChart3, AlertTriangle, CheckCircle, Search,
  UserCheck, UserX, UserPlus, Activity, LogIn, Bell, BellRing, MousePointerClick, Network
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Order {
  id: string; status: string; total: number; items: any;
  created_at: string; user_id: string | null;
  seller_id: string | null; assigned_delivery_staff_id: string | null;
  godown_id: string | null;
}
interface Product { id: string; name: string; price: number; purchase_rate: number; mrp: number; stock: number; is_active: boolean; category: string | null; }
interface SellerProduct { id: string; name: string; price: number; purchase_rate: number; stock: number; seller_id: string; is_approved: boolean; }
interface GodownStock { id: string; quantity: number; product_id: string; purchase_price: number; godown_id: string; }
interface Profile { user_id: string; full_name: string | null; user_type: string; local_body_id: string | null; ward_number: number | null; created_at: string; mobile_number: string | null; last_login_at: string | null; fcm_token: string | null; }
interface SellerWallet { seller_id: string; balance: number; }
interface SellerWalletTxn { seller_id: string; type: string; amount: number; description: string | null; }
interface LocalBody { id: string; name: string; district_id: string; ward_count: number; }
interface District { id: string; name: string; }
interface PushNotification { id: string; title: string; created_at: string; is_active: boolean | null; }
interface PushRead { notification_id: string; user_id: string; delivered_at: string | null; read_at: string | null; clicked_at: string | null; }
interface Community { id: string; name: string; creator_user_id: string | null; created_at: string; }
interface CommunityMember { community_id: string; user_id: string; joined_at: string; }
interface CommunitySummaryRow { community_id: string; community_name: string; creator_user_id: string | null; creator_name: string | null; member_count: number; order_count: number; revenue: number | string; profit: number | string; }

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2,220 70% 50%))", "hsl(var(--chart-3,160 60% 45%))", "hsl(var(--chart-4,30 80% 55%))", "hsl(var(--chart-5,280 65% 60%))"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const pct = (n: number, d: number) => d ? `${((n / d) * 100).toFixed(1)}%` : "—";

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, sub, color = "text-primary", ...cardProps }: { label: string; value: string; icon: any; sub?: string; color?: string } & React.ComponentProps<typeof Card>) => (
  <Card {...cardProps}>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      <Icon className={`h-5 w-5 ${color}`} />
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

// ─── Popup table ─────────────────────────────────────────────────────────────
type Col = { label: string; right?: boolean };
const MAX_ROWS = 1000;
const DetailTable = ({ cols, rows, empty = "Nothing to show" }: { cols: Col[]; rows: ReactNode[][]; empty?: string }) =>
  rows.length === 0 ? (
    <p className="text-center text-muted-foreground py-8">{empty}</p>
  ) : (
    <>
      <Table>
        <TableHeader>
          <TableRow>{cols.map(c => <TableHead key={c.label} className={c.right ? "text-right" : ""}>{c.label}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, MAX_ROWS).map((r, i) => (
            <TableRow key={i}>{r.map((cell, j) => <TableCell key={j} className={cols[j]?.right ? "text-right" : ""}>{cell}</TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length > MAX_ROWS && <p className="text-xs text-muted-foreground text-center mt-2">Showing first {MAX_ROWS} of {rows.length}</p>}
    </>
  );
const Summary = ({ children }: { children: ReactNode }) => <p className="mb-3 text-sm text-muted-foreground">{children}</p>;

const CollapsibleSection = ({ title, sub, defaultOpen, children }: { title: string; sub?: string; defaultOpen?: boolean; children: ReactNode }) => {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2 rounded-lg border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:bg-accent/50">
          <span className="text-sm font-semibold">{title}</span>
          {sub && <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">{sub}</span>}
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180", !sub && "ml-auto")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const ReportsPage = () => {
  const [detail, setDetail] = useState<{ title: string; body: ReactNode } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([]);
  const [godownStock, setGodownStock] = useState<GodownStock[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sellerWallets, setSellerWallets] = useState<SellerWallet[]>([]);
  const [sellerTxns, setSellerTxns] = useState<SellerWalletTxn[]>([]);
  const [localBodies, setLocalBodies] = useState<LocalBody[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchHistory, setSearchHistory] = useState<{ search_query: string; result_count: number | null; created_at: string; customer_user_id: string }[]>([]);
  const [pushNotifications, setPushNotifications] = useState<PushNotification[]>([]);
  const [pushReads, setPushReads] = useState<PushRead[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communityMembers, setCommunityMembers] = useState<CommunityMember[]>([]);
  const [communitySummary, setCommunitySummary] = useState<CommunitySummaryRow[]>([]);

  // ─── Filters ───────────────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDistrict, setFilterDistrict] = useState<string>("all");
  const [filterLocalBody, setFilterLocalBody] = useState<string>("all");
  const [filterWard, setFilterWard] = useState<string>("all");

  // Compute available categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [products]);

  // Apply date preset
  const handleDatePreset = (preset: string) => {
    setDateRange(preset);
    const now = new Date();
    switch (preset) {
      case "7d": setDateFrom(subDays(now, 7)); setDateTo(now); break;
      case "30d": setDateFrom(subDays(now, 30)); setDateTo(now); break;
      case "90d": setDateFrom(subDays(now, 90)); setDateTo(now); break;
      case "6m": setDateFrom(subMonths(now, 6)); setDateTo(now); break;
      case "1y": setDateFrom(subMonths(now, 12)); setDateTo(now); break;
      case "custom": break;
      default: setDateFrom(undefined); setDateTo(undefined); break;
    }
  };

  // Build product maps early for category filter
  const productMapEarly: Record<string, Product> = {};
  products.forEach(p => { productMapEarly[p.id] = p; });
  const sellerProdMapEarly: Record<string, SellerProduct & { category?: string | null }> = {};
  sellerProducts.forEach(sp => { sellerProdMapEarly[sp.id] = sp as any; });

  // Profile lookup for location filtering
  const profileMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.forEach(p => { m[p.user_id] = p; });
    return m;
  }, [profiles]);


  const localBodyIdsForDistrict = useMemo(() => {
    if (filterDistrict === "all") return null;
    return new Set(localBodies.filter(lb => lb.district_id === filterDistrict).map(lb => lb.id));
  }, [localBodies, filterDistrict]);

  // Filter orders by date range, status, category, and location
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (dateFrom && dateTo) {
        const d = new Date(o.created_at);
        if (!isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) })) return false;
      }
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      if (filterCategory !== "all") {
        const items = Array.isArray(o.items) ? o.items : [];
        const hasCategory = items.some((item: any) => {
          const cat = productMapEarly[item.id]?.category || (sellerProdMapEarly[item.id] as any)?.category;
          return cat === filterCategory;
        });
        if (!hasCategory) return false;
      }
      // Location filters
      if (filterDistrict !== "all" || filterLocalBody !== "all" || filterWard !== "all") {
        if (!o.user_id) return false;
        const prof = profileMap[o.user_id];
        if (!prof) return false;
        if (filterLocalBody !== "all") {
          if (prof.local_body_id !== filterLocalBody) return false;
          if (filterWard !== "all" && prof.ward_number !== Number(filterWard)) return false;
        } else if (filterDistrict !== "all") {
          if (!prof.local_body_id || !localBodyIdsForDistrict?.has(prof.local_body_id)) return false;
        }
      }
      return true;
    });
  }, [orders, dateFrom, dateTo, filterStatus, filterCategory, productMapEarly, sellerProdMapEarly, filterDistrict, filterLocalBody, filterWard, profileMap, localBodyIdsForDistrict]);

  // Location filter derived data
  const filteredLocalBodies = useMemo(() => {
    if (filterDistrict === "all") return localBodies;
    return localBodies.filter(lb => lb.district_id === filterDistrict);
  }, [localBodies, filterDistrict]);

  const wardOptions = useMemo(() => {
    if (filterLocalBody === "all") return [];
    const lb = localBodies.find(l => l.id === filterLocalBody);
    if (!lb) return [];
    return Array.from({ length: lb.ward_count }, (_, i) => i + 1);
  }, [localBodies, filterLocalBody]);


  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [
        { data: ord }, { data: prod }, { data: sprod }, { data: gstock },
        { data: prof }, { data: sw }, { data: stxn }, { data: lb }, { data: dist },
        { data: sh }, { data: pn }, { data: pr }, { data: com }, { data: cm }
      ] = await Promise.all([
        supabase.from("orders").select("id,status,total,items,created_at,user_id,seller_id,assigned_delivery_staff_id,godown_id").order("created_at", { ascending: false }),
        supabase.from("products").select("id,name,price,purchase_rate,mrp,stock,is_active,category"),
        supabase.from("seller_products").select("id,name,price,purchase_rate,stock,seller_id,is_approved"),
        supabase.from("godown_stock").select("id,quantity,product_id,purchase_price,godown_id"),
        supabase.from("profiles").select("user_id,full_name,user_type,local_body_id,ward_number,created_at,mobile_number,last_login_at,fcm_token"),
        supabase.from("seller_wallets").select("seller_id,balance"),
        supabase.from("seller_wallet_transactions").select("seller_id,type,amount,description"),
        supabase.from("locations_local_bodies").select("id,name,district_id,ward_count"),
        supabase.from("locations_districts").select("id,name"),
        supabase.from("customer_search_history").select("search_query,result_count,created_at,customer_user_id").order("created_at", { ascending: false }),
        supabase.from("notifications").select("id,title,created_at,is_active").order("created_at", { ascending: false }),
        supabase.from("notification_reads").select("notification_id,user_id,delivered_at,read_at,clicked_at"),
        supabase.from("communities").select("id,name,creator_user_id,created_at").order("created_at", { ascending: false }),
        supabase.from("community_members").select("community_id,user_id,joined_at"),
      ]);
      setOrders((ord ?? []) as Order[]);
      setProducts((prod ?? []) as Product[]);
      setSellerProducts((sprod ?? []) as SellerProduct[]);
      setGodownStock((gstock ?? []) as GodownStock[]);
      setProfiles((prof ?? []) as Profile[]);
      setSellerWallets((sw ?? []) as SellerWallet[]);
      setSellerTxns((stxn ?? []) as SellerWalletTxn[]);
      setLocalBodies((lb ?? []) as LocalBody[]);
      setDistricts((dist ?? []) as District[]);
      setSearchHistory(sh ?? []);
      setCommunities((com ?? []) as Community[]);
      setCommunityMembers((cm ?? []) as CommunityMember[]);
      setLoading(false);
    };
    load();
  }, []);

  // ─── Derived Data (uses filteredOrders) ────────────────────────────────────
  const delivered = filteredOrders.filter(o => o.status === "delivered");
  const cancelled = filteredOrders.filter(o => o.status === "cancelled");
  const pending = filteredOrders.filter(o => !["delivered", "cancelled"].includes(o.status));

  // P&L: revenue = sum of order totals (delivered); COGS = sum of (purchase_rate × qty) for all items
  let grossRevenue = 0, cogs = 0;
  const productMap: Record<string, Product> = {};
  products.forEach(p => { productMap[p.id] = p; });
  const sellerProdMap: Record<string, SellerProduct> = {};
  sellerProducts.forEach(sp => { sellerProdMap[sp.id] = sp; });

  delivered.forEach(o => {
    grossRevenue += o.total || 0;
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((item: any) => {
      const qty = item.quantity || 1;
      const pr = productMap[item.id]?.purchase_rate ?? sellerProdMap[item.id]?.purchase_rate ?? 0;
      cogs += pr * qty;
    });
  });
  const grossProfit = grossRevenue - cogs;
  const grossMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

  // Monthly revenue for chart (last 6 months)
  const monthlyMap: Record<string, { revenue: number; orders: number; cogs: number }> = {};
  delivered.forEach(o => {
    const m = new Date(o.created_at).toLocaleString("en-IN", { month: "short", year: "2-digit" });
    if (!monthlyMap[m]) monthlyMap[m] = { revenue: 0, orders: 0, cogs: 0 };
    monthlyMap[m].revenue += o.total || 0;
    monthlyMap[m].orders++;
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((item: any) => {
      const pr = productMap[item.id]?.purchase_rate ?? sellerProdMap[item.id]?.purchase_rate ?? 0;
      monthlyMap[m].cogs += pr * (item.quantity || 1);
    });
  });
  const monthlyData = Object.entries(monthlyMap).slice(-6).map(([month, v]) => ({
    month, revenue: Math.round(v.revenue), cogs: Math.round(v.cogs),
    profit: Math.round(v.revenue - v.cogs), orders: v.orders
  }));

  // Order status distribution
  const statusDist = [
    { name: "Delivered", value: delivered.length },
    { name: "Pending", value: pending.length },
    { name: "Cancelled", value: cancelled.length },
  ].filter(d => d.value > 0);

  // Product performance (regular products)
  const prodSales: Record<string, { name: string; sold: number; revenue: number; profit: number }> = {};
  delivered.forEach(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((item: any) => {
      const p = productMap[item.id];
      if (!p) return;
      if (!prodSales[item.id]) prodSales[item.id] = { name: p.name, sold: 0, revenue: 0, profit: 0 };
      const qty = item.quantity || 1;
      prodSales[item.id].sold += qty;
      prodSales[item.id].revenue += (item.price || p.price) * qty;
      prodSales[item.id].profit += ((item.price || p.price) - p.purchase_rate) * qty;
    });
  });
  const topProducts = Object.values(prodSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Seller performance
  const sellerProfiles = profiles.filter(p => p.user_type === "selling_partner");
  const sellerPerfMap: Record<string, { name: string; revenue: number; orders: number; balance: number; settled: number }> = {};
  sellerProfiles.forEach(p => {
    const wallet = sellerWallets.find(w => w.seller_id === p.user_id);
    const txns = sellerTxns.filter(t => t.seller_id === p.user_id);
    const credits = txns.filter(t => t.type !== "settlement").reduce((s, t) => s + Math.abs(t.amount), 0);
    const settled = txns.filter(t => t.type === "settlement" || t.description?.toLowerCase().includes("settl")).reduce((s, t) => s + Math.abs(t.amount), 0);
    sellerPerfMap[p.user_id] = { name: p.full_name || p.user_id, revenue: credits, orders: 0, balance: wallet?.balance || 0, settled };
  });
  delivered.forEach(o => {
    if (o.seller_id && sellerPerfMap[o.seller_id]) sellerPerfMap[o.seller_id].orders++;
  });
  const sellerPerf = Object.values(sellerPerfMap).sort((a, b) => b.revenue - a.revenue);

  // Local body performance
  const lbMap: Record<string, string> = {};
  localBodies.forEach(lb => { lbMap[lb.id] = lb.name; });
  const profileLbMap: Record<string, string> = {};
  profiles.forEach(p => { if (p.local_body_id) profileLbMap[p.user_id] = lbMap[p.local_body_id] || "Unknown"; });
  const lbPerf: Record<string, { name: string; orders: number; revenue: number }> = {};
  delivered.forEach(o => {
    const lb = o.user_id ? (profileLbMap[o.user_id] || "Unknown") : "Unknown";
    if (!lbPerf[lb]) lbPerf[lb] = { name: lb, orders: 0, revenue: 0 };
    lbPerf[lb].orders++;
    lbPerf[lb].revenue += o.total || 0;
  });
  const lbPerfArr = Object.values(lbPerf).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Stock health
  const lowStockProds = products.filter(p => p.stock >= 0 && p.stock <= 5 && p.is_active);
  const totalGodownStock = godownStock.reduce((s, g) => s + g.quantity, 0);
  const totalStockValue = godownStock.reduce((s, g) => s + g.quantity * g.purchase_price, 0);

  // Delivery staff performance
  const deliveryStaff = profiles.filter(p => p.user_type === "delivery_staff");
  const staffPerf: Record<string, { name: string; delivered: number; pending: number }> = {};
  deliveryStaff.forEach(p => { staffPerf[p.user_id] = { name: p.full_name || p.user_id, delivered: 0, pending: 0 }; });
  delivered.forEach(o => { if (o.assigned_delivery_staff_id && staffPerf[o.assigned_delivery_staff_id]) staffPerf[o.assigned_delivery_staff_id].delivered++; });
  pending.forEach(o => { if (o.assigned_delivery_staff_id && staffPerf[o.assigned_delivery_staff_id]) staffPerf[o.assigned_delivery_staff_id].pending++; });
  const staffPerfArr = Object.values(staffPerf).sort((a, b) => b.delivered - a.delivered);

  // Category breakdown (from delivered orders)
  const catMap: Record<string, { name: string; revenue: number; sold: number }> = {};
  delivered.forEach(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    items.forEach((item: any) => {
      const p = productMap[item.id] || sellerProdMap[item.id];
      const cat = (p as any)?.category || "Uncategorized";
      if (!catMap[cat]) catMap[cat] = { name: cat, revenue: 0, sold: 0 };
      catMap[cat].sold += item.quantity || 1;
      catMap[cat].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });
  const catData = Object.values(catMap).sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  // ─── Search Analytics ────────────────────────────────────────────────────
  const filteredSearchHistory = useMemo(() => {
    if (!dateFrom || !dateTo) return searchHistory;
    return searchHistory.filter(s => {
      const d = new Date(s.created_at);
      return isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
    });
  }, [searchHistory, dateFrom, dateTo]);

  const searchAnalytics = useMemo(() => {
    const queryCount: Record<string, { count: number; totalResults: number; zeroCount: number }> = {};
    filteredSearchHistory.forEach(s => {
      const q = s.search_query.toLowerCase().trim();
      if (!queryCount[q]) queryCount[q] = { count: 0, totalResults: 0, zeroCount: 0 };
      queryCount[q].count++;
      queryCount[q].totalResults += s.result_count ?? 0;
      if ((s.result_count ?? 0) === 0) queryCount[q].zeroCount++;
    });

    const topSearches = Object.entries(queryCount)
      .map(([query, v]) => ({ query, count: v.count, avgResults: v.count > 0 ? Math.round(v.totalResults / v.count) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const zeroResultSearches = Object.entries(queryCount)
      .filter(([, v]) => v.zeroCount > 0)
      .map(([query, v]) => ({ query, count: v.zeroCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Daily search volume (last 30 entries)
    const dailyMap: Record<string, number> = {};
    filteredSearchHistory.forEach(s => {
      const day = format(new Date(s.created_at), "dd MMM");
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });
    const dailyVolume = Object.entries(dailyMap).slice(-30).map(([day, searches]) => ({ day, searches }));

    const uniqueSearchers = new Set(filteredSearchHistory.map(s => s.customer_user_id)).size;
    const totalSearches = filteredSearchHistory.length;
    const zeroResultTotal = filteredSearchHistory.filter(s => (s.result_count ?? 0) === 0).length;

    return { topSearches, zeroResultSearches, dailyVolume, uniqueSearchers, totalSearches, zeroResultTotal };
  }, [filteredSearchHistory]);

  // ─── Customer Analytics ────────────────────────────────────────────────────
  const [custInactiveDays, setCustInactiveDays] = useState<number>(30);

  const customerAnalytics = useMemo(() => {
    const now = new Date();
    const customers = profiles.filter(p => p.user_type === "customer");

    // Build order map per customer
    const customerOrderMap: Record<string, { count: number; totalSpent: number; lastOrderDate: string | null; firstOrderDate: string | null }> = {};
    orders.forEach(o => {
      if (!o.user_id || o.status === "cancelled") return;
      if (!customerOrderMap[o.user_id]) customerOrderMap[o.user_id] = { count: 0, totalSpent: 0, lastOrderDate: null, firstOrderDate: null };
      const rec = customerOrderMap[o.user_id];
      rec.count++;
      if (o.status === "delivered") rec.totalSpent += o.total || 0;
      if (!rec.lastOrderDate || o.created_at > rec.lastOrderDate) rec.lastOrderDate = o.created_at;
      if (!rec.firstOrderDate || o.created_at < rec.firstOrderDate) rec.firstOrderDate = o.created_at;
    });

    // Classify customers
    type CustRow = {
      userId: string; name: string; mobile: string | null;
      localBodyId: string | null; wardNumber: number | null;
      status: "active" | "inactive" | "new" | "never_ordered";
      orderCount: number; totalSpent: number;
      lastOrderDate: string | null; firstOrderDate: string | null;
      daysSinceLastOrder: number | null; joinedAt: string;
    };

    const custRows: CustRow[] = customers.map(c => {
      const om = customerOrderMap[c.user_id];
      const orderCount = om?.count || 0;
      const totalSpent = om?.totalSpent || 0;
      const lastOrderDate = om?.lastOrderDate || null;
      const firstOrderDate = om?.firstOrderDate || null;
      const daysSinceLastOrder = lastOrderDate ? differenceInDays(now, new Date(lastOrderDate)) : null;

      let status: CustRow["status"];
      if (orderCount === 0) status = "never_ordered";
      else if (daysSinceLastOrder !== null && daysSinceLastOrder <= 7) status = "active";
      else if (daysSinceLastOrder !== null && daysSinceLastOrder <= custInactiveDays) status = "active";
      else status = "inactive";

      // If joined within 7 days and no orders, mark as new
      const joinedDaysAgo = differenceInDays(now, new Date(c.created_at || now));
      if (orderCount === 0 && joinedDaysAgo <= 7) status = "new";

      return {
        userId: c.user_id,
        name: c.full_name || "Unknown",
        mobile: c.mobile_number || null,
        localBodyId: c.local_body_id,
        wardNumber: c.ward_number,
        status,
        orderCount,
        totalSpent,
        lastOrderDate,
        firstOrderDate,
        daysSinceLastOrder,
        joinedAt: c.created_at || "",
      };
    });

    // Apply location filters
    let filtered = custRows;
    if (filterDistrict !== "all" || filterLocalBody !== "all" || filterWard !== "all") {
      filtered = custRows.filter(c => {
        if (filterLocalBody !== "all") {
          if (c.localBodyId !== filterLocalBody) return false;
          if (filterWard !== "all" && c.wardNumber !== Number(filterWard)) return false;
        } else if (filterDistrict !== "all") {
          if (!c.localBodyId || !localBodyIdsForDistrict?.has(c.localBodyId)) return false;
        }
        return true;
      });
    }

    // Apply date filter — only include customers who joined within date range
    if (dateFrom && dateTo) {
      filtered = filtered.filter(c => {
        if (!c.joinedAt) return true;
        const d = new Date(c.joinedAt);
        return isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) }) ||
          (c.lastOrderDate && isWithinInterval(new Date(c.lastOrderDate), { start: startOfDay(dateFrom), end: endOfDay(dateTo) }));
      });
    }

    const totalCustomers = filtered.length;
    const active = filtered.filter(c => c.status === "active");
    const inactive = filtered.filter(c => c.status === "inactive");
    const newCust = filtered.filter(c => c.status === "new");
    const neverOrdered = filtered.filter(c => c.status === "never_ordered");

    const avgOrderValue = active.length > 0
      ? active.reduce((s, c) => s + (c.orderCount > 0 ? c.totalSpent / c.orderCount : 0), 0) / active.length
      : 0;

    const totalRevenue = filtered.reduce((s, c) => s + c.totalSpent, 0);
    const repeatCustomers = filtered.filter(c => c.orderCount > 1);

    // Top customers by spend
    const topSpenders = [...filtered].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);

    // Activity by panchayath
    const lbActivity: Record<string, { name: string; active: number; inactive: number; newCust: number; neverOrdered: number; total: number }> = {};
    filtered.forEach(c => {
      const lbName = c.localBodyId ? (lbMap[c.localBodyId] || "Unknown") : "Unknown";
      if (!lbActivity[lbName]) lbActivity[lbName] = { name: lbName, active: 0, inactive: 0, newCust: 0, neverOrdered: 0, total: 0 };
      lbActivity[lbName].total++;
      if (c.status === "active") lbActivity[lbName].active++;
      else if (c.status === "inactive") lbActivity[lbName].inactive++;
      else if (c.status === "new") lbActivity[lbName].newCust++;
      else lbActivity[lbName].neverOrdered++;
    });
    const lbActivityArr = Object.values(lbActivity).sort((a, b) => b.total - a.total).slice(0, 10);

    // Status distribution for pie chart
    const statusDist = [
      { name: "Active", value: active.length },
      { name: "Inactive", value: inactive.length },
      { name: "New", value: newCust.length },
      { name: "Never Ordered", value: neverOrdered.length },
    ].filter(d => d.value > 0);

    return {
      totalCustomers, active, inactive, newCust, neverOrdered,
      avgOrderValue, totalRevenue, repeatCustomers,
      topSpenders, lbActivityArr, statusDist, filtered
    };
  }, [profiles, orders, custInactiveDays, filterDistrict, filterLocalBody, filterWard, localBodyIdsForDistrict, dateFrom, dateTo, lbMap]);

  // ─── Customer Login Analytics ──────────────────────────────────────────────
  const loginAnalytics = useMemo(() => {
    const now = new Date();
    const customers = profiles.filter(p => p.user_type === "customer");
    let rows = customers.map(c => {
      const days = c.last_login_at ? differenceInDays(now, new Date(c.last_login_at)) : null;
      return {
        userId: c.user_id, name: c.full_name || "Unknown", mobile: c.mobile_number || null,
        localBodyId: c.local_body_id, wardNumber: c.ward_number,
        lastLogin: c.last_login_at, joinedAt: c.created_at || "", daysSinceLogin: days,
      };
    });
    if (filterDistrict !== "all" || filterLocalBody !== "all" || filterWard !== "all") {
      rows = rows.filter(c => {
        if (filterLocalBody !== "all") {
          if (c.localBodyId !== filterLocalBody) return false;
          if (filterWard !== "all" && c.wardNumber !== Number(filterWard)) return false;
        } else if (filterDistrict !== "all") {
          if (!c.localBodyId || !localBodyIdsForDistrict?.has(c.localBodyId)) return false;
        }
        return true;
      });
    }
    if (dateFrom && dateTo) {
      rows = rows.filter(c => {
        const joined = c.joinedAt ? isWithinInterval(new Date(c.joinedAt), { start: startOfDay(dateFrom), end: endOfDay(dateTo) }) : false;
        const login = c.lastLogin ? isWithinInterval(new Date(c.lastLogin), { start: startOfDay(dateFrom), end: endOfDay(dateTo) }) : false;
        return joined || login;
      });
    }
    const loggedInToday = rows.filter(c => c.daysSinceLogin === 0);
    const loggedIn7 = rows.filter(c => c.daysSinceLogin !== null && c.daysSinceLogin <= 7);
    const loggedIn30 = rows.filter(c => c.daysSinceLogin !== null && c.daysSinceLogin <= 30);
    const neverLoggedIn = rows.filter(c => c.daysSinceLogin === null);
    const recencyDist = [
      { name: "Today", value: loggedInToday.length },
      { name: "1–7 days", value: rows.filter(c => c.daysSinceLogin !== null && c.daysSinceLogin >= 1 && c.daysSinceLogin <= 7).length },
      { name: "8–30 days", value: rows.filter(c => c.daysSinceLogin !== null && c.daysSinceLogin > 7 && c.daysSinceLogin <= 30).length },
      { name: "31+ days", value: rows.filter(c => c.daysSinceLogin !== null && c.daysSinceLogin > 30).length },
      { name: "Never", value: neverLoggedIn.length },
    ];
    return { filtered: rows, loggedInToday, loggedIn7, loggedIn30, neverLoggedIn, recencyDist };
  }, [profiles, filterDistrict, filterLocalBody, filterWard, localBodyIdsForDistrict, dateFrom, dateTo]);

  // ─── Push Notification Analytics ───────────────────────────────────────────
  const pushAnalytics = useMemo(() => {
    const customers = profiles.filter(p => p.user_type === "customer");
    const inLocation = (c: typeof customers[number]) => {
      if (filterLocalBody !== "all") {
        if (c.local_body_id !== filterLocalBody) return false;
        if (filterWard !== "all" && c.ward_number !== Number(filterWard)) return false;
        return true;
      }
      if (filterDistrict !== "all") return !!c.local_body_id && !!localBodyIdsForDistrict?.has(c.local_body_id);
      return true;
    };
    const scoped = customers.filter(inLocation);
    const scopedIds = new Set(scoped.map(c => c.user_id));
    const notifInRange = pushNotifications.filter(n => {
      if (dateFrom && dateTo) return isWithinInterval(new Date(n.created_at), { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
      return true;
    });
    const notifIds = new Set(notifInRange.map(n => n.id));
    const reads = pushReads.filter(r => notifIds.has(r.notification_id) && scopedIds.has(r.user_id));
    const delivered = reads.filter(r => r.delivered_at).length;
    const read = reads.filter(r => r.read_at).length;
    const clicked = reads.filter(r => r.clicked_at).length;
    const registered = scoped.filter(c => c.fcm_token).map(c => ({
      userId: c.user_id, name: c.full_name || "Unknown", mobile: c.mobile_number || null, lastLogin: c.last_login_at,
    }));

    const perCustomer = new Map<string, { name: string; mobile: string | null; delivered: number; read: number; clicked: number; lastClick: string | null }>();
    reads.forEach(r => {
      const p = profileMap[r.user_id];
      const rec = perCustomer.get(r.user_id) || { name: p?.full_name || "Customer", mobile: p?.mobile_number || null, delivered: 0, read: 0, clicked: 0, lastClick: null as string | null };
      if (r.delivered_at) rec.delivered++;
      if (r.read_at) rec.read++;
      if (r.clicked_at) { rec.clicked++; if (!rec.lastClick || r.clicked_at > rec.lastClick) rec.lastClick = r.clicked_at; }
      perCustomer.set(r.user_id, rec);
    });
    const customerRows = [...perCustomer.values()].sort((a, b) => b.clicked - a.clicked || b.delivered - a.delivered);

    const perNotif = notifInRange.map(n => {
      const rs = reads.filter(r => r.notification_id === n.id);
      return { id: n.id, title: n.title, createdAt: n.created_at, delivered: rs.filter(r => r.delivered_at).length, read: rs.filter(r => r.read_at).length, clicked: rs.filter(r => r.clicked_at).length };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { registered, delivered, read, clicked, customerRows, perNotif };
  }, [profiles, pushNotifications, pushReads, filterDistrict, filterLocalBody, filterWard, localBodyIdsForDistrict, dateFrom, dateTo, profileMap]);

  // ─── Community Analytics ───────────────────────────────────────────────────
  useEffect(() => {
    const from = (dateFrom ? startOfDay(dateFrom) : startOfDay(subDays(new Date(), 30))).toISOString();
    const to = (dateTo ? endOfDay(dateTo) : endOfDay(new Date())).toISOString();
    // Server-side analytics: admins can't read other users' communities directly (RLS), so use the permission-checked RPC.
    (supabase.rpc as any)("get_community_analytics", { _from: from, _to: to }).then(({ data, error }: any) => {
      if (error) console.error("community analytics:", error.message);
      setCommunitySummary((data ?? []) as CommunitySummaryRow[]);
    });
  }, [dateFrom, dateTo]);

  const communityAnalytics = useMemo(() => {
    const rows = communitySummary.map((s: any) => ({
      id: s.community_id as string,
      name: s.community_name as string,
      creator: s.creator_name || (s.creator_user_id ? profileMap[s.creator_user_id]?.full_name || "—" : "—"),
      mobile: (s.creator_mobile as string) || "—",
      created: s.created_at ? format(new Date(s.created_at), "dd MMM yyyy") : "—",
      members: Number(s.member_count || 0),
      newMembers: Number(s.members_joined_period || 0),
      orders: Number(s.order_count || 0),
      revenue: Number(s.revenue || 0),
      cost: Number(s.cost || 0),
      profit: Number(s.profit || 0),
    }));
    const revenue = rows.reduce((sum, r) => sum + r.revenue, 0);
    const orders = rows.reduce((sum, r) => sum + r.orders, 0);
    return {
      rows,
      totalMembers: rows.reduce((sum, r) => sum + r.members, 0),
      newMembers: rows.reduce((sum, r) => sum + r.newMembers, 0),
      activeCommunities: rows.filter(r => r.orders > 0).length,
      orders,
      revenue,
      profit: rows.reduce((sum, r) => sum + r.profit, 0),
      avgOrder: orders > 0 ? revenue / orders : 0,
    };
  }, [communitySummary, profileMap]);

  // ─── Click-to-open detail popups ───────────────────────────────────────────
  const cardClick = (title: string, build: () => ReactNode) => {
    const open = () => setDetail({ title, body: build() });
    return {
      onClick: open,
      role: "button" as const,
      tabIndex: 0,
      onKeyDown: (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } },
      className: "cursor-pointer transition-colors hover:border-primary/60 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    };
  };

  const custName = (id: string | null) => (id ? profileMap[id]?.full_name || "Customer" : "—");
  const orderCost = (o: Order) =>
    (Array.isArray(o.items) ? o.items : []).reduce(
      (sum: number, it: any) => sum + (productMap[it.id]?.purchase_rate ?? sellerProdMap[it.id]?.purchase_rate ?? 0) * (it.quantity || 1), 0);
  const statusBadge = (st: string) => (
    <Badge variant={st === "delivered" ? "default" : st === "cancelled" ? "destructive" : "secondary"}>{st.replace(/_/g, " ")}</Badge>
  );
  const shortDate = (d: string | null) => (d ? format(new Date(d), "dd MMM yy") : "—");

  const ordersTable = (list: Order[]) => (
    <>
      <Summary>{list.length} orders · Total value {fmt(list.reduce((sum, o) => sum + (o.total || 0), 0))}</Summary>
      <DetailTable
        cols={[{ label: "Order" }, { label: "Customer" }, { label: "Status" }, { label: "Items", right: true }, { label: "Total", right: true }, { label: "Date" }]}
        rows={list.map(o => [
          <span className="font-mono text-xs">{o.id.slice(0, 8)}…</span>, custName(o.user_id), statusBadge(o.status),
          Array.isArray(o.items) ? o.items.length : 0, fmt(o.total || 0), shortDate(o.created_at),
        ])}
        empty="No orders"
      />
    </>
  );

  const financeTable = (list: Order[]) => {
    const rev = list.reduce((sum, o) => sum + (o.total || 0), 0);
    const cost = list.reduce((sum, o) => sum + orderCost(o), 0);
    return (
      <>
        <Summary>{list.length} delivered orders · Revenue {fmt(rev)} · Cost {fmt(cost)} · Profit {fmt(rev - cost)} ({pct(rev - cost, rev)})</Summary>
        <DetailTable
          cols={[{ label: "Order" }, { label: "Customer" }, { label: "Date" }, { label: "Revenue", right: true }, { label: "Cost", right: true }, { label: "Profit", right: true }]}
          rows={list.map(o => {
            const c = orderCost(o); const r = o.total || 0;
            return [<span className="font-mono text-xs">{o.id.slice(0, 8)}…</span>, custName(o.user_id), shortDate(o.created_at), fmt(r), fmt(c),
              <span className={r - c >= 0 ? "text-green-600" : "text-destructive"}>{fmt(r - c)}</span>];
          })}
          empty="No delivered orders"
        />
      </>
    );
  };

  const monthlyTable = () => (
    <DetailTable
      cols={[{ label: "Month" }, { label: "Orders", right: true }, { label: "Revenue", right: true }, { label: "COGS", right: true }, { label: "Profit", right: true }, { label: "Margin", right: true }]}
      rows={Object.entries(monthlyMap).map(([m, v]) => [m, v.orders, fmt(v.revenue), fmt(v.cogs),
        <span className={v.revenue - v.cogs >= 0 ? "text-green-600" : "text-destructive"}>{fmt(v.revenue - v.cogs)}</span>, pct(v.revenue - v.cogs, v.revenue)])}
      empty="No delivered orders"
    />
  );

  const plRows = [
    { label: "Gross Revenue (Delivered Orders)", value: fmt(grossRevenue), bold: false },
    { label: "(-) Cost of Goods Sold (COGS)", value: fmt(cogs), bold: false },
    { label: "Gross Profit", value: fmt(grossProfit), bold: true },
    { label: "Gross Margin %", value: `${grossMargin.toFixed(2)}%`, bold: true },
    { label: "Total Orders", value: String(orders.length), bold: false },
    { label: "Delivered Orders", value: String(delivered.length), bold: false },
    { label: "Cancelled Orders", value: String(cancelled.length), bold: false },
    { label: "Pending Orders", value: String(pending.length), bold: false },
    { label: "Average Order Value (Delivered)", value: delivered.length ? fmt(grossRevenue / delivered.length) : "—", bold: false },
  ];
  const plTable = () => (
    <Table>
      <TableBody>
        {plRows.map(row => (
          <TableRow key={row.label}>
            <TableCell className={row.bold ? "font-semibold" : ""}>{row.label}</TableCell>
            <TableCell className={`text-right ${row.bold ? "font-bold text-lg" : ""}`}>{row.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const categoryTable = () => (
    <DetailTable
      cols={[{ label: "Category" }, { label: "Units Sold", right: true }, { label: "Revenue", right: true }, { label: "% of Revenue", right: true }]}
      rows={Object.values(catMap).sort((a, b) => b.revenue - a.revenue).map(c => [c.name, c.sold, fmt(c.revenue), pct(c.revenue, Object.values(catMap).reduce((sum, x) => sum + x.revenue, 0))])}
      empty="No data yet"
    />
  );

  const productsTable = (list: Product[]) => (
    <>
      <Summary>{list.length} products</Summary>
      <DetailTable
        cols={[{ label: "Product" }, { label: "Category" }, { label: "Stock", right: true }, { label: "Price", right: true }, { label: "MRP", right: true }, { label: "Status" }]}
        rows={list.map(p => [p.name, p.category || "—", <Badge variant={p.stock <= 5 ? "destructive" : "secondary"}>{p.stock}</Badge>, `₹${p.price}`, `₹${p.mrp}`, p.is_active ? "Active" : "Inactive"])}
        empty="No products"
      />
    </>
  );

  const topProductsTable = () => (
    <DetailTable
      cols={[{ label: "Product" }, { label: "Units Sold", right: true }, { label: "Revenue", right: true }, { label: "Profit", right: true }, { label: "Margin", right: true }]}
      rows={Object.values(prodSales).sort((a, b) => b.revenue - a.revenue).map(p => [p.name, p.sold, fmt(p.revenue),
        <span className={p.profit >= 0 ? "text-green-600" : "text-destructive"}>{fmt(p.profit)}</span>, pct(p.profit, p.revenue)])}
      empty="No sales data"
    />
  );

  const sellersTable = () => (
    <DetailTable
      cols={[{ label: "Seller" }, { label: "Mobile" }, { label: "Products", right: true }, { label: "Delivered", right: true }, { label: "Revenue", right: true }, { label: "Settled", right: true }, { label: "Wallet", right: true }]}
      rows={sellerProfiles.map(p => {
        const perf = sellerPerfMap[p.user_id];
        return [p.full_name || p.user_id, p.mobile_number || "—", sellerProducts.filter(sp => sp.seller_id === p.user_id).length, perf.orders, fmt(perf.revenue), fmt(perf.settled), fmt(perf.balance)];
      })}
      empty="No sellers yet"
    />
  );

  const sellerProductsTable = (list: SellerProduct[]) => (
    <>
      <Summary>{list.length} seller products</Summary>
      <DetailTable
        cols={[{ label: "Product" }, { label: "Seller" }, { label: "Approval" }, { label: "Stock", right: true }, { label: "Price", right: true }]}
        rows={list.map(sp => [sp.name, profileMap[sp.seller_id]?.full_name || "Seller", sp.is_approved ? <Badge>Approved</Badge> : <Badge variant="destructive">Pending</Badge>, sp.stock, `₹${sp.price}`])}
        empty="No seller products"
      />
    </>
  );

  const staffTable = () => (
    <DetailTable
      cols={[{ label: "Staff" }, { label: "Mobile" }, { label: "Delivered", right: true }, { label: "Pending", right: true }, { label: "Success Rate", right: true }]}
      rows={deliveryStaff.map(p => {
        const sp = staffPerf[p.user_id]; const total = sp.delivered + sp.pending;
        return [sp.name, p.mobile_number || "—", sp.delivered, sp.pending, total > 0 ? `${((sp.delivered / total) * 100).toFixed(0)}%` : "—"];
      })}
      empty="No delivery staff yet"
    />
  );

  const stockTable = () => {
    const agg: Record<string, { name: string; qty: number; value: number; batches: number }> = {};
    godownStock.forEach(g => {
      if (!agg[g.product_id]) agg[g.product_id] = { name: productMap[g.product_id]?.name || g.product_id, qty: 0, value: 0, batches: 0 };
      agg[g.product_id].qty += g.quantity; agg[g.product_id].value += g.quantity * g.purchase_price; agg[g.product_id].batches++;
    });
    const rows = Object.values(agg).sort((a, b) => b.qty - a.qty);
    return (
      <>
        <Summary>{totalGodownStock.toLocaleString()} units · Stock value {fmt(totalStockValue)}</Summary>
        <DetailTable
          cols={[{ label: "Product" }, { label: "Batches", right: true }, { label: "Godown Stock", right: true }, { label: "Avg Cost", right: true }, { label: "Stock Value", right: true }]}
          rows={rows.map(r => [r.name, r.batches, r.qty, r.qty ? fmt(r.value / r.qty) : "—", fmt(r.value)])}
          empty="No godown stock"
        />
      </>
    );
  };

  const areaTable = () => (
    <DetailTable
      cols={[{ label: "Area" }, { label: "Orders", right: true }, { label: "Revenue", right: true }, { label: "Avg Order Value", right: true }, { label: "% of Revenue", right: true }]}
      rows={Object.values(lbPerf).sort((a, b) => b.revenue - a.revenue).map(lb => [lb.name, lb.orders, fmt(lb.revenue), lb.orders ? fmt(lb.revenue / lb.orders) : "—", pct(lb.revenue, grossRevenue)])}
      empty="No location data"
    />
  );

  const searchesTable = (list: typeof searchHistory) => (
    <>
      <Summary>{list.length} searches</Summary>
      <DetailTable
        cols={[{ label: "Search Query" }, { label: "Customer" }, { label: "Results", right: true }, { label: "Date" }]}
        rows={list.map(sh => [sh.search_query, custName(sh.customer_user_id), <Badge variant={(sh.result_count ?? 0) === 0 ? "destructive" : "secondary"}>{sh.result_count ?? 0}</Badge>, shortDate(sh.created_at)])}
        empty="No search data"
      />
    </>
  );

  const searchersTable = () => {
    const m: Record<string, { count: number; zero: number; last: string }> = {};
    filteredSearchHistory.forEach(sh => {
      const r = m[sh.customer_user_id] || (m[sh.customer_user_id] = { count: 0, zero: 0, last: sh.created_at });
      r.count++; if ((sh.result_count ?? 0) === 0) r.zero++; if (sh.created_at > r.last) r.last = sh.created_at;
    });
    return (
      <DetailTable
        cols={[{ label: "Customer" }, { label: "Searches", right: true }, { label: "Zero-Result", right: true }, { label: "Last Search" }]}
        rows={Object.entries(m).sort((a, b) => b[1].count - a[1].count).map(([id, r]) => [custName(id), r.count, r.zero, shortDate(r.last)])}
        empty="No search data"
      />
    );
  };

  const dailySearchTable = () => {
    const m: Record<string, number> = {};
    filteredSearchHistory.forEach(sh => { const d = format(new Date(sh.created_at), "yyyy-MM-dd"); m[d] = (m[d] || 0) + 1; });
    return (
      <DetailTable
        cols={[{ label: "Day" }, { label: "Searches", right: true }]}
        rows={Object.entries(m).sort((a, b) => b[0].localeCompare(a[0])).map(([d, n]) => [format(new Date(d), "dd MMM yyyy"), n])}
        empty="No search data"
      />
    );
  };

  const queryTable = (zeroOnly: boolean) => {
    const m: Record<string, { count: number; results: number; zero: number }> = {};
    filteredSearchHistory.forEach(sh => {
      const q = sh.search_query.toLowerCase().trim();
      const r = m[q] || (m[q] = { count: 0, results: 0, zero: 0 });
      r.count++; r.results += sh.result_count ?? 0; if ((sh.result_count ?? 0) === 0) r.zero++;
    });
    const rows = Object.entries(m).filter(([, r]) => !zeroOnly || r.zero > 0).sort((a, b) => (zeroOnly ? b[1].zero - a[1].zero : b[1].count - a[1].count));
    return (
      <DetailTable
        cols={zeroOnly ? [{ label: "#" }, { label: "Search Query" }, { label: "Times", right: true }] : [{ label: "#" }, { label: "Search Query" }, { label: "Count", right: true }, { label: "Avg Results", right: true }]}
        rows={rows.map(([q, r], i) => zeroOnly ? [i + 1, q, <Badge variant="destructive">{r.zero}</Badge>] : [i + 1, q, r.count, <Badge variant={r.count && Math.round(r.results / r.count) === 0 ? "destructive" : "secondary"}>{r.count ? Math.round(r.results / r.count) : 0}</Badge>])}
        empty={zeroOnly ? "No zero-result searches found" : "No search data"}
      />
    );
  };

  type CustList = typeof customerAnalytics.filtered;
  const customersTable = (list: CustList) => (
    <>
      <Summary>{list.length} customers · Spent {fmt(list.reduce((sum, c) => sum + c.totalSpent, 0))}</Summary>
      <DetailTable
        cols={[{ label: "Customer" }, { label: "Mobile" }, { label: "Area" }, { label: "Ward" }, { label: "Status" }, { label: "Orders", right: true }, { label: "Total Spent", right: true }, { label: "Last Order" }]}
        rows={list.map(c => [c.name, c.mobile || "—", c.localBodyId ? lbMap[c.localBodyId] || "—" : "—", c.wardNumber || "—",
          <Badge variant={c.status === "active" ? "default" : c.status === "inactive" ? "destructive" : c.status === "new" ? "outline" : "secondary"}>{c.status === "never_ordered" ? "Never Ordered" : c.status}</Badge>,
          c.orderCount, c.totalSpent > 0 ? fmt(c.totalSpent) : "—", shortDate(c.lastOrderDate)])}
        empty="No customers found"
      />
    </>
  );

  const customerAreaTable = () => {
    const m: Record<string, { total: number; active: number; inactive: number; new: number; never: number }> = {};
    customerAnalytics.filtered.forEach(c => {
      const n = c.localBodyId ? lbMap[c.localBodyId] || "Unknown" : "Unknown";
      const r = m[n] || (m[n] = { total: 0, active: 0, inactive: 0, new: 0, never: 0 });
      r.total++; if (c.status === "active") r.active++; else if (c.status === "inactive") r.inactive++;
      else if (c.status === "new") r.new++; else r.never++;
    });
    return (
      <DetailTable
        cols={[{ label: "Area" }, { label: "Customers", right: true }, { label: "Active", right: true }, { label: "Inactive", right: true }, { label: "New", right: true }, { label: "Never Ordered", right: true }]}
        rows={Object.entries(m).sort((a, b) => b[1].total - a[1].total).map(([n, r]) => [n, r.total, r.active, r.inactive, r.new, r.never])}
        empty="No location data"
      />
    );
  };

  const loginTable = (bucket: string) => {
    const list = bucket === "today" ? loginAnalytics.loggedInToday
      : bucket === "7d" ? loginAnalytics.loggedIn7
      : bucket === "30d" ? loginAnalytics.loggedIn30
      : bucket === "never" ? loginAnalytics.neverLoggedIn
      : loginAnalytics.filtered;
    return (
      <>
        <Summary>{list.length} customers</Summary>
        <DetailTable
          cols={[{ label: "Customer" }, { label: "Mobile" }, { label: "Joined" }, { label: "Last Login" }, { label: "Days Since Login", right: true }]}
          rows={list.slice(0, 500).map(c => [
            c.name, c.mobile || "—",
            c.joinedAt ? format(new Date(c.joinedAt), "dd MMM yy") : "—",
            c.lastLogin ? new Date(c.lastLogin).toLocaleString("en-IN") : "Never",
            c.daysSinceLogin !== null ? `${c.daysSinceLogin}d` : "—",
          ])}
          empty="No customers found"
        />
      </>
    );
  };

  const pushRegisteredTable = () => (
    <>
      <Summary>{pushAnalytics.registered.length} customers have push notifications enabled</Summary>
      <DetailTable
        cols={[{ label: "Customer" }, { label: "Mobile" }, { label: "Last Login" }]}
        rows={pushAnalytics.registered.slice(0, 500).map(c => [c.name, c.mobile || "—", c.lastLogin ? new Date(c.lastLogin).toLocaleString("en-IN") : "Never"])}
        empty="No push-registered customers"
      />
    </>
  );

  const pushCustomerTable = () => (
    <>
      <Summary>Push delivery, read and click counts per customer (current filters applied)</Summary>
      <DetailTable
        cols={[{ label: "Customer" }, { label: "Mobile" }, { label: "Delivered", right: true }, { label: "Read", right: true }, { label: "Clicked", right: true }, { label: "Last Click" }]}
        rows={pushAnalytics.customerRows.slice(0, 500).map(c => [c.name, c.mobile || "—", c.delivered, c.read, c.clicked, c.lastClick ? new Date(c.lastClick).toLocaleString("en-IN") : "—"])}
        empty="No push activity in this period"
      />
    </>
  );

  const pushNotificationTable = () => (
    <>
      <Summary>{pushAnalytics.perNotif.length} notifications sent in this period</Summary>
      <DetailTable
        cols={[{ label: "Notification" }, { label: "Sent" }, { label: "Delivered", right: true }, { label: "Read", right: true }, { label: "Clicked", right: true }]}
        rows={pushAnalytics.perNotif.map(n => [n.title, format(new Date(n.createdAt), "dd MMM yy HH:mm"), n.delivered, n.read, n.clicked])}
        empty="No notifications in this period"
      />
    </>
  );

  const communityTable = () => (
    <>
      <Summary>{communityAnalytics.rows.length} communities · {communityAnalytics.totalMembers} members · {communityAnalytics.newMembers} joined this period</Summary>
      <DetailTable
        cols={[{ label: "Community" }, { label: "Creator" }, { label: "Mobile" }, { label: "Created" }, { label: "Members", right: true }, { label: "New", right: true }, { label: "Orders", right: true }, { label: "Revenue", right: true }, { label: "Cost", right: true }, { label: "Profit", right: true }]}
        rows={communityAnalytics.rows.slice().sort((a, b) => b.revenue - a.revenue).map(r => [r.name, r.creator, r.mobile, r.created, r.members, r.newMembers, r.orders, r.revenue > 0 ? fmt(r.revenue) : "—", r.cost > 0 ? fmt(r.cost) : "—", r.profit !== 0 ? fmt(r.profit) : "—"])}
        empty="No communities yet"
      />
    </>
  );

  const statusOrdersTable = () => {
    const m: Record<string, number> = {};
    filteredOrders.forEach(o => { m[o.status] = (m[o.status] || 0) + 1; });
    return (
      <>
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(m).sort((a, b) => b[1] - a[1]).map(([st, n]) => <span key={st} className="flex items-center gap-1 text-sm">{statusBadge(st)} {n}</span>)}
        </div>
        {ordersTable(filteredOrders)}
      </>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground animate-pulse">Loading reports…</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Preset */}
          <Select value={dateRange} onValueChange={handleDatePreset}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last 1 Year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Pickers */}
          {dateRange === "custom" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("text-xs gap-1", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateFrom ? format(dateFrom, "dd MMM yy") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("text-xs gap-1", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateTo ? format(dateTo, "dd MMM yy") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </>
          )}

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* District Filter */}
          <Select value={filterDistrict} onValueChange={(v) => { setFilterDistrict(v); setFilterLocalBody("all"); setFilterWard("all"); }}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="District" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Panchayath Filter */}
          {filterDistrict !== "all" && (
            <Select value={filterLocalBody} onValueChange={(v) => { setFilterLocalBody(v); setFilterWard("all"); }}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Panchayath" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Panchayaths</SelectItem>
                {filteredLocalBodies.map(lb => (
                  <SelectItem key={lb.id} value={lb.id}>{lb.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Ward Filter */}
          {filterLocalBody !== "all" && wardOptions.length > 0 && (
            <Select value={filterWard} onValueChange={setFilterWard}>
              <SelectTrigger className="w-[110px] h-9 text-xs">
                <SelectValue placeholder="Ward" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Wards</SelectItem>
                {wardOptions.map(w => (
                  <SelectItem key={w} value={String(w)}>Ward {w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Reset */}
          {(dateRange !== "all" || filterStatus !== "all" || filterCategory !== "all" || filterDistrict !== "all") && (
            <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setDateRange("all"); setDateFrom(undefined); setDateTo(undefined); setFilterStatus("all"); setFilterCategory("all"); setFilterDistrict("all"); setFilterLocalBody("all"); setFilterWard("all"); }}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Active filters summary */}
      {(dateRange !== "all" || filterStatus !== "all" || filterCategory !== "all" || filterDistrict !== "all") && (
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>
            Showing {filteredOrders.length} of {orders.length} orders
            {dateFrom && dateTo && ` • ${format(dateFrom, "dd MMM yy")} – ${format(dateTo, "dd MMM yy")}`}
            {filterStatus !== "all" && ` • Status: ${filterStatus}`}
            {filterCategory !== "all" && ` • Category: ${filterCategory}`}
            {filterDistrict !== "all" && ` • District: ${districts.find(d => d.id === filterDistrict)?.name}`}
            {filterLocalBody !== "all" && ` • ${localBodies.find(lb => lb.id === filterLocalBody)?.name}`}
            {filterWard !== "all" && ` • Ward ${filterWard}`}
          </span>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-6 flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pl">P&L</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="sellers">Sellers</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Orders" value={String(filteredOrders.length)} icon={ShoppingCart} sub={`${delivered.length} delivered`} {...cardClick("Total Orders", () => ordersTable(filteredOrders))} />
            <StatCard label="Gross Revenue" value={fmt(grossRevenue)} icon={TrendingUp} sub={`from ${delivered.length} deliveries`} color="text-green-600" {...cardClick("Gross Revenue — delivered orders", () => financeTable(delivered))} />
            <StatCard label="Gross Profit" value={fmt(grossProfit)} icon={BarChart3} sub={`${grossMargin.toFixed(1)}% margin`} color={grossProfit >= 0 ? "text-green-600" : "text-destructive"} {...cardClick("Gross Profit — by order", () => financeTable(delivered))} />
            <StatCard label="Cancellations" value={String(cancelled.length)} icon={TrendingDown} sub={pct(cancelled.length, filteredOrders.length) + " of orders"} color="text-destructive" {...cardClick("Cancelled Orders", () => ordersTable(cancelled))} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active Products" value={String(products.filter(p => p.is_active).length)} icon={Package} sub={`${products.length} total`} {...cardClick("Active Products", () => productsTable(products.filter(p => p.is_active)))} />
            <StatCard label="Selling Partners" value={String(sellerProfiles.length)} icon={Store} sub={`${sellerProducts.filter(sp => sp.is_approved).length} approved products`} {...cardClick("Selling Partners", () => sellersTable())} />
            <StatCard label="Delivery Staff" value={String(deliveryStaff.length)} icon={Truck} {...cardClick("Delivery Staff", () => staffTable())} />
            <StatCard label="Pending Orders" value={String(pending.length)} icon={AlertTriangle} color="text-amber-500" {...cardClick("Pending Orders", () => ordersTable(pending))} />
          </div>

          {/* Monthly Revenue & Profit Chart */}
          <Card {...cardClick("Monthly Revenue & Profit", () => monthlyTable())}>
            <CardHeader><CardTitle>Monthly Revenue & Profit</CardTitle></CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No delivered orders yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cogs" name="COGS" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="hsl(var(--chart-3,160 60% 45%))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Order Status Donut */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card {...cardClick("Orders by Status", () => statusOrdersTable())}>
              <CardHeader><CardTitle>Order Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card {...cardClick("Revenue by Category", () => categoryTable())}>
              <CardHeader><CardTitle>Revenue by Category</CardTitle></CardHeader>
              <CardContent>
                {catData.length === 0 ? <p className="text-muted-foreground text-center py-8">No data yet</p> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={catData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                        {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── P&L ── */}
        <TabsContent value="pl" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Gross Revenue" value={fmt(grossRevenue)} icon={TrendingUp} sub="Sum of delivered order totals" color="text-green-600" {...cardClick("Gross Revenue — delivered orders", () => financeTable(delivered))} />
            <StatCard label="Cost of Goods Sold" value={fmt(cogs)} icon={Package} sub="Sum of purchase_rate × qty" color="text-amber-500" {...cardClick("Cost of Goods Sold — by order", () => financeTable(delivered))} />
            <StatCard label="Gross Profit" value={fmt(grossProfit)} icon={BarChart3} sub={`${grossMargin.toFixed(1)}% gross margin`} color={grossProfit >= 0 ? "text-green-600" : "text-destructive"} {...cardClick("Gross Profit — by order", () => financeTable(delivered))} />
          </div>

          <Card {...cardClick("P&L Summary", () => plTable())}>
            <CardHeader><CardTitle>P&L Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Gross profit {fmt(grossProfit)} · {grossMargin.toFixed(1)}% margin. Click to see the full summary.</p>
            </CardContent>
          </Card>

          {/* Monthly P&L table */}
          <Card {...cardClick("Monthly P&L Breakdown", () => monthlyTable())}>
            <CardHeader><CardTitle>Monthly P&L Breakdown</CardTitle></CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? <p className="text-muted-foreground text-center py-6">No delivered orders</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map(m => (
                      <TableRow key={m.month}>
                        <TableCell className="font-medium">{m.month}</TableCell>
                        <TableCell className="text-right">{m.orders}</TableCell>
                        <TableCell className="text-right">{fmt(m.revenue)}</TableCell>
                        <TableCell className="text-right">{fmt(m.cogs)}</TableCell>
                        <TableCell className={`text-right font-semibold ${m.profit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(m.profit)}</TableCell>
                        <TableCell className="text-right">{m.revenue > 0 ? `${((m.profit / m.revenue) * 100).toFixed(1)}%` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── PRODUCTS ── */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Products" value={String(products.length)} icon={Package} sub={`${products.filter(p => p.is_active).length} active`} {...cardClick("All Products", () => productsTable(products))} />
            <StatCard label="Top Product Revenue" value={topProducts[0] ? fmt(topProducts[0].revenue) : "—"} icon={TrendingUp} sub={topProducts[0]?.name} color="text-green-600" {...cardClick("Products by Revenue", () => topProductsTable())} />
            <StatCard label="Low Stock Alert" value={String(lowStockProds.length)} icon={AlertTriangle} sub="≤5 units" color="text-amber-500" {...cardClick("Low Stock Products", () => productsTable(lowStockProds))} />
          </div>

          {/* Top Products */}
          <Card {...cardClick("Products by Revenue (Delivered)", () => topProductsTable())}>
            <CardHeader><CardTitle>Top Products by Revenue (Delivered)</CardTitle></CardHeader>
            <CardContent>
              {topProducts.length === 0 ? <p className="text-muted-foreground text-center py-6">No sales data</p> : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={topProducts.slice(0, 6)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} className="text-xs" />
                      <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Units Sold</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map(p => (
                        <TableRow key={p.name}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-right">{p.sold}</TableCell>
                          <TableCell className="text-right">{fmt(p.revenue)}</TableCell>
                          <TableCell className={`text-right ${p.profit >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(p.profit)}</TableCell>
                          <TableCell className="text-right">{pct(p.profit, p.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>

          {/* Low Stock */}
          {lowStockProds.length > 0 && (
            <Card {...cardClick("Low Stock Products", () => productsTable(lowStockProds))}>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Low Stock Products</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">MRP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockProds.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.category || "—"}</TableCell>
                        <TableCell className="text-right"><Badge variant="destructive">{p.stock}</Badge></TableCell>
                        <TableCell className="text-right">₹{p.mrp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── SELLERS ── */}
        <TabsContent value="sellers" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Sellers" value={String(sellerProfiles.length)} icon={Store} {...cardClick("Sellers", () => sellersTable())} />
            <StatCard label="Seller Products" value={String(sellerProducts.length)} icon={Package} sub={`${sellerProducts.filter(sp => sp.is_approved).length} approved`} {...cardClick("Seller Products", () => sellerProductsTable(sellerProducts))} />
            <StatCard label="Total Seller Revenue" value={fmt(sellerPerf.reduce((s, p) => s + p.revenue, 0))} icon={Wallet} color="text-primary" {...cardClick("Seller Revenue", () => sellersTable())} />
          </div>

          <Card {...cardClick("Seller Performance", () => sellersTable())}>
            <CardHeader><CardTitle>Seller Performance</CardTitle></CardHeader>
            <CardContent>
              {sellerPerf.length === 0 ? <p className="text-muted-foreground text-center py-6">No sellers yet</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead className="text-right">Delivered Orders</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-right">Settled</TableHead>
                      <TableHead className="text-right">Wallet Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellerPerf.map(s => (
                      <TableRow key={s.name}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.orders}</TableCell>
                        <TableCell className="text-right font-medium text-primary">{fmt(s.revenue)}</TableCell>
                        <TableCell className="text-right">{fmt(s.settled)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(s.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Unapproved seller products */}
          {sellerProducts.filter(sp => !sp.is_approved).length > 0 && (
            <Card {...cardClick("Seller Products Pending Approval", () => sellerProductsTable(sellerProducts.filter(sp => !sp.is_approved)))}>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Pending Approval</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellerProducts.filter(sp => !sp.is_approved).map(sp => (
                      <TableRow key={sp.id}>
                        <TableCell>{sp.name}</TableCell>
                        <TableCell className="text-right">{sp.stock}</TableCell>
                        <TableCell className="text-right">₹{sp.price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── DELIVERY ── */}
        <TabsContent value="delivery" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Delivery Staff" value={String(deliveryStaff.length)} icon={Truck} {...cardClick("Delivery Staff", () => staffTable())} />
            <StatCard label="Orders Delivered" value={String(delivered.length)} icon={CheckCircle} color="text-green-600" {...cardClick("Delivered Orders", () => ordersTable(delivered))} />
            <StatCard label="Orders Pending" value={String(pending.length)} icon={AlertTriangle} color="text-amber-500" {...cardClick("Pending Orders", () => ordersTable(pending))} />
          </div>

          <Card {...cardClick("Delivery Staff Performance", () => staffTable())}>
            <CardHeader><CardTitle>Delivery Staff Performance</CardTitle></CardHeader>
            <CardContent>
              {staffPerfArr.length === 0 ? <p className="text-muted-foreground text-center py-6">No delivery staff yet</p> : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={staffPerfArr.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="delivered" name="Delivered" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pending" name="Pending" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-right">Delivered</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Success Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffPerfArr.map(s => {
                        const total = s.delivered + s.pending;
                        return (
                          <TableRow key={s.name}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell className="text-right text-primary">{s.delivered}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{s.pending}</TableCell>
                            <TableCell className="text-right">{total > 0 ? `${((s.delivered / total) * 100).toFixed(0)}%` : "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STOCK ── */}
        <TabsContent value="stock" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Stock Units" value={totalGodownStock.toLocaleString()} icon={Package} sub="Across all godowns" {...cardClick("Stock by Product", () => stockTable())} />
            <StatCard label="Stock Value (Cost)" value={fmt(totalStockValue)} icon={Wallet} color="text-green-600" {...cardClick("Stock Value by Product", () => stockTable())} />
            <StatCard label="Low Stock Items" value={String(lowStockProds.length)} icon={AlertTriangle} sub="≤5 units" color="text-amber-500" {...cardClick("Low Stock Products", () => productsTable(lowStockProds))} />
          </div>

          <Card {...cardClick("Stock by Product (Godowns)", () => stockTable())}>
            <CardHeader><CardTitle>Stock by Product (Godowns)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Godown Stock</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {godownStock.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No godown stock</TableCell></TableRow>
                  ) : (
                    // Aggregate by product_id
                    Object.values(
                      godownStock.reduce((acc, g) => {
                        const p = productMap[g.product_id];
                        const key = g.product_id;
                        if (!acc[key]) acc[key] = { name: p?.name || g.product_id, qty: 0, purchasePrice: g.purchase_price };
                        acc[key].qty += g.quantity;
                        return acc;
                      }, {} as Record<string, { name: string; qty: number; purchasePrice: number }>)
                    ).sort((a, b) => b.qty - a.qty).map(row => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right">{row.qty}</TableCell>
                        <TableCell className="text-right">₹{row.purchasePrice}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(row.qty * row.purchasePrice)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── GEOGRAPHY ── */}
        <TabsContent value="geography" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Active Areas" value={String(lbPerfArr.length)} icon={Users} {...cardClick("Areas", () => areaTable())} />
            <StatCard label="Top Area" value={lbPerfArr[0]?.name || "—"} icon={TrendingUp} sub={lbPerfArr[0] ? fmt(lbPerfArr[0].revenue) : ""} color="text-green-600" {...cardClick("Areas", () => areaTable())} />
            <StatCard label="Top Area Orders" value={String(lbPerfArr[0]?.orders || 0)} icon={ShoppingCart} {...cardClick("Areas", () => areaTable())} />
          </div>

          <Card {...cardClick("Revenue by Area", () => areaTable())}>
            <CardHeader><CardTitle>Revenue by Local Body / Area</CardTitle></CardHeader>
            <CardContent>
              {lbPerfArr.length === 0 ? <p className="text-muted-foreground text-center py-6">No location data</p> : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={lbPerfArr} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} className="text-xs" />
                      <YAxis type="category" dataKey="name" width={130} className="text-xs" />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Area</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Avg Order Value</TableHead>
                        <TableHead className="text-right">% of Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lbPerfArr.map(lb => (
                        <TableRow key={lb.name}>
                          <TableCell className="font-medium">{lb.name}</TableCell>
                          <TableCell className="text-right">{lb.orders}</TableCell>
                          <TableCell className="text-right">{fmt(lb.revenue)}</TableCell>
                          <TableCell className="text-right">{lb.orders > 0 ? fmt(lb.revenue / lb.orders) : "—"}</TableCell>
                          <TableCell className="text-right">{pct(lb.revenue, grossRevenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SEARCH ANALYTICS ── */}
        <TabsContent value="search" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Searches" value={String(searchAnalytics.totalSearches)} icon={Search} sub="all time filtered" {...cardClick("All Searches", () => searchesTable(filteredSearchHistory))} />
            <StatCard label="Unique Searchers" value={String(searchAnalytics.uniqueSearchers)} icon={Users} sub="distinct customers" {...cardClick("Searchers", () => searchersTable())} />
            <StatCard label="Zero-Result Searches" value={String(searchAnalytics.zeroResultTotal)} icon={AlertTriangle} sub={pct(searchAnalytics.zeroResultTotal, searchAnalytics.totalSearches) + " of searches"} color="text-destructive" {...cardClick("Zero-Result Searches", () => searchesTable(filteredSearchHistory.filter(sh => (sh.result_count ?? 0) === 0)))} />
            <StatCard label="Avg Searches/User" value={searchAnalytics.uniqueSearchers > 0 ? (searchAnalytics.totalSearches / searchAnalytics.uniqueSearchers).toFixed(1) : "0"} icon={BarChart3} {...cardClick("Searches per User", () => searchersTable())} />
          </div>

          {/* Search Volume Chart */}
          <Card {...cardClick("Daily Search Volume", () => dailySearchTable())}>
            <CardHeader>
              <CardTitle className="text-base">Daily Search Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {searchAnalytics.dailyVolume.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No search data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={searchAnalytics.dailyVolume}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="searches" name="Searches" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Searches */}
            <Card {...cardClick("Top Searches", () => queryTable(false))}>
              <CardHeader>
                <CardTitle className="text-base">Top Searches</CardTitle>
              </CardHeader>
              <CardContent>
                {searchAnalytics.topSearches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No search data</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Search Query</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Avg Results</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchAnalytics.topSearches.map((s, i) => (
                        <TableRow key={s.query}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{s.query}</TableCell>
                          <TableCell className="text-right">{s.count}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={s.avgResults === 0 ? "destructive" : "secondary"}>{s.avgResults}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Zero-Result Searches */}
            <Card {...cardClick("Zero-Result Searches", () => queryTable(true))}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Zero-Result Searches
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchAnalytics.zeroResultSearches.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No zero-result searches found 🎉</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Search Query</TableHead>
                        <TableHead className="text-right">Times</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchAnalytics.zeroResultSearches.map((s, i) => (
                        <TableRow key={s.query}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{s.query}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">{s.count}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── CUSTOMERS ── */}
        <TabsContent value="customers" className="space-y-4">
          <CollapsibleSection title="Customer Overview" sub="Totals, activity & charts" defaultOpen>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-sm font-medium text-muted-foreground">Inactive threshold:</span>
            <Select value={String(custInactiveDays)} onValueChange={v => setCustInactiveDays(Number(v))}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Customers" value={String(customerAnalytics.totalCustomers)} icon={Users} {...cardClick("All Customers", () => customersTable(customerAnalytics.filtered))} />
            <StatCard label="Active Customers" value={String(customerAnalytics.active.length)} icon={UserCheck} sub={pct(customerAnalytics.active.length, customerAnalytics.totalCustomers)} color="text-green-600" {...cardClick("Active Customers", () => customersTable(customerAnalytics.active))} />
            <StatCard label="Inactive Customers" value={String(customerAnalytics.inactive.length)} icon={UserX} sub={`No order in ${custInactiveDays}+ days`} color="text-destructive" {...cardClick("Inactive Customers", () => customersTable(customerAnalytics.inactive))} />
            <StatCard label="Never Ordered" value={String(customerAnalytics.neverOrdered.length)} icon={AlertTriangle} sub={pct(customerAnalytics.neverOrdered.length, customerAnalytics.totalCustomers)} color="text-amber-500" {...cardClick("Never Ordered", () => customersTable(customerAnalytics.neverOrdered))} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="New Customers (7d)" value={String(customerAnalytics.newCust.length)} icon={UserPlus} color="text-blue-500" {...cardClick("New Customers (7 days)", () => customersTable(customerAnalytics.newCust))} />
            <StatCard label="Repeat Customers" value={String(customerAnalytics.repeatCustomers.length)} icon={Activity} sub={pct(customerAnalytics.repeatCustomers.length, customerAnalytics.totalCustomers)} {...cardClick("Repeat Customers", () => customersTable(customerAnalytics.repeatCustomers))} />
            <StatCard label="Customer Revenue" value={fmt(customerAnalytics.totalRevenue)} icon={TrendingUp} color="text-green-600" {...cardClick("Customer Revenue", () => customersTable([...customerAnalytics.filtered].sort((a, b) => b.totalSpent - a.totalSpent)))} />
            <StatCard label="Avg Order Value" value={fmt(customerAnalytics.avgOrderValue)} icon={ShoppingCart} {...cardClick("Customers by Average Order", () => customersTable(customerAnalytics.active))} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Status Distribution Pie */}
            <Card {...cardClick("Customers by Status", () => customersTable(customerAnalytics.filtered))}>
              <CardHeader><CardTitle className="text-base">Customer Status Distribution</CardTitle></CardHeader>
              <CardContent>
                {customerAnalytics.statusDist.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No customer data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={customerAnalytics.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                        {customerAnalytics.statusDist.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Activity by Panchayath */}
            <Card {...cardClick("Customer Activity by Area", () => customerAreaTable())}>
              <CardHeader><CardTitle className="text-base">Customer Activity by Area</CardTitle></CardHeader>
              <CardContent>
                {customerAnalytics.lbActivityArr.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No location data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={customerAnalytics.lbActivityArr} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="active" name="Active" stackId="a" fill="hsl(var(--chart-3,160 60% 45%))" />
                      <Bar dataKey="inactive" name="Inactive" stackId="a" fill="hsl(var(--destructive))" />
                      <Bar dataKey="newCust" name="New" stackId="a" fill="hsl(var(--chart-1,220 80% 55%))" />
                      <Bar dataKey="neverOrdered" name="Never Ordered" stackId="a" fill="hsl(var(--chart-4,30 80% 55%))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          </CollapsibleSection>

          <CollapsibleSection title="Top 10 Customers by Spending" sub="Highest spend in this period">
          {/* Top Spenders */}
          <Card {...cardClick("Customers by Spending", () => customersTable([...customerAnalytics.filtered].sort((a, b) => b.totalSpent - a.totalSpent)))}>
            <CardHeader><CardTitle className="text-base">Top 10 Customers by Spending</CardTitle></CardHeader>
            <CardContent>
              {customerAnalytics.topSpenders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No customer data</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead className="text-right">Avg Order</TableHead>
                      <TableHead className="text-right">Last Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerAnalytics.topSpenders.map((c, i) => (
                      <TableRow key={c.userId}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === "active" ? "default" : c.status === "inactive" ? "destructive" : "secondary"}>
                            {c.status === "never_ordered" ? "Never Ordered" : c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{c.orderCount}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(c.totalSpent)}</TableCell>
                        <TableCell className="text-right">{c.orderCount > 0 ? fmt(c.totalSpent / c.orderCount) : "—"}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {c.lastOrderDate ? format(new Date(c.lastOrderDate), "dd MMM yy") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          </CollapsibleSection>

          <CollapsibleSection title="All Customers" sub={String(customerAnalytics.filtered.length)}>
          {/* Full Customer List */}
          <Card {...cardClick("All Customers", () => customersTable(customerAnalytics.filtered))}>
            <CardHeader><CardTitle className="text-base">All Customers ({customerAnalytics.filtered.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead>Ward</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead className="text-right">Days Since Last</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerAnalytics.filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No customers found</TableCell></TableRow>
                    ) : (
                      customerAnalytics.filtered.slice(0, 100).map(c => (
                        <TableRow key={c.userId}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-xs">{c.localBodyId ? (lbMap[c.localBodyId] || "—") : "—"}</TableCell>
                          <TableCell className="text-xs">{c.wardNumber || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={c.status === "active" ? "default" : c.status === "inactive" ? "destructive" : c.status === "new" ? "outline" : "secondary"} className="text-xs">
                              {c.status === "never_ordered" ? "Never Ordered" : c.status === "new" ? "New" : c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{c.orderCount}</TableCell>
                          <TableCell className="text-right">{c.totalSpent > 0 ? fmt(c.totalSpent) : "—"}</TableCell>
                          <TableCell className="text-right text-xs">{c.daysSinceLastOrder !== null ? `${c.daysSinceLastOrder}d` : "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {customerAnalytics.filtered.length > 100 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">Showing first 100 of {customerAnalytics.filtered.length} customers</p>
                )}
              </div>
            </CardContent>
          </Card>

          </CollapsibleSection>

          <CollapsibleSection title="Customer Login Analytics" sub="Login recency & engagement">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Logged In Today" value={String(loginAnalytics.loggedInToday.length)} icon={LogIn} sub={`${pct(loginAnalytics.loggedInToday.length, loginAnalytics.filtered.length)} of customers`} {...cardClick("Logged In Today", () => loginTable("today"))} />
            <StatCard label="Logged In (7d)" value={String(loginAnalytics.loggedIn7.length)} icon={LogIn} sub={pct(loginAnalytics.loggedIn7.length, loginAnalytics.filtered.length)} color="text-green-600" {...cardClick("Logged In (7 days)", () => loginTable("7d"))} />
            <StatCard label="Logged In (30d)" value={String(loginAnalytics.loggedIn30.length)} icon={LogIn} sub={pct(loginAnalytics.loggedIn30.length, loginAnalytics.filtered.length)} color="text-emerald-600" {...cardClick("Logged In (30 days)", () => loginTable("30d"))} />
            <StatCard label="Never Logged In" value={String(loginAnalytics.neverLoggedIn.length)} icon={UserX} sub={pct(loginAnalytics.neverLoggedIn.length, loginAnalytics.filtered.length)} color="text-destructive" {...cardClick("Never Logged In", () => loginTable("never"))} />
          </div>
          <Card {...cardClick("Login Recency Breakdown", () => loginTable("all"))}>
            <CardHeader><CardTitle className="text-base">Last Login Recency</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={loginAnalytics.recencyDist}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Customers" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          </CollapsibleSection>

          <CollapsibleSection title="Push Notification Analytics" sub="FCM delivery, reads & clicks">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Push Registered (FCM)" value={String(pushAnalytics.registered.length)} icon={Bell} sub={`${pct(pushAnalytics.registered.length, loginAnalytics.filtered.length)} of customers`} {...cardClick("Push Registered", () => pushRegisteredTable())} />
            <StatCard label="Push Delivered" value={String(pushAnalytics.delivered)} icon={BellRing} sub={`${pushAnalytics.perNotif.length} notifications in range`} {...cardClick("Push Delivery by Customer", () => pushCustomerTable())} />
            <StatCard label="Push Read" value={String(pushAnalytics.read)} icon={CheckCircle} sub={pct(pushAnalytics.read, pushAnalytics.delivered)} color="text-green-600" {...cardClick("Push Reads by Customer", () => pushCustomerTable())} />
            <StatCard label="Push Clicked" value={String(pushAnalytics.clicked)} icon={MousePointerClick} sub={pct(pushAnalytics.clicked, pushAnalytics.delivered)} color="text-blue-500" {...cardClick("Push Clicks by Customer", () => pushCustomerTable())} />
          </div>
          <Card {...cardClick("Push Performance by Notification", () => pushNotificationTable())}>
            <CardHeader><CardTitle className="text-base">Push Performance by Notification</CardTitle></CardHeader>
            <CardContent>
              {pushAnalytics.perNotif.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notifications in this period</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notification</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead className="text-right">Delivered</TableHead>
                      <TableHead className="text-right">Read</TableHead>
                      <TableHead className="text-right">Clicked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pushAnalytics.perNotif.slice(0, 15).map(n => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium max-w-[220px] truncate">{n.title}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(n.createdAt), "dd MMM yy HH:mm")}</TableCell>
                        <TableCell className="text-right">{n.delivered}</TableCell>
                        <TableCell className="text-right">{n.read}</TableCell>
                        <TableCell className="text-right">{n.clicked}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          </CollapsibleSection>
        </TabsContent>

        <TabsContent value="community" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Communities" value={String(communityAnalytics.rows.length)} icon={Network} {...cardClick("Communities", () => communityTable())} />
            <StatCard label="Community Members" value={String(communityAnalytics.totalMembers)} icon={Users} sub={`${communityAnalytics.newMembers} joined this period`} {...cardClick("Community Members", () => communityTable())} />
            <StatCard label="Active Communities" value={String(communityAnalytics.activeCommunities)} icon={Activity} sub="with orders in this period" {...cardClick("Active Communities", () => communityTable())} />
            <StatCard label="Community Revenue" value={fmt(communityAnalytics.revenue)} icon={TrendingUp} sub={`profit ${fmt(communityAnalytics.profit)}`} color="text-green-600" {...cardClick("Community Performance", () => communityTable())} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Community Orders" value={String(communityAnalytics.orders)} icon={Activity} sub="delivered in this period" {...cardClick("Community Performance", () => communityTable())} />
            <StatCard label="Avg Order Value" value={fmt(communityAnalytics.avgOrder)} icon={TrendingUp} {...cardClick("Community Performance", () => communityTable())} />
            <StatCard label="Inactive Communities" value={String(communityAnalytics.rows.length - communityAnalytics.activeCommunities)} icon={Network} sub="no orders this period" {...cardClick("Community Performance", () => communityTable())} />
            <StatCard label="Avg Members" value={communityAnalytics.rows.length ? (communityAnalytics.totalMembers / communityAnalytics.rows.length).toFixed(1) : "0"} icon={Users} sub="per community" {...cardClick("Community Members", () => communityTable())} />
          </div>
          <Card {...cardClick("Community Performance", () => communityTable())}>
            <CardHeader><CardTitle className="text-base">Community Performance (period revenue)</CardTitle></CardHeader>
            <CardContent>
              {communityAnalytics.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No communities yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Community</TableHead>
                        <TableHead>Creator</TableHead>
                        <TableHead className="text-right">Members</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {communityAnalytics.rows.slice().sort((a, b) => b.revenue - a.revenue).map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-xs">{r.creator}</TableCell>
                          <TableCell className="text-right">{r.members}</TableCell>
                          <TableCell className="text-right">{r.orders}</TableCell>
                          <TableCell className="text-right font-semibold">{r.revenue > 0 ? fmt(r.revenue) : "—"}</TableCell>
                          <TableCell className="text-right">{r.profit > 0 ? fmt(r.profit) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
            <DialogDescription>Full details behind this figure (current filters applied).</DialogDescription>
          </DialogHeader>
          {detail?.body}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ReportsPage;
