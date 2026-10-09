/**
 * Route Command — app.js
 * Entry point: passcode gate and startup. Feature code lives in js/*.js,
 * bundled by esbuild at deploy time.
 */
import { $, today, AUTH_KEY, DEFAULT_VEHICLE_KEY, HISTORY_KEY } from './js/util.js';
import { VALID_VIEWS, navigateTo } from './js/nav.js';
import { flushQueue, updateOnlineState } from './js/queue.js';
import { loadHistory, renderHistory } from './js/history.js';
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
    gatekeeper.classList.add('hidden');
    appShell.classList.remove('hidden');
    onAppReady();
  } else {
    gatekeeper.classList.remove('hidden');
    appShell.classList.add('hidden');
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
    passcodeInput.value = '';
    passcodeInput.focus();
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
  flushQueue();
  updateOnlineState();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().map(h => h.status === 'sending' ? { ...h, status: 'failed' } : h)));
  initIdentity();
  initBookmarkGuide();
  loadPersistedData();
  initCredits();
  initDonations();
  const seg = window.location.pathname.slice(1);
  const initial = VALID_VIEWS.has(seg) ? seg : 'receipts';
  history.replaceState(null, '', '/' + initial);
  navigateTo(initial, false, false);
}

/* Kick off */
initAuth();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
