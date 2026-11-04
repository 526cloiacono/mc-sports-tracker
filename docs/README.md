# MC Sports — HTML, CSS & JavaScript

The working MC Sports card inventory and profit tracker, extracted into a simple static website. The website includes a pinned Supabase browser SDK and uses private account-based cloud storage. No frontend build step is needed to host the committed files.

## Start in VS Code

1. Clone this repository and open its `docs` folder in VS Code.
2. Serve the folder using the Live Server extension, or run `python -m http.server 8000` in this folder and open http://localhost:8000.
3. Use the site in your browser. Do not open index.html by double-clicking: the JavaScript uses ES modules, which need an HTTP server.

## Files

- `index.html`: page structure and navigation.
- `style.css`: responsive MC Sports blue/navy/black/white design.
- `app.js`: forms, inventory table, sales, expenses, searching, date filters, backups, and CSV export.
- `model.js`: validation and profit calculations using integer cents.
- `tests/model.test.js`: accounting and inventory tests.
- `.github/copilot-instructions.md`: project context for Copilot.

## Features

Add, edit, and remove cards. Track quantities, cost per card, manual PSA certs/grades, purchase dates, and notes. Save a card first, then use Sell to record quantity sold, total proceeds, and selling fees/shipping. Record expenses and view date-filtered financial totals. Export JSON backups and all-time CSV files (money fields in cents). There is no asking-price field.

Net profit = sales proceeds minus cost of sold cards, selling fees/shipping, and business expenses. Unsold cards remain inventory at cost.

## Working with GitHub Copilot

Open this folder in VS Code with GitHub Copilot enabled. Start with a prompt like:

> Read README.md and .github/copilot-instructions.md. Explain this project, then help me extend it using plain HTML, CSS, and JavaScript. Preserve the MC Sports design, existing backup format, and integer-cent accounting. Ask which feature I want next before changing behavior.

## Tests

With Node.js 22 or newer installed, run `npm test`. No npm install is required for this package.

## GitHub

Repository: https://github.com/526cloiacono/mc-sports-tracker

The complete standalone application is in `docs/`. The root contains earlier framework configuration retained for reference; use `docs/` to run and test this version.

To host on GitHub Pages, choose Settings → Pages → Deploy from a branch → main → /docs → Save. To run locally from the repository root: `python -m http.server 8000 --directory docs`. To test: `cd docs` then `npm test`.

## Data and hosting

Sign up on the website, confirm your email, then sign in. Records save to your private Supabase account. On other devices, sign in to the same account; use Refresh cloud records to load newer changes. Saves check a revision number and reject conflicting updates. An internet connection is required; failed saves are not queued offline.

Existing `cardledger-v1` browser records remain untouched. Use Import browser records on the original device/address, or Restore a JSON backup from another address. Both replace the cloud collection after confirmation, so export the cloud collection first if needed.

The default Supabase email service only sends to organization team addresses. Use your Supabase organization email for initial signup. Configure custom SMTP before opening signup to the public. Email confirmation remains enabled. See `docs/CLOUD-SETUP.md` (or `CLOUD-SETUP.md` when viewing docs/) for configuration details.

The publishable Supabase key is intentionally public and database access is restricted by row-level security. Never commit secret or service-role keys.

PSA automatic lookup is paused. Certs and grades are manual. No PSA API token is included, and no PSA requests are made. Do not put credentials in HTML, JavaScript, or Git.

## New in version 1.1

- Show list: choose cards and quantities to bring to your next show; see total quantity and acquisition cost.
- Print a packing checklist or export all packed cards to CSV. Print and export include the whole show list, even when a search is active.
- Sales cap show quantities at remaining stock. Undoing a sale restores inventory but does not automatically repack cards.
- Inventory sorting: newest added, name, cost high/low, and quantity.
- Stock filters: in stock, sold out, or all inventory.
- Live sale-profit preview before saving.
- Period sales summaries: transactions, cards sold, and average profit per card before business expenses.
- Old JSON backups remain compatible. New backups include show-list quantities.

To update, export a backup first, then replace the code files while keeping the same site address/server port. If you move addresses, restore that backup on the new site.

