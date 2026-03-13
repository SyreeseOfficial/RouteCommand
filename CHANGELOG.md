# Changelog

## [1.1.0] — 2026-03-13
### Added
- `app.js`: wrapped all code in `DOMContentLoaded` listener
- `app.js`: Gatekeeper auth — checks `localStorage.getItem('auth')` on load; if `'verified'`, hides `#gatekeeper-screen` and shows `#app-container`
- `app.js`: `#gatekeeper-form` submit listener — validates input against `'boarshead'`, sets `localStorage('auth', 'verified')`, unlocks app, `e.preventDefault()`

## [1.0.0-ui] — 2026-03-13
### Added
- `index.html`: `#submit-btn` — full-width red submit button at bottom of form
- `index.html`: `#success-state` — green SVG checkmark with `scaleIn` animation, "Upload Successful! Ian has your receipt." text, "Submit Another Expense" `#reset-btn`
- `style.css`: `#submit-btn` — `#7b0618` bg, white bold text, 48px, disabled state gray `#cccccc`
- `style.css`: `#success-state` — hidden by default, centered `.success-body`, animated `.success-checkmark`, `#reset-btn` outlined style
- `style.css`: `0.3s opacity` transition on form/success for fade swap
### Milestone
- Phase 1 UI complete — all visual components built (Gatekeeper, Header, Drawer, Routing, Placeholder Pages, Expense Form, Success State)

## [0.9.0] — 2026-03-13
### Added
- `index.html`: Expense Amount `<input type="number" inputmode="decimal" step="0.01">`, Vehicle Tag `<select>` defaulting to "N/A" with 5 vehicle options, Receipt Upload hidden `<input type="file">` with custom `<label>` styled as a dashed-border camera button
- `style.css`: hidden file input (`opacity: 0; position: absolute`), `.file-upload-btn` dashed border with camera SVG icon, `.has-file` state turns border solid red accent
- `app.js`: `change` listener on `#receipt-upload` — toggles label text to "Receipt Attached (1)" and adds `.has-file` class

## [0.8.0] — 2026-03-13
### Added
- `index.html`: `<section id="main-expense-view">` with `<form id="expense-form">` containing Employee Name `<select>` (10 names), Date on Receipt `<input type="date">`, Expense Category `<select>` (9 categories)
- `style.css`: `.form-group` flex-column layout, shared input/select styles — 48px height, charcoal `1px` border, `6px` radius, red `2px` focus state, custom SVG dropdown arrow

## [0.7.0] — 2026-03-13
### Added
- `app.js`: `navigateTo()` routing function — hides all pages in `allPages` array, shows only the target page by `data-page` attribute
- `app.js`: drawer links call `navigateTo()` after closing drawer; back links call `navigateTo('main-expense-view')`

## [0.6.0] — 2026-03-13
### Added
- `index.html`: `#fleet-health-page` — wrench inline SVG icon, "Fleet Health (Coming Soon)" headline, PRD §4.2 pitch text, back link
- `index.html`: `#push-list-page` — list/barcode inline SVG icon, "Push List (Coming Soon)" headline, PRD §4.2 pitch text, back link
- `index.html`: `#roadmap-page` — compass/target inline SVG icon, "The Route Command Vision" headline, PRD §4.2 pitch text, back link
- `style.css`: all three sections `display: none` by default; `.back-link`, `.placeholder-page-body`, `.placeholder-icon`, `.coming-soon-badge` styles

## [0.5.0] — 2026-03-13
### Added
- `app.js`: hamburger toggle — `openDrawer()` adds `.open` class + shows overlay; `closeDrawer()` removes `.open` + hides overlay
- `app.js`: `aria-expanded` toggled on `#hamburger-btn` for accessibility
- `app.js`: click listeners on `#hamburger-btn`, `#overlay`, and all `.drawer-link` elements to open/close drawer

## [0.4.0] — 2026-03-13
### Added
- `index.html`: `#overlay` div — full-screen dim layer, hidden by default
- `index.html`: `<nav id="side-drawer">` with four `data-page` anchor links: Submit Expense, Fleet Health, Push List, Feature Roadmap
- `style.css`: `#overlay` — `position: fixed`, `inset: 0`, `rgba(0,0,0,0.5)`, `z-index: 600`, `display: none`
- `style.css`: `#side-drawer` — fixed right, 250px wide, full height, `#201f1d` background, `translateX(100%)` off-screen by default, `z-index: 700`
- `style.css`: `.open` class on drawer translates to `translateX(0)` with `0.3s ease-in-out` transition
- `style.css`: `.drawer-link` — white text, 48px min tap target, subtle hover/active state

## [0.3.0] — 2026-03-13
### Added
- `index.html`: `<header id="main-header">` inside `#app-container` — fixed top bar with "Route Command" title (left) and `#hamburger-btn` (right)
- `index.html`: Hamburger icon built from three `<span class="hamburger-bar">` elements — no external libraries
- `index.html`: `<main id="main-content">` as the page content host, offset to clear the fixed header
- `style.css`: `#main-header` — `position: fixed`, black background, white text, flexbox space-between, 56px height, 20px side padding
- `style.css`: `.hamburger-bar` — three 22×2px white bars with `gap: 5px`, 48px tap target on the button
- `style.css`: `#main-content` — `padding-top: 56px` to clear fixed header

## [0.2.0] — 2026-03-13
### Added
- `index.html`: `#gatekeeper-screen` div — full-viewport flexbox, centered card with `h1`, password `input`, and submit `button`
- `index.html`: `#app-container` div (hidden by default via `hidden` attribute)
- `style.css`: Gatekeeper styles — full-viewport fixed overlay, card layout, 48px input with charcoal border + red focus state, 48px red submit button with white bold text

## [0.1.0] — 2026-03-13
### Added
- Initialized project workspace: created `index.html`, `style.css`, `app.js`
- `style.css`: defined `:root` CSS variables for full brand palette (`--color-primary-accent`, `--color-primary-dark`, `--color-secondary-dark`, `--color-base`)
- `style.css`: global box-sizing reset, system font stack, white base background, mobile-first layout with `max-width: 600px`
- `app.js`: stubbed with `'use strict'` and project header comment
