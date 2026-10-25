# WhatsApp community invites + Play Store redirect

## What will be built

### 1. Send a community invite through WhatsApp
On `/customer/profile?tab=profile` → My Community, each pending invite gets a **Share via WhatsApp** button (also offered right after creating an invite). The message contains the community name and a link:

`https://www.pennyekart.com/community/invite/<invite-id>`

- Only the community creator can send links (existing policy — pending invites are creator-only).
- `invite_to_community` already blocks inviting someone who belongs to another community; nothing changes there.

### 2. New invite landing page
New public route `/community/invite/:inviteId` with this behavior:

- **Inside the app** (native shell): shows the community name and creator, then Accept / Decline. Accept runs the existing `respond_to_community_invite` RPC, which matches the invite to the signed-in user's mobile. Not signed in → login first, then return to the invite. Mobile doesn't match, invite used/expired → clear error message.
- **Mobile browser without the app**: shows an "Open the Pennyekart app" screen and auto-redirects to the Play Store listing (`https://play.google.com/store/apps/details?id=com.pennyekart.app&pcampaignid=web_share`) after a short countdown, with a visible "Continue in browser" button that cancels the redirect and proceeds with the invite flow (web browsers cannot detect whether the app is installed, so the countdown + escape hatch is the reliable pattern).
- **Desktop**: proceeds straight to the invite flow.

### 3. Same Play Store behavior for the verification link
`/verify-account` (existing `VerifyAccountLink` page, linked from the WhatsApp verification message) gets the same mobile-browser treatment: countdown → Play Store, "Continue in browser" to proceed with redemption. Inside the app it redeems immediately as today.

## Out of scope (already done, per your confirmation)
- Allocation table collapse model — already live on /admin/communities.
- Panchayath details in the allocation table — left as-is.

## Technical details
- `CommunityCard.tsx`: add WhatsApp share per pending invite using the existing `wa.me` pattern; message text with encoded link.
- New `src/pages/customer/CommunityInvite.tsx` + route in `App.tsx`; shared small helper (e.g. `src/lib/appLinks.ts`) for `isNativeApp()` check and the Play Store countdown screen so both pages use one implementation.
- No database changes: invite acceptance, single-community rule, and mobile matching already run server-side in `respond_to_community_invite`.
- Add a focused test for the redirect decision helper (native vs mobile-web vs desktop) next to the existing lib tests.
