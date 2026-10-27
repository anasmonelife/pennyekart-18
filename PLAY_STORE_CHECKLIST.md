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
**The https intent filter in `AndroidManifest.xml` is now `autoVerify="true"` for
`/product`, `/category`, `/community` and `/customer/verify` on BOTH
www.pennyekart.com and pennyekart.com (Android treats the two hosts as
different domains, so each is registered explicitly). Verification CANNOT
succeed until the steps below are done — until then Android shows a chooser
instead of auto-opening (same or better than before). The manifest change only
takes effect after a new APK/AAB build.**

- [x] Play App Signing SHA-256 pasted into `public/.well-known/assetlinks.json`
      (Play Console → Setup → App signing):
      `7C:D9:28:BC:EA:04:8D:DF:2F:17:19:18:2F:E9:93:15:95:9E:D6:C9:E0:D7:CA:1E:2D:8C:21:D0:B7:02:CD:B2`
- [ ] Redeploy the website so the updated `assetlinks.json` is live
      (`public/` files are served before rewrites, so it goes live with the deploy)
- [ ] Check `https://www.pennyekart.com/.well-known/assetlinks.json` in a
      browser shows the real fingerprint — as of 2026-10-27 the live URL
      returns HTTP 200 but serves the app HTML (deployed build predates the
      file), so Android cannot verify yet
- [ ] Check `https://pennyekart.com/.well-known/assetlinks.json` (apex, no
      www) also returns the JSON — Android verifies each host separately. If
      the apex 301-redirects to www, confirm the Digital Asset Links fetcher
      still succeeds (`adb shell pm get-app-links` shows the host as verified);
      otherwise serve the file on the apex too.
- [ ] Confirm product share links now point at the site itself: shared URLs
      are `https://www.pennyekart.com/product/<id>` (optionally `?coupon=`).
      After redeploy, request that URL with a WhatsApp user-agent — it must
      return OG HTML (via the vercel.json bot rewrite to product-og); a normal
      browser user-agent must still get the app SPA. Previous Supabase
      `product-og` links already shared keep working.
- [ ] On a device: rebuild the app (`git pull`, `npx cap sync android`, new
      APK/AAB), then test (a) a product link from WhatsApp, (b) a community
      invite link from WhatsApp, (c) cold start vs app already open,
      (d) `adb shell pm verify-app-links --re-verify com.pennyekart.app` and
      `adb shell pm get-app-links com.pennyekart.app`.
- [ ] If the installed build was side-loaded/debug-signed (Android Studio Run),
      App Links verification fails — the phone's certificate won't match the
      Play signing key. Install from Play, or temporarily enable the link
      manually: Settings → Apps → Pennyekart → Open by default →
      "Open supported links" + check both web addresses.

## Before uploading
- [ ] `git pull`, `npm install`, `npm run build`, `npx cap sync android`
- [ ] Add `google-services.json` if push notifications are used
- [ ] Build signed release AAB in Android Studio (bump versionCode)
- [ ] Complete Data Safety, Content rating, Target audience, Ads declaration
- [ ] Provide a test login for Google reviewers
- [ ] Test on a real device: photo picker, location, notifications, microphone prompts, account deletion
