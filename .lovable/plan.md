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
- Add `pathPrefix` entries only for the agreed routes: `/product` (list + details),
  `/category`, `/community` (keeps existing invite handling), and `/customer/verify`
  (kept as-is). No other routes — wallet, profile, cart, and unrelated pages are
  NOT added, so the filter cannot intercept unrelated URLs.
- Preserve existing query parameters; do not change the package ID.

### 2. Domain verification file

- Create `public/.well-known/assetlinks.json` with package `com.pennyekart.app`
  and an empty sha256 value — no invented or placeholder fingerprint is shipped.
- Document loudly in `PLAY_STORE_CHECKLIST.md`: the real Play App Signing SHA-256
  (Play Console → Setup → App signing) must be filled into that file and the site
  redeployed before App Links verification can succeed (Vercel serves `public/`
  files before rewrites, so the file goes live with the deploy).
- Until the real fingerprint is deployed, verification fails and Android shows a
  chooser instead of silently opening the browser — same or better than today.

### 3. One shared link resolver for admin-entered links

- New helper in `src/lib/appLinks.ts` (or a sibling module): `resolveInternalLink(url)`
  returns an in-app route ONLY for internal links on the canonical host
  (`www.pennyekart.com`) plus explicitly approved same-site hosts. It accepts bare
  paths (`/product/1`), full site URLs (`https://www.pennyekart.com/product/1`),
  tolerates trailing slashes and encoded paths, and returns `null` for everything
  else — protocol-relative URLs (`//evil.example`), unsafe schemes
  (`javascript:`, `data:`), lookalike domains (`pennyekart.com.evil.io`,
  `notpennyekart.com`), and genuinely external URLs (wa.me, Play Store, maps).
- BannerCarousel, NotificationPopup, NotificationDetailDialog, OfferFlashPopup
  (and ScratchRewards product coupon links, which already navigate — verify only)
  use it: internal → React Router navigation inside the app; external → unchanged
  `window.open` / `target="_blank"`.
- On the website the same helper keeps normal browser behaviour — no automatic
  redirect of website visitors into the app.

### 4. appUrlOpen hardening in src/lib/native.ts

- Cold start and already-running deliveries both route to the linked screen;
  a repeated identical URL within a short window is deduped without suppressing
  legitimate subsequent navigation.
- Malformed or cross-origin links: current behaviour kept (same-origin pushState,
  external opens in place); nothing crashes on bad input.

## Out of scope (per the brief)

Package ID, auth system, database schema, payments/wallet/orders/seller/delivery/
admin logic, Firebase setup — all untouched. Website behaviour for normal
browsers unchanged.

## Verification

- Unit tests for the link resolver: valid internal path, full site URL with query
  parameters, external URL, `//`-prefixed unsafe path, unsafe schemes
  (`javascript:`), lookalike domains, malformed URLs. Plus an appUrlOpen-style
  dedupe test (repeat suppressed, later different link not suppressed). Run
  `bun run test`.
- Production build clean (observability build log).
- Playwright check: banner/notification-style internal links navigate in-app on
  the web preview; external links still open a new tab.
- Reported as manual Android-only steps: add the real Play App Signing SHA-256 to
  `assetlinks.json` and redeploy, `git pull` + `npx cap sync`, build a new
  APK/AAB, install, and test (a) tapping a product link from WhatsApp,
  (b) cold start vs app already open, (c) domain verification of
  `https://www.pennyekart.com/.well-known/assetlinks.json`. App Links
  verification is NOT claimed done until tested on a device.
