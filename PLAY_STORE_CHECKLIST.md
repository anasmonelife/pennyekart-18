# Pennyekart – Google Play Store Checklist

## Pennyekart contact details
- [x] Privacy contact email — pennyekart@gmail.com
- [x] Business address — Pennyekart, 1st Floor, Opposite Biotech Lab, Pookottumpadam
- [x] Contact phone — 9497589094

## URLs to enter in Play Console
- Privacy policy: https://www.pennyekart.com/privacy-policy
- Account deletion: https://www.pennyekart.com/delete-account
- Terms: https://www.pennyekart.com/terms

## Data Safety answers (match real app behaviour)
| Data | Collected | Shared | Purpose | Optional |
|---|---|---|---|---|
| Name, email, phone | Yes | No (hosting processor only) | Account, orders | Email optional |
| Address, precise location | Yes | With delivery partner for the order | Delivery | Location optional |
| Purchase history, wallet records | Yes | No | Orders, accounting | Required |
| Photos (product/profile, picked from gallery) | Yes (partners/users who upload) | Image storage provider (processor) | App functionality | Optional |
| Date of birth, area (panchayath/ward) | Yes | No | Account, area-based catalogue | Required |
| Search terms | Yes | No | Improve catalogue | Automatic |
| Audio (voice input) | Processed on device/browser speech service, not stored | No | Penny Assistant | Optional |
| Device push token | Only if notifications turned on | Firebase (processor) | Order updates | Optional |
- Data encrypted in transit: Yes (HTTPS)
- Users can request deletion: Yes (in-app + web page). Login, profile, addresses, search history, community links and verification codes are deleted; order, service and wallet records are kept anonymised for accounting.

## Android permissions declared
INTERNET, ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, POST_NOTIFICATIONS, RECORD_AUDIO (Penny Assistant voice only).
No background location, contacts, SMS, phone or broad storage permissions.

## App Links (deep links) — REQUIRED before links auto-open the app
**Android verifies App Links per HOST. `www.pennyekart.com` is the canonical
auto-verified host (`autoVerify="true"` in `AndroidManifest.xml`, covering
`/product`, `/category`, `/community` and `/customer/verify`).
`pennyekart.com` (apex) 308-redirects to `www`, so Google's Digital Asset
Links fetcher fails on it (ERROR_CODE_REDIRECT); the apex host therefore sits
in a separate standard browsable intent filter WITHOUT `autoVerify` and is
NOT part of automatic verification while that redirect remains. The manifest
change only takes effect after a new APK/AAB build — a successful build is
NOT successful Android domain verification.**

- [x] Play App Signing SHA-256 listed in `public/.well-known/assetlinks.json`
      (Play Console → Setup → App signing):
      `7C:D9:28:BC:EA:04:8D:DF:2F:17:19:18:2F:E9:93:15:95:9E:D6:C9:E0:D7:CA:1E:2D:8C:21:D0:B7:02:CD:B2`
      — the certificate Google re-signs releases with; it verifies app
      installs from Google Play.
- [x] Local test APK SHA-256 also listed in `assetlinks.json`:
      `45:31:D7:3A:FD:A8:00:FC:B0:B8:17:44:87:F6:43:69:47:2B:40:52:CB:13:22:0E:99:1B:C8:D2:E7:2F:76:88`
      — the certificate side-loaded local test builds are signed with; it lets
      App Links verification succeed for local test installs. Keep BOTH
      fingerprints listed; never replace the Play one with the test one, and
      never confuse either with the upload key.
- [ ] Redeploy the website so the updated `assetlinks.json` is live: commit
      and push, and Vercel serves it on the next production deploy (`public/`
      files are served before rewrites). Confirm at
      https://www.pennyekart.com/.well-known/assetlinks.json — as of
      2026-10-27 the live URL returns HTTP 200 but serves app HTML (the
      deployed build predates the file), so Android cannot verify yet.
- [ ] Confirm product share links point at the site itself:
      `https://www.pennyekart.com/product/<id>` (optionally `?coupon=`).
      After redeploy, request that URL with a WhatsApp user-agent — it must
      return OG HTML (via the vercel.json bot rewrite to product-og); a normal
      browser user-agent must still get the app SPA. Previous Supabase
      `product-og` links already shared keep working.
- [ ] On a real device, verify App Links (a successful build is NOT successful
      domain verification):
      1. `git pull origin main && npm install && npm run build && npx cap sync android`
      2. Build and install a signed local test APK using the project's Android
         configuration (or install from Play for the Play signing certificate).
      3. `adb shell pm verify-app-links --re-verify com.pennyekart.app`
      4. Wait for verification, then
         `adb shell pm get-app-links com.pennyekart.app`
         — expected: `www.pennyekart.com: verified`.
- [ ] Test the four routes on a real device (browser or WhatsApp), cold start
      and with the app already open — the app must open the matching route on
      the live website:
      - `https://www.pennyekart.com/product/<real-product-id>`
      - `https://www.pennyekart.com/category/<real-category-id>`
      - `https://www.pennyekart.com/community/<real-community-id>`
      - `https://www.pennyekart.com/customer/verify/<real-code>`
      Also confirm wallet/profile/cart URLs still open in the browser, not the
      app.
- [ ] If the installed build was side-loaded with a key that matches NEITHER
      fingerprint above, verification fails — enable the link manually:
      Settings → Apps → Pennyekart → Open by default → "Open supported links"
      + check www.pennyekart.com.

## Before uploading
- [ ] `git pull`, `npm install`, `npm run build`, `npx cap sync android`
- [ ] Add `google-services.json` if push notifications are used
- [ ] Build signed release AAB in Android Studio (bump versionCode)
- [ ] Complete Data Safety, Content rating, Target audience, Ads declaration
- [ ] Provide a test login for Google reviewers
- [ ] Test on a real device: photo picker, location, notifications, microphone prompts, account deletion
