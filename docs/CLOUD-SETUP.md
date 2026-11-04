# MC Sports cloud storage

Project: bzegomrjkrklrdruosxc (Card Tracker / Free / US East).
The public publishable key in cloud.js is intentionally public. Never add a service-role key.

Each authenticated user owns one portfolios row. RLS restricts SELECT, INSERT and UPDATE to auth.uid(). The database increments revision on every update; clients match the last loaded revision to avoid lost updates. A collection save is atomic. Offline changes are not queued: a failed save requires a refresh, and unsaved edits must be re-entered.

Old cardledger-v1 browser records are preserved. Sign in and use Import browser records to replace the cloud collection after confirmation. JSON Restore also replaces the cloud collection; export first. There is no automatic merge.

Auth Site URL: https://526cloiacono.github.io/mc-sports-tracker/
Email confirmation remains enabled. The default Supabase mail service only permits organization team recipients. Configure custom SMTP before opening email signup to the public. No SMTP provider is configured by this change.

Vendor rebuild: npm ci && npm run build:vendor. supabase.js is a pinned browser bundle; commit it with package-lock.json so GitHub Pages needs no build step.

Validation: existing financial model tests; database RLS cross-user isolation and revision tests in a rolled-back transaction; Supabase security advisor.
