# Route Command: Findings

Reviewed 2026-10-08, updated 2026-10-09. Open work is at the top, finished work is in one list at the bottom.
Tags: **[H]** high, **[M]** medium, **[L]** low. `[ ]` = open. Items marked "promoted" were parked in `IMPROVEMENTS.md` under "Later" and should move up.

## Contents
- [Do first: deploy](#do-first-deploy)
- [Open: bugs and UX](#open-bugs-and-ux)
- [Skipped for now](#skipped-for-now)
- [Open: security and abuse](#open-security-and-abuse)
- [Open: accessibility](#open-accessibility)
- [Open: features and ideas (parked)](#open-features-and-ideas-parked)
- [Open: docs](#open-docs)
- [Completed](#completed)

---

## Do first: deploy
Commits `cbfeaa2` and `822ae37` were pushed with `[skip netlify]`, so the live site still runs the **old** code. **Do not push without `[skip netlify]` until step 1 is ticked**, or every submission fails with "Endpoint not configured".

- [ ] **1. Netlify env vars** (Site configuration → Environment variables): `GAS_URL_RECEIPT`, `GAS_URL_CREDIT`, `GAS_URL_DONATION`. Values are the web app URLs of the three Apps Script deployments (unchanged; also in `git show db9dfda:netlify/functions/submit-receipt.mjs`, `-credit.mjs`, `-donation.mjs`). Harmless to add early: the old code ignores them.
- [ ] **2. Deploy the site** once the UI/UX work is done: Deploys → Trigger deploy → Deploy site (or push without `[skip netlify]`). Then check the build log: it should run `npm run build` and publish `dist/`.
- [ ] **3. Smoke test on the live site:** submit a test receipt, credit and donation; each should add a row, with an ID in the hidden last column.
- [ ] **4. Real-phone check (Chrome/Android):** submit while offline, close the app, go online; the row should still arrive. Also try pull-to-refresh on History and the "Update available" banner after a second deploy.

## Open: bugs and UX
UI review 2026-10-09, from screenshots at 390 px (phone, dark and light) and 1280 px (desktop). Ranked within each list.

**Phone: bugs**
- [ ] **[M]** Credits/donations fields are cramped by nested padding. Page 20 px + form card 24 px + item card 14 px per side leaves ~270 px of the 390 px screen. Visible damage: the donation "Sell-by date" shows `mm/dd/y` cut off (`.item-card__row` is `1fr 132px`), the credit UPC placeholder reads `e.g. 012345…`, and a 360 px Android is worse. Fix: below ~480 px drop the outer card's border, shadow and side padding (keep 16 px gutters), so fields get ~330 px. Also shorten the UPC placeholder to `UPC`.
- [ ] **[L]** "Copy diagnostics" touches the Version card above it (no gap, `index.html` About section). Add `margin-top: 0.75rem` (the `.btn--add-item` rule does this elsewhere).
- [ ] **[L]** Receipt photo buttons: "Choose from library" wraps to two lines at 390 px and the two buttons look unequal (solid vs dashed, one-line vs two). Shorten to "Library" or "From library", and give both the same height.
- [ ] **[L]** History rows with a queued/failed left border (`style.css:1336-1338`) are drawn 2 px further in than saved rows, and the curve at the corners looks broken. Use `box-shadow: inset 3px 0 0 <color>` so every row lines up.

**Phone: flow and speed**
- [ ] **[H]** Submit is below the fold on the shortest form. On Receipts the button sits at y ≈ 780–826 and the visible area above the nav is ~780 px (iPhone 14; less on Android with browser bars). Credits and donations push it further with every item. Make the submit button a sticky bar above the bottom nav while the form is on screen (hide it when a field has focus, as the nav already does).
- [ ] **[M]** Compact the page header on phones. "Receipts / Submit an expense receipt." costs ~120 px before the form, and the active tab already says where you are. Hide `.view__sub` under 640 px (keep Credits' "to Ian" by moving it into the Store label or the submit button) and cut `.view__header` margin to 1rem. Pulls the form up ~60 px.
- [ ] **[M]** Date shortcuts: "Today / Yesterday" chips next to the receipt date and next to the credit date. Nearly every date is one of those two, and the native date picker is 3+ taps. Chips set the input's value; the input stays for anything older.
- [ ] **[M]** "Duplicate" button on each credit/donation item card (copies type and reason, clears the UPC/item and qty). A store credit is usually several lines with the same reason, so this saves the reason select and the type toggle on every extra line. Also make the credit **Reason** default to the last one used (donations already remember it).
- [ ] **[M]** Sell-by quick picks on donation items ("Tomorrow", "+3 days") above the date field, same idea as the date chips. The previous item's date is already carried over; this covers the first item.
- [ ] **[L]** History: the expand chevron is 12 px and grey, so rows do not look tappable. Make it ~20 px, right-aligned and vertically centered. Also trade the two chips per row (type + status) for one chip plus a coloured status dot, and set "Clear history" apart (more space, text-button style) so it is not one mis-tap below the last row.
- [ ] **[L]** Settings: "Your name" and "Default vehicle" are a label above a select inside a card (card in a card). Make them single rows, label left and select right, like the Dark mode row. Saves ~100 px.
- [ ] **[L]** Inconsistent defaults: credits list "Retail" first and default, donations list "Chub" first and default. Pick one order for both.

**Desktop (1280 px)**
- [ ] **[M]** Receipt form is one 670 px wide column: the date input and amount are stretched across the whole card. At 1024 px and up put Date + Amount side by side (and Category + Vehicle). Credits: Store + Date side by side.
- [ ] **[L]** Hide the number-input spinner arrows on the amount field (`appearance: textfield`); they show on desktop only and add clutter.
- [ ] **[L]** Ctrl/Cmd+Enter submits the open form (the Enter-as-next handler already exists in `enterAsNext`).

## Skipped for now
Parked on purpose; revisit later.

- [ ] **[M]** Brand colors are too dull to carry a dark UI. Gold `#625636` is about 2.6:1 on black and red `#841b2a` about 1.9:1 on the card. The dashed "Take photo" border, step numbers, icons and the gate's focus color are all that muddy olive-brown, so there is no bright accent. Keep the brand values for fills and logos; add brighter tokens for borders, icons and focus on dark (e.g. gold `#9c8a55`, red `#c0394d`) and use them for the active nav indicator, focus rings and the upload border.
- [ ] **[M]** The "no photo" dialog nudges toward skipping the photo (`js/receipts.js:117`). Make the primary button "Add photo" (closes the dialog, opens the camera/library) and the secondary "Submit without photo". If the date is old or in the future *and* the photo is missing, combine the two dialogs into one list of warnings with one confirm.

## Open: security and abuse
Real company data and a public URL. Order = fix order.

- [ ] **[H]** The passcode is a constant compared in the browser (`app.js:72-73`), visible in DevTools or the repo (promoted). Move the check into a Netlify function (`/api/auth`) that compares against an env var and returns a signed token (HMAC, 30-day expiry); the submit functions require that token. Combine with per-person PINs to also fix "anyone can submit as anyone".
- [ ] **[H]** Securing only the Netlify function is not enough: the GAS web app URL is hardcoded in the repo history and the deployment is "Anyone". Anyone can POST straight to Google and fill your Drive folder or Sheet. Put a shared secret in a Netlify env var **and** in GAS `PropertiesService`; the function adds it to the body, `doPost` rejects when missing or wrong. Then rotate the GAS deployment URL (new deployment = new URL) and update the Netlify env vars.
- [ ] **[H]** `data.json` is still published (employee full names, customer store names) and the Drive folder and Sheet IDs remain in git history. The `dist/` change already stopped the `.gs` and docs files from being downloadable. Decide if `data.json` must sit behind the auth token, and whether to rotate the IDs.
- [ ] **[M]** No size or shape validation in `doPost` (`Code.gs:56-70`): `imageData` has no max length (a 50 MB base64 string eats the Apps Script quota or times out), `amount` and `receiptDate` are not validated, `category` is free text. Reject images over ~2 MB decoded, require `^\d{4}-\d{2}-\d{2}$` dates, amount `> 0` and `< 10000`, and `category` in an allowlist.
- [ ] **[M]** `savedFile.setSharing(ANYONE_WITH_LINK)` (`Code.gs:90`) makes every receipt photo (names, card last-4, addresses) public to anyone with the link. Use `DOMAIN_WITH_LINK` if accounting is in the same Workspace, or skip per-file sharing and let the folder permissions apply.
- [ ] **[M]** Auto-lock: ask for the passcode again after 30 days or when the name changes, so a lost phone stops working.
- [ ] **[L]** No rate limiting or logging on the functions. Netlify's `context.ip` plus a small in-memory counter, and `console.log` of failures, gives you something to look at when a submission "went missing".
- [ ] **[L]** `data.json` includes "Ian Aps" and the developer; confirm it is the intended roster before this goes wider.

## Open: accessibility
- [ ] **[M]** Donation item fields have no accessible names. The "Qty" and "Sell-by date" labels are `<span>`s (`js/donations.js:36-47`), so tapping them does nothing and screen readers announce an unnamed field. The stepper `−`/`+` buttons and quantity input have no `aria-label` (credits has them). Use `<label>` or `aria-label`. Same for "Receipt photo" (`<label>` without `for`) and all placeholder-only inputs (UPC, weight, search).

## Open: features and ideas (parked)
**High value**
- [ ] **[H]** Email Ian on every submission (promoted). 3 lines of `MailApp.sendEmail` with a link to the Sheet row and the photo. Doubles as a backup of what was submitted.
- [ ] **[H]** Warn when the amount looks wrong: confirm if `amount >= $500`, or if it equals an earlier submission today (same amount + category). Cheap guard against typos like 1250 vs 12.50 and double-submits.

**Medium**
- [ ] **[M]** "Submit same as last time" shortcut on the receipt form (copy category, vehicle tag, store for recurring fuel stops).
- [ ] **[M]** Receipt OCR: start with the free browser `TextDetector` or lazily loaded Tesseract.js to auto-suggest total and date; the rep confirms. No server cost.
- [ ] **[M]** Photo tools: auto-crop/edge-detect, boost contrast, and a rotate button for sideways shots.
- [ ] **[M]** Admin page, read-only version: a second GAS `doGet` returning JSON of recent rows behind the same secret, shown as a table with filters and a CSV export link.
- [ ] **[M]** Weekly/monthly digest email to each rep and to Ian: totals per category and anything still unmatched (needs a "Done" status column).

**Low**
- [ ] **[L]** Photo resize caps width at 1024 px / JPEG 0.7 (`app.js:224-225`). Long thermal receipts lose small print. Use 1600 px / 0.75, still under ~400 KB.
- [ ] **[L]** Category chips: show the top 3 (last used) above the select. Fuel and Sales Lunch are most receipts, but each needs open → scroll → tap.
- [ ] **[L]** Policy rules in `data.json`: per-category photo required, note required, max amount without approval, so the form enforces policy and Ian stops bouncing submissions.
- [ ] **[L]** Move name list, stores, items and category rules to a "Config" sheet tab read by `doGet`; Ian edits without a deploy. Cache in the service worker.
- [ ] **[L]** Mileage log with odometer photo, tied to the vehicle tag.
- [ ] **[L]** Spanish for warehouse staff: UI strings in a small `strings.js` dictionary, picked from `navigator.language` with a Settings override.

## Open: docs
- [ ] **[L]** README: add the deploy steps (GAS deployment, Netlify env vars, how to rotate the secret) so someone else can take over.

---

## Completed
One list, newest areas first. Dates are 2026-10-09 unless noted.

**Deploy and data safety**
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
- [x] **[M]** Stale docs (`PRD.md`, `PROMPTS.md`, `RULES.md`, `TODO.md`, `CHANGELOG.md`) moved to `docs/`.
- [x] **[L]** Build: `esbuild` 0.28.2 pinned; `build.mjs` writes to `dist/`, Netlify publishes `dist/`. Only `index.html`, `app.js`, `sw.js`, `style.css`, `data.json`, `_redirects` are public.
- [x] **[L]** `CreditCode.gs` placeholder removed; sheet ID comes from Script property `CREDIT_SHEET_ID`. Stale step 5 fixed in the credit and donation scripts.
- [x] **[L]** `Code.gs` header points at `GAS_URL_RECEIPT`; `DRIVE_FOLDER_ID` and `SHEET_ID` moved to Script Properties.
- [x] **[L]** History stores plain data and renders with `esc()` at view time (`js/summary.js`); old rows keep their status but lose expandable details. `tests/summary.test.mjs`.
- [x] **[L]** Tests: `node --test 'tests/*.test.mjs'` (13 tests, no dependencies). Documented in README.
- [x] **[L]** `_redirects` vs `netlify.toml`: already one SPA rule, no change needed.
- [x] **[L]** `app.js` split into ES modules under `js/*.js`; also fixed the Settings bookmark guide being empty until a history retry.
- [x] **[L]** Branding: `style.css` header and README say Cascade Deli Provisions; sections renumbered 1-23.

**Features**
- [x] **[M]** Settings → About shows `v1.4 · build <commit>` and a "Copy diagnostics" button.
- [x] **[M]** Submit buttons read "Save for later (offline)" while offline; the offline banner now shows when the app opens offline.
- [x] **[L]** Pull-to-refresh on History (>70 px) sends the queue; "Last sent" line under the title. Verified in jsdom only.
- [x] **[L]** History rows: "Copy details" and "Delete" (hidden while queued/sending; confirms for failed rows); Retry moved into the same row.
- [x] **[L]** Haptic tick on confirmed (not queued) send.

**Look and depth**
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

**Flow and feedback**
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

**Navigation, copy and accessibility**
- [x] **[M]** Active tab has a pill behind the icon and `aria-current="page"`; pill toggles use `aria-pressed` through `setPill()`.
- [x] **[M]** One "Add to home screen" accordion in Settings (hidden when standalone); the install modal is gone. On Chrome/Android an "Install app" button uses `beforeinstallprompt`.
- [x] **[M]** Sentence case on every button, label and heading (option values left as is: they land in the sheet).
- [x] **[M]** Dark-mode toggle has a 2 px gold focus outline.
- [x] **[M]** Receipt thumbnail is a real `<button>` with a zoom badge; the photo dialog has a 44 px × and "Tap anywhere to close". Take photo is the filled button, Choose from library has an icon, and the preview offers Retake and Remove.
- [x] **[L]** One label style in Settings; one rule for tap highlight; desktop column centered beside the sidebar.
- [x] **[L]** Notes say "(optional)", Receipt photo says "(recommended)"; page subtitles all start with a verb.
- [x] **[L]** History day headings are `<h3>`; pill toggles have `role="group"`; landmark roles cleaned up.
