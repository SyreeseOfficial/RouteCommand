## Product Requirements Document (PRD)
Project Name: Route Command (Internal Operations & Expense MVP)
Target Audience: ~15 Total Employees (Drivers, Warehouse Manager Ian, Owner David Lindholm, Dedicated Sales Writers, Demo Representatives, Stockers)
Product Owner: Syreese Delos Santos
Current Phase: MVP v1.0 (Development & Testing)
### 1. Executive Summary & Product Vision
The primary objective of the Route Command project is to deploy a zero-cost, highly efficient, mobile-first web application tailored specifically for a ~15-person B2B food distribution company. The initial MVP (v1.0) strictly focuses on solving the administrative bottleneck of corporate expense tracking, receipt management, and fleet-to-warehouse data synchronization.
Because the team consists of a hybrid workforce—including drivers operating heavy trucks, dedicated sales writers conducting field meetings, demo representatives executing in-store events, and stockers managing retail cases—the application must be universally accessible, requiring zero technical onboarding.
The application adheres to a "Wizard of Oz" operational architecture. To the end-user, the application appears as a fully automated, database-driven enterprise tool. In reality, the backend relies on manual data auditing and entry processed asynchronously by the Product Owner (Syreese Delos Santos). This strategic decision removes the immediate need for paid AI Optical Character Recognition (OCR) APIs, keeping overhead operational costs at exactly $0.00 while simultaneously proving product-market fit and securing user adoption.
The design philosophy is strictly modern, minimalist, clean, stylish, and premium. By utilizing official brand colors, the interface instills immediate trust and mimics a high-tier corporate application, ensuring employees respect the tool and utilize it consistently.
### 2. System Architecture & Technology Stack
The architecture is purposefully designed to decouple the frontend presentation layer from the backend database layer. This ensures high performance, instantaneous UI updates, and absolute zero hosting costs, while granting the Product Owner complete sovereignty over the data and codebase.
- Frontend Deployment: Vercel or Netlify (Free Tier). This provides a clean, secure HTTPS domain and rapid deployment capabilities via drag-and-drop or GitHub integration.
- Frontend Framework: HTML5, CSS3, Vanilla JavaScript. Built as a Single Page Application (SPA) to eliminate page reload times and provide a native application feel.
- Backend API / Webhook: Google Apps Script (Free Tier). Acts as the serverless bridge receiving POST requests from the frontend.
- Database: Google Sheets. Serves as the immutable ledger for all submitted data.
	- Target Sheet ID: 1EVNu8oFX3ll-slu8EX0kCtNOEvfii4aXRyvzXt1a-m0
- File Storage: Google Drive (Owner's 2TB Personal Account). Houses all compressed JPEG receipt uploads in a centralized, shareable folder.
	- Target Folder ID: 1N0MTnkIyHIhwRGgPnaM-R3v4DXp4zCzb
- Client Architecture: Progressive Web App (PWA) optimization. The application utilizes web app manifests and service workers to allow "Add to Home Screen" functionality, bypassing the Apple App Store and Google Play Store entirely.
### 3. UI/UX Design Specifications
The interface must feel like a premium, native iOS/Android application. It must remain highly legible in high-glare environments (such as the cab of a delivery truck or under fluorescent grocery store lighting) and be fully operable with one hand.
### 3.1 Color Palette
The application will exclusively utilize the following hex codes to align seamlessly with brand identity. No deviations or gradient mixtures are permitted.
- Primary Accent (Boar's Head Red): #7b0618 - Utilized for primary call-to-action (CTA) buttons, active input border highlights, success state iconography, and critical system alerts.
- Primary Dark (Black): #000000 - Utilized for primary H1/H2 typography, fixed header backgrounds, and high-contrast UI elements.
- Secondary Dark (Charcoal): #201f1d - Utilized for secondary text (subtitles, placeholders), inactive input field borders, the hamburger navigation menu background, and subtle drop-shadows.
- Background / Base (White): #FFFFFF - Utilized for the main application background, form card backgrounds, and negative space to maintain a stark, minimalist aesthetic.
### 3.2 Typography, Layout, & Interactive States
- Font Family: System default sans-serif stack ( font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;). This guarantees zero external font load times and ensures native OS familiarity.
- Touch Targets: All interactive elements (inputs, dropdowns, buttons) must have a minimum height of 48px to accommodate gloved hands or rapid tapping in the field.
- Input Styling: Soft rounded corners ( border-radius: 6px) with a 1px solid border in #201f1d. Upon user focus, the border transitions smoothly to a 2px solid #7b0618.
- Padding & Margins: Generous utilization of white space. A minimum 20px padding on all screen edges (left/right) to prevent edge-bleed on modern bezel-less smartphones.
### 4. Core Features & Functional Requirements
### 4.1 Global Navigation (The Hamburger Menu)
A fixed header will exist at the absolute top of the application viewport containing the application title ("Route Command") aligned left, and a hamburger menu icon (three stacked horizontal lines) aligned right.
- Drawer Behavior: Tapping the hamburger icon slides a navigation drawer in from the right side of the screen ( transform: translateX(0)). The main background of the screen dims with a semi-transparent black overlay ( rgba(0,0,0,0.5)) to lock focus on the drawer. Tapping the overlay closes the drawer.
- Drawer Styling: The drawer background color is #201f1d. All typography within the drawer is White ( #FFFFFF).
- Menu Items:
	1. Submit Expense: The default active state. Closes the drawer and returns the user to the primary form view.
	2. Fleet Health: Routes the user to a dedicated placeholder page.
	3. Push List: Routes the user to a dedicated placeholder page.
	4. Feature Roadmap: Routes the user to a dedicated vision page.
### 4.2 Dedicated Future-Feature Pages
To prevent main-menu clutter while simultaneously demonstrating long-term value to Owner David Lindholm, the non-active features will exist as independent, ultra-minimalist landing pages.
- Page Architecture: Each page replaces the main form view. The header remains intact. A subtle "← Back to Expense Form" link appears at the top of the view.
- Fleet Health Page: * Visual: A large, charcoal ( #201f1d) wrench icon.
	- Headline: "Fleet Health (Coming Soon)"
	- Pitch Text: "A streamlined pre-trip inspection tool to log mileage, monitor reefer temperatures, and instantly report maintenance issues to Ian before the trucks leave the yard."
- Push List Page:
	- Visual: A large, charcoal ( #201f1d) barcode or tag icon.
	- Headline: "Push List (Coming Soon)"
	- Pitch Text: "A live, dynamic hit-list updated by the warehouse highlighting short-dated inventory, giving the sales team instant visibility to move product before it expires."
- Feature Roadmap Page:
	- Visual: A large, charcoal ( #201f1d) map or compass icon.
	- Headline: "The Route Command Vision"
	- Pitch Text: "This application is currently in MVP Phase 1. Our goal is to expand this into a centralized command center to optimize operations for our ~15 person team. Upcoming Phase 2 integrations include Automated AI Receipt Scanning to eliminate manual data entry, and Dynamic Inventory Routing to automatically ping sales writers about warehouse overstock in real-time. Stay tuned."
### 4.3 Security Protocol (The Gatekeeper)
To prevent unauthorized POST requests, spam, or data pollution on the public Vercel/Netlify URL, a lightweight, zero-friction security measure is required.
- The Master Password: boarshead
- Gatekeeper UI: Upon a user's very first visit to the URL, they are presented with a completely blank white screen containing a single input field and a submit button. The header reads: "Enter Company Passcode."
- Functionality: The user types boarshead and submits. The application validates the string. If correct, the application saves a persistent token to the browser's localStorage (e.g., localStorage.setItem('auth', 'verified')).
- Persistence: The user immediately bypasses to the main Expense Form. Upon all future visits, the JavaScript checks for the localStorage token. If present, the Gatekeeper screen is bypassed entirely. The user never enters the password again unless they utilize a new device or clear their browser cache.
### 4.4 The Expense Submission Form (Main View)
The primary interface consists of a single, vertically scrollable form containing the following strictly validated data fields:
- Employee Name:
	- Type: Dropdown Select ( <select>).
	- Values (Alphabetical): David Lindholm, Hannah, Ian Aps, Kaleb, Nick, Steve, Syreese Delos Santos, Tagen Garris, Teresa, Tyler Sharpe.
	- Persistence Logic: Upon submission, the JavaScript saves the selected index to localStorage. On the user's next visit, their name is pre-selected, saving time.
- Receipt Date:
	- Type: Date Input ( <input type="date">).
	- Labeling: Explicitly labeled as "Date on Receipt" so users do not confuse it with the current date of submission.
	- Behavior: Triggers the native iOS/Android date picker scroll wheel.
- Expense Category:
	- Type: Dropdown Select.
	- Values: Fuel, Sales Lunch / Client Entertainment, Vehicle Maintenance, Office / Warehouse Supplies, Tolls / Parking, Ferry, Equipment / Tools, Lodging / Hotel, Miscellaneous.
	- Validation: Cannot be left blank.
- Expense Amount:
	- Type: Number Input ( <input type="number">).
	- Attributes: inputmode="decimal", pattern="[0-9]*", step="0.01". This explicitly triggers the native numeric keypad on iOS and Android devices.
- Vehicle Tag:
	- Type: Dropdown Select.
	- Values: N/A, Bumblebee, Prime, Heno, White Van, Personal Vehicle.
	- Default State: Always defaults to "N/A". This ensures stockers or demo people do not accidentally assign an expense to a truck.
- Receipt Upload (The File Input):
	- Type: Standard File Input ( <input type="file">).
	- Attributes: accept="image/*".
	- Behavior: Triggers the native operating system prompt, allowing the user to either open their native camera application directly or select an existing photograph.
	- Styling Overlay: The default HTML file input is hidden via CSS ( opacity: 0; position: absolute;). A custom <label> styled as a large, charcoal-bordered button with a camera icon will overlay it. When a file is successfully attached, the button text changes from "Attach Receipt Photo" to "Receipt Attached (1)".
- Submit Button:
	- Type: Submit ( <button type="submit">).
	- Styling: Large, full-width button spanning the container. Background color #7b0618, text color #FFFFFF, font-weight bold.
	- State Management: Upon tapping, the button immediately disables, the background shifts to a muted gray, and the text changes to "Uploading... Please Wait".
### 5. Technical Requirements & Data Handling
### 5.1 Image Compression & Optimization (Critical Infrastructure)
Attempting to transmit raw, 12-megapixel smartphone images via a Base64 encoded string will crash the Google Apps Script webhook. The frontend must handle client-side compression prior to transmission.
- Execution Flow:
	1. JavaScript intercepts the selected file from the <input>.
	2. The file is loaded into an invisible HTML5 <canvas> element.
	3. The image is resized so the maximum width or height does not exceed 1024 pixels.
	4. The canvas exports the resized image to a Base64 JPEG string utilizing a quality setting of 0.7 (70% compression).
	5. This compressed string is appended to the JSON payload.
### 5.2 Cross-Origin Resource Sharing (CORS) Handling
Because the Vercel frontend and Google backend reside on different domains, strict CORS protocols must be negotiated.
- Backend Requirement: The Google Apps Script doPost(e) function must return a TextOutput object containing headers that permit cross-origin requests.
- Frontend Requirement: The fetch() API call must utilize mode: 'no-cors' to ensure the payload bypasses standard preflight blocking.
### 5.3 Data Transmission Payload (JSON Schema)
The frontend will construct a stringified JSON object containing the following exact key-value pairs:
- passcode (String) - Used for backend secondary validation ( boarshead).
- submissionTimestamp (ISO Date String) - Generated at the moment of submission.
- receiptDate (String) - Extracted from the date input field.
- employeeName (String) - Extracted from the dropdown.
- category (String) - Extracted from the dropdown.
- amount (Number) - Extracted from the input field.
- vehicle (String) - Extracted from the dropdown.
- imageFileName (String) - The original name of the file uploaded.
- imageBase64 (String) - The compressed image string.
### 5.4 Backend Processing (Google Apps Script Operations)
Upon receiving a POST request, the Google Apps Script must execute the following operations utilizing the hardcoded IDs:
1. Decode Blob: Convert the Base64 string into a binary image blob.
2. Standardized Renaming: Rename the blob utilizing the format: [ReceiptDate]_[EmployeeName]_[Category]_[Amount].jpg (e.g., 2026-03-12_TylerSharpe_Fuel_75.50.jpg).
3. Drive Storage: Save the blob directly into Folder ID: 1N0MTnkIyHIhwRGgPnaM-R3v4DXp4zCzb.
4. URL Extraction: Retrieve the public/sharable view URL of the new Drive file.
5. Database Append: Append a new row to Sheet ID: 1EVNu8oFX3ll-slu8EX0kCtNOEvfii4aXRyvzXt1a-m0 containing: Submission Timestamp, Receipt Date, Employee Name, Category, Amount, Vehicle, and the Image URL.
### 5.5 Edge Case & Error Handling
- The "Back Button" Trap: Implement a beforeunload event listener. If a user attempts to leave the page while the submit button says "Uploading...", a native browser warning must appear.
- Network Failure: If the fetch() request fails, the application must re-enable the submit button and display a red error message: "Network error. Please check your cellular connection and try submitting again."
- Empty State Prevention: HTML5 form validation ( required) must prevent submission if the Receipt Date, Amount, Category, or File Input are empty.
### 6. User Success Flow
### 6.1 The Dopamine Hit (Visual Success State)
- Trigger Mechanism: The frontend receives a successful callback.
- Action: The entire expense form fades out via a 0.3-second CSS transition.
- Visual Interface: A massive, animated green checkmark appears in the absolute center of the viewport.
- Copywriting: Bold, #000000 text rendering: "Upload Successful! Ian has your receipt."
- Reset Protocol: A secondary button appears directly below the text stating "Submit Another Expense." Tapping this clears the form fields (except for the Employee Name) and fades the main form back in.
### 7. Administrative Workflow (The Wizard of Oz Protocol)
This defines how the Product Owner (Syreese Delos Santos) manages the data efficiently.
1. Batch Processing: Syreese designates a specific block (e.g., Friday mornings) to review the database in Google Sheets.
2. Visual Audit: Syreese clicks the generated Google Drive URL in the spreadsheet to view the compressed photograph of the receipt.
3. Manual Reconciliation: Syreese visually verifies that the total printed on the physical receipt matches the $ Amount typed into the application. Discrepancies are manually corrected in the cell.
4. Financial Export: At month-end, Syreese utilizes the native Google Sheets export functionality to download the cleaned ledger as a CSV or PDF. This document is delivered to David Lindholm and the company CPA.
### 8. Deployment & Onboarding Operations
### 8.1 Production Deployment
The compiled HTML, CSS, and JavaScript files will be deployed via Vercel or Netlify.
### 8.2 In-App Installation Instructions (PWA Adoption)
- UI Implementation: Below the "Submit Button", a text link renders: "Want to add this to your home screen?"
- Modal Behavior: Tapping triggers a sleek #201f1d modal pop-up.
- Modal Copywriting: * iPhone: Tap the Share icon (square with an up arrow) at the bottom of Safari, scroll down, and tap "Add to Home Screen".
	- Android: Tap the three-dot menu at the top right of Chrome, and tap "Add to Home Screen".
- Result: The application installs as a standalone icon, hiding the browser URL address bar for a native experience.
### 9. Future Roadmap (v2.0+ Capabilities)
(These elements are actively represented in the UI via the "Feature Roadmap" page).
- Automated OCR Integration: Upgrading the Google Apps Script webhook to ping the OpenAI Vision API or Gemini Flash API to automatically extract receipt totals, vendors, and dates from the uploaded image.
- Dynamic Inventory Routing: Building out the active database to allow Ian to push real-time alerts to the dedicated sales writers regarding warehouse overstock.