> **AI INSTRUCTIONS:** This file outlines the strict rules for the "Route Command" project.
> - **Purpose:** To enforce technical constraints, workflows, and guidelines you must follow at all times.
> - **How to use:** Internalize these rules before writing any code or performing any actions. Do not deviate from these constraints under any circumstances.
> - **Relationship:** These rules keep the implementation matching `PRD.md`. Open work lives in `FINDINGS.md`.

---

# Project Rules

## 1. Process & Memory
* Reference `PRD.md` for all architectural decisions.
* Update `CHANGELOG.md` after every successful task. Include Date/Time.
* Track open work in `FINDINGS.md`: tick items off when done.

## 2. Technical Constraints
* **Stack:** Vanilla HTML5, CSS3, and ES6+ JavaScript ONLY. 
* **Frameworks:** Strictly forbidden (No React, Tailwind, etc.).
* **Colors:** Use the CSS variables in `style.css`; do not hardcode new hex values.
* **Mobile-First:** 48px minimum touch targets. Must pass PWA lighthouse audits.

## 3. Environment & Security
* **System:** Omarchy Linux. Use `pnpm` for dependencies.
* **Hardcoded IDs:** NEVER modify Google Sheet ID (`1EVNu8oFX3ll-slu8EX0kCtNOEvfii4aXRyvzXt1a-m0`) or Google Drive ID (`1N0MTnkIyHIhwRGgPnaM-R3v4DXp4zCzb`).
* **Zero Cost:** No paid APIs.