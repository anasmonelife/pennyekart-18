import { adminClient, corsHeaders, json, sha256 } from "../_shared/auth.ts";
import { normalizeMobile } from "../_shared/verificationLink.ts";

// Best-effort throttle per instance (the token itself is a 256-bit secret).
const hits = new Map<string, number[]>();
const throttled = (key: string, max = 30, windowMs = 60_000) => {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (throttled(ip)) return json({ error: "Too many attempts. Please wait a minute." }, 429);

  let token = "";
  try { token = String((await req.json())?.token ?? ""); } catch { /* empty */ }
  if (!/^[0-9a-f]{64}$/i.test(token)) return json({ error: "invalid" }, 400);

  const admin = adminClient();
  const { data: link } = await admin
    .from("account_verification_links")
    .select("*")
    .eq("token_hash", await sha256(token))
    .maybeSingle();
  if (!link) return json({ error: "invalid" }, 400);
  if (link.used_at) return json({ status: "already_verified" });
  if (new Date(link.expires_at) < new Date()) return json({ error: "expired" }, 400);

  // Atomic single-use claim: only one redemption can flip used_at.
  const { data: claimed } = await admin
    .from("account_verification_links")
    .update({ used_at: new Date().toISOString() })
    .eq("id", link.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return json({ status: "already_verified" });

  // The number on the account must still match the number the link was made for.
  const { data: profile } = await admin
    .from("profiles")
    .select("user_id, mobile_number, is_verified")
    .eq("user_id", link.customer_user_id)
    .maybeSingle();
  if (!profile) return json({ error: "invalid" }, 400);
  if (normalizeMobile(profile.mobile_number) !== link.customer_mobile) {
    return json({ error: "mobile_changed" }, 400);
  }

  if (!profile.is_verified) {
    const { error } = await admin
      .from("profiles")
      .update({ is_verified: true, verified_at: new Date().toISOString() })
      .eq("user_id", profile.user_id);
    if (error) return json({ error: "Verification failed. Please try again." }, 500);
  }
  return json({ status: "ok" });
});
