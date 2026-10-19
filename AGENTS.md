# Architecture rules

- Resolve community eligibility on the server from protected user_roles with a legacy-role fallback; approve requests atomically in a super-admin-checked RPC, and synchronize existing administrator role changes so grants cannot diverge.
- Keep community access requests separate from membership invitations; the profile wrapper gates the existing community card and the active admin Communities page hosts the review queue.

- Share automatic-cancellation classification and partner contact visibility in utilityServices helpers; keep this presentation-only so booking permissions and actions remain unchanged.

- Keep utility reminder pause timestamps scoped to the signed-in seller in a dedicated client hook; suppress only automatic in-app alerts and their floating reminder while leaving Firebase delivery and request actions unchanged.

- Share the presentation-only OrderItemHighlight across normal and utility seller order views; shared customer/delivery dialogs opt in explicitly so seller styling does not alter other roles or order actions.

- Keep delivery Orders card navigation local to DeliveryOrders while preserving quick-filter and notification deep-link entry into All Orders; presentation changes must not alter order actions.
- Keep Stock feature navigation local to DeliveryStock; card navigation must preserve the existing stock search, transfer form, and history filters without changing stock operations.

- Share the global assistant's availability and open command with homepage navigation through `src/lib/chatControls.ts`; the assistant stays mounted at app level so conversations survive page navigation.
- Keep delivery-staff reads and writes of customer address-book locations in an authenticated Edge Function that verifies order assignment, rather than granting staff direct access to other users' addresses.
- Fetch delivery order customer contacts in cached batches through the assignment-checked delivery Edge Function; share the contact display across order lists and notifications to avoid exposing unrelated profiles.
- Use NotificationDialogFrame for admin, seller, delivery, and utility booking alerts; default to blue and opt seller unfinished reminders into orange inside the portal so other roles and order actions stay unchanged.
- Keep utility-service FCM delivery in an authenticated Edge Function that verifies request ownership, resolves the provider server-side, and deduplicates sends so customer clients cannot choose recipients.
- Keep utility booking history reads scoped to the signed-in customer through the existing request ownership policies, so other customers' contact details remain private.
- Share per-user, per-role daily reminder dismissal across delivery, seller, and utility popup flows; keep it client-side and separate from booking/order actions.
- Keep delivery contact-attempt notifications behind an authenticated Edge Function that verifies order assignment, claims the order once, and sends only to that order's customer; customer notice reads must remain scoped to their own order.- Sync e-Life roles into profiles only through the super-admin-checked elife-role-sync Edge Function, matching by normalized mobile and existing role names, so browsers never choose roles from external data.
