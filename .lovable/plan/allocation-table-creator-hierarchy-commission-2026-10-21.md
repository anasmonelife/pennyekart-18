# Allocation table: creator + hierarchy commission

## What changes
The Allocation table on /admin/communities will show two kinds of rows for the chosen period:

1. **Community creator** – as today: creator's role rate (Role commission rules) x community profit.
2. **Hierarchy** – per person from e-Life:
   - **Coordinator**: communities whose creator lives in one of their allocated wards.
   - **Team leader**: communities in any of their allocated panchayaths.
   - **Super admin**: communities in any of their allocated panchayaths.
   - Each gets their role's rate (Role commission rules) x the profit of those communities.
   - If several people of the same role cover the same community, that role's share is split equally between them.

Only community profit is shared. Sales outside any community are never included.

## Flow
1. Admin picks a period and clicks Refresh: the table is calculated and **saved** (status "Pending verification").
2. Admin reviews, can edit any amount, and marks rows verified.
3. Admin clicks **Allocate**: amount is credited to that person's wallet and appears in the customer wallet **Sales commission** tab (new) with community, role, and date period.
4. Hierarchy people are linked to their Pennyekart account by mobile number; rows with no matching account show "No account" and cannot be allocated.
5. A person/community/period can only be paid once; overlapping periods are blocked.

## Wallet page
/customer/wallet gets tabs: **Transactions** (existing) and **Sales commission** (new) listing each payout: amount, community, role (creator / coordinator / team leader / super admin), period from–to, paid date.

## Technical details
- Migration: extend `community_commission_allocations` with `recipient_type` (creator|coordinator|team_leader|super_admin), `elife_person_id`, `status` (pending|verified|allocated), `share_count`; replace the per-community overlap rule with one keyed on (community, recipient user, recipient_type, period). Add super-admin RPCs `save_commission_allocation_rows(jsonb)`, `verify_commission_allocation(id, amount)`, and change `allocate_community_commission` to take an allocation row id, re-check status/overlap under lock, then credit wallet + transaction atomically.
- Hierarchy matching reuses `communitiesInArea` (wards for coordinators, panchayaths otherwise) in `src/lib/commissionAllocation.ts`; add a pure `buildHierarchyRows()` that splits equally among same-role people, with unit tests (equal split, ward filter, no non-community sales).
- Mobile → user_id match via normalized mobile against `profiles` (server-side in the save RPC).
- `CommunityCommissionTable.tsx` renders both row groups with type badges; `Wallet.tsx` adds Tabs and reads own rows from the ledger (owner RLS).
- Resolve the open linter note on the SECURITY DEFINER allocate function (internally super-admin-guarded; anon revoked).
- Update AGENTS.md rule for payouts.
