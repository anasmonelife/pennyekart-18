# Users page: tidy phone layout with tap-to-expand sections

Only the phone view changes (screens under 768px). Desktop stays exactly as it is. No change to what any button does.

## What changes on phone

1. **Header** — title smaller; "Export CSV" and "Add Admin" shrink to compact icon+label buttons on one row.
2. **User type counters** — the 7 big count boxes become one horizontal scroll strip of small chips ("All 320", "Customers 210", "Admins 1"...). Tapping a chip still switches the list.
3. **Filters** — search box stays visible. The 7 dropdowns (role, approval, status, district, panchayath, ward, seller type) move into a collapsible "Filters" panel, closed by default, with a badge showing how many filters are on and a "Clear" button.
4. **User list** — instead of a wide sideways-scrolling table, each user is a small card showing name, mobile and type badge. Tapping the card expands it to show email, seller type, approved, role, super admin and the action buttons (edit, reset password, block, delete).
5. **Customers and Admins tabs** — same card-and-expand treatment for their lists on phone.
6. **Pagination** — compact single row (prev / page x of y / next).

## Technical details
- `src/pages/admin/UsersPage.tsx`: use `useIsMobile()`; wrap filters in `Collapsible`; render mobile card list (Collapsible per row reusing existing action handlers) when mobile, existing Table otherwise; counter grid becomes `flex overflow-x-auto` chips on mobile.
- `src/components/admin/CustomerList.tsx` and `AdminsPanel.tsx`: add the same mobile card/expand rendering branch.
- Presentation only; no data or permission changes.
