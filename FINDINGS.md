# Route Command: Findings

Updated 2026-10-19. Open work first, grouped by area and sorted by priority; finished work is at the bottom.
Tags: **[H]** high, **[M]** medium, **[L]** low. `[ ]` = open, `[x]` = done.

## Contents
- [Bugs and data loss](#bugs-and-data-loss)
- [Security and abuse](#security-and-abuse)
- [UX and accessibility](#ux-and-accessibility)
- [Features](#features)
- [Docs and repo](#docs-and-repo)
- [Completed](#completed)

---

## Bugs and data loss
- [ ] **[H]** A new submission can silently delete an unsent failed one. `saveToHistory` drops every earlier `failed` row with the same type + label (`js/history.js:24`), and `reconcile` then deletes any `failed` outbox record that no history row points at (`js/queue.js:51`). Labels are only `$amount · category`, so two real receipts such as `$5.00 · Tolls / Parking` collide; if the first one failed, entering the second discards the first receipt and its photo with no warning. Match on `submissionId` (or a content key of date + amount + category + store), never on the label, and stop `reconcile` from deleting failed records that still hold unsent photos without asking.
- [ ] **[H]** Transient server trouble becomes a permanent failure. `postJSON` returns only the parsed body and drops `res.status` (`js/util.js:77-90`); `flushOutbox` then treats anything other than a network error as terminal and writes `status: 'failed'` (`js/outbox.js:77-86`). So a queued submission that hits "Google is busy" (the gateway's own 502), a lock timeout ("Server busy, try again."), or a platform 504 waits for the rep to open History and tap Retry. Return `{ ok, status, body }`, keep 5xx / 429 / "busy" replies in `queued` with an `attempts` count and backoff (1 min, 5 min, 30 min), and only mark `failed` for 4xx validation errors. Resending is already safe thanks to `submissionId`.
- [ ] **[M]** Failed rows don't say why. History shows just the word "failed" (`history.js:116`); the outbox record already stores `error`. Show it under the row ("Tab 'Receipts' not found", "Server busy") so a rep can decide between Retry and telling Ian.
- [ ] **[M]** `loadHistory` has no `try/catch` around `JSON.parse` (`history.js:10`). One corrupted `rc_history` value (storage quota error mid-write, a manual edit) throws on every `renderHistory()` call at startup, so the app never finishes booting. Return `[]` on parse errors and keep a `rc_history_bad` copy for diagnostics.
- [ ] **[M]** Amount is sent as whatever the input held. `type="number"` accepts `1e3`, `12.345` and `0.001`, and the payload carries the raw string (`js/receipts.js:123-124`), while the History label shows `toFixed(2)`. Round to cents on the client (`Number(parseFloat(amount).toFixed(2))`) and enforce the same shape in `Code.gs` (`/^\d{1,6}(\.\d{1,2})?$/`) so a direct POST can't write `1e999` into the sheet.
- [ ] **[M]** `DonationCode.gs` still hard-codes its Sheet ID in the repo (`DonationCode.gs:19`), and the credit and donation scripts write to `getActiveSheet()` (`CreditCode.gs:87`, `DonationCode.gs:76`), the fragility already fixed for receipts. Reordering or adding a tab silently redirects new rows. Move to a Script property (`DONATION_SHEET_ID`) and a named tab (`Credits`, `Donations`) with the same clear error `Code.gs` gives.
- [ ] **[M]** `DonationCode.gs` writes `item.qty || 1` unsanitised (`:112`), and the other fields' formula guard doesn't apply to it. The web app is public ("Anyone"), so a direct POST with `qty: "=IMPORTXML(...)"` lands as a live formula. Coerce `Number(item.qty)`, reject non-finite values, and cap at something sane (1-9999); do the same for any other raw field.
- [ ] **[L]** Receipt photo filenames collide and retries can orphan files. The name is `date_name_category_amount.jpg` (`Code.gs:127`), so two identical-amount fuel receipts on one day get the same name, and if the Drive upload succeeds but `appendRow` fails, the retry uploads a second copy. Put the first 8 characters of `submissionId` in the filename and check `folder.getFilesByName()` before creating.
- [ ] **[L]** The GAS fetches in `submit.mjs` have no timeout, so a slow Apps Script holds the function until the platform kills it and returns an HTML error page. Wrap both `fetch` calls in `AbortSignal.timeout(8000)` (and log the route + message with `console.error`) so the client always gets the JSON "Google is busy" reply that the queue can retry.
- [ ] **[L]** On resume the queue isn't flushed until the 30 s interval (`queue.js:109`), and iOS has no Background Sync. Add a `visibilitychange` -> visible listener that calls `flushQueue()` at once, and show a banner when the oldest queued item is over a day old ("2 receipts haven't sent since yesterday. Open on Wi-Fi.").
- [ ] **[L]** `sw.js` precaches only four files (`SHELL`), so `manifest.webmanifest`, `icon-192.png` and the apple icon are cached only if they were fetched online before. Add them to `SHELL`. Also, `data.json` updates (a new store or rep) arrive one load late because the cache is served first; post a message from the worker when the refreshed body differs and re-render the pickers.

## Security and abuse
- [ ] **[H]** The passcode is a constant compared in the browser (`app.js:72-73`), visible in DevTools or the repo. Move the check into a Netlify function (`/api/auth`) that compares against an env var and returns a signed token (HMAC, 30-day expiry); the submit functions require that token. Combine with per-person PINs to also fix "anyone can submit as anyone".
- [ ] **[H]** Securing only the Netlify function is not enough: the GAS web app URL is hardcoded in the repo history and the deployment is "Anyone". Anyone can POST straight to Google and fill your Drive folder or Sheet. Put a shared secret in a Netlify env var **and** in GAS `PropertiesService`; the function adds it to the body, `doPost` rejects when missing or wrong. Then rotate the GAS deployment URL (new deployment = new URL) and update the Netlify env vars.
- [ ] **[H]** `data.json` is still published (employee full names, customer store names) and the Drive folder and Sheet IDs remain in git history. The `dist/` change already stopped the `.gs` and docs files from being downloadable. Decide if `data.json` must sit behind the auth token, and whether to rotate the IDs.
- [ ] **[M]** No size or shape validation in `doPost` (`Code.gs:56-70`): `imageData` has no max length (a 50 MB base64 string eats the Apps Script quota or times out), `amount` and `receiptDate` are not validated, `category` is free text. Reject images over ~2 MB decoded, require `^\d{4}-\d{2}-\d{2}$` dates, amount `> 0` and `< 10000`, and `category` in an allowlist.
- [ ] **[M]** `savedFile.setSharing(ANYONE_WITH_LINK)` (`Code.gs:90`) makes every receipt photo (names, card last-4, addresses) public to anyone with the link. Use `DOMAIN_WITH_LINK` if accounting is in the same Workspace, or skip per-file sharing and let the folder permissions apply.
- [ ] **[M]** Auto-lock: ask for the passcode again after 30 days or when the name changes, so a lost phone stops working.
- [ ] **[M]** `netlify.toml` sets only cache headers. Add a `[[headers]] for = "/*"` block: `Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `Permissions-Policy: camera=(self), geolocation=(), microphone=()`. The app renders history through `innerHTML` (escaped by `esc()`), and a CSP is the backstop if one template is ever missed.
- [ ] **[L]** No rate limiting or logging on the functions. Netlify's `context.ip` plus a small in-memory counter, and `console.log` of failures, gives you something to look at when a submission "went missing".
- [ ] **[L]** `data.json` includes "Ian Aps" and the developer; confirm it is the intended roster before this goes wider.
- [ ] **[L]** Add a GitHub Actions workflow: `npm ci && npm test && npm run build`, then fail if `dist/` contains any `.gs`, `.md` or `FINDINGS` file. It automates the "only six files are public" guarantee the `dist/` change introduced.

## UX and accessibility
- [ ] **[M]** Donation item fields have no accessible names. The "Qty" and "Sell-by date" labels are `<span>`s (`js/donations.js:36-47`), so tapping them does nothing and screen readers announce an unnamed field. The stepper `−`/`+` buttons and quantity input have no `aria-label` (credits has them). Use `<label>` or `aria-label`. Same for "Receipt photo" (`<label>` without `for`) and all placeholder-only inputs (UPC, weight, search).
- [ ] **[M]** The "no photo" dialog nudges toward skipping the photo (`js/receipts.js:117`). Make the primary button "Add photo" (closes the dialog, opens the camera/library) and the secondary "Submit without photo". If the date is old or in the future *and* the photo is missing, combine the two dialogs into one list of warnings with one confirm.
- [ ] **[M]** Brand colors are too dull to carry a dark UI. Gold `#625636` is about 2.6:1 on black and red `#841b2a` about 1.9:1 on the card. The dashed "Take photo" border, step numbers, icons and the gate's focus color are all that muddy olive-brown, so there is no bright accent. Keep the brand values for fills and logos; add brighter tokens for borders, icons and focus on dark (e.g. gold `#9c8a55`, red `#c0394d`) and use them for the active nav indicator, focus rings and the upload border.
- [ ] **[M]** "Submit same as last time" shortcut on the receipt form (copy category, vehicle tag, store for recurring fuel stops).
- [ ] **[M]** Rank item and store search results. `matchAll` returns the first 8 entries in list order (`js/itemlist.js:5-9`), so a rep typing `ham` sees whichever hams come first alphabetically. Sort by: starts-with, then word-start match, then substring, and put items this rep used recently on top (a small `rc_item_counts` map in `localStorage`); add a "Show more" row instead of a hard 8-row cap.
- [ ] **[L]** Category chips: show the top 3 (last used) above the select. Fuel and Sales Lunch are most receipts, but each needs open → scroll → tap.
- [ ] **[L]** Theme setting: Auto / Light / Dark. The toggle stops following the system setting after the first flip.
- [ ] **[L]** Reason "Other" (credits and donations) should reveal a short "What happened?" field; today it carries no information.
- [ ] **[L]** Raise the history limit from 15 to 50 and add "Show more" (15 rows is only a few days of use). Retry payloads live in the outbox, so storage stays small.
- [ ] **[L]** Store list: show recent and favorite stores first on Receipts too (Credits already offers the last 3).
- [ ] **[L]** Autosave a draft on the receipt form. Credits and donations restore a draft after a reload (`autosaveDraft`), but the receipts form (`js/receipts.js`) doesn't, so an app kill while taking the photo loses the amount, category and notes. Reuse `autosaveDraft` and keep the photo in IndexedDB.

## Features
- [ ] **[H]** Email Ian on every submission. 3 lines of `MailApp.sendEmail` with a link to the Sheet row and the photo. Doubles as a backup of what was submitted.
- [ ] **[H]** Warn when the amount looks wrong: confirm if `amount >= $500`, or if it equals an earlier submission today (same amount + category). Cheap guard against typos like 1250 vs 12.50 and double-submits.
- [ ] **[H]** Tell reps what happened to their submission. Today every row ends at "saved" (it reached the sheet), and reps never learn if it was approved, paid, or needs another photo. Add a `Status` / `Reviewer note` column to the receipt sheet (the credits sheet already has a `Done` column), a `doGet?name=...&secret=...` endpoint returning that rep's last 30 rows, and show "Approved" / "Paid" / "Needs info: <note>" chips in History on open. This is rep-facing and distinct from the parked admin page.
- [ ] **[M]** Scan the UPC. The donation and credit forms ask for a UPC and then search `data.json`; on Chrome/Android the `BarcodeDetector` API (EAN-13 / UPC-A) can read it from the camera in a few lines, then `matchAll(items, upc)` fills the item. Feature-detect and fall back to typing on iOS.
- [ ] **[M]** Allow 2-3 photos per receipt. Long thermal receipts and two-page invoices don't fit one 1024 px frame (the photo quality item only makes the single image bigger). Send `imageData` as an array, save each to Drive with `_1`, `_2`, and put all URLs in the sheet cell separated by newlines.
- [ ] **[M]** Month-to-date total for the rep: "$412.50 this month · 9 receipts" on Receipts and History. History keeps only 15 rows, so compute it from a separate `rc_totals` ledger (date, amount, category) that survives trimming, or from the rep status item. It answers "did I submit everything?" before expense reports are due.
- [ ] **[M]** Receipt OCR: start with the free browser `TextDetector` or lazily loaded Tesseract.js to auto-suggest total and date; the rep confirms. No server cost.
- [ ] **[M]** Admin page, read-only version: a second GAS `doGet` returning JSON of recent rows behind the same secret, shown as a table with filters and a CSV export link.
- [ ] **[M]** Weekly/monthly digest email to each rep and to Ian: totals per category and anything still unmatched (needs a "Done" status column).
- [ ] **[M]** Photo quality and tools. Resize caps width at 1024 px / JPEG 0.7 (`app.js:224-225`), so long thermal receipts lose small print; use 1600 px / 0.75 (still under ~400 KB). Add auto-crop/edge-detect, a contrast boost and a rotate button for sideways shots.
- [ ] **[M]** Policy rules in `data.json`: per-category photo required, note required (e.g. Miscellaneous and Sales Lunch / Client Entertainment: who and why; ask Ian first), max amount without approval, so the form enforces policy and Ian stops bouncing submissions.
- [ ] **[L]** Move name list, stores, items and category rules to a "Config" sheet tab read by `doGet`; Ian edits without a deploy. Cache in the service worker.
- [ ] **[L]** Mileage log with odometer photo, tied to the vehicle tag.
- [ ] **[L]** Spanish for warehouse staff: UI strings in a small `strings.js` dictionary, picked from `navigator.language` with a Settings override.
- [ ] **[L]** Store photos as Blobs, not data URLs. `FileReader.readAsDataURL` then `toDataURL` builds two large strings per photo and the outbox saves a base64 string (33% bigger). Use `createImageBitmap(file, { imageOrientation: 'from-image' })` -> `canvas.toBlob('image/jpeg', q)`, keep the Blob in IndexedDB, and convert to base64 only at send time.
- [ ] **[L]** Manifest upgrades: add `"id": "/"`, `"scope": "/"`, `"orientation": "portrait"`, and `shortcuts` (New receipt `/receipts`, New credit `/credits`, New donation `/donations`) so long-pressing the home-screen icon jumps straight into a form. Split the 512 icon into separate `any` and `maskable` entries (`"any maskable"` on one file is discouraged and crops the shield).
- [ ] **[L]** Add a `share_target` so a receipt photo sent via email or Messages can be shared into Route Command and open the receipt form with the photo attached (needs a service-worker handler for the POSTed file).

## Docs and repo
- [ ] **[L]** README is stale: it says Netlify functions are "configured in each `.mjs` file" (there is one `submit.mjs` reading three env vars), shows v1.2 while the app says v1.4, and has no env-var list. Add the deploy steps (GAS deployment, Netlify env vars, how to rotate the secret) so someone else can take over.
- [ ] **[L]** `npm test` uses `node --test 'tests/*.test.mjs'`, whose glob needs a recent Node. Add `"engines": { "node": ">=22" }` and `.nvmrc` so Netlify and local runs agree.

---

## Completed
- [x] **[H]** Deployed to Netlify 2026-10-19: env vars `GAS_URL_RECEIPT`, `GAS_URL_CREDIT`, `GAS_URL_DONATION` set; smoke test passed (each flow adds a row with an ID in the hidden last column); real-phone check passed (offline submit arrives later, pull-to-refresh on History, "Update available" banner). The function paths in `submit.mjs` must stay a literal array, or Netlify ignores them and `/api/*` returns the HTML page.
- [x] **[H]** Submit sits in a sticky bar above the bottom nav while a form is longer than the screen; it drops back to the end of the form while a field has focus. The bar also holds the submit error text. CSS only (`.submit-bar`).
- [x] **[M]** Below 480 px the form card loses its border, shadow and padding and the gutter is 16 px, so credit and donation fields get ~330 px (sell-by date no longer cut off). UPC placeholder is `UPC`.
- [x] **[M]** Phones hide the page subtitle (History keeps its "last 15" line) and the header margin is 1 rem. Credits' recipient moved into the Store label ("Store · sent to Ian", phones only).
- [x] **[M]** Today / Yesterday chips on the receipt and credit dates; Tomorrow / +3 days under the donation sell-by date. One click handler in `app.js` (`[data-days]`); `today(n)` takes a day offset (`tests/util.test.mjs`).
- [x] **[M]** Duplicate button on every credit and donation card: copies type, reason and sell-by, clears UPC/item, weight and qty, and focuses the new line. Credit Reason now defaults to the last one used.
- [x] **[M]** Desktop (1024 px+): Date + Amount and Category + Vehicle side by side on receipts, Store + Date on credits. The receipt form's DOM order is now Date, Amount, Category, Vehicle (phones too).
- [x] **[L]** Copy diagnostics has a gap under the Version card.
- [x] **[L]** Photo buttons: "From library" fits one line and both buttons are the same height.
- [x] **[L]** Queued and failed History rows draw their accent with `box-shadow: inset`, so every row lines up.
- [x] **[L]** History rows: 20 px chevron, right-aligned and centered; one type chip plus a coloured status dot and word; "Clear history" is a text button with more space above.
- [x] **[L]** Settings: "Your name" and "Default vehicle" are single rows (label left, select right).
- [x] **[L]** Credits and donations both list Retail first and default to it (donations still remember the last type used).
- [x] **[L]** Number inputs hide the spinner arrows (amount, weight, qty).
- [x] **[L]** Ctrl/Cmd+Enter submits the form on screen (ignored while a dialog is open).
- [x] **[H]** Apps Script deployed as new versions of the existing deployments (same URLs): `Code.gs` (Script properties `DRIVE_FOLDER_ID`, `SHEET_ID`; tab named `Receipts`), `CreditCode.gs` (property `CREDIT_SHEET_ID`), `DonationCode.gs`. They also accept requests from the old app.
- [x] **[H]** Duplicate rows on retry: client adds a `submissionId` (UUID) once per submission, kept on every resend. All three scripts keep it in a hidden `Submission ID` column, check the newest 2000 rows under the lock before saving the photo, and answer a repeat with success + `duplicate:true`. Tested against the real `.gs` files with a fake spreadsheet.
- [x] **[H]** Rows marked `sending` no longer flip to `failed` on next load. An interrupted send stays in the outbox, is queued again and resent with the same `submissionId`, so the row ends `saved`.
- [x] **[H]** "Submit another" wiped the date and default vehicle. After `reset()` the date is `today()` and the vehicle is the saved default (`js/receipts.js`).
- [x] **[M]** Queue and history moved off `localStorage`: unsent submissions (with photos) live in IndexedDB (`js/outbox.js`); old items migrate automatically.
- [x] **[M]** Background Sync: the queue flushes from the service worker when the connection returns (Chrome/Android); iOS and Firefox keep the 30 s / `online` flush while the app is open. A Web Lock stops page and worker sending at once.
- [x] **[M]** Gateway returns 502 `{status:'error', message:'Google is busy, try again in a minute'}` for non-JSON replies; `postJSON` turns any non-JSON reply into a readable error. `tests/gateway.test.mjs`.
- [x] **[M]** `Code.gs` writes to the tab named `Receipts`, with a clear error if missing (not the active tab).
- [x] **[M]** All three `doPost`s take `LockService.getScriptLock().waitLock(10000)` (fixes the header-row race). Credit and donation rows are written in one `setValues` call.
- [x] **[M]** Sheet formula injection: `sanitize()` in all three `.gs` files prefixes a leading `= + - @` with `'`. Test in `tests/gas.test.mjs`.
- [x] **[M]** Service worker versions its cache (`rc-<7-char commit>`), precaches with `cache:'reload'`, deletes old caches, and shows an "Update available. Tap to reload" banner (not on first install).
- [x] **[M]** Netlify functions merged into one `netlify/functions/submit.mjs` route table, URLs from env vars; a missing var returns a clear 500.
- [x] **[M]** Stale docs moved to `docs/`; later `PROMPTS.md`, `TODO.md` and `IMPROVEMENTS.md` deleted (history is in git, open work is here).
- [x] **[L]** Build: `esbuild` 0.28.2 pinned; `build.mjs` writes to `dist/`, Netlify publishes `dist/`. Only `index.html`, `app.js`, `sw.js`, `style.css`, `data.json`, `_redirects` are public.
- [x] **[L]** `CreditCode.gs` placeholder removed; sheet ID comes from Script property `CREDIT_SHEET_ID`. Stale step 5 fixed in the credit and donation scripts.
- [x] **[L]** `Code.gs` header points at `GAS_URL_RECEIPT`; `DRIVE_FOLDER_ID` and `SHEET_ID` moved to Script Properties.
- [x] **[L]** History stores plain data and renders with `esc()` at view time (`js/summary.js`); old rows keep their status but lose expandable details. `tests/summary.test.mjs`.
- [x] **[L]** Tests: `node --test 'tests/*.test.mjs'` (13 tests, no dependencies). Documented in README.
- [x] **[L]** `_redirects` vs `netlify.toml`: already one SPA rule, no change needed.
- [x] **[L]** `app.js` split into ES modules under `js/*.js`; also fixed the Settings bookmark guide being empty until a history retry.
- [x] **[L]** Branding: `style.css` header and README say Cascade Deli Provisions; sections renumbered 1-23.
- [x] **[M]** Settings → About shows `v1.4 · build <commit>` and a "Copy diagnostics" button.
- [x] **[M]** Submit buttons read "Save for later (offline)" while offline; the offline banner now shows when the app opens offline.
- [x] **[L]** Pull-to-refresh on History (>70 px) sends the queue; "Last sent" line under the title. Verified in jsdom only.
- [x] **[L]** History rows: "Copy details" and "Delete" (hidden while queued/sending; confirms for failed rows); Retry moved into the same row.
- [x] **[L]** Haptic tick on confirmed (not queued) send.
- [x] **[H]** Transitions: 0.15 s for state changes, 0.3 s only for drawer/modal.
- [x] **[H]** Tab switches: instant scroll to top, card entrance animation removed.
- [x] **[H]** Hover scale removed from buttons; hover styles under `@media (hover: hover)`.
- [x] **[H]** Icons, web app manifest, `viewport-fit=cover` and safe-area padding added.
- [x] **[H]** `color-scheme` set for dark and light (native pickers, scrollbars, spinners).
- [x] **[M]** Depth: page `#0b0b0b`, card `#161616`, raised `#1f1f1f`, 1 px top highlight. Fixed self-referencing `--color-inset/hover/hover-strong`.
- [x] **[M]** Font sizes snapped to five tokens; nothing below 12 px.
- [x] **[M]** Borders and focus ring lifted for contrast on dark.
- [x] **[M]** Muted text uses `--color-subtext`; `--color-muted` is for borders and disabled only.
- [x] **[M]** Light mode: `--color-hover` token redefined in `html.light`; hardcoded `#1a1a1a` removed.
- [x] **[M]** Destructive actions no longer share the CTA red; confirm dialog focuses Cancel when `danger`.
- [x] **[M]** Disabled/submitting button keeps its red at reduced opacity with `cursor: progress`.
- [x] **[M]** History status is a pill with icon, plus a left accent bar on failed/queued rows. Row label is 1 rem / 600, time on the right, type as a small chip.
- [x] **[M]** Single-item credit/donation card alignment fixed (`display: none` on the hidden remove button).
- [x] **[M]** Credits and Donations share one labeled `.item-card` layout; placeholder-only fields now have visible labels.
- [x] **[L]** Success check is green/lighter gold; duplicated SVGs became one `<symbol>`.
- [x] **[L]** Radii: 8 px controls, 12 px cards.
- [x] **[L]** Passcode shield glow pulses by `opacity` for 3 loops (no `filter` animation).
- [x] **[L]** One `--chevron` SVG token for selects, accordion and History rows.
- [x] **[L]** One `<svg><symbol>` sprite for nav, header, gate and splash icons.
- [x] **[L]** About 640 lines of dead CSS removed (`style.css` 2,233 → 1,590 lines; built file −9.4 KB). The unused `observeAnimatables()` was already gone.
- [x] **[L]** Splash (shield + "Route Command") visible from the first frame; removed once the app or gate shows.
- [x] **[L]** Dates no longer go stale: on `visibilitychange` → visible after midnight, untouched Receipts and Credits date fields roll to the new day (`app.js`).
- [x] **[M]** Offline success uses a different icon and gold color from confirmed success.
- [x] **[M]** Success copy: "Receipt sent", "Credit request sent", "Donation logged", no exclamation marks. "Submit another" is primary; history is secondary.
- [x] **[M]** Name shown in the mobile header and desktop sidebar; tap goes to Settings.
- [x] **[M]** Success screen resets when you leave the tab and after 60 s.
- [x] **[M]** Tab switches use `replaceState`; Back button leaves the app.
- [x] **[M]** Removing a filled item shows "Item removed · Undo" for 5 s.
- [x] **[M]** Bottom nav hides while a form field is focused; toasts drop to the bottom and tips hide.
- [x] **[M]** Enter moves to the next field in credit/donation forms (`enterAsNext()`, `enterkeyhint`); Submit is the only way to submit. Receipts form unchanged.
- [x] **[L]** Draft restored note; vehicle field animates in; toast and update banner share one stack with a 150 ms fade.
- [x] **[L]** Confirm and install dialogs use native `<dialog>` (focus trap, Escape, backdrop).
- [x] **[L]** Search empty states ("No match…", "Use as typed"); item results show the UPC as a muted monospace prefix; the Credits store field offers the last 3 stores on empty focus; off-list stores show "Not in the store list. Sending as typed."
- [x] **[L]** History subtitle says "Last 15"; "Send now" shown when something is queued.
- [x] **[L]** Wrong passcode keeps and selects the text, with a short shake. Name gate shows "Choose your name".
- [x] **[L]** Donation History label is first item name plus a count (`Black Forest Ham +2`).
- [x] **[L]** Settings changes confirm with toasts ("Submitting as <name> now", "Default vehicle saved").
- [x] **[L]** Toggling the theme to what the phone uses removes `rc_theme`, so it follows the phone again.
- [x] **[L]** Install tip auto-dismisses after 8 s and never shows over a focused field. Bookmark guide preselects iOS/Android from the user agent.
- [x] **[L]** Passcode input is `autocomplete="off"`.
- [x] **[M]** Active tab has a pill behind the icon and `aria-current="page"`; pill toggles use `aria-pressed` through `setPill()`.
- [x] **[M]** One "Add to home screen" accordion in Settings (hidden when standalone); the install modal is gone. On Chrome/Android an "Install app" button uses `beforeinstallprompt`.
- [x] **[M]** Sentence case on every button, label and heading (option values left as is: they land in the sheet).
- [x] **[M]** Dark-mode toggle has a 2 px gold focus outline.
- [x] **[M]** Receipt thumbnail is a real `<button>` with a zoom badge; the photo dialog has a 44 px × and "Tap anywhere to close". Take photo is the filled button, Choose from library has an icon, and the preview offers Retake and Remove.
- [x] **[L]** One label style in Settings; one rule for tap highlight; desktop column centered beside the sidebar.
- [x] **[L]** Notes say "(optional)", Receipt photo says "(recommended)"; page subtitles all start with a verb.
- [x] **[L]** History day headings are `<h3>`; pill toggles have `role="group"`; landmark roles cleaned up.
