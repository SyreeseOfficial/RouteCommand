# Route Command

> Internal operations portal for a hybrid B2B food distribution workforce.

Built to look like a $50k enterprise tool. Costs $0/month to run.

---

## What it does

- **Receipt Submission** — Drivers and reps snap a photo, fill a short form, and hit submit. Image is compressed client-side, sent to Google Drive, and logged to Google Sheets automatically.
- **Credits & Donations** — Separate flows for credit adjustments and donation tracking, each writing to their own Sheet.
- **Submission History** — Employees can review their own past submissions in-app.
- **Offline-capable PWA** — "Add to Home Screen" on any phone. Works in low-signal warehouses and truck cabs.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML / CSS / JS — no frameworks |
| Hosting | Netlify (free tier) |
| Backend | Google Apps Script (free tier) |
| Database | Google Sheets |
| File Storage | Google Drive |

No monthly bill. No vendor lock-in beyond Google Workspace.

## Architecture

```
Employee's phone
     │
     ▼
Netlify (static SPA + serverless functions)
     │  proxies to keep GAS URL private
     ▼
Google Apps Script web app
     │
     ├─► Google Drive  (receipt image, renamed & stored)
     └─► Google Sheets (timestamped log row per submission)
```

Client-side image compression (canvas → JPEG 0.7 @ 1024px max) keeps payloads under 200KB so GAS never times out.

## Local dev

No build step. Just open `index.html` or run any static file server:

```bash
npx serve .
```

Netlify functions live in `netlify/functions/` and proxy to the Google Apps Script endpoints configured in each `.mjs` file.

## Deployment

Push to `main` → Netlify auto-deploys. That's it.

GAS scripts (`Code.gs`, `CreditCode.gs`, `DonationCode.gs`) are deployed manually from the Google Apps Script editor as web apps.

## Design

Pure black canvas (`#000000`), Boar's Head Red (`#841b2a`), Boar's Head Gold (`#625636`). Enterprise-premium aesthetic — rivals high-end SaaS without the SaaS price tag.

---

*Route Command v1.2 — built by [Syreese Delos Santos](https://github.com/syreese)*
