import { createClient } from "npm:@supabase/supabase-js@2";
import { adminClient, corsHeaders, getUserId, json } from "../_shared/auth.ts";
import { allocatedPanchayathIds, allocatedWards, normalizeRole, toIds } from "./allocation.ts";

const normalizeMobile = (raw: unknown) => {
  const s = String(raw ?? "").replace(/\D/g, "");
  return s.length >= 10 ? s.slice(-10) : "";
};
const MOBILE_COLS = ["mobile", "mobile_number", "phone", "phone_number", "whatsapp_number"];
const ROLE_COLS = ["role", "role_name", "designation", "agent_role", "position", "rank"];
const pickMobile = (row: Record<string, unknown>) => {
  for (const c of MOBILE_COLS) { const m = normalizeMobile(row[c]); if (m) return m; }
  return "";
};
const pickRole = (row: Record<string, unknown>) => {
  for (const c of ROLE_COLS) { const r = normalizeRole(row[c]); if (r) return r; }
  return "";
};

// Read-only: lists e-Life people (admins + Pennyekart agents) with their role and allocated panchayaths.
const PEOPLE_TABLES = ["admins", "pennyekart_agents"];
const PERSON_REF_COLS = ["admin_id", "agent_id", "pennyekart_agent_id", "user_id", "member_id"];

const fetchAll = async (client: any, table: string) => {
  const rows: any[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await client.from(table).select("*").range(from, from + 999);
    if (error) return { rows, error: error.message as string };
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return { rows, error: null as string | null };
};

const pickName = (r: Record<string, any>) =>
  String(r.name ?? r.full_name ?? r.username ?? r.display_name ?? "").trim() || null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const callerId = await getUserId(req);
    if (!callerId) return json({ error: "Not signed in" }, 401);
    const admin = adminClient();
    const { data: caller } = await admin.from("profiles").select("is_super_admin").eq("user_id", callerId).maybeSingle();
    if (!caller?.is_super_admin) return json({ error: "Only super admins can view e-Life allocations" }, 403);

    const elifeUrl = Deno.env.get("ELIFE_SUPABASE_URL");
    const elifeKey = Deno.env.get("ELIFE_SUPABASE_SERVICE_ROLE_KEY");
    if (!elifeUrl || !elifeKey) return json({ error: "e-Life connection is not set up" }, 400);
    const elife = createClient(elifeUrl, elifeKey, { auth: { persistSession: false } });

    const { data: cfg } = await admin.from("chatbot_config").select("value").eq("key", "elife_allowed_tables").maybeSingle();
    const allowed = (cfg?.value || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const ok = (t: string) => !allowed.length || allowed.includes(t);
    const blocked: string[] = [];
    const sources: Record<string, number | string> = {};

    // Table list + columns from PostgREST's OpenAPI spec
    let defs: Record<string, { properties?: Record<string, unknown> }> = {};
    try {
      const spec = await fetch(`${elifeUrl}/rest/v1/`, { headers: { apikey: elifeKey, Authorization: `Bearer ${elifeKey}` } });
      if (spec.ok) { const s = await spec.json(); defs = s.definitions ?? s.components?.schemas ?? {}; }
    } catch { /* spec optional */ }
    const tables = Object.keys(defs);
    const cols = (t: string) => Object.keys(defs[t]?.properties ?? {});

    // Panchayath directory
    const panchayaths = new Map<string, { id: string; name: string; district: string | null }>();
    if (ok("panchayaths")) {
      const { rows, error } = await fetchAll(elife, "panchayaths");
      sources.panchayaths = error ?? rows.length;
      const districtNames = new Map<string, string>();
      if (!error && rows.some((r) => r.district_id) && tables.includes("districts") && ok("districts")) {
        const d = await fetchAll(elife, "districts");
        for (const r of d.rows) districtNames.set(String(r.id), String(r.name ?? ""));
      }
      for (const r of rows) {
        const id = String(r.id);
        panchayaths.set(id, {
          id,
          name: String(r.name ?? r.name_en ?? r.name_ml ?? id),
          district: (r.district ?? (r.district_id ? districtNames.get(String(r.district_id)) : null)) || null,
        });
      }
    } else blocked.push("panchayaths");

    // Allocation link tables, e.g. admin_panchayaths / team_leader_assignments
    const links = new Map<string, Set<string>>(); // `${refCol}:${id}` -> panchayath ids
    for (const t of tables) {
      if (t === "panchayaths" || PEOPLE_TABLES.includes(t)) continue;
      if (!/(assign|alloc|panchayath)/i.test(t)) continue;
      const c = cols(t);
      const pCol = c.find((x) => x === "panchayath_id");
      const refCol = PERSON_REF_COLS.find((x) => c.includes(x));
      if (!pCol || !refCol) continue;
      if (!ok(t)) { blocked.push(t); continue; }
      const { rows, error } = await fetchAll(elife, t);
      sources[t] = error ?? rows.length;
      for (const r of rows) {
        if (r.is_active === false) continue;
        const key = `${refCol}:${r[refCol]}`;
        if (!links.has(key)) links.set(key, new Set());
        toIds(r[pCol]).forEach((id) => links.get(key)!.add(id));
      }
    }

    const people: any[] = [];
    const seen = new Set<string>();
    for (const t of PEOPLE_TABLES) {
      if (!ok(t)) { blocked.push(t); continue; }
      const { rows, error } = await fetchAll(elife, t);
      if (error) { sources[t] = error; continue; }
      sources[t] = rows.length;
      const refCols = t === "admins" ? ["admin_id", "user_id"] : ["agent_id", "pennyekart_agent_id", "member_id"];
      for (const r of rows) {
        const role = pickRole(r);
        if (!role) continue;
        const mobile = pickMobile(r) || normalizeMobile(r.mobile);
        const dedupe = `${mobile || r.id}:${role}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        const ids = new Set<string>(allocatedPanchayathIds(r, role));
        if (role !== "coordinator") {
          for (const c of refCols) links.get(`${c}:${r.id}`)?.forEach((id) => ids.add(id));
          if (r.user_id) links.get(`user_id:${r.user_id}`)?.forEach((id) => ids.add(id));
        }
        people.push({
          id: `${t}:${r.id}`,
          source: t,
          name: pickName(r),
          mobile: mobile || null,
          role,
          ward: r.ward ?? null,
          wards: allocatedWards(r, role),
          is_active: r.is_active !== false,
          panchayaths: [...ids].map((id) => panchayaths.get(id) ?? { id, name: "Unknown panchayath", district: null }),
        });
      }
    }

    return json({ ok: true, people, sources, blocked_tables: [...new Set(blocked)] });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
