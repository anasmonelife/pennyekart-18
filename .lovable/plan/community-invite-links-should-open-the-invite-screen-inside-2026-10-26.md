# Community invite links should open the invite screen inside the app

Today, a community invite shared on WhatsApp opens the web page, which shows the Play Store countdown. For people who already have the app installed, tapping "Open" launches the app at its homepage — the invite is lost. The app currently has no way to receive a link, so it can never land on the invite acceptance screen.

Confirmed current state:

- `android/app/src/main/AndroidManifest.xml` has only the launcher intent filter — no deep-link filter, so Android never offers "Open in Pennyekart" for these links.
- No code listens for `appUrlOpen` (`src/lib/native.ts` uses `@capacitor/app` only for back button and resume; the plugin is already installed).
- The invite page (`src/pages/customer/CommunityInvite.tsx`) works once you reach it in a browser or the app's web view; the gap is only getting there.
- `AppStoreRedirect.tsx` redirects mobile browsers to the plain Play Store listing after 5 seconds.

## What changes

```text
WhatsApp tap (phone with app installed)
  → web page tries to open the app WITH the invite link (Android intent)
  → app opens directly on the invite accept screen
  → if the app is not installed, Android falls back to the Play Store listing (unchanged)

WhatsApp tap (desktop) → invite page as before
```

1. **Mobile-browser screen opens the app first** (`AppStoreRedirect.tsx`, helpers in `src/lib/appLinks.ts`):
   - The 5-second redirect changes from the Play Store URL to an Android `intent://` link that carries the current page URL (the invite link) and targets `com.pennyekart.app`, with the Play Store URL as the automatic fallback when the app is missing.
   - "Continue in browser" stays, and still skips the redirect.
   - A small helper builds the intent URL from the current link (covered by an appLinks vitest test).

2. **The app accepts the link** (two parts):
   - `AndroidManifest.xml`: add a non-verified intent filter for `https` links to `www.pennyekart.com` under the invite path and the account-verification path, so Android can route WhatsApp links into the app.
   - `src/lib/native.ts`: listen for `App.addListener("appUrlOpen")` and open the linked path in the app's web view, so the invite (and any future WhatsApp link) lands on the right screen instead of the homepage.

3. **Housekeeping**: record the deep-link rule in `AGENTS.md`; update `roadmap.md`.

## Important note

The manifest change lives inside the Android app itself, so it only takes effect after the next APK/AAB build and Play Store update. Until then, devices keep the current Play Store behavior — the website changes (intent link + fallback) go live immediately.

## Out of scope

- No change to the invite accept/decline logic, the verification flow, or Play Store listing content.
