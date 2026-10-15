# Roadmap

## Partner notification daily dismissal
- [ ] Add a user-scoped “Not today” action beside Close in delivery, seller, and utility partner reminder popups.
- [ ] Verify dismissal persistence, next-day reset, role isolation, and popup actions.

## Automatic cancellation display
- [x] Show delayed-acceptance automatic cancellation badges in customer bookings and utility partner requests; hide customer names, phones, addresses, map links, notes, and call links on those partner requests. Source inspection and 13 focused tests passed. Live signed-in views remain unverified (external Supabase session unavailable).

## Utility My bookings status tabs
- [x] Split My bookings into Pending and Completed tabs (Cancelled tab appears when a booking was cancelled); counts shown per tab, Pending opens first. Three tab-switching tests and the booking grouping test passed; build OK. Live signed-in booking views remain unverified (external Supabase session unavailable).

## Utility booking availability and cancellation alerts
- [ ] Require an availability estimate when a utility partner accepts a request; show it in customer booking history.
- [ ] Allow customers to cancel pending/accepted bookings and immediately alert the assigned utility partner.
- [ ] Verify estimate and cancellation behavior with focused tests and preview checks.

## Admin seller directory
- [ ] Split the entry page into normal and utility seller cards, shorten lists with filters and pagination, and add matching utility partner detail tabs.
- [ ] Verify directory navigation, filters, and partner detail views.

## Utility seller phone layout and reminder pause
- [x] Match normal seller container, header, greeting, and launcher sizing; organize utility services, requests, and forms for phones. Sample screens checked at 360px, 390px, and desktop without horizontal overflow; build OK.
- [x] Add a top reminder control that pauses in-app reminders for 12 hours, persists on reload, and resumes automatically. Three timing/persistence/resume tests and existing popup action test passed; sample switch/reload/resume checked. Firebase unchanged.
- [ ] Verify the updated screen with a real utility seller account (blocked: external Supabase does not provide an authenticated test session).

## Seller unfinished-order reminders
- [x] Include all unfinished order stages and recurring reminders; new alerts blue, unfinished alerts orange with larger text. Filtering and shared-popup tests passed; build OK. Live seller-account verification unavailable with external Supabase.

## Seller order item visibility
- [x] Highlight individual items and show full item/service names in normal and utility seller order lists, details, and alerts; existing order-control tests and build passed, sample popups checked at desktop and phone widths. Live seller account orders remain unverified.

## Delivery Stock feature cards
- [x] Convert Stock sections to feature cards matching Orders; automated section/back-navigation, search and control checks passed; build OK. Live signed-in stock operations remain unverified (external Supabase).

## Delivery Orders feature cards
- [x] Finish the Orders feature-card grid and back navigation; two automated tests passed for all five sections and quick filters, and build passed. Live signed-in checks unavailable with external Supabase.

## Utility seller notification popup
- [x] Match the utility request popup to the normal seller blue notification layout; sample layout verified at 360px and 390px, with Accept and Later controls tested. Live signed-in booking updates remain unverified (external Supabase session unavailable).

## Selling partner dashboard controls
- [ ] Fix the pending utility-service reminder popup so it appears and its actions work.
- [ ] Replace order-status dropdown changes with explicit status buttons, preserving existing order actions.

## Consistent order popups
- [ ] Match admin and selling-partner order popups to the delivery blue layout, preserving role-specific actions; verify layout and controls.

## Delivery order contacts and popup
- [x] Show customer contact details on delivery orders and organize the blue gradient notification popup for mobile; deploy assignment-checked contact service.
- [ ] Verify customer contact retrieval and order updates signed in on the delivery app (blocked: external Supabase session unavailable); sample popup layout and controls verified at 360px.

## Delivery staff customer location
- [ ] Navigate to saved customer address pins and let assigned delivery staff save a newly captured delivery pin to the customer's address book.

## Dedicated selling-partner management
- [ ] Expand the standalone admin area to include partner profile/business details, performance, products, wallet, and coverage in one place.
- [ ] Confirm all admin links point to the standalone partner area, outside Users.

## Selling partner sign-in and notifications
- [x] Keep selling-partner sign-in restored after reopening; remember the mobile number without saving the password.
- [x] Refresh the notification permission display when the app resumes.

## Mobile homepage Utility shortcut
- [x] Replace scrolling service names with animated Utility category images; keep the icon fallback.

## Play Store compliance (approved plan)
- [ ] DB: deletion requests, profile field protection, verification RPCs, anonymise function, FK changes
- [ ] delete-account server function + Delete Account section (profile + partner dashboards)
- [ ] /privacy-policy, /delete-account, /terms pages + links (login, signup, profile, footer)
- [ ] Admin deletion requests list
- [ ] Android permissions + permission explanation prompts; no push request at launch
- [ ] Security: lock admin password reset function, verification moved server-side
- [ ] PLAY_STORE_CHECKLIST.md

## Customer password migration (uploaded notes)
- [ ] Remove shared password from frontend; legacy login checked on server only
- [ ] New signups choose own password
- [ ] Legacy/temporary accounts forced to set new password after login (status legacy -> migrated)
- [ ] Admin "Set Password" (temporary, must change on next login), admin-only on server
- [ ] No DOB-based recovery for customers

## Admin Reports click-to-open details
- [x] Every stat tile and report card on /admin/reports opens a popup with the full list behind it (orders, finance, products, sellers, delivery, stock, areas, searches, customers); P&L summary now opens as a popup. Type check passed; live admin view unverified (needs admin sign-in).

## Utility auto-cancel waiting limit
- [x] Per-category auto-cancel minutes setting in /admin/utility-services
- [x] DB function cancels stale pending bookings (cancelled_by=system)
- [x] Sweep runs on customer history, partner dashboard, admin page loads
- [x] Customer sees "partner unavailable" notice; tests pass, build OK
