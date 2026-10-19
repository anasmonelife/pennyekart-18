export const normalizeMobile = (raw: unknown): string => {
  const s = String(raw ?? "").replace(/\D/g, "");
  return s.length >= 10 ? s.slice(-10) : "";
};

export const normalizeRole = (raw: unknown): string =>
  String(raw ?? "").trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");

const MOBILE_COLS = ["mobile", "mobile_number", "phone", "phone_number", "whatsapp_number"];
const ROLE_COLS = ["role", "role_name", "designation", "agent_role", "position", "rank"];

export const pickMobile = (row: Record<string, unknown>) => {
  for (const c of MOBILE_COLS) { const m = normalizeMobile(row[c]); if (m) return m; }
  return "";
};
export const pickRole = (row: Record<string, unknown>) => {
  for (const c of ROLE_COLS) { const r = normalizeRole(row[c]); if (r) return r; }
  return "";
};

/** Never auto-grant full access, whatever e-Life says. */
export const BLOCKED_ROLES = new Set(["super admin"]);

export const resolveRoleId = (elifeRole: string, roles: { id: string; name: string }[]) => {
  const r = normalizeRole(elifeRole);
  if (!r || BLOCKED_ROLES.has(r)) return null;
  return roles.find((x) => normalizeRole(x.name) === r)?.id ?? null;
};
