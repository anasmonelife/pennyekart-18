# Product & community links must open the Android app

Implements the two fixes from the pasted audit (share `https://www.pennyekart.com/product/...` directly, add the non-www host to the manifest). The other two causes from the audit (debug-signed build, old APK on the device) are deployment/device steps and stay in the Play Store checklist — no code change can fix them.

## Confirmed state (read from the code)

- `ProductDetail.tsx` (line ~346) and `PennyPrime.tsx` (line ~210) share the Supabase `product-og` URL, so WhatsApp taps land on `supabase.co` — a domain the app is not registered for. The function later redirects to the site, but Android 12+ does not auto-handoff browser redirects to the app.
- `AndroidManifest.xml` registers only `www.pennyekart.com`; a `pennyekart.com` (apex) link never matches.
- All shared links are built from `window.location.origin` (community invite in `CommunityCard.tsx`, referral in `InviteFriendDialog.tsx`, verification in `VerifyAccountCard.tsx`, product links). On the apex domain or in a dev build this puts the wrong host in the shared link.
- WhatsApp's preview bot gets per-product OG tags only from the Supabase function today; the SPA (`index.html`) has generic site-level OG tags.

## Changes

### 1. Canonical share links (src/lib/appLinks.ts + call sites)

- Add `SITE_URL = "https://www.pennyekart.com"` (canonical, always www) and
  `productShareLink(productId, coupon?)` returning
  `https://www.pennyekart.com/product/<id>` with `?coupon=<code>` only when a
  coupon is passed.
- Use it in `ProductDetail.tsx` (share button — replaces the Supabase OG URL;
  the unused `?source=seller_product` fallback URL is dropped) and
  `PennyPrime.tsx` (WhatsApp deal share, keeps the coupon code as `?coupon=`).
- Pass `SITE_URL` instead of `window.location.origin` to `communityInviteLink`
  in `CommunityCard.tsx`, and use `SITE_URL` as the base for the referral link
  in `InviteFriendDialog.tsx` and the verification link in
  `VerifyAccountCard.tsx` — all are WhatsApp-shared links, and
  `appLinks.ts` is the single home for them per the existing architecture rule.
- Website visitors who tap a shared link still open the normal web product
  page; nothing about in-browser behaviour changes.

### 2. Product OG tags served on the real route (vercel.json)

- Add a rewrite ABOVE the SPA catch-all that serves bots the per-product OG
  page on the shared URL itself:
  `source: "/product/:id"`, `has: [{ "type": "header", "key": "user-agent",
  "value": "<same bot regex as product-og's BOT_UA_PATTERN>" }]`,
  destination: the Supabase `product-og` function with
  `?id=:id&site_url=https://www.pennyekart.com`.
- Human requests don't match the header condition, so they keep loading the
  SPA product page — no redirect, no loop. WhatsApp's crawler gets real
  product title/price/image, and a real user tap opens the app directly
  (verified App Links), never through a redirect.
- `?coupon=...` query params are preserved and still reach the function.

### 3. Manifest: register the apex host (needs a new APK/AAB)

- In `AndroidManifest.xml`, add four more `<data>` elements with
  `android:host="pennyekart.com"` for the same path prefixes
  (`/product`, `/category`, `/community`, `/customer/verify`). Both hosts
  must be listed explicitly — Android treats them as different domains.
- Keep `www.pennyekart.com` entries untouched; no other routes added.

### 4. Play Store checklist + docs

- `PLAY_STORE_CHECKLIST.md`: add the steps the audit called out — confirm
  `https://pennyekart.com/.well-known/assetlinks.json` is reachable on the
  apex host too (each host is verified separately), rebuild the app with the
  new manifest, and the manual device checks (Open by default settings, test
  WhatsApp tap, cold start vs already open, `adb shell pm verify-app-links`).
- `AGENTS.md`: record that WhatsApp-shared links always use the canonical
  `SITE_URL` from appLinks (never `window.location.origin`).
- `roadmap.md`: record this task as done once verified.

## Out of scope

Signing keys, package ID, auth/database, payments, the `product-og` function
logic (only its call sites change), Firebase. Website behaviour unchanged.

## Verification

- `bunx vitest run src/lib/appLinks.test.ts` — new tests assert
  `productShareLink("abc")` → `https://www.pennyekart.com/product/abc`,
  with a coupon → `.../product/abc?coupon=CODE`; existing tests stay green.
- Production build clean (observability build log).
- Cannot be verified here: Vercel header-condition rewrite behaviour and
  Android App Links verification — the live domain is deployed outside this
  workspace and a signed build/device is needed. These become explicit
  checklist steps: redeploy, then confirm `https://www.pennyekart.com/product/<id>`
  returns OG HTML for a WhatsApp user-agent and app HTML for a normal browser,
  then a new APK/AAB and device testing per the checklist.
