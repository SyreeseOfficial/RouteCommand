# Changelog

> **AI INSTRUCTIONS:** This file represents the history of changes made to the "Route Command" project. It acts as the AI's long-term memory for the project context.
> - **Purpose:** To keep track of modifications, implemented features, and bug fixes over time as context window shrinks.
> - **How to use:** Read this file briefly before making major changes to understand recent progress. Append new, significant updates with timestamps when prompted or after major milestones.
> - **Relationship:** This file reflects work completed from the `TODO.md` and guided by the steps in `PROMPTS.md`. It tracks the realization of the project defined in `PRD.md`.

---

## [2026-03-15] — Phase 3 Complete (v1.2 MVP Build Finished)

### Phase 3: Logic & Security

**3.1 — Gatekeeper Shield (in `app.js`)**
- `initAuth()` runs on boot: checks `localStorage.getItem('rc_auth') === 'verified'`.
- If no token: full-screen black overlay is shown with the animated red shield SVG and a gold-focus-border passcode input.
- `attemptUnlock()`: entry of `boarshead` sets the auth token, triggers a `fadeOut` CSS animation on the gatekeeper, and then reveals the app shell.
- Incorrect passcode clears the field and shows an inline error message.
- Subsequent page loads skip the gatekeeper entirely until localStorage is cleared.

**3.2 — Canvas Image Compression (in `app.js`)**
- `handleImageUpload(file)`: reads the selected file via `FileReader`.
- Draws the image onto an off-screen `<canvas>`, resizing to a max width of 1024px while preserving aspect ratio.
- Exports canvas as `image/jpeg` at quality `0.7` via `toDataURL()`.
- Result stored in `compressedImageData` (Base64 data URL string).
- Confirms upload to user: button border/text turns green, "Receipt Attached ✓" label shown.

**3.3 — Google Apps Script Backend (`Code.gs`)**
- `doPost(e)`: parses JSON payload `{ employeeName, receiptDate, category, amount, vehicleTag, notes, imageData, timestamp }`.
- Constructs standardized filename: `[ReceiptDate]_[EmployeeName]_[Category]_[Amount].jpg`.
- Decodes Base64 string via `Utilities.base64Decode()` → `Utilities.newBlob()`.
- Saves JPEG blob to Drive Folder ID `1N0MTnkIyHIhwRGgPnaM-R3v4DXp4zCzb` and sets public view-link sharing.
- Appends row to Sheet ID `1EVNu8oFX3ll-slu8EX0kCtNOEvfii4aXRyvzXt1a-m0` with columns: Timestamp, Employee Name, Receipt Date, Category, Amount, Vehicle Tag, Notes, Receipt Image URL.
- Auto-creates a styled bold header row if the sheet is empty.
- `sanitize()` helper trims and caps all string fields at 500 chars.
- Graceful error catch returns `{ status: 'error', message: ... }` JSON.
- `doGet()` handles browser health-check pings.

**3.4 — Frontend Fetch & Success/Error States (in `app.js`)**
- On form submit: validates required fields (Name, Date, Category, Amount) with red border highlights on empty fields.
- Submit button transitions to `Uploading…` and is disabled during the request.
- `beforeunload` event listener prevents accidental tab close during upload.
- On `{ status: 'success' }` response: `handleSuccess()` updates the "Recent Activity" stat card timestamp in localStorage and shows the animated Red/Gold checkmark success state with the copy "Upload Successful! Ian has your receipt."
- On network or server error: `handleError()` re-enables the button and injects a red error message: "Network error. Please check your connection and try again."
- "Submit Another Expense" button resets all form fields, retains the saved Employee Name, and restores the form view.
- Dev mode: when `GAS_URL` is empty, a 1.2s simulated success fires so the UI can be tested locally before backend deployment.

---

## [2026-03-15] — Phase 1 & Phase 2 Complete

### Phase 1: Architecture & Layout

**1.1 — Project Initialization & Theme**
- Created `index.html`, `style.css`, `app.js` (Vanilla HTML5/CSS3/ES6+, no frameworks).
- CSS variable system: `--color-bg` (#000000), `--color-surface` (#161616), `--color-border` (#222222), `--color-red` (#841b2a), `--color-gold` (#625636), `--color-text` (#FFFFFF), `--color-subtext` (#A0A0A0).
- Google Inter font + system sans-serif fallback. Global CSS reset.

**1.2 — Responsive Shell**
- Desktop (≥1024px): Fixed 260px sidebar with brand shield, title, 5 nav links with SVG icons.
- Mobile: Fixed 56px top header + fixed 64px bottom nav (4 tabs: Receipts, Vehicles, Short Dates, More).
- 48px minimum touch targets throughout.

**1.3 — More Menu Drawer**
- Slide-up drawer from "More" bottom nav tap. Semi-transparent blur overlay.
- Roadmap and Settings links with gold SVG icons. 0.3s ease-out CSS transition.

**1.4 — SPA Page Routing**
- `navigateTo(viewId)` hides all views, activates target, syncs active state on both sidebar and bottom nav.
- Triggers IntersectionObserver on navigation for scroll animations.

### Phase 2: Feature Views & Aesthetics

**2.1 — Receipts Tab & Stat Cards**
- Stat cards: "Recent Activity" (localStorage) and "System Status" (green dot).
- Premium form card: #161616 bg, border, box-shadow elevation.

**2.2 — Form Inputs, Notes & Upload**
- All 5 PRD form fields (Employee Name, Date, Category, Amount, Vehicle Tag).
- Notes `<textarea>`. Styled gold dashed "Attach Photo" button with camera icon.
- Red focus borders; `inputmode="decimal"` on amount.

**2.3 — Placeholder Pages & Roadmap**
- Vehicles (wrench icon), Short Dates (barcode icon) with PRD copy.
- Roadmap: versioned list with Live/Soon badges (v1.2, v2.0, v2.1).

**2.4 — Settings Page**
- Active Identity (reads localStorage). Dark/Light mode toggle (CSS class swap, persisted).
- Red "Reset Application" button clears localStorage and reloads.

**2.5 — Animations & Micro-interactions**
- Hover: 1.02x scale + brightness. Active/tap: 0.98x shrink.
- IntersectionObserver scroll-fade on stat cards, form card, placeholders, roadmap items (80ms stagger).
- Gatekeeper shield pulse. View `fadeSlideUp` transitions. Success state scale-in.
