# Route Command: Improvement Ideas

Found by reading `index.html`, `app.js`, `style.css`, the Netlify functions, and the `.gs` scripts.

## Top 5 (do these first)

1. **Fix the wrong-date bug.** `new Date().toISOString().split('T')[0]` returns the UTC date. After ~5pm Pacific, receipts and credits default to tomorrow. Use local date parts instead. Appears in `loadPersistedData`, `initCredits`, `resetCreditForm`.
2. **Stop serving your whole repo publicly.** There is no `netlify.toml`, so the site root is the repo root. `/Code.gs`, `/PRD.md`, `/CHANGELOG.md` etc. are probably downloadable, and `Code.gs` contains your Drive folder ID and Sheet ID. Move the site files into `public/` and set `publish = "public"`.
3. **Lock down the backend.** The passcode `boarshead` is in the client JS, and the `/api/*` functions and the GAS web apps accept anyone. Have the Netlify function check a secret (env var) before forwarding, and send the passcode with each request.
4. **Real PWA.** README says "Offline-capable PWA" but there is no `manifest.json` and no service worker. Add both (about 30 lines total) plus icons.
5. **Offline queue.** If a submission fails, save it in localStorage and auto-retry when the connection returns. This matters most for trucks and warehouses.

## Bugs

- "Submit Another Expense" calls `form.reset()`, which clears the auto-filled date and the default vehicle. Re-apply them after reset.
- No duplicate protection: if GAS saves but the response times out, retrying creates a duplicate row. Add a client-generated submission ID and skip repeats in the `.gs` files.

## Security

- User-typed text goes into `innerHTML` (`renderHistory`, `buildCreditSuccessSummary`, `buildDonationSuccessSummary`, the suggestions lists). The "Other" name field on donations is free text. Use `textContent` or escape.
- Sheet formula injection: a value starting with `=`, `+`, `-`, or `@` becomes a formula in Google Sheets. Prefix such values with `'` in `sanitize()`.
- Receipt images are set to "anyone with the link". Fine for a small team, but consider restricting to your domain.
- GAS URLs are hardcoded in the Netlify functions. Move them to Netlify env vars.

## UX

- Suggestion dropdowns: only the store search has arrow-key support. Credits and donations item search have none. Add `role="combobox"` and `aria-activedescendant`.
- Credits should remember the last reason and type, like donations already do.
- "Duplicate last item" button on credit and donation lists.

## UI

- Replace inline `style="..."` in the HTML and `cssText` in JS with CSS classes (`.submit-error` is duplicated 3 times).

## Speed

- Drop Fuse.js (CDN script) and use `includes()` filtering, or self-host it. You have ~70 stores and ~250 items, so it is not needed, and it breaks offline.
- Self-host Inter (woff2, 2 weights) or use the system font stack. The Google Fonts CSS blocks rendering and fails offline.
- Move `STORES`, `DONATION_ITEMS`, and name lists out of `app.js` (about 300 lines of the 1,700) into a JSON file. Load it lazily, and cache it in the service worker.
- Add cache headers for `style.css` and `app.js` in `netlify.toml`, and minify both.
- Add a timeout to `fetch` (AbortController, ~20s) so a stalled GAS call doesn't hang the button.

## Bloat and cleanup

- Dead CSS: `.stat-card`, `.stat-cards`, `.placeholder-card`, `.section-card`, `.view-copy-card` are in `style.css` and in the `observeAnimatables` selector, but none appear in `index.html`. Probably left over from removed Vehicles, Short Dates, and Roadmap pages. `style.css` is 2,072 lines, so a pass will shrink it.
- Three near-identical Netlify functions. Merge into one function that takes a route and reads the target URL from an env var.
- Docs: `PRD.md`, `PROMPTS.md`, `RULES.md`, `TODO.md`, `CHANGELOG.md` are stale (TODO mentions a "More Menu" and pages that no longer exist). Move to `docs/` or delete.
- Split `app.js` into ES modules: `data.js`, `auth.js`, `receipts.js`, `credits.js`, `donations.js`, `history.js`.
- `CreditCode.gs` still has `PASTE_YOUR_CREDIT_SHEET_ID_HERE`. Confirm the deployed script matches the repo.

## New feature ideas

Cheap:
- Email Ian on every submission (`MailApp.sendEmail` in each `.gs`, ~3 lines).
- Barcode scan for UPC entry on credits (`BarcodeDetector`, works on Android Chrome).
- Store list: show recent and favorite stores first.
- Per-person PINs instead of one shared passcode, so you know who submitted.
- Edit catalogs (stores, items, names) from a Google Sheet tab instead of redeploying code.

Medium:
- Show Ian's "Done" status back to reps (read the sheet by name).
- Multiple photos per receipt.
- Mileage/odometer field when category is Fuel, tied to the vehicle tag.
- Monthly expense totals per employee (Sheet pivot, no code).

Big:
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
