### Phase 1: Architecture & Layout (The Shell)

**Prompt 1: Project Initialization & Theme (Step 1.1)**
> "Read `PRD.md` and `rules.md`. Initialize a Vanilla JS project. Create `index.html`, `style.css`, and `app.js`. In `style.css`, set up the official Boar's Head CSS variables: Background (`#000000`), Surface (`#161616`), Red (`#841b2a`), Gold (`#625636`), and Gray (`#A0A0A0`). Set the global font to a modern sans-serif stack (Inter/Roboto). Implement a global reset and set the body background to pure black. Update `changelog.md` to reflect project initialization."

**Prompt 2: Responsive Sidebar & Header (Step 1.2)**
> "In `index.html` and `style.css`, build the 'Command Center' shell. On desktop (min-width: 1024px), create a fixed left sidebar (`#161616`) with a 1px border-right (`#222222`). Include the 'Shield' branding area and nav links with Gold icons. On mobile, hide the sidebar and show a fixed top header with the app title. Create a bottom navigation bar for mobile users with 4 tabs: Receipts, Vehicles, Short Dates, and More. Ensure the bottom nav uses `#161616` and has a premium, minimalist feel."

**Prompt 3: The 'More' Menu Drawer (Step 1.3)**
> "Build the mobile 'More' menu. When 'More' is tapped on the bottom nav, a sleek slide-up drawer (background: `#161616`) should appear from the bottom of the screen. This drawer must contain links for 'Roadmap' and 'Settings'. Use a semi-transparent black overlay for the background when the drawer is open. Ensure smooth CSS transitions (0.3s ease-out)."

**Prompt 4: Page Routing Logic (Step 1.4)**
> "In `app.js`, implement a Single Page Application (SPA) routing system. Create a function that switches between views (`#receipts-view`, `#vehicles-view`, `#short-dates-view`, `#roadmap-view`, `#settings-view`). When a tab is clicked in the sidebar or bottom nav, hide all other sections and show the target section. Ensure the active tab gets a Red (`#841b2a`) highlight. Update `changelog.md`."

---

### Phase 2: Feature Views & Aesthetics

**Prompt 5: The Receipts Tab & Stat Cards (Step 2.1)**
> "Build the 'Receipts' view. At the top, add two minimalist 'Stat Cards' using `#161616` backgrounds and subtle borders. Card 1: 'Recent Activity' (show a placeholder date). Card 2: 'System Status' (show 'Ready' with a small green dot). Below the cards, create the main Expense Form inside a premium 'Glassmorphism' card. Use generous padding and clean typography."

**Prompt 6: Form Inputs & Notes (Step 2.2)**
> "Complete the Expense Form fields in the Receipts tab. Add: Employee Name dropdown (with the 10 names from PRD), Receipt Date (date picker), Category dropdown (9 options), Amount (numeric input), and Vehicle dropdown. Add the new 'Notes' `<textarea>` field. Finally, build the styled 'Attach Photo' button using a Gold (`#625636`) camera icon. Style the inputs with `#161616` backgrounds and red focus borders."

**Prompt 7: Placeholder Pages & Settings (Step 2.3 & 2.4)**
> "Build the content for the 'Vehicles', 'Short Dates', and 'Roadmap' views using the exact copy and icons from the PRD. Then, build the 'Settings' view: include an 'Active Identity' display (pulling from `localStorage`), a 'Light/Dark Mode' toggle (just the UI for now), and a Red 'Reset Application' button. Ensure consistent spacing across all pages."

**Prompt 8: Animations & Micro-interactions (Step 2.5)**
> "Add the 'Premium' polish. In `style.css`, add hover states for all buttons: they should subtly scale (1.02x) and brighten. Add micro-interactions: buttons should shrink slightly (0.98x) when actively pressed/tapped. Use the Intersection Observer API in `app.js` to make the Dashboard cards gently fade and slide up into view as the user scrolls."

---

### Phase 3: Logic & Security

**Prompt 9: The Gatekeeper Shield (Step 3.1)**
> "Build the 'Gatekeeper' security screen. It must be a full-screen pure black overlay with a large Red Shield icon centered. Below the icon, add the 'Enter Company Passcode' input. In `app.js`, write the logic: if `localStorage` has no 'auth' token, show the gatekeeper. If the user enters 'boarshead', save the token and fade the gatekeeper out to reveal the dashboard. Update `changelog.md`."

**Prompt 10: Image Compression Logic (Step 3.2)**
> "In `app.js`, write the `handleImageUpload` function. When a photo is selected, use the HTML5 Canvas API to resize it to a max width of 1024px while maintaining aspect ratio. Export it as a JPEG with 0.7 quality. Ensure the Base64 string is generated correctly. Add a 'Receipt Attached' visual confirmation to the UI once the process finishes. Check `rules.md` to ensure no libraries are used."

**Prompt 11: Google Apps Script Backend (Step 3.3)**
> "Write the Google Apps Script (`Code.gs`). Include the `doPost(e)` function to handle the JSON payload. Logic must: 1. Decode the Base64 image. 2. Save it to Drive Folder ID `1N0MTnkIyHIhwRGgPnaM-R3v4DXp4zCzb` with the naming format `[Date]_[Name]_[Category]_[Amount].jpg`. 3. Append all data (including Notes) to Sheet ID `1EVNu8oFX3ll-slu8EX0kCtNOEvfii4aXRyvzXt1a-m0`. Ensure CORS headers are included in the return."

**Prompt 12: Connection & Success State (Step 3.4)**
> "Tying it all together. In `app.js`, write the `fetch` call to send the form data to the Google Apps Script. On click, change the button to 'Uploading...'. On success, trigger the 'Success State': hide the form and show a large Red/Gold checkmark with the text 'Upload Successful! Ian has your receipt.' Add a 'Submit Another' button to reset the form but keep the Employee Name selected."