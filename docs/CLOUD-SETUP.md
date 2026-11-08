# MC Sports cloud storage

Project: bzegomrjkrklrdruosxc (Card Tracker / Free / US East).
The public publishable key in cloud.js is intentionally public. Never add a service-role key.

Each authenticated user owns one portfolios row. RLS restricts SELECT, INSERT and UPDATE to auth.uid(). The database increments revision on every update; clients match the last loaded revision to avoid lost updates. A collection save is atomic. Offline changes are not queued: a failed save requires a refresh, and unsaved edits must be re-entered.

Old cardledger-v1 browser records are preserved. Sign in and use Import browser records to replace the cloud collection after confirmation. JSON Restore also replaces the cloud collection; export first. There is no automatic merge.

Auth Site URL: https://526cloiacono.github.io/mc-sports-tracker/
Email confirmation remains enabled. The default Supabase mail service only permits organization team recipients. Configure custom SMTP before opening email signup to the public. No SMTP provider is configured by this change.

Vendor rebuild: npm ci && npm run build:vendor. supabase.js is a pinned browser bundle; commit it with package-lock.json so GitHub Pages needs no build step.

Validation: existing financial model tests; database RLS cross-user isolation and revision tests in a rolled-back transaction; Supabase security advisor.

## Public-launch work (November 5, 2026)

Public privacy, terms, contact/deletion instructions, and vendor notices are in privacy.html, terms.html, contact.html, and licenses.html. The contact is the owner-approved Instagram @mc_sports27. Signup includes a required Terms checkbox. This is not a legal compliance certification or a trademark clearance.

Account-deletion requests are manual. Do not treat an Instagram username or claimed email as proof of ownership. Arrange confirmation through the registered account/email; never ask for passwords, recovery links, or sign-in codes. After ownership is verified and the user confirms deletion, export only if requested, revoke active sessions, delete their portfolios row and Auth user in Supabase, and verify both removals. Do not delete other users or send portfolio contents over social media. Check provider backup/log retention separately. Confirm completion privately. No automatic deletion or request-monitoring service is installed.

Remaining launch setup:
1. Choose and connect a production hosting account that permits the intended business use (for example Cloudflare Pages). The static publish directory is docs; no build command is needed. GitHub Pages commercial-use restrictions still apply to the existing deployment.
2. Set the Supabase Auth Site URL to the final HTTPS app URL and allow that exact URL in redirect settings. The app builds its confirmation and reset URLs from its current hosting location. Allow the new exact URL in Supabase before testing email flows. Sessions saved on the old browser origin do not transfer; users sign in again. Cloud portfolio data remains in the same Supabase project.
3. Configure a verified sender/domain and custom SMTP in Supabase Authentication. Keep provider credentials out of the repository and frontend. Keep email confirmation enabled. Test registration, confirmation, login, reset, and recovery using an owner-approved test address. The connector currently provides no Auth configuration/SMTP management capability; use the Supabase dashboard.
4. Verify the intended public brand/domain and review the published policies for the operator's jurisdiction and practices. An exact purchased domain has not been supplied.

## Anonymous reviews

The star in the tracker opens approved reviews. Signed-in users can submit one rating and comment per account. The database stores the account ID for duplicate prevention and account deletion. Public API readers can only see approved reviews and cannot select account IDs or approve submissions.

Moderate in the Supabase Table Editor under public.tracker_reviews. Read the comment, remove reviews that reveal private information, and set approved to true for reviews that are ready to publish. Do not approve or reject based on the star rating. Account deletion removes the associated review automatically.

## Cloudflare Pages deployment

Connect the existing 526cloiacono/mc-sports-tracker GitHub repository in Workers & Pages and choose Pages. Use the Free plan, the main branch, framework preset None, repository root, no build command, and docs as the output directory. The app already includes its browser bundle and does not need a server or separate database.

After a successful deployment, allow the exact new HTTPS address in Supabase Auth URL Configuration. Confirm existing sign-in and record loading on the new host. Configure custom SMTP with a verified sender, then test signup and reset with an address outside the project team before sharing the address widely.
