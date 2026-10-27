/**
 * App-link helpers for links shared through WhatsApp (community invites and
 * account verification). Web browsers cannot detect whether the Android app
 * is installed, so mobile browsers get a countdown redirect to the Play Store
 * listing with a "continue in browser" escape hatch; the native shell and
 * desktop proceed straight to the link's flow.
 */
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.pennyekart.app&pcampaignid=web_share";

/**
 * Canonical https origin used for every link shared outside the app
 * (WhatsApp, invite, referral, verification, product). Never build shared
 * links from window.location.origin — the app can be viewed on the apex
 * domain or a dev host, and Android verifies each host separately.
 */
export const SITE_URL = "https://www.pennyekart.com";

/**
 * Shareable product link on the canonical domain. A verified Android App
 * Links install opens it directly in the app, and WhatsApp previews get the
 * real product OG tags (Vercel serves the product-og function to bots on
 * this exact route).
 */
export const productShareLink = (productId: string, coupon?: string): string =>
  coupon
    ? `${SITE_URL}/product/${productId}?coupon=${encodeURIComponent(coupon)}`
    : `${SITE_URL}/product/${productId}`;

export type LinkDevice = "app" | "mobile_browser" | "desktop";

export const resolveLinkDevice = (isNative: boolean, userAgent: string): LinkDevice => {
  if (isNative) return "app";
  return /android|iphone|ipad|ipod|iemobile|opera mini|blackberry|mobile/i.test(userAgent)
    ? "mobile_browser"
    : "desktop";
};

export const communityInviteLink = (origin: string, inviteId: string): string =>
  `${origin.replace(/\/+$/, "")}/community/invite/${inviteId}`;

export const APP_PACKAGE = "com.pennyekart.app";

/**
 * Android-only: opens the installed app with the given link (the app routes to
 * the linked screen via appUrlOpen). If the app is not installed, Chrome falls
 * back to browser_fallback_url — the Play Store listing.
 */
export const androidAppIntentUrl = (linkUrl: string): string => {
  const u = new URL(linkUrl);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=${APP_PACKAGE};S.browser_fallback_url=${encodeURIComponent(linkUrl)};end`;
};

export const communityInviteWhatsAppMessage = (communityName: string, link: string): string =>
  `You're invited to join the "${communityName}" community on Pennyekart!\n\nTap to accept:\n${link}`;

/** Opens the WhatsApp app/site with a pre-filled share message. */
export const whatsappShareUrl = (message: string): string =>
  `https://wa.me/?text=${encodeURIComponent(message)}`;

/** Hosts whose links may be opened inside the app. Never wildcard. */
export const SITE_HOSTS = ["www.pennyekart.com", "pennyekart.com"];

/**
 * Resolves an admin-entered link to an in-app route, or null when it must open
 * outside the app. Accepts bare paths ("/product/1"), full site URLs
 * ("https://www.pennyekart.com/product/1"), tolerates trailing slashes, and
 * preserves query parameters. Returns null for everything else —
 * protocol-relative URLs ("//evil.example"), unsafe schemes ("javascript:",
 * "data:"), lookalike domains ("pennyekart.com.evil.io"), and genuinely
 * external URLs (wa.me, Play Store, maps).
 */
export const resolveInternalLink = (url: string): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/")) {
    // Bare in-app path; collapse a trailing slash, keep query/hash as-is.
    return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") || "/" : trimmed;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!SITE_HOSTS.includes(parsed.hostname.toLowerCase())) return null;
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  return `${path}${parsed.search}${parsed.hash}`;
};

// ---------- appUrlOpen dedupe ----------
// Android can deliver the same appUrlOpen link twice (cold start + listener
// attach). Suppress a repeated identical URL within a short window without
// suppressing legitimate later navigation.

let lastDeepLink: { url: string; at: number } | null = null;
const DEEP_LINK_DEDUPE_MS = 1500;

export const shouldOpenDeepLink = (url: string, now: number = Date.now()): boolean => {
  if (lastDeepLink && lastDeepLink.url === url && now - lastDeepLink.at < DEEP_LINK_DEDUPE_MS) {
    return false;
  }
  lastDeepLink = { url, at: now };
  return true;
};

/** Test hook: clears dedupe state. */
export const resetDeepLinkDedupe = () => {
  lastDeepLink = null;
};
