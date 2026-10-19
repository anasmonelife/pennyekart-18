import { createClient } from "npm:@supabase/supabase-js@2";
import { adminClient, corsHeaders, getUserId, json } from "../_shared/auth.ts";
import { normalizeMobile, normalizeRole, pickMobile, pickRole, resolveRoleId } from "./match.ts";

const fetchAll = async (client: any, table: string) => {
  const rows: any[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await client.from(table).select("*").range(from, from + 999);
    if (error) return { rows, error: error.message };
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return { rows, error: null as string | null };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const callerId = await getUserId(req);
    if (!callerId) return json({ error: "Not signed in" }, 401);
    const admin = adminClient();
    const { data: caller } = await admin.from("profiles").select("is_super_admin").eq("user_id", callerId).maybeSingle();
    if (!caller?.is_super_admin) return json({ error: "Only super admins can sync roles" }, 403);

    const elifeUrl = Deno.env.get("ELIFE_SUPABASE_URL");
    const elifeKey = Deno.env.get("ELIFE_SUPABASE_SERVICE_ROLE_KEY");
    if (!elifeUrl || !elifeKey) return json({ error: "e-Life connection is not set up" }, 400);
    const elife = createClient(elifeUrl, elifeKey, { auth: { persistSession: false } });

    const { data: cfg } = await admin.from("chatbot_config").select("value").eq("key", "elife_allowed_tables").maybeSingle();
    const allowed = (cfg?.value || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const ok = (t: string) => !allowed.length || allowed.includes(t);

    // mobile -> e-Life role (first source wins)
    const elifeRoles = new Map<string, string>();
    const sources: Record<string, number | string> = {};
    const add = (mobile: string, role: string) => { if (mobile && role && !elifeRoles.has(mobile)) elifeRoles.set(mobile, role); };

    for (const t of ["pennyekart_agents", "admins", "members"]) {
      if (!ok(t)) continue;
      const { rows, error } = await fetchAll(elife, t);
      if (error) { sources[t] = error; continue; }
      let n = 0;
      for (const r of rows) { const m = pickMobile(r), ro = pickRole(r); if (m && ro) { add(m, ro); n++; } }
      sources[t] = n;
    }
    if (ok("user_roles") && ok("profiles")) {
      const [ur, pr] = await Promise.all([fetchAll(elife, "user_roles"), fetchAll(elife, "profiles")]);
      if (!ur.error && !pr.error) {
        const mobileByUser = new Map<string, string>();
        for (const p of pr.rows) { const m = pickMobile(p); const id = p.user_id ?? p.id; if (m && id) mobileByUser.set(id, m); }
        let n = 0;
        for (const r of ur.rows) { const m = mobileByUser.get(r.user_id); const ro = pickRole(r); if (m && ro) { add(m, ro); n++; } }
        sources.user_roles = n;
      } else sources.user_roles = ur.error || pr.error || "error";
    }

    const { data: roles } = await admin.from("roles").select("id, name");
    const { data: profiles } = await admin.from("profiles").select("id, user_id, mobile_number, role_id, is_super_admin").not("mobile_number", "is", null).limit(20000);

    let matched = 0, updated = 0;
    const unmatchedRoles = new Set<string>();
    for (const p of profiles ?? []) {
      if (p.is_super_admin || p.user_id === callerId) continue;
      const er = elifeRoles.get(normalizeMobile(p.mobile_number));
      if (!er) continue;
      matched++;
      const roleId = resolveRoleId(er, roles ?? []);
      if (!roleId) { unmatchedRoles.add(normalizeRole(er)); continue; }
      if (p.role_id === roleId) continue;
      const { error } = await admin.from("profiles").update({ role_id: roleId }).eq("id", p.id);
      if (!error) updated++;
    }

    return json({ ok: true, elife_people: elifeRoles.size, matched, updated, unmatched_roles: [...unmatchedRoles], sources });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
