import { adminClient, corsHeaders, getUserId, json } from "../_shared/auth.ts";
import {
  canRecordContactAttempt,
  CONTACT_ATTEMPT_MESSAGE,
  CONTACT_ATTEMPT_TITLE,
  isAssignedDeliveryStaff,
} from "./contactAttempt.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const b64url = (buf: ArrayBuffer | string) => {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let value = "";
  bytes.forEach((byte) => (value += String.fromCharCode(byte)));
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function getAccessToken(clientEmail: string, privateKeyRaw: string): Promise<string> {
  const pem = privateKeyRaw.replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const der = Uint8Array.from(atob(pem), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }))}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(signature)}`,
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Google token error [${response.status}]`);
  return body.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const staffUserId = await getUserId(req);
    if (!staffUserId) return json({ error: "Please sign in again." }, 401);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request body." }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "Invalid request body." }, 400);
    }
    const orderId = (body as Record<string, unknown>).order_id;
    if (typeof orderId !== "string" || !UUID.test(orderId)) {
      return json({ error: "Invalid order." }, 400);
    }

    const admin = adminClient();
    const { data: order, error: orderError } = await admin.from("orders")
      .select("id, user_id, assigned_delivery_staff_id, status, delivery_contact_attempted_at")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || !isAssignedDeliveryStaff(order.assigned_delivery_staff_id, staffUserId)) {
      return json({ error: "This order is not assigned to you." }, 403);
    }
    if (!order.user_id) return json({ error: "This order has no customer account." }, 400);
    if (!canRecordContactAttempt(order.status, order.delivery_contact_attempted_at)) {
      return json({ sent: false, reason: order.delivery_contact_attempted_at ? "already_sent" : "order_closed" });
    }

    const { data: claim, error: claimError } = await admin.from("orders")
      .update({ delivery_contact_attempted_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("assigned_delivery_staff_id", staffUserId)
      .is("delivery_contact_attempted_at", null)
      .not("status", "in", "(delivered,cancelled,return_requested,return_accepted,return_collected,return_confirmed)")
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claim) return json({ sent: false, reason: "already_sent" });

    const { data: customer, error: customerError } = await admin.from("profiles")
      .select("fcm_token")
      .eq("user_id", order.user_id)
      .eq("user_type", "customer")
      .maybeSingle();
    if (customerError) {
      console.error("Delivery contact alert customer lookup failed:", customerError.message);
      return json({ sent: true, push_sent: false, reason: "customer_lookup_failed" });
    }
    if (!customer?.fcm_token) return json({ sent: true, push_sent: false, reason: "no_customer_token" });

    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
    const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
    if (!projectId || !clientEmail || !privateKey) {
      console.error("Delivery contact alert Firebase secrets are not configured.");
      return json({ sent: true, push_sent: false, reason: "push_not_configured" });
    }

    try {
      const accessToken = await getAccessToken(clientEmail, privateKey);
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: {
          token: customer.fcm_token,
          notification: { title: CONTACT_ATTEMPT_TITLE, body: CONTACT_ATTEMPT_MESSAGE },
          data: {
            type: "delivery_contact_attempt",
            order_id: orderId,
            url: `/customer/profile?tab=orders&order=${encodeURIComponent(orderId)}`,
          },
          android: { priority: "high", notification: { channel_id: "default_notification_channel" } },
        } }),
      });
      if (response.ok) {
        await response.body?.cancel();
        return json({ sent: true, push_sent: true, reason: "ok" });
      }

      const errorBody = await response.json().catch(() => ({}));
      const code = errorBody?.error?.details?.find((detail: { errorCode?: string }) => detail.errorCode)?.errorCode
        ?? errorBody?.error?.status;
      const invalidToken = response.status === 404 || code === "UNREGISTERED" ||
        (response.status === 400 && code === "INVALID_ARGUMENT" && /token/i.test(errorBody?.error?.message ?? ""));
      if (invalidToken) {
        await admin.from("profiles").update({ fcm_token: null })
          .eq("user_id", order.user_id)
          .eq("fcm_token", customer.fcm_token);
      }
      console.error(`Delivery contact alert FCM failed [${response.status}] ${code ?? ""}`);
      return json({ sent: true, push_sent: false, reason: invalidToken ? "invalid_token_cleared" : "push_failed" });
    } catch (error) {
      console.error("Delivery contact alert push error:", error instanceof Error ? error.message : "unknown");
      return json({ sent: true, push_sent: false, reason: "push_failed" });
    }
  } catch (error) {
    console.error("send-delivery-contact-alert error:", error instanceof Error ? error.message : "unknown");
    return json({ error: "Could not notify the customer." }, 500);
  }
});