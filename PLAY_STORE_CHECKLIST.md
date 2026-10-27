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
`/product`, `/category`, `/community` and `/customer/verify` on
www.pennyekart.com. Verification CANNOT succeed until the steps below are done —
until then Android shows a chooser instead of auto-opening (same or better than
before). The manifest change only takes effect after a new APK/AAB build.**

- [ ] Copy the Play App Signing SHA-256 (Play Console → Setup → App signing)
- [ ] Paste it into `public/.well-known/assetlinks.json`, replacing the empty
      `""` in `sha256_cert_fingerprints` (no placeholder fingerprint is shipped)
- [ ] Redeploy the website so the updated `assetlinks.json` is live
      (`public/` files are served before rewrites, so it goes live with the deploy)
- [ ] Check `https://www.pennyekart.com/.well-known/assetlinks.json` in a
      browser shows the real fingerprint
- [ ] On a device: rebuild the app (`git pull`, `npx cap sync android`, new
      APK/AAB), then test (a) a product link from WhatsApp, (b) cold start vs
      app already open, (c) `adb shell pm verify-app-links --re-verify
      com.pennyekart.app` and `adb shell pm get-app-links com.pennyekart.app`

## Before uploading
- [ ] `git pull`, `npm install`, `npm run build`, `npx cap sync android`
- [ ] Add `google-services.json` if push notifications are used
- [ ] Build signed release AAB in Android Studio (bump versionCode)
- [ ] Complete Data Safety, Content rating, Target audience, Ads declaration
- [ ] Provide a test login for Google reviewers
- [ ] Test on a real device: photo picker, location, notifications, microphone prompts, account deletion
