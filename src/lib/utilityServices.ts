export const PRICE_UNITS = [
  { value: "fixed", label: "Fixed price" },
  { value: "hour", label: "Per hour" },
  { value: "day", label: "Per day" },
  { value: "visit", label: "Per visit" },
  { value: "sqft", label: "Per sq.ft" },
  { value: "quote", label: "On request / quote" },
];

export const PRODUCT_UNITS = [
  { value: "g", label: "G (gram)" },
  { value: "kg", label: "Kg (Kilo Gram)" },
  { value: "nos", label: "Nos (Numbers)" },
];

export const CATEGORY_TYPES = [
  { value: "service", label: "Service" },
  { value: "product", label: "Product" },
];

export const unitsForCategoryType = (type?: string | null) =>
  type === "product" ? PRODUCT_UNITS : PRICE_UNITS;

/** Pre-fix pack models a utility seller can quickly add to a product listing. */
export const PRESET_PACKS: { label: string; unit: string; pack_size: number }[] = [
  { label: "100 g", unit: "g", pack_size: 100 },
  { label: "250 g", unit: "g", pack_size: 250 },
  { label: "500 g", unit: "g", pack_size: 500 },
  { label: "750 g", unit: "g", pack_size: 750 },
  { label: "1 kg", unit: "kg", pack_size: 1 },
  { label: "2 kg", unit: "kg", pack_size: 2 },
  { label: "5 kg", unit: "kg", pack_size: 5 },
  { label: "10 kg", unit: "kg", pack_size: 10 },
  { label: "1 no.", unit: "nos", pack_size: 1 },
  { label: "5 nos", unit: "nos", pack_size: 5 },
  { label: "10 nos", unit: "nos", pack_size: 10 },
  { label: "12 nos", unit: "nos", pack_size: 12 },
];

export const isProductCategory = (type?: string | null) => type === "product";

export const REQUEST_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const priceUnitLabel = (unit?: string | null) =>
  [...PRICE_UNITS, ...PRODUCT_UNITS].find((u) => u.value === unit)?.label ?? "Fixed price";

export const statusLabel = (status?: string | null) =>
  status === "quoted"
    ? "Quote provided"
    : REQUEST_STATUSES.find((s) => s.value === status)?.label ?? status?.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? "—";

export const formatServicePrice = (price: number, unit?: string | null) => {
  if (unit === "quote" || !price) return "On request";
  const productUnit = PRODUCT_UNITS.find((u) => u.value === unit);
  if (productUnit) return `₹${price} / ${unit === "nos" ? "no." : unit}`;
  const suffix =
    unit === "hour" ? " / hour" : unit === "day" ? " / day" : unit === "visit" ? " / visit" : unit === "sqft" ? " / sq.ft" : "";
  return `₹${price}${suffix}`;
};

export interface UtilityCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  category_type?: string | null;
  auto_cancel_minutes?: number | null;
}

/** Human label for a category's auto-cancel waiting limit. */
export const autoCancelLabel = (minutes?: number | null) => {
  if (!minutes || minutes <= 0) return "Off";
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hr`;
  const days = hours / 24;
  return `${days % 1 === 0 ? days : days.toFixed(1)} day${days === 1 ? "" : "s"}`;
};

export interface UtilityService {
  id: string;
  provider_user_id: string | null;
  category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  price_unit: string;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  coverage_area: string | null;
  local_body_id: string | null;
  ward_number: number | null;
  is_active: boolean;
  is_approved: boolean;
  sort_order: number;
  created_at: string;
  requires_location?: boolean;
}

export interface UtilityRequest {
  id: string;
  service_id: string;
  customer_user_id: string | null;
  contact_name: string;
  contact_phone: string;
  address: string | null;
  preferred_date: string | null;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  quoted_amount: number | null;
  created_at: string;
  variant_id?: string | null;
  variant_label?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_amount?: number | null;
  address_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cancelled_by?: string | null;
}

export interface UtilityVariant {
  id: string;
  service_id: string;
  label: string;
  unit: string;
  pack_size: number;
  price: number;
  mrp: number;
  stock: number;
  is_active: boolean;
  sort_order: number;
}

export type BookingGroup = "pending" | "completed" | "cancelled";

/** Which "My bookings" tab a utility request belongs to. */
export const bookingGroup = (status?: string | null): BookingGroup =>
  status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "pending";

export const isAutoCancelledRequest = (request: Pick<UtilityRequest, "status" | "cancelled_by">) =>
  request.status === "cancelled" && request.cancelled_by === "system";

/** Presentation only: do not change request permissions or actions. */
export const showUtilityPartnerContact = (request: Pick<UtilityRequest, "status" | "cancelled_by">) =>
  !isAutoCancelledRequest(request);
