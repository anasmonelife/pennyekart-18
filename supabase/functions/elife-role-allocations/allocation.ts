export const normalizeRole = (raw: unknown) =>
  String(raw ?? "").trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");

export const toIds = (v: unknown): string[] => {
  if (v === null || v === undefined || v === "") return [];
  if (Array.isArray(v)) return v.flatMap(toIds);
  if (typeof v === "object") { const o = v as Record<string, unknown>; return toIds(o.id ?? o.panchayath_id); }
  const s = String(v).trim();
  if (s.startsWith("[") || s.startsWith("{")) {
    try { return toIds(JSON.parse(s.replace(/^\{(.*)\}$/, "[$1]"))); } catch { /* fall through */ }
  }
  return s.split(",").map((x) => x.trim().replace(/^"|"$/g, "")).filter(Boolean);
};

/** Columns that hold a person's list of allocated panchayaths (e-Life uses responsible_panchayath_ids). */
const MULTI_PANCHAYATH_COLS = [
  "responsible_panchayath_ids", "panchayath_ids", "assigned_panchayaths", "allocated_panchayaths", "panchayaths",
];

const isCoordinator = (role: string) => normalizeRole(role) === "coordinator";

/**
 * Coordinators work inside one panchayath (their panchayath_id, split into responsible wards).
 * Every other role is allocated several panchayaths; their home panchayath_id is only a fallback.
 */
export const allocatedPanchayathIds = (row: Record<string, unknown>, role: string): string[] => {
  const home = toIds(row.panchayath_id);
  if (isCoordinator(role)) return [...new Set(home)];
  const multi = MULTI_PANCHAYATH_COLS.flatMap((c) => toIds(row[c]));
  return [...new Set(multi.length ? multi : home)];
};

/** Wards a coordinator is responsible for inside their panchayath. */
export const allocatedWards = (row: Record<string, unknown>, role: string): string[] =>
  isCoordinator(role) ? [...new Set(toIds(row.responsible_wards))] : [];
