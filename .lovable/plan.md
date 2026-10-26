# Android deep links & in-app navigation fix

Fixes the problem where Pennyekart links (products, community, verification, banners,
notification links) open in the web browser instead of the installed Android app,
per the uploaded audit brief.

## Confirmed root causes (read from the code)

1. `android/app/src/main/AndroidManifest.xml` — the https intent filter has
   `autoVerify="false"` and only covers `/community/invite` and `/customer/verify`,
   so links to product/category/other pages never open the app.
2. There is no `public/.well-known/assetlinks.json` anywhere, so App Links domain
   verification cannot succeed.
3. Inside the app, admin-entered links open the system browser:
   `BannerCarousel` uses `target="_blank"` on the banner `link_url`,
   `NotificationPopup` / `NotificationDetailDialog` use `window.open(link_url, "_blank")`,
   and `OfferFlashPopup` uses `window.open(linkUrl, "_blank")`. When those admin
   values point at internal pages (`/product/...`, `/category/...`), the app opens
   them in Chrome instead of its own screens.
4. The `appUrlOpen` handler in `src/lib/native.ts` routes same-origin links in-app
   but has no protection against the same link being delivered twice.

## Changes

### 1. Manifest (needs a new APK/AAB build to take effect)

- Set `android:autoVerify="true"` on the https intent filter.
- Add `pathPrefix` entries for all public screens: `/product`, `/category`,
  `/flash-sale`, `/services`, `/utility-services`, `/penny-prime`, `/pennycarbs`,
  `/play`, `/community`, `/customer` (covers verify/wallet/profile), `/cart`.
- Keep the existing data entries; do not change the package ID.

### 2. Domain verification file

- Create `public/.well-known/assetlinks.json` with package `com.pennyekart.app`
  and a clearly marked `PLACEHOLDER-SHA256` fingerprint.
- Add a short instruction block in `PLAY_STORE_CHECKLIST.md`: where to copy the
  real SHA-256 (Play Console → Setup → App signing) and that the file goes live
  automatically with the next site deploy (Vercel serves `public/` before rewrites).
- Until the real fingerprint is in place, verification fails and Android shows a
  chooser instead of silently opening the browser — same or better than today.

### 3. One shared link resolver for admin-entered links

- New helper in `src/lib/appLinks.ts` (or a sibling module): `resolveInternalLink(url)`
  returns an in-app route for internal links — bare paths (`/product/1`),
  full site URLs (`https://www.pennyekart.com/product/1`), and same-host
  variants — and `null` for genuinely external URLs (wa.me, Play Store, maps).
- BannerCarousel, NotificationPopup, NotificationDetailDialog, OfferFlashPopup
  (and ScratchRewards product coupon links, which already navigate — verify only)
  use it: internal → React Router navigation inside the app; external → unchanged
  `window.open` / `target="_blank"`.
- On the website the same helper keeps normal browser behaviour — no automatic
  redirect of website visitors into the app.

### 4. appUrlOpen hardening in src/lib/native.ts

- Ignore a repeated identical URL delivered within a short window (dedupe).
- Malformed or cross-origin links: current behaviour kept (same-origin pushState,
  external opens in place); nothing crashes on bad input.

## Out of scope (per the brief)

Package ID, auth system, database schema, payments/wallet/orders/seller/delivery/
admin logic, Firebase setup — all untouched. Website behaviour for normal
browsers unchanged.

## Verification

- Unit tests for the link resolver (internal path, full site URL, external URL,
  `//`-prefixed unsafe path) in the existing test suite; run `bun run test`.
- Production build clean (observability build log).
- Playwright check: banner/notification-style internal links navigate in-app on
  the web preview; external links still open a new tab.
- Reported as manual Android-only steps: replace the placeholder SHA-256,
  `git pull` + `npx cap sync`, build a new APK/AAB, install, and test
  (a) tapping a product link from WhatsApp, (b) cold start vs app already open,
  (c) verification of `https://www.pennyekart.com/.well-known/assetlinks.json`.
  App Links verification cannot be claimed done until tested on a device.
