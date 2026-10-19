import { adminClient, corsHeaders, getUserId, json } from "../_shared/auth.ts";
import { parseUpdate, targetError } from "./rules.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const callerId = await getUserId(req);
    if (!callerId) return json({ error: "Not signed in" }, 401);
    const admin = adminClient();

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const targetUserId = String(body.user_id ?? "");
    if (!targetUserId) return json({ error: "Missing admin" }, 400);

    const [{ data: caller }, { data: target }] = await Promise.all([
      admin.from("profiles").select("is_super_admin").eq("user_id", callerId).maybeSingle(),
      admin.from("profiles").select("user_id, is_super_admin, role_id, email").eq("user_id", targetUserId).maybeSingle(),
    ]);
    const denied = targetError(callerId, !!caller?.is_super_admin, target);
    if (denied) return json({ error: denied }, 403);

    if (action === "update") {
      const parsed = parseUpdate(body);
      if (typeof parsed === "string") return json({ error: parsed }, 400);

      const { data: role } = await admin.from("roles").select("id").eq("id", parsed.role_id).maybeSingle();
      if (!role) return json({ error: "Role not found" }, 400);

      if (parsed.email !== (target!.email ?? "").trim().toLowerCase()) {
        const { error } = await admin.auth.admin.updateUserById(targetUserId, { email: parsed.email, email_confirm: true });
        if (error) return json({ error: error.message }, 400);
      }
      const { error } = await admin.from("profiles").update(parsed).eq("user_id", targetUserId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { error } = await admin.rpc("delete_account_data", { _uid: targetUserId });
      if (error) return json({ error: /community|Super admin/i.test(error.message) ? error.message : "Could not delete admin. Nothing was deleted." }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
