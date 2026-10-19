# Sync e-Life roles into Users

A "Sync e-Life roles" button on the Users page. It looks up every user's mobile number on the e-Life Society site. When it finds a match, it gives that user the Pennyekart role with the same name.

## What the admin sees
- A **Sync e-Life roles** button in the Users page header. Only super admins can use it.
- A confirmation before anything changes, then a summary: how many users matched, how many roles were updated, and which e-Life roles have no Pennyekart role with the same name (those users are left unchanged).
- The list refreshes afterwards, so updated users show their new role.

## Rules
- Users are matched by mobile number. Numbers are compared on their last 10 digits, so +91, 0 and spaces don't stop a match.
- A role is set only when an e-Life role name matches a Pennyekart role name (ignoring capital letters). No new roles are created.
- Super admins and the admin running the sync are never changed.
- Users with no e-Life match keep their current role.

## Steps
1. Check e-Life's role data (its `user_roles`, `admins`, `profiles` and `pennyekart_agents` tables) to confirm which one holds the role for each mobile number. This hasn't been confirmed yet.
2. Add a secure server function, `elife-role-sync`. It checks that the caller is a super admin, reads e-Life roles by mobile number, matches them to Pennyekart users and roles, and updates their role. It returns the summary.
3. Add the button, confirmation and summary to the Users page.
4. Add a small test for the mobile-number matching and role-name matching rules.

## Technical details
- The function reuses the existing e-Life connection settings and respects the "Allowed e-Life tables" list.
- It also uses the same super-admin check as the existing e-Life table check and the "Add Admin" flow.
- Role updates go through the server function so browsers can't set roles directly.
- AGENTS.md gets a rule: e-Life role sync runs server-side and only for super admins.
