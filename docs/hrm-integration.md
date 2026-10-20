# HRM-Mini integration

Source: https://github.com/Welstoryvietnam/HRM-Mini at 54563abc1fa55225c71e1ae096c95410cce68a5b.

The meal cycle (26th–25th), Vietnamese currency helpers, and Excel report templates were adapted from this repository. UI modules use the existing HR Scan login. No demo accounts, passwords, public REST data mirror, ntfy channel, anonymous Firebase login, or external notification integrations are imported.

Menus: HR Scan, external meal declarations, and HR task management. Existing HR Scan data and drafts retain their collections. New structured data uses `hrm_meals`, `hrm_tasks`, and `hrm_settings` in the configured Firestore project. No new credentials or storage bucket is required.

Administrators manage assignments and meal settings and see all records. Employees see their own meals/tasks and can update progress/results for assigned tasks. Server-side authorization verifies the existing signed session and active account. Writes use Firestore preconditions to reject stale changes from another device.

This integration includes meals and tasks requested by the user. HRM-Mini's MBO, notes, AI chat, Google Calendar and messaging integrations are outside this scope.

## Importing historical data

Run `node --import tsx scripts/migrate-hrm.ts --source PATH` for a dry run, then add `--apply` to commit the verified plan. The destination must be `hrscan`. A backup of destination records and a migration report are stored under ignored `build/hrm-migration/`. A single atomic commit creates records with deterministic IDs and a migration marker. Repeating the same import skips existing matching records; conflicting records stop the import. Existing meal settings are preserved.

Historical employee profiles use `hrm_directory`; no passwords or account roles are migrated. An administrator can use “Nhân viên HRM-Mini & liên kết tài khoản” to link a profile to an existing account. Historical records remain private until this link is explicit. Source databases are never modified. A backup JSON exported from HRM-Mini's Settings screen can supply meal data that cannot be read from its old Firestore database.
