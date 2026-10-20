# HRM-Mini integration

Source: https://github.com/Welstoryvietnam/HRM-Mini at 54563abc1fa55225c71e1ae096c95410cce68a5b.

The meal cycle (26th–25th), Vietnamese currency helpers, and Excel report templates were adapted from this repository. No demo accounts, plaintext password storage, public REST data mirror, ntfy channel, anonymous Firebase login, or external notification integrations are imported.

Menus: HR Scan, external meal declarations, and HR task management. Existing HR Scan data and drafts retain their collections. New structured data uses `hrm_meals`, `hrm_tasks`, and `hrm_settings` in the configured Firestore project. No new credentials or storage bucket is required.

Administrators manage assignments and meal settings and see all records. Employees see their own meals/tasks and can update progress/results for assigned tasks. Server-side authorization verifies the existing signed session and active account. Writes use Firestore preconditions to reject stale changes from another device.

This integration includes meals and tasks requested by the user. HRM-Mini's MBO, notes, AI chat, Google Calendar and messaging integrations are outside this scope.

## Importing historical data

Run `node --import tsx scripts/migrate-hrm.ts --source PATH` for a dry run, then add `--apply` to commit the verified plan. The destination must be `hrscan`. A backup of destination records and a migration report are stored under ignored `build/hrm-migration/`. A single atomic commit creates records with deterministic IDs and a migration marker. Repeating the same import skips existing matching records; conflicting records stop the import. Existing meal settings are preserved.

The first data-only import stored historical profiles in `hrm_directory`, without login credentials. The subsequently authorized HRM account cutover is described below. An administrator can still use “Nhân viên HRM-Mini & liên kết tài khoản” to resolve unmatched profiles. Source databases are never modified. A backup JSON exported from HRM-Mini's Settings screen can supply meal data that cannot be read from its old Firestore database.

## HRM accounts and meal screens

The authorized account cutover uses `scripts/migrate-hrm-accounts.ts --source PATH [--apply]`. It imports the existing HRM employee codes and stored passwords as scrypt hashes into `hrm_accounts`, links the matching historical profiles by exact employee code, and enables `hrm_auth/config` in one atomic commit. It refuses to overwrite existing accounts. Passwords and source backups stay under ignored `build/`; they are never included in browser bundles or Git. Missing contact emails are left empty; a stable internal `.invalid` principal identifies record ownership without inventing a contact address.

As explicitly selected by the owner, both HRM administrators and HR managers have administrative access to HR Scan. Staff remain limited to their own HRM data and personnel intake. Only the stored password is accepted; the old universal/last-four-digit bypasses are not imported. Legacy seed accounts are available only to explicit test fixtures, never Production.

Meal screens restore the original 26th–25th cycle, day cards, four meal-type checkboxes, location/purpose suggestions, personal statement and Excel report. Saves are awaited and versioned; an error keeps the form open. Future days cannot be declared. Statement percentages count days, not meal portions.
