import { adminClient, corsHeaders, getUserId, json, sha256 } from "../_shared/auth.ts";
import {
  LINK_TTL_MINUTES,
  MAX_LINKS_PER_HOUR,
  generateLinkToken,
  isAllowedSenderRole,
  normalizeMobile,
} from "../_shared/verificationLink.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const uid = await getUserId(req);
  if (!uid) return json({ error: "Unauthorized" }, 401);

  let mobile = "";
  try { mobile = normalizeMobile(String((await req.json())?.mobile ?? "")); } catch { /* empty */ }
  if (mobile.length !== 10) return json({ error: "Enter a valid 10-digit mobile number" }, 400);

  const admin = adminClient();

  // Authorization is checked on the server from protected sources only.
  const { data: p } = await admin.from("profiles").select("is_super_admin").eq("user_id", uid).maybeSingle();
  if (!p) return json({ error: "Profile not found" }, 404);
  let allowed = Boolean(p.is_super_admin);
  if (!allowed) {
    const { data: roles } = await admin.from("user_roles").select("roles(name)").eq("user_id", uid);
    allowed = (roles ?? []).some((r: { roles?: { name?: string } | null }) => isAllowedSenderRole(r.roles?.name));
  }
  if (!allowed) return json({ error: "You are not allowed to send verification links" }, 403);

  // Basic rate limit per sender.
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await admin
    .from("account_verification_links")
    .select("id", { count: "exact", head: true })
    .eq("created_by", uid)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_LINKS_PER_HOUR) {
    return json({ error: "Too many links created. Please wait before trying again." }, 429);
  }

  const { data: customer } = await admin
    .from("profiles")
    .select("user_id, is_verified")
    .eq("mobile_number", mobile)
    .eq("user_type", "customer")
    .maybeSingle();
  if (!customer) return json({ error: "No customer account found with this mobile number" }, 404);
  if (customer.is_verified) return json({ error: "This customer is already verified" }, 400);

  const token = generateLinkToken();
  const { error } = await admin.from("account_verification_links").insert({
    token_hash: await sha256(token),
    customer_user_id: customer.user_id,
    customer_mobile: mobile,
    created_by: uid,
    expires_at: new Date(Date.now() + LINK_TTL_MINUTES * 60_000).toISOString(),
  });
  if (error) return json({ error: "Could not create the verification link" }, 500);

  return json({ token, ttl_minutes: LINK_TTL_MINUTES });
});
