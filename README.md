# MC Sports — Inventory & Profits

A sports card inventory and profit tracker with a blue, navy, black, and white interface.

## Features

- Add, edit, and remove cards; track quantities, purchase cost, dates, notes, and manual PSA cert/grade details.
- Record sales after saving a card, including partial quantities, sale proceeds, and selling fees/shipping. Undo sales when needed.
- Track business expenses and filter financial totals by date.
- Export and restore JSON backups; export all-time CSV data (money fields use integer cents).

Net profit = sales minus sold-card cost, selling fees/shipping, and business expenses. Unsold cards remain inventory at cost. Date filters affect financial totals and sales/expense lists, while inventory shows current holdings.

## Run locally

Requires Node.js 22.13 or newer and pnpm (version specified in package.json).

```sh
pnpm install
pnpm dev
```

For a lightweight interface preview without the framework, serve `public/` with a static web server, for example `python3 -m http.server 8000 --directory public`.

```sh
pnpm test
pnpm build
```

The framework uses Vinext and a Cloudflare Worker. Interface assets are in `public/`; `lib/cardledger-html.ts` contains the root HTML response and should be kept consistent with `public/index.html`.

## Data and current limits

Inventory is stored only in the current browser using localStorage (`cardledger-v1`), with no account or cross-device sync. Export backups regularly. No customer inventory or API credentials are included in this repository. Existing backups remain compatible with the MC Sports design.

PSA automatic lookup is paused. Certs and grades can be entered manually. The inactive adapter and synthetic tests remain for future development; the API route returns a paused response. Do not add API tokens to browser code or Git. Any future public PSA integration requires appropriate provider permission and server-side credentials and quota controls.

There are no automatic market prices, card photos, or tax reports. Making this repository public does not change the hosted site's access settings.
