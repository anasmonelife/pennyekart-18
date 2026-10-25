# WhatsApp verification link for customers (super admin, team leader, coordinator)

On `/customer/profile?tab=profile`, add a second way to verify an account: an authorized person (super admin, team leader, or coordinator) creates a one-tap verification link for any customer's mobile number and sends it through WhatsApp. When the customer opens that link, their account is verified automatically — no code to type.

Decisions confirmed with the user: links expire after **24 hours**, any customer can be linked by mobile number, and the existing self-verification code flow **stays** alongside the new option.

## How it works

```text
Authorized role-holder (customer profile page)
  → enters the customer's 10-digit mobile
  → app calls create-verification-link (server checks the sender's role)
  → server stores a hashed one-time token, tied to that mobile, 24h expiry
  → app opens WhatsApp to the customer's number with a pre-filled message containing the link

Customer taps the link (any device, no sign-in needed)
  → /customer/verify?token=... opens
  → page calls redeem-verification-link
  → server checks: token valid, unused, not expired, mobile still matches the profile
  → marks the account verified → success screen
```

The "number match" is guaranteed two ways: the link is delivered only to that customer's WhatsApp, and at redemption the server re-checks that the profile's mobile number still matches the one stored in the link (so a changed number cannot be verified by an old link).

## Database (one migration)

New table `account_verification_links`:

- `token_hash` (unique) — SHA-256 of the random token; raw token is never stored
- `customer_user_id`, `customer_mobile` — the account and number the link verifies
- `created_by` — who generated the link
- `expires_at` — created_at + 24 hours; `used_at` — set at first successful redemption
- `created_at`

Access rules:

- Row-level security on; only service-side functions read/write the table
- Signed-in users may view only the links they created (lets the sender see what they sent); no other client access
- No anon grants

## Server (Edge Functions)

- `create-verification-link` (signed-in only): re-checks the sender's authorization on the server (profile super-admin flag, or an assigned role named super admin / team leader / coordinator from the protected user_roles table), validates the mobile, finds the customer account, rate-limits per user, stores the hashed token with a 24-hour expiry, and returns the raw token once so the app can build the link.
- `redeem-verification-link` (public, no sign-in needed): rate-limited per IP; validates the token hash, single-use, expiry, and the current mobile match; marks the link used and sets the profile verified flag and timestamp in one step. Reopening a used link shows "Already verified" rather than failing.
- Shared helper module keeps the allowed-role names and token logic testable, following the existing edge-function test pattern.

## Frontend

- New public route `/customer/verify` → `src/pages/customer/VerifyAccountLink.tsx`: reads the token from the URL, calls the redeem function on open, and shows clear states — verified successfully, already verified, expired, already used, or invalid link. Works signed-out and on mobile browsers.
- `VerifyAccountCard` on the profile page gains a second option, shown only when the signed-in user's assigned role is super admin, team leader, or coordinator (read from the same protected role source the app already uses; super admin via the profile flag):
  - "Verify a customer" opens a dialog: enter the customer's 10-digit mobile → "Create link & open WhatsApp" → opens `wa.me` to the customer's number with a pre-filled message containing the link, same pattern as the existing code flow.
  - The existing self-verification (enter own number, 6-digit code) is unchanged and still shown to everyone.
- Small shared helper (`src/lib/accountVerification.ts`) for the allowed-role check and mobile normalization, with vitest tests matching the project's existing test style.

## Housekeeping

- AGENTS.md: add one rule — verification links are created only through the server-checked edge function and redeemed by a single-use hashed token with a 24-hour expiry and a mobile-match check, so browser code can never mint or approve verification.
- roadmap.md: add a "WhatsApp verification link" section.

## Out of scope

- No change to the 6-digit code flow, login, or other profile features.
- No push/FCM notification for the sender when the customer verifies; the sender sees the link was created, and the customer's verified badge updates on their next profile load.
