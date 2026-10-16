# Delivery staff contact-attempt alerts

When delivery staff taps **Notify customer** on an assigned order, the customer receives a one-time “We’re trying to contact you” alert in the app and a Firebase phone notification. The existing Call and WhatsApp actions stay unchanged.

## What will change
- Add a **Notify customer** button to each delivery order’s contact area. After it is sent, show that it has already been sent and prevent repeat sends for that order.
- Add an authenticated Edge Function that verifies the signed-in user is the delivery staff member assigned to that order, records the attempt atomically, and sends FCM to the order customer’s saved device token. Reuse the existing Firebase setup; do not trust a customer ID or message supplied by the browser.
- Store a nullable contact-attempt timestamp on the order so the action is once per order and the customer can still see it if phone notifications are unavailable.
- Show the alert inline on the customer’s active order, with a deep link from the phone notification to that order. Keep the existing broadcast notifications and order actions unchanged.
- Add focused checks for assignment-only access and one-send-per-order behavior; verify the staff button and customer order notice.

## Technical details
- Schema: add `orders.delivery_contact_attempted_at`; retain existing order RLS and perform the new write only in the ownership-checking Edge Function using the service role.
- FCM: use the existing Firebase secrets and clear a stale customer token only for Firebase’s invalid/unregistered-token response.
- Message is fixed: “We’re trying to contact you about your delivery. Please answer the call or contact your delivery staff.” No free-text messages or customer contact details in the push payload.
