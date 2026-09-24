# Route Command: Improvement Ideas

Found by reading `index.html`, `app.js`, `style.css`, the Netlify functions, and the `.gs` scripts.

Sections: **UI/UX ideas** (new, unreviewed), **Later** (parked on purpose), **Completed**.
Sizes: **S** = under an hour, **M** = a few hours.

## UI/UX ideas

New ideas from a fresh pass over the current app. Not yet triaged.

### Identity and trust
- **S** Show "Submitting as Hannah · Change" at the top of each form. The name fields were removed, so nothing on the form says who a submission will be filed under. On a shared phone or truck tablet that is easy to miss until it is already sent. "Change" goes to Settings > Your Name.

### Forms
- **S** "Add Another Item" should focus the new item's first field and scroll it into view. The item list sits above the button, so the new item appears above where you tapped. Also focus the first item after picking a store.
- **S** Receipt date shortcuts: "Today" and "Yesterday" buttons next to the date field. Most receipts are from today or yesterday, and the native date picker takes several taps.
- **S** Reason "Other" (credits and donations) should reveal a short "What happened?" field. Today "Other" carries no information.
- **S** Suggestion lists need a no-match state: "No match. Use "xyz" as typed." Right now the store and item search show nothing when nothing matches, which looks broken even though free text is accepted.
- **M** Receipt category: preselect the last one used (reps tend to log the same kind of expense repeatedly), or sort the list by use.
- **M** *(Ask Ian first)* Require a note for "Miscellaneous" and "Sales Lunch / Client Entertainment" (who and why), if accounting needs it.

### Dialogs and feedback
- **M** Replace the native `confirm()` popups (no photo, old date, reset, clear history) with an in-app dialog styled like the install modal. Native popups look out of place and show the site URL.
- **S** Show a toast when queued submissions finish sending ("1 submission sent"). Today the History badge just disappears if you are on another tab.
- **S** Check suggestion lists on a real phone. The keyboard covers the bottom half of the screen and the list opens downward, so it may be hidden. Scroll the field toward the top of the screen on focus, or open the list upward when there is no room.

### Receipt photo
- **S** Tap the thumbnail to see it full size, so the rep can check the receipt is readable before submitting.

### History
- **S** Raise the history limit from 15 to 50 and add "Show more". With the day grouping, 15 rows is only a few days of use. Retry payloads are stored only on failed rows, so storage stays small.
- **S** Better empty state on History: "No submissions yet" with a "Submit a receipt" button.

### Settings and polish
- **S** Make "Reset Application" less prominent (outline style, in a "Danger zone" at the bottom) and rename it "Reset app and sign out". It is a large solid red button, the same weight as the main actions, so it is an easy mis-tap.
- **S** Update `<meta name="theme-color">` when the theme changes. It is fixed at black, so light mode gets a mismatched browser bar.
- **S** Passcode field: change `autocomplete="current-password"` to `off`. Browsers keep offering to save a shared company passcode as a password.

## Later

Parked on purpose. Not planned for now.

### Security and access
- **Stop serving your whole repo publicly.** `netlify.toml` now exists, but it publishes the repo root. `/Code.gs`, `/PRD.md`, `/CHANGELOG.md` etc. are probably downloadable, and `Code.gs` contains your Drive folder ID and Sheet ID. Move the site files into `public/` and set `publish = "public"`.
- **Lock down the backend.** The passcode `boarshead` is in the client JS, and the `/api/*` functions and the GAS web apps accept anyone. Have the Netlify function check a secret (env var) before forwarding, and send the passcode with each request.
- User-typed text goes into `innerHTML` in some places (`buildCreditSuccessSummary` and `buildDonationSuccessSummary` are escaped now, but check every template). Use `textContent` or escape.
- Sheet formula injection: a value starting with `=`, `+`, `-`, or `@` becomes a formula in Google Sheets. Prefix such values with `'` in `sanitize()`.
- Receipt images are set to "anyone with the link". Fine for a small team, but consider restricting to your domain.
- GAS URLs are hardcoded in the Netlify functions. Move them to Netlify env vars.

### PWA
- **Real PWA.** `sw.js` now caches the app for offline use, but there is still no `manifest.json` and no icons, so "Add to Home Screen" is not a proper install. Add both (about 20 lines) plus icons.
- When the manifest lands, handle the iPhone safe area: add `viewport-fit=cover` and `env(safe-area-inset-bottom)` padding on the bottom nav and the install tip. There is no safe-area handling today.

### Bugs
- Donation items typed by hand lose their name: the item text is split on the first space and the first word is stored as the UPC, so "Ham slices" becomes UPC "Ham". Only split when the first word is a number. Same idea for credit chub items.
- "Submit Another Expense" calls `form.reset()`, which clears the auto-filled date and the default vehicle. Re-apply them after reset.
- No duplicate protection: if GAS saves but the response times out, retrying (or the offline queue) creates a duplicate row. Add a client-generated submission ID and skip repeats in the `.gs` files.

### Form UX
- **S** Undo for "remove item" on credit and donation lists. Removing an item with typed data is instant, and the autosaved draft forgets it too. Show a toast with Undo for a few seconds.
- **M** Sticky submit button on long credit and donation forms, above the bottom nav, so you don't scroll past a long list to submit.
- Credits should remember the last reason and type, like donations already do.
- "Duplicate last item" button on credit and donation lists.

### Settings and onboarding
- **S** Passcode screen: add a Show/Hide toggle. The field is masked, so a typo on a phone keyboard is easy.
- **S** Theme: make it Auto / Light / Dark. The toggle stops following the system setting after the first flip.

### Code cleanup
- Three near-identical Netlify functions. Merge into one function that takes a route and reads the target URL from an env var.
- Docs: `PRD.md`, `PROMPTS.md`, `RULES.md`, `TODO.md`, `CHANGELOG.md` are stale (TODO mentions a "More Menu" and pages that no longer exist). Move to `docs/` or delete.
- Split `app.js` into ES modules: `data.js`, `auth.js`, `receipts.js`, `credits.js`, `donations.js`, `history.js`.
- `CreditCode.gs` still has `PASTE_YOUR_CREDIT_SHEET_ID_HERE`. Confirm the deployed script matches the repo.

### New features: cheap
- Email Ian on every submission (`MailApp.sendEmail` in each `.gs`, ~3 lines).
- Barcode scan for UPC entry on credits (`BarcodeDetector`, works on Android Chrome).
- Store list: show recent and favorite stores first.
- Per-person PINs instead of one shared passcode, so you know who submitted.
- Edit catalogs (stores, items, names) from a Google Sheet tab instead of redeploying code.

### New features: medium
- Show Ian's "Done" status back to reps (read the sheet by name).
- Multiple photos per receipt.
- Mileage/odometer field when category is Fuel, tied to the vehicle tag.
- Monthly expense totals per employee (Sheet pivot, no code).

### New features: big
- Receipt OCR: auto-fill amount, date, and category from the photo (Netlify function calling a vision model).
- Admin view for Ian: filter, approve, and export submissions.

## Completed

- [x] Error messages: `err.message` is "Failed to fetch" on network loss, so the friendly "Network error..." fallback never shows. Check `navigator.onLine` or catch `TypeError` and show the friendly text. Same in credits and donations.
- [x] Photo race: submitting before the image finishes compressing sends no photo, silently. Disable submit until compression is done.
- [x] Light theme is applied at the bottom of `app.js`, so light-mode users see a dark flash on load. Set the theme class with a tiny inline script in `<head>`.
- [x] Negative or zero amounts pass (`novalidate` disables `min`). Validate `amount > 0`.
- [x] Credit qty and chub weight are not required. A credit can be submitted with no quantity.
- [x] `capture="environment"` forces the camera on many phones, so you can't pick a screenshot or an existing photo. Add a second "Choose from library" input.
- [x] One identity. There are three separate remembered names (`rc_employee_name`, `rc_credit_name`, `rc_donation_name`) and three different name lists ("David Lindholm" vs "David"; Nick and Steve only appear in some). Ask once (first run or Settings) and use it everywhere.
- [x] Hardcoded "Ian has your receipt" and "Ian has your credit request". Put the recipient in one config value.
- [x] Show a photo thumbnail with a Retake button, not just "Receipt Attached". Warn if submitting a receipt with no photo.
- [x] Move "Recent Submissions" out of Settings. It is a main feature and is buried.
- [x] Autosave drafts for the credit and donation forms so an accidental reload doesn't wipe a long list.
- [x] Update `document.title` and move focus to the view heading on navigation.
- [x] Add `:focus-visible` styles and a `prefers-reduced-motion` rule (neither exists in `style.css`).
- [x] Follow the system light/dark preference on first visit.
- [x] Success screens are identical across all three flows. Make them show what was submitted and a "View in history" link.
- [x] Show submission status per row (sending, saved, failed, queued) in history.
- [x] Loading state on the submit button: add a spinner, not just "Uploading...".
- [x] Duplicated code: the credit and donation forms are ~90% the same (add/remove/count items, suggestions, submit, error element, reset). One generic item-list helper would remove ~300 lines.
- [x] **Fix the wrong-date bug.** `new Date().toISOString().split('T')[0]` returns the UTC date. After ~5pm Pacific, receipts and credits default to tomorrow. Use local date parts instead. Appears in `loadPersistedData`, `initCredits`, `resetCreditForm`.
- [x] **Offline queue.** If a submission fails, save it in localStorage and auto-retry when the connection returns. This matters most for trucks and warehouses.
- [x] Suggestion dropdowns: only the store search has arrow-key support. Credits and donations item search have none. Add `role="combobox"` and `aria-activedescendant`.
- [x] Replace inline `style="..."` in the HTML and `cssText` in JS with CSS classes (`.submit-error` is duplicated 3 times).
- [x] Dead CSS: `.stat-card`, `.stat-cards`, `.placeholder-card`, `.section-card`, `.view-copy-card` are in `style.css` and in the `observeAnimatables` selector, but none appear in `index.html`. Probably left over from removed Vehicles, Short Dates, and Roadmap pages. `style.css` is 2,072 lines, so a pass will shrink it.
- [x] Drop Fuse.js (CDN script) and use `includes()` filtering, or self-host it. You have ~70 stores and ~250 items, so it is not needed, and it breaks offline.
- [x] Self-host Inter (woff2, 2 weights) or use the system font stack. The Google Fonts CSS blocks rendering and fails offline.
- [x] Move `STORES`, `DONATION_ITEMS`, and name lists out of `app.js` (about 300 lines of the 1,700) into a JSON file. Load it lazily, and cache it in the service worker.
- [x] Add cache headers for `style.css` and `app.js` in `netlify.toml`, and minify both.
- [x] Add a timeout to `fetch` (AbortController, ~20s) so a stalled GAS call doesn't hang the button.
- [x] Warn before "Reset Application" if unsent items exist. It runs `localStorage.clear()`, which silently deletes queued submissions (`rc_queue`) and drafts. Show "2 submissions haven't sent yet. Reset anyway?".
- [x] Inline error text under invalid fields, plus focus and scroll to the first one. Today a bad field only gets a red border, so on a phone the field can be off-screen and nothing says what is wrong. Add `aria-invalid` too.
- [x] Check the receipt date: warn if it is in the future or more than ~60 days old.
- [x] Amount field: add a `$` prefix. Show "Vehicle Tag" only for categories where it matters (Fuel, Vehicle Maintenance, Tolls / Parking).
- [x] Scroll to the success card after submit. The form is replaced by a shorter card, but the page stays at the old scroll position, so the checkmark can be off-screen.
- [x] Group rows by day (Today, Yesterday), add "Clear history", and add a Retry button on failed rows (needs the payload stored with the row).
- [x] Tap a history row to expand it and see what was submitted (items, quantities). Rows now only show a one-line label.
- [x] Install: hide the install button when the app is already installed (`display-mode: standalone`), and drop the "(Mobile)" label. Move the "Save to Your Phone" guide from the bottom of Credits into Settings > App Setup, next to the install button. Also add a concise tooltip on user first login mentioning they can install the app to their phone by visiting the settings page or something like that.
- [x] Donations: a new item copies the previous item's sell-by date (items in one pile usually share it). Credits: use the same − / + qty stepper as donations.
- [x] Offline banner ("You're offline. Submissions will be saved and sent later.") and a badge on the History tab for items waiting to send. Today the only sign is inside History.
- [x] Contrast in dark mode: history type labels are `#841b2a` (1.9:1), `#625636` (2.5:1) and `#2a6084` (2.7:1) on the card, and the gold "Take Photo" text is 2.5:1. WCAG AA needs 4.5:1. Use lighter variants in dark mode.
- [x] Touch targets: the remove-item button is 36px. Make it 44px like the other controls.
- [x] Give the submit error text `role="alert"` so screen readers announce a failed submit.
