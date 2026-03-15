# Product Requirements Document (PRD): Route Command v1.2

**Project Name:** Route Command (Internal Operations & Expense MVP)
**Product Owner:** Syreese Delos Santos
**Target Audience:** ~15 Total Employees (Drivers, Warehouse Manager Ian, Owner David Lindholm, Dedicated Sales Writers, Demo Representatives, Stockers)
**Current Phase:** MVP v1.2 (Responsive Dark Mode Dashboard)

---

## 1. Executive Summary & Product Vision
The primary objective of the Route Command project is to deploy a zero-cost, high-efficiency, internal command center specifically designed for a hybrid B2B food distribution workforce. Version 1.2 transitions the product from a basic mobile form into a Premium Responsive Dashboard.

The application operates on a **"Wizard of Oz"** architecture. To the end-user (the employee), the system appears as a high-end, automated enterprise portal. Behind the scenes, the system facilitates structured data collection that is audited and processed manually by the Product Owner (Syreese Delos Santos). This strategic approach eliminates the immediate overhead of paid AI/OCR APIs while providing the "monopoly" control necessary for future scaling or licensing.

The design philosophy is centered on an **"Enterprise Premium"** aesthetic—utilizing the official Boar's Head brand colors against a pure black canvas to instill immediate corporate trust and ensure the application feels like a native, expensive tool rather than a temporary workaround.

---

## 2. Visual Identity & "Look and Feel"
The application must be beautiful, modern, elegant, and minimalist. It should rival the user experience of high-end SaaS platforms.

### 2.1 Aesthetic Specifications
* **Style:** Modern, Minimalist, Elegant, Premium.
* **Color Palette (Official Brand Spec):**
    * **Background:** #000000 (Pure Black)
    * **Surface/Cards:** #161616 (Deep Grey) with subtle #222222 borders.
    * **Primary Accent:** #841b2a (Boar's Head Red)
    * **Secondary Accent:** #625636 (Boar's Head Gold)
    * **Typography:** White (#FFFFFF) for headers; Muted Grey (#A0A0A0) for subtext.
* **Animations & Interactions:**
    * **Micro-interactions:** All buttons must provide tactile feedback (0.98x scale shrink on active/tap).
    * **Smooth States:** Transitions for all hovers and menu slides must be set to 0.3s ease-out.
    * **Scroll Triggers:** Form elements and dashboard cards should utilize "Intersection Observer" logic to gently fade and slide up into view as the user scrolls.
    * **Hover States:** On desktop, cards should have a subtle glowing border or increased brightness on hover.
* **Typography:** Utilize a clean, modern system sans-serif stack (Inter, San Francisco, or Roboto) to ensure maximum legibility across all device types.

---

## 3. System Architecture & Technology Stack
The architecture is designed to decouple the frontend presentation from the backend database, ensuring high performance and zero monthly hosting fees.

* **Frontend Deployment:** Vercel or Netlify (Free Tier). Single Page Application (SPA) architecture.
* **Frontend Framework:** Vanilla HTML5, CSS3, and JavaScript. No external frameworks (React/Tailwind) to ensure long-term stability and fast load times in low-signal areas.
* **Backend API / Webhook:** Google Apps Script (Free Tier). Acts as the bridge between the web app and Google Workspace.
* **Database:** Google Sheets (1EVNu8oFX3ll-slu8EX0kCtNOEvfii4aXRyvzXt1a-m0).
* **File Storage:** Google Drive Folder (1N0MTnkIyHIhwRGgPnaM-R3v4DXp4zCzb) on the Product Owner’s 2TB personal account for total data sovereignty.
* **Client Architecture:** Progressive Web App (PWA) with manifest and service workers for "Add to Home Screen" support.

---

## 4. UI/UX: Responsive Dashboard Layout
The application must adapt seamlessly to the device being used.

### 4.1 Desktop View (Command Center)
* **Sidebar:** A persistent left-hand sidebar (Width: 260px) containing the "Red Shield" icon, app title, and navigation links.
* **Main Panel:** A scrollable area to the right where the active "Tab" content is displayed.
* **Card Design:** The expense form should be centered in a "Glassmorphism" card (subtle border, deep grey background) with generous padding.

### 4.2 Mobile View (Field Optimized)
* **Bottom Navigation:** A 4-tab bottom bar (Receipts, Vehicles, Short Dates, More).
* **More Menu:** A sleek, dark slide-up drawer containing Roadmap and Settings.
* **One-Handed Operation:** All interactive inputs are positioned within the "thumb zone" for easy use while standing in a warehouse or sitting in a truck cab.

---

## 5. Core Features & Functional Requirements

### 5.1 The Gatekeeper (Security)
* **Visual:** A centered, premium Red Shield Icon (#841b2a) on a pure black background.
* **UI:** Minimalist input field with a Gold (#625636) focus border.
* **Logic:** Master password `boarshead`. Upon entry, `localStorage.setItem('auth', 'verified')` is triggered.
* **Persistence:** Users bypass this screen on all subsequent visits unless the browser cache is cleared.

### 5.2 The Receipts Dashboard (Default Tab)
This is the primary utility of the MVP.

* **Local Stat Cards (Header):** Two minimalist cards at the top of the view.
    * **Card 1 (Recent Activity):** Displays the date and time of the user's last submission (saved to and pulled from localStorage).
    * **Card 2 (System Status):** Displays "System Online" or "Ready for Upload."
* **The Expense Submission Form:**
    * **Employee Name:** Dropdown Select. Values (Alphabetical): David Lindholm, Hannah, Ian Aps, Kaleb, Nick, Steve, Syreese Delos Santos, Tagen Garris, Teresa, Tyler Sharpe. (Saves to localStorage for auto-fill on next visit).
    * **Receipt Date:** Date Input explicitly labeled "Date on Receipt."
    * **Expense Category:** Dropdown Select. Values: Fuel, Sales Lunch / Client Entertainment, Vehicle Maintenance, Office / Warehouse Supplies, Tolls / Parking, Ferry, Equipment / Tools, Lodging / Hotel, Miscellaneous.
    * **Expense Amount:** Number Input (`inputmode="decimal"`) to trigger the numeric keypad on mobile.
    * **Vehicle Tag:** Dropdown Select. Values: N/A, Bumblebee, Prime, Heno, White Van, Personal Vehicle. (Defaults to "N/A").
    * **Notes (Optional):** A `<textarea>` field for short explanations or context regarding the expense.
    * **Receipt Upload:** A styled label button with a Gold camera icon. Triggers native camera/gallery.
    * **Submit Button:** A full-width Red (#841b2a) button. Transitions to "Uploading..." in Grey upon being tapped.

### 5.3 Vehicles & Short Dates (Placeholder Tabs)
To demonstrate the "Command Center" vision to Owner David, these tabs serve as high-fidelity placeholders.

* **Vehicles:** Icon: Wrench. Text: "Fleet health monitoring coming soon. Future features include mileage logs, maintenance problem reporting, and reefer temperature tracking for easy spreadsheet export."
* **Short Dates:** Icon: Barcode. Text: "Warehouse inventory alerts coming soon. Real-time visibility on stock expiring soon so employees can move product before it expires."

### 5.4 Settings Tab (Utility)
* **Active Profile:** Displays "Active Identity: [Name]" based on localStorage.
* **Appearance:** A functional toggle for Light/Dark mode (Internal CSS variable swap, though the app defaults to Dark).
* **System:** A "Reset Application" button that clears localStorage to allow for a "logout" or passcode reset.

---

## 6. Technical Requirements & Data Handling

### 6.1 Image Compression (Client-Side)
To prevent Google Apps Script from timing out, the frontend must compress images before transmission.

1.  **Intercept:** JavaScript catches the file from the input.
2.  **Canvas Resize:** The image is drawn to an invisible HTML5 Canvas and resized to a maximum width of 1024px (preserving aspect ratio).
3.  **JPEG Encode:** The canvas is exported as a Base64 string at 0.7 quality. This converts 8MB+ photos into roughly 150KB-200KB strings.

### 6.2 Backend Operations (Google Apps Script)
The script deployed as a web app will handle the following:

* **Decoding:** Convert the Base64 string back into a binary Blob.
* **Renaming:** Standardize the file name as `[ReceiptDate]_[EmployeeName]_[Category]_[Amount].jpg`.
* **Storage:** Save to the specific Google Drive Folder ID provided.
* **Logging:** Append a new row to the specific Google Sheet ID including the current timestamp and the Drive URL.

### 6.3 Edge Case & Error Handling
* **CORS:** The script must return proper headers to allow the Vercel/Netlify frontend to talk to Google.
* **Unload Warning:** A `beforeunload` listener triggers if a user attempts to close the app while the submission is in progress.
* **Network Fail:** If the fetch request fails, the submit button is re-enabled, and a red error message appears: "Network error. Please check your connection and try again."

---

## 7. User Success Flow
1.  **Trigger:** The frontend receives a successful JSON response from the Google Apps Script.
2.  **Action:** The main form card fades out; a large animated Red/Gold checkmark appears.
3.  **Copy:** "Upload Successful! Ian has your receipt."
4.  **Reset:** A "Submit Another Expense" button appears, which clears all form fields (retaining the Employee Name) and returns the user to the Receipts tab.

---

## 8. Administrative Workflow (The Wizard of Oz Protocol)
The Product Owner (Syreese) manages the backend logic via the "Wizard of Oz" manual audit:

1.  **Verification:** Syreese opens the Google Sheet weekly.
2.  **Visual Audit:** Clicks the Drive Image URL for each new entry to view the receipt photo.
3.  **Reconciliation:** Ensures the "Amount" entered by the employee matches the photo. Any user errors are corrected manually in the spreadsheet.
4.  **Reporting:** At month-end, Syreese exports the cleaned Sheet as a CSV/PDF for David Lindholm and the company CPA.

---

## 9. Deployment & Onboarding
* **Hosting:** Vercel or Netlify.
* **Installation:** "Add to Home Screen" instructions are provided via a Gold-accented modal accessible in the Settings and at the base of the Receipts form.

---

## 10. Future Roadmap
* **v2.0 (Automation):** Implement AI OCR (OpenAI/Gemini Vision) to scan the photo and auto-populate the Category, Date, and Amount fields.
* **v2.1 (Operations):** Activate the "Short Dates" tab with a live feed from the warehouse inventory system to send push notifications to the sales team.