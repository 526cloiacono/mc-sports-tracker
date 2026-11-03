# MC Sports project instructions

This is a plain HTML/CSS/JavaScript sports-card inventory and profit tracker. Keep it framework-free unless the owner requests a migration.

- Preserve the blue, navy, black, and white MC Sports design and mobile layout.
- Do not add an asking-price field. Cards are saved before a separate Sell action records proceeds.
- Keep financial amounts as integer cents and validate non-negative values and whole-number quantities.
- Profit uses sold-card cost, not total inventory purchases. Partial sales must preserve remaining quantities.
- Keep localStorage key cardledger-v1 and preserve JSON backup compatibility. Do not silently reset user data.
- PSA automatic lookup is paused. Keep manual cert and grade entry. Never add secrets to client-side code.
- Escape user-provided text before rendering HTML and protect exported CSV values against formula injection.
- Run npm test after accounting or inventory changes. Update tests only when intended behavior changes.
- A future shared/public product needs a separately designed backend, per-user access controls, and database. Do not imply localStorage provides synchronization.

- Preserve optional card.showQty for show planning, validate it against remaining stock, and keep old backups without this field compatible.

