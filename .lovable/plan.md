# Bulk WhatsApp messaging for customers

## Experience
- Add customer selection to the Customers list, including desktop rows and mobile cards; selection will persist across pages and filters.
- Provide controls to select the current page or all currently filtered customers, show the selected count, and skip customers without a usable WhatsApp number.
- Add a bulk message composer with the existing message templates and editable text. Personalize the shared message with each customer's name.
- Open each selected customer's WhatsApp chat one at a time with the prepared message filled in. The admin sends each message manually, then continues to the next customer; no messages are sent automatically.

## Implementation details
- Keep the feature in the existing customer-list and WhatsApp messaging UI, reusing the current WhatsApp number/link helpers and shared checkbox/button components.
- Add focused tests for message personalization and the recipient queue behavior, then run relevant tests and verify the preview build.
