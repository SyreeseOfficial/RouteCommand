/**
 * Route Command — app.js
 * Entry point: passcode gate and startup. Feature code lives in js/*.js,
 * bundled by esbuild at deploy time.
 */
import { $, today, showTip, dismiss, AUTH_KEY, DEFAULT_VEHICLE_KEY } from './js/util.js';
import { VALID_VIEWS, navigateTo } from './js/nav.js';
import { startQueue, updateOnlineState } from './js/queue.js';
import { renderHistory } from './js/history.js';
import { initIdentity, initBookmarkGuide } from './js/settings.js';
import { initCredits } from './js/credits.js';
import { initDonations } from './js/donations.js';
import './js/receipts.js';

const gatekeeper      = $('gatekeeper');
const appShell        = $('app');
const passcodeInput   = $('passcode-input');
const passcodeSubmit  = $('passcode-submit');
const passcodeError   = $('passcode-error');
$('passcode-toggle').addEventListener('click', (e) => {
  const show = passcodeInput.type === 'password';
  passcodeInput.type = show ? 'text' : 'password';
  e.currentTarget.textContent = show ? 'Hide' : 'Show';
  e.currentTarget.setAttribute('aria-pressed', String(show));
});

/* ═══════════════════════════════════════════════════════════
   GATEKEEPER — AUTH LOGIC
═══════════════════════════════════════════════════════════ */
function initAuth() {
  const isAuthed = localStorage.getItem(AUTH_KEY) === 'verified';

  if (isAuthed) {
    $('splash').remove();
    gatekeeper.classList.add('hidden');
    appShell.classList.remove('hidden');
    onAppReady();
  } else {
    gatekeeper.classList.remove('hidden');
    appShell.classList.add('hidden');
    setTimeout(() => $('splash').remove(), 500);   // the gate fades in over the splash (same background), then the splash goes
    setTimeout(() => passcodeInput.focus(), 100);
  }
}

function attemptUnlock() {
  const val = passcodeInput.value.trim().toLowerCase();
  if (val === 'boarshead') {
    localStorage.setItem(AUTH_KEY, 'verified');
    passcodeError.textContent = '';
    gatekeeper.classList.add('fade-out');
    appShell.classList.remove('hidden');
    gatekeeper.addEventListener('animationend', () => {
      gatekeeper.classList.add('hidden');
      gatekeeper.classList.remove('fade-out');
    }, { once: true });
    onAppReady();
  } else {
    passcodeError.textContent = 'Incorrect passcode. Please try again.';
    /* Keep what was typed, selected, so a one-letter typo is a quick fix */
    passcodeInput.focus();
    passcodeInput.select();
    passcodeInput.classList.remove('shake');
    void passcodeInput.offsetWidth;   // restart the animation on repeated misses
    passcodeInput.classList.add('shake');
  }
}

passcodeSubmit.addEventListener('click', attemptUnlock);
passcodeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') attemptUnlock();
});

/* ═══════════════════════════════════════════════════════════
   BOOTSTRAP
═══════════════════════════════════════════════════════════ */
function loadPersistedData() {
  const savedVehicle = localStorage.getItem(DEFAULT_VEHICLE_KEY);
  if (savedVehicle) {
    const defaultVehicleEl = $('default-vehicle');
    const vehicleTagEl     = $('vehicle-tag');
    if (defaultVehicleEl) defaultVehicleEl.value = savedVehicle;
    if (vehicleTagEl)     vehicleTagEl.value     = savedVehicle;
  }

  /* Auto-fill today's date on receipt form */
  const receiptDateEl = $('receipt-date');
  if (receiptDateEl && !receiptDateEl.value) receiptDateEl.value = today();

  renderHistory();
}

function onAppReady() {
  updateOnlineState();
  initIdentity();
  initBookmarkGuide();
  loadPersistedData();
  initCredits();
  initDonations();
  startQueue();
  const seg = window.location.pathname.slice(1);
  const initial = VALID_VIEWS.has(seg) ? seg : 'receipts';
  history.replaceState(null, '', '/' + initial);
  navigateTo(initial, false, false);
}

/* Kick off */
initAuth();

/* A new deploy installs a new service worker that takes over at once; the page in front of the user is still the old code */
function showUpdateTip() {
  if (document.querySelector('.tip--update')) return;
  const tip = document.createElement('div');
  tip.className = 'tip tip--update';
  tip.setAttribute('role', 'status');
  tip.innerHTML = `<p>Update available. <button type="button" class="tip__link">Tap to reload</button></p>
    <button type="button" class="tip__close" aria-label="Dismiss">×</button>`;
  tip.querySelector('.tip__link').addEventListener('click', () => location.reload());
  tip.querySelector('.tip__close').addEventListener('click', () => dismiss(tip));
  showTip(tip);
}

if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;   // false on the very first visit: nothing to update
  navigator.serviceWorker.register('/sw.js').catch(() => {});   // fails when unbundled (dev): the app works without it
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) showUpdateTip(); });
}
