/**
 * Route Command — app.js
 * Vanilla ES6+ SPA logic for the Boar's Head internal operations dashboard.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const AUTH_KEY             = 'rc_auth';
const NAME_KEY             = 'rc_employee_name';
const RECIPIENT            = 'Ian';   // who receives receipts and credit requests
const getName = () => localStorage.getItem(NAME_KEY) || '';
const DEFAULT_VEHICLE_KEY  = 'rc_default_vehicle';
const HISTORY_KEY          = 'rc_history';

/* ═══════════════════════════════════════════════════════════
   DOM REFERENCES
═══════════════════════════════════════════════════════════ */
const gatekeeper      = document.getElementById('gatekeeper');
const appShell        = document.getElementById('app');
const passcodeInput   = document.getElementById('passcode-input');
const passcodeSubmit  = document.getElementById('passcode-submit');
const passcodeError   = document.getElementById('passcode-error');

const sidebarNavItems  = document.querySelectorAll('.sidebar .nav-item[data-view]');
const bottomNavItems   = document.querySelectorAll('.bottom-nav .bottom-nav__item[data-view]');
const views            = document.querySelectorAll('.view');

const expenseForm      = document.getElementById('expense-form');
const submitBtn        = document.getElementById('submit-btn');
const successState     = document.getElementById('success-state');
const submitAnotherBtn = document.getElementById('submit-another-btn');
const receiptPhotoInput = document.getElementById('receipt-photo');
const resetBtn         = document.getElementById('reset-btn');
const darkModeToggle   = document.getElementById('dark-mode-toggle');
const defaultVehicleEl   = document.getElementById('default-vehicle');
const installPwaBtn        = document.getElementById('install-pwa-btn');
const pwaModalOverlay      = document.getElementById('pwa-modal-overlay');
const pwaModal             = document.getElementById('pwa-modal');
const pwaModalClose        = document.getElementById('pwa-modal-close');
const submissionHistoryEl  = document.getElementById('submission-history');

/* Stores compressed image as base64 */
let compressedImageData = null;

/* ═══════════════════════════════════════════════════════════
   1. GATEKEEPER — AUTH LOGIC
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
   2. ROUTER — SPA VIEW SWITCHING
═══════════════════════════════════════════════════════════ */
const VALID_VIEWS = new Set(['receipts', 'credits', 'donations', 'history', 'settings']);

function navigateTo(viewId, updateHistory = true, moveFocus = true) {
  /* Hide all views */
  views.forEach(v => v.classList.remove('active'));

  /* Show target */
  const target = document.getElementById(`${viewId}-view`);
  if (target) target.classList.add('active');

  /* Sync sidebar active state */
  sidebarNavItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });

  /* Sync bottom nav active state */
  bottomNavItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });

  /* Title and focus for screen readers / keyboard users */
  document.title = `${viewId[0].toUpperCase()}${viewId.slice(1)} · Route Command`;
  const heading = target && target.querySelector('.view__title');
  if (heading && moveFocus) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  /* Scroll to top of new view */
  window.scrollTo(0, 0);

  /* Trigger scroll-based animations for the new view */
  observeAnimatables();

  /* Update browser URL */
  if (updateHistory) history.pushState(null, '', '/' + viewId);
}

/* Handle browser back / forward */
window.addEventListener('popstate', () => {
  const seg = window.location.pathname.slice(1);
  navigateTo(VALID_VIEWS.has(seg) ? seg : 'receipts', false);
});

/* "View in history" links on success screens */
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-goto-history]')) return;
  navigateTo('history');
});

/* Sidebar nav */
sidebarNavItems.forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.view));
});

/* Bottom nav */
bottomNavItems.forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.view));
});

/* ═══════════════════════════════════════════════════════════
   3. LOCALSTORAGE PERSISTENCE
═══════════════════════════════════════════════════════════ */
function loadPersistedData() {
  /* Default vehicle */
  const savedVehicle = localStorage.getItem(DEFAULT_VEHICLE_KEY);
  if (savedVehicle && defaultVehicleEl) {
    defaultVehicleEl.value = savedVehicle;
  }
  /* Pre-populate vehicle tag on the form */
  const vehicleTagEl = document.getElementById('vehicle-tag');
  if (savedVehicle && vehicleTagEl) {
    vehicleTagEl.value = savedVehicle;
  }

  /* Auto-fill today's date on receipt form */
  const receiptDateEl = document.getElementById('receipt-date');
  if (receiptDateEl && !receiptDateEl.value) {
    receiptDateEl.value = today();
  }

  /* Render submission history */
  renderHistory();
}

/* Catalog (names, stores, donation items) lives in data.json; fetched on first use, then cached by the service worker */
let dataPromise = null;
function loadData() {
  dataPromise = dataPromise || fetch('/data.json').then(r => r.json()).catch(err => { dataPromise = null; throw err; });
  return dataPromise;
}
const catalog = (key) => loadData().then(d => d[key], () => []);

async function initIdentity() {
  const NAMES = await catalog('names');
  const opts = NAMES.map(n => `<option value="${n}">${n}</option>`).join('');
  const gate = document.getElementById('name-gate');
  const gateSel = document.getElementById('name-gate-select');
  const settingsSel = document.getElementById('identity-select');
  gateSel.innerHTML = '<option value="" disabled selected>Select your name</option>' + opts;
  settingsSel.innerHTML = opts;
  document.querySelectorAll('[data-recipient]').forEach(el => { el.textContent = RECIPIENT; });

  const sync = () => { settingsSel.value = getName(); };
  if (NAMES.includes(getName())) { sync(); showInstallTip(); } else gate.classList.remove('hidden');

  document.getElementById('name-gate-submit').addEventListener('click', () => {
    if (!gateSel.value) return;
    localStorage.setItem(NAME_KEY, gateSel.value);
    sync();
    gate.classList.add('hidden');
    showInstallTip();
  });
  settingsSel.addEventListener('change', () => localStorage.setItem(NAME_KEY, settingsSel.value));
}

/* ═══════════════════════════════════════════════════════════
   5. IMAGE COMPRESSION (Canvas)
═══════════════════════════════════════════════════════════ */
/* Block submit while a photo is still compressing, so it can't be sent without it */
function setPhotoBusy(busy) {
  submitBtn.disabled    = busy;
  submitBtn.textContent = busy ? 'Processing photo…' : 'Submit Expense';
}

function handleImageUpload(file) {
  if (!file) return;

  const MAX_WIDTH = 1024;
  const QUALITY   = 0.7;

  setPhotoBusy(true);
  const reader = new FileReader();
  reader.onerror = () => setPhotoBusy(false);
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width  = MAX_WIDTH;
      }

      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      compressedImageData = canvas.toDataURL('image/jpeg', QUALITY);

      showPhotoPreview(compressedImageData);
      setPhotoBusy(false);
    };
    img.onerror = () => setPhotoBusy(false);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

const photoActions = document.querySelector('.photo-actions');
const photoPreview = document.getElementById('photo-preview');

function showPhotoPreview(src) {
  document.getElementById('photo-thumb').src = src || '';
  photoPreview.classList.toggle('hidden', !src);
  photoActions.classList.toggle('hidden', !!src);
}

/* Camera and library inputs both feed the same handler */
[receiptPhotoInput, document.getElementById('receipt-library')].forEach(input => {
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  });
});

document.getElementById('photo-retake').addEventListener('click', () => {
  compressedImageData = null;
  showPhotoPreview(null);
});

/* ═══════════════════════════════════════════════════════════
   SHARED HELPERS
═══════════════════════════════════════════════════════════ */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
/* Local YYYY-MM-DD (toISOString would give the UTC date, which is tomorrow after ~5pm Pacific) */
const today = () => new Date().toLocaleDateString('en-CA');
const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`;

/* Inline field errors: red border, message under the field, aria-invalid. Cleared when the user edits the field.
   Returns false so callers can do `valid = markInvalid(el, 'message')`. */
let errorSeq = 0;

function clearInvalid(el) {
  el.classList.remove('is-invalid');
  el.removeAttribute('aria-invalid');
  el.removeAttribute('aria-describedby');
  if (el._err) el._err.remove();
  if (el._onEdit) ['input', 'change'].forEach(ev => el.removeEventListener(ev, el._onEdit));
  el._err = el._onEdit = null;
}

function markInvalid(el, message) {
  clearInvalid(el);
  el.classList.add('is-invalid');
  el.setAttribute('aria-invalid', 'true');

  /* Put the message after the whole control, and after the row when two fields share one */
  let anchor = el.closest('.store-search-wrap, .input-prefix, .qty-stepper') || el;
  if (anchor.parentElement.matches('.credit-item__row')) anchor = anchor.parentElement;
  const err = document.createElement('p');
  err.className = 'field-error';
  err.id = `field-error-${++errorSeq}`;
  err.textContent = message;
  anchor.insertAdjacentElement('afterend', err);
  el.setAttribute('aria-describedby', err.id);

  el._err = err;
  el._onEdit = () => clearInvalid(el);
  ['input', 'change'].forEach(ev => el.addEventListener(ev, el._onEdit));
  return false;
}

/* After a failed validation, take the user to the first problem (it may be off-screen on a phone) */
function focusFirstInvalid(formEl) {
  const el = formEl.querySelector('.is-invalid');
  if (!el) return;
  el.scrollIntoView({ block: 'center' });
  el.focus({ preventScroll: true });
}

/* POST JSON with a timeout, so a stalled server call can't hang the button forever */
const FETCH_TIMEOUT_MS = 20000;
async function postJSON(endpoint, payload) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  ctrl.signal,
    });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* fetch() rejects with a TypeError ("Failed to fetch") when offline; a timeout aborts it */
const isNetworkError = (err) => err.name === 'TypeError' || err.name === 'AbortError' || !navigator.onLine;

/* POST a form, drive the button spinner, error text, history status, and success screen. */
/* ── Offline queue: submissions that failed for lack of network wait here and retry ── */
const QUEUE_KEY = 'rc_queue';
const loadQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch { return []; } };

/* Badge on the History tab: how many submissions are waiting to send */
function updateQueueBadge() {
  const n = loadQueue().length;
  document.querySelectorAll('[data-view="history"]').forEach(nav => {
    const badge = nav.querySelector('.nav-badge');
    badge.textContent = n;
    badge.classList.toggle('hidden', !n);
    if (nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', n ? `History, ${n} waiting to send` : 'History');
  });
}

/* Returns false if the item couldn't be stored (e.g. storage full), so the caller can show the error instead */
function enqueue(item) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...loadQueue(), item]));
    updateQueueBadge();
    return true;
  } catch { return false; }
}

let flushing = false;
async function flushQueue() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  for (const item of loadQueue()) {
    let status;
    try {
      const data = await postJSON(item.endpoint, item.payload);
      status = data.status === 'success' ? 'saved' : 'failed';
    } catch (err) {
      if (isNetworkError(err)) break;   // still offline; try again on the next tick
      status = 'failed';                // any other reply ends the item: a retry would just fail again
    }
    setHistoryStatus(item.historyId, status, status === 'failed' ? { endpoint: item.endpoint, payload: item.payload } : undefined);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(loadQueue().filter(q => q.historyId !== item.historyId)));
    updateQueueBadge();
  }
  flushing = false;
}
window.addEventListener('online', flushQueue);

function updateOnlineState() { $('offline-banner').classList.toggle('hidden', navigator.onLine); }
window.addEventListener('online', updateOnlineState);
window.addEventListener('offline', updateOnlineState);
setInterval(flushQueue, 30000);

/* Save `snapshot()` to localStorage on every edit, so a reload doesn't lose a long list */
function autosaveDraft(key, formEl, snapshot) {
  const save = () => localStorage.setItem(key, JSON.stringify(snapshot()));
  ['input', 'change', 'click'].forEach(ev => formEl.addEventListener(ev, save));
}
function loadDraft(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

async function submitForm({ draftKey, endpoint, payload, btn, label, type, histLabel, formEl, successEl, summaryEl, summaryHTML }) {
  if (btn.disabled) return;
  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Submitting…';
  window.addEventListener('beforeunload', beforeUnloadHandler);

  let errEl = btn.parentElement.querySelector('.submit-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.className = 'submit-error';
    errEl.setAttribute('role', 'alert');
    btn.insertAdjacentElement('afterend', errEl);
  }
  errEl.textContent = '';

  /* The success screen doubles as the "saved offline" screen */
  const showSuccess = (queued) => {
    const title = successEl.querySelector('.success-state__title');
    const msg   = successEl.querySelector('.success-state__msg');
    title.dataset.orig = title.dataset.orig || title.textContent;
    msg.dataset.orig   = msg.dataset.orig   || msg.innerHTML;
    title.textContent = queued ? 'Saved Offline' : title.dataset.orig;
    msg.innerHTML     = queued ? 'It will send automatically when you\'re back online.' : msg.dataset.orig;
    summaryEl.innerHTML = summaryHTML;
    formEl.classList.add('hidden');
    successEl.classList.remove('hidden');
    successEl.scrollIntoView({ block: 'center' });
  };

  const historyId = saveToHistory({ type, label: histLabel, status: 'sending', summary: summaryHTML });
  try {
    const data = await postJSON(endpoint, payload);
    if (data.status !== 'success') throw new Error(data.message || 'Server error');

    setHistoryStatus(historyId, 'saved');
    if (draftKey) localStorage.removeItem(draftKey);
    showSuccess(false);
  } catch (err) {
    if (isNetworkError(err) && enqueue({ endpoint, payload, historyId })) {
      setHistoryStatus(historyId, 'queued');
      if (draftKey) localStorage.removeItem(draftKey);
      showSuccess(true);
    } else {
      setHistoryStatus(historyId, 'failed', { endpoint, payload });
      errEl.textContent = isNetworkError(err)
        ? 'Network error. Please check your connection and try again.'
        : err.message;
    }
  } finally {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    btn.disabled    = false;
    btn.textContent = label;
  }
}

/* One add/remove/count/suggest/type-toggle implementation for the credit and donation item lists. */
function createItemList({ listId, countId, buildHTML, onType }) {
  const el = $(listId);
  let counter = 0;

  const refresh = () => {
    const n = el.children.length;
    $(countId).textContent = plural(n, 'item');
    el.querySelectorAll('.credit-item__remove').forEach(b => b.classList.toggle('credit-item__remove--hidden', n <= 1));
  };
  const add   = () => { el.insertAdjacentHTML('beforeend', buildHTML(++counter)); refresh(); };
  const reset = () => { el.innerHTML = ''; counter = 0; add(); };

  const setType = (item, type) => {
    item.querySelectorAll('[data-type-btn]').forEach(b => b.classList.toggle('pill-toggle__btn--active', b.dataset.typeBtn === type));
    item.querySelectorAll('[data-fields-type]').forEach(f => f.classList.toggle('hidden', f.dataset.fieldsType !== type));
  };

  /* Draft support: plain-data snapshot of every item, and the reverse */
  const serialize = () => [...el.children].map(item => ({
    type:   item.querySelector('.pill-toggle__btn--active')?.dataset.typeBtn,
    values: Object.fromEntries([...item.querySelectorAll('[data-fname]')].map(f => [f.dataset.fname, f.value])),
  }));
  const restore = (items) => {
    el.innerHTML = ''; counter = 0;
    items.forEach(({ type, values }) => {
      add();
      const item = el.lastElementChild;
      if (type) setType(item, type);
      Object.entries(values).forEach(([k, v]) => {
        const f = item.querySelector(`[data-fname="${k}"]`);
        if (f) f.value = v;
      });
    });
    if (!el.children.length) add();
  };

  el.addEventListener('input', async (e) => {
    const input = e.target.closest('[data-fname="name"]');
    if (!input) return;
    const box = input.closest('.store-search-wrap').querySelector('.store-suggestions');
    const q   = input.value.trim();
    const results = q ? await searchDonationItems(q) : [];
    if (input.value.trim() === q) showSuggestions(input, box, results);   // ignore stale results
  });

  el.addEventListener('keydown', (e) => {
    const input = e.target.closest('[data-fname="name"]');
    if (input) suggestionKeydown(e, input, input.closest('.store-search-wrap').querySelector('.store-suggestions'));
  });

  el.addEventListener('click', (e) => {
    const hit = e.target.closest('.store-suggestion');
    if (hit) {
      pickSuggestion(hit.closest('.store-search-wrap').querySelector('input'), hit.parentElement, hit.textContent);
      return;
    }
    const typeBtn = e.target.closest('[data-type-btn]');
    if (typeBtn) {
      setType(typeBtn.closest('[data-id]'), typeBtn.dataset.typeBtn);
      if (onType) onType(typeBtn.dataset.typeBtn);
      return;
    }
    const step = e.target.closest('.qty-stepper__btn');
    if (step) {
      const qty = step.closest('.qty-stepper').querySelector('[data-fname="qty"]');
      qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) + parseInt(step.dataset.dir, 10));
      return;
    }
    const rm = e.target.closest('[data-remove]');
    if (rm) { rm.closest('[data-id]').remove(); refresh(); }
  });

  el.addEventListener('change', (e) => {
    if (e.target.matches('[data-fname="qty"]') && !(parseInt(e.target.value, 10) >= 1)) e.target.value = 1;
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.store-search-wrap')) el.querySelectorAll('.store-suggestions').forEach(hideSuggestions);
  });

  return { el, add, reset, serialize, restore };
}

const REMOVE_BTN_HTML = `
  <button type="button" class="credit-item__remove" data-remove aria-label="Remove item">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>`;

/* Vehicle Tag only matters for these categories */
const VEHICLE_CATEGORIES = ['Fuel', 'Vehicle Maintenance', 'Tolls / Parking'];
function syncVehicleField() {
  $('vehicle-group').classList.toggle('hidden', !VEHICLE_CATEGORIES.includes($('expense-category').value));
}
$('expense-category').addEventListener('change', syncVehicleField);

/* ═══════════════════════════════════════════════════════════
   6. EXPENSE FORM SUBMISSION
═══════════════════════════════════════════════════════════ */

if (expenseForm) {
  expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = getName();
    const date     = document.getElementById('receipt-date').value;
    const category = document.getElementById('expense-category').value;
    const amount   = document.getElementById('expense-amount').value;
    /* The vehicle field is hidden for categories that don't involve a vehicle */
    const vehicle  = $('vehicle-group').classList.contains('hidden') ? 'N/A' : $('vehicle-tag').value;
    const notes    = document.getElementById('notes').value;

    let valid = true;
    if (!date)                     valid = markInvalid($('receipt-date'), 'Enter the date on the receipt');
    if (!category)                 valid = markInvalid($('expense-category'), 'Choose a category');
    if (!(parseFloat(amount) > 0)) valid = markInvalid($('expense-amount'), 'Enter an amount above $0');
    if (!name || !valid) { focusFirstInvalid(expenseForm); return; }

    /* Unusual dates are usually typos */
    const ageDays = (Date.parse(today()) - Date.parse(date)) / 864e5;
    if (ageDays < 0  && !confirm('This receipt is dated in the future. Submit anyway?')) return;
    if (ageDays > 60 && !confirm(`This receipt is ${Math.round(ageDays)} days old. Submit anyway?`)) return;

    if (!compressedImageData && !confirm('No receipt photo attached. Submit anyway?')) return;

    const photoNote = compressedImageData ? 'Photo attached' : 'No photo';
    const veh       = vehicle && vehicle !== 'N/A' ? ` · ${vehicle}` : '';
    submitForm({
      endpoint:    '/api/submit-receipt',
      payload:     { employeeName: name, receiptDate: date, category, amount, vehicleTag: vehicle, notes,
                     imageData: compressedImageData || null, timestamp: new Date().toISOString() },
      btn:         submitBtn,
      label:       'Submit Expense',
      type:        'Receipt',
      histLabel:   `$${parseFloat(amount).toFixed(2)} · ${category}`,
      formEl:      expenseForm,
      successEl:   successState,
      summaryEl:   document.getElementById('receipt-success-summary'),
      summaryHTML: `<div class="credit-success-meta">$${parseFloat(amount).toFixed(2)} &middot; ${esc(category)}</div>
        <div class="credit-success-item"><span class="credit-success-item__product">${fmtDate(date)}${esc(veh)}</span>
        <span class="credit-success-item__reason">${photoNote}</span></div>`,
    });
  });
}

function beforeUnloadHandler(e) {
  e.preventDefault();
  e.returnValue = '';
}

/* Submit Another */
if (submitAnotherBtn) {
  submitAnotherBtn.addEventListener('click', () => {
    expenseForm.reset();
    compressedImageData = null;

    showPhotoPreview(null);
    syncVehicleField();

    successState.classList.add('hidden');
    expenseForm.classList.remove('hidden');
  });
}

/* ═══════════════════════════════════════════════════════════
   7. SETTINGS
═══════════════════════════════════════════════════════════ */

/* Default vehicle persistence */
if (defaultVehicleEl) {
  defaultVehicleEl.addEventListener('change', () => {
    localStorage.setItem(DEFAULT_VEHICLE_KEY, defaultVehicleEl.value);
    const vehicleTagEl = document.getElementById('vehicle-tag');
    if (vehicleTagEl) vehicleTagEl.value = defaultVehicleEl.value;
  });
}

/* PWA install modal */
function openPwaModal() {
  pwaModalOverlay.classList.remove('hidden');
  pwaModal.classList.remove('hidden');
  pwaModalOverlay.removeAttribute('aria-hidden');
}

function closePwaModal() {
  pwaModalOverlay.classList.add('hidden');
  pwaModal.classList.add('hidden');
  pwaModalOverlay.setAttribute('aria-hidden', 'true');
}

if (installPwaBtn)   installPwaBtn.addEventListener('click', openPwaModal);

/* Already installed: the install help has nothing left to offer */
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
if (isStandalone()) $('app-setup-section').classList.add('hidden');

/* One-time hint for phone users, shown the first time they get into the app */
const INSTALL_TIP_KEY = 'rc_install_tip_seen';
function showInstallTip() {
  if (isStandalone() || !matchMedia('(pointer: coarse)').matches || localStorage.getItem(INSTALL_TIP_KEY)) return;
  localStorage.setItem(INSTALL_TIP_KEY, '1');

  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('role', 'status');
  tip.innerHTML = `<p>Tip: install Route Command on your phone. Open <button type="button" class="tip__link">Settings → App Setup</button>.</p>
    <button type="button" class="tip__close" aria-label="Dismiss">×</button>`;
  tip.querySelector('.tip__link').addEventListener('click', () => { navigateTo('settings'); tip.remove(); });
  tip.querySelector('.tip__close').addEventListener('click', () => tip.remove());
  document.body.appendChild(tip);
}
if (pwaModalOverlay) pwaModalOverlay.addEventListener('click', closePwaModal);
if (pwaModalClose)   pwaModalClose.addEventListener('click', closePwaModal);

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    const unsent = loadQueue().length;
    const warning = unsent
      ? `${plural(unsent, 'submission')} ${unsent === 1 ? "hasn't" : "haven't"} sent yet and will be lost. Reset anyway?`
      : 'Reset Route Command? This will clear all saved data and return to the login screen.';
    if (!confirm(warning)) return;
    localStorage.clear();
    location.reload();
  });
}

if (darkModeToggle) {
  /* The <head> script already applied the saved or system theme; just sync the toggle */
  darkModeToggle.checked = !document.documentElement.classList.contains('light');

  darkModeToggle.addEventListener('change', () => {
    if (darkModeToggle.checked) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('rc_theme', 'dark');
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('rc_theme', 'light');
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   8. INTERSECTION OBSERVER — SCROLL ANIMATIONS
═══════════════════════════════════════════════════════════ */
let observer = null;

function observeAnimatables() {
  const animatables = document.querySelectorAll(
    '.stat-card:not(.visible), .form-card:not(.visible), .placeholder-card:not(.visible), .section-card:not(.visible), .view-copy-card:not(.visible)'
  );

  if (!animatables.length) return;

  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          /* Stagger each element slightly */
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, i * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  }

  animatables.forEach(el => observer.observe(el));
}

/* ═══════════════════════════════════════════════════════════
   9. CREDITS FEATURE
═══════════════════════════════════════════════════════════ */




/* Every space-separated word must appear somewhere in the entry */
function matchAll(list, query) {
  const words = query.toLowerCase().split(/\s+/);
  return list.filter(s => { const l = s.toLowerCase(); return words.every(w => l.includes(w)); }).slice(0, 8);
}
const searchStores        = async (q) => matchAll(await catalog('stores'), q);
const searchDonationItems = async (q) => matchAll(await catalog('donationItems'), q);

/* Combobox behaviour shared by the store search and the item search boxes */
let suggestionSeq = 0;

function showSuggestions(input, box, results) {
  box.id = box.id || `suggestions-${++suggestionSeq}`;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', box.id);
  box.innerHTML = results.map((s, i) => `<div class="store-suggestion" role="option" id="${box.id}-${i}" tabindex="-1">${esc(s)}</div>`).join('');
  box.classList.toggle('hidden', !results.length);
  input.setAttribute('aria-expanded', String(results.length > 0));
  input.removeAttribute('aria-activedescendant');
}

function hideSuggestions(box) {
  box.classList.add('hidden');
  const input = box.parentElement.querySelector('input');
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
}

function pickSuggestion(input, box, text) {
  input.value = text;
  clearInvalid(input);
  hideSuggestions(box);
  input.dispatchEvent(new Event('change', { bubbles: true }));   // lets draft autosave see keyboard picks
}

/* Arrow keys move through the options, Enter picks, Escape closes */
function suggestionKeydown(e, input, box) {
  if (box.classList.contains('hidden')) return;
  const opts = [...box.children];
  const cur  = box.querySelector('.focused');
  let idx    = opts.indexOf(cur);

  if (e.key === 'ArrowDown')      idx = (idx + 1) % opts.length;
  else if (e.key === 'ArrowUp')   idx = idx <= 0 ? opts.length - 1 : idx - 1;
  else if (e.key === 'Enter' && cur) { e.preventDefault(); pickSuggestion(input, box, cur.textContent); return; }
  else if (e.key === 'Escape')    { hideSuggestions(box); return; }
  else return;

  e.preventDefault();
  cur?.classList.remove('focused');
  opts[idx].classList.add('focused');
  input.setAttribute('aria-activedescendant', opts[idx].id);
  opts[idx].scrollIntoView({ block: 'nearest' });
}

function initStoreSearch() {
  const input = $('credit-store-input');
  const box   = $('store-suggestions');

  input.addEventListener('input', async () => {
    const q = input.value.trim();
    const results = q ? await searchStores(q) : [];
    if (input.value.trim() === q) showSuggestions(input, box, results);   // ignore stale results
  });
  box.addEventListener('click', (e) => {
    const hit = e.target.closest('.store-suggestion');
    if (!hit) return;
    pickSuggestion(input, box, hit.textContent);
    input.blur();
  });
  input.addEventListener('keydown', (e) => suggestionKeydown(e, input, box));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.store-search-wrap')) hideSuggestions(box);
  });
}

function createCreditItemHTML(id) {
  return `
    <div class="credit-item" data-id="${id}">
      <div class="credit-item__header">
        <div class="pill-toggle">
          <button type="button" class="pill-toggle__btn pill-toggle__btn--active" data-type-btn="retail">Retail</button>
          <button type="button" class="pill-toggle__btn" data-type-btn="chub">Chub / Deli</button>
        </div>${REMOVE_BTN_HTML}
      </div>
      <div data-fields-type="retail">
        <div class="credit-item__row">
          <input type="text" class="form-input" placeholder="UPC / Item #" inputmode="numeric" autocomplete="off" data-fname="upc" />
          <div class="qty-stepper">
            <button type="button" class="qty-stepper__btn" data-dir="-1" aria-label="Decrease quantity">−</button>
            <input type="number" class="qty-stepper__input" value="1" min="1" inputmode="numeric" aria-label="Quantity" data-fname="qty" />
            <button type="button" class="qty-stepper__btn" data-dir="1" aria-label="Increase quantity">+</button>
          </div>
        </div>
      </div>
      <div class="hidden" data-fields-type="chub">
        <div class="store-search-wrap store-search-wrap--spaced">
          <input type="text" class="form-input" placeholder="Search item or UPC…" autocomplete="off" autocorrect="off" spellcheck="false" inputmode="search" data-fname="name" />
          <div class="store-suggestions hidden" role="listbox" aria-label="Item suggestions"></div>
        </div>
        <input type="number" class="form-input" placeholder="Weight (lbs)" inputmode="decimal" step="0.01" min="0" data-fname="weight" />
      </div>
      <select class="form-select" data-fname="reason">
        <option value="10-Day" selected>10-Day</option>
        <option value="Expired">Expired</option>
        <option value="Damaged Packaging">Damaged Packaging</option>
        <option value="Poor Quality">Poor Quality</option>
        <option value="Bad Seal">Bad Seal</option>
        <option value="Other">Other</option>
      </select>
    </div>`;
}

const CREDIT_DRAFT_KEY = 'rc_draft_credit';
let creditList;

/* Returns the items, or null if any required field is empty (fields get highlighted). */
function collectCreditItems() {
  let valid = true;
  const items = [...creditList.el.children].map(itemEl => {
    const type   = itemEl.querySelector('.pill-toggle__btn--active').dataset.typeBtn;
    const retail = type === 'retail';
    const f      = (n) => itemEl.querySelector(`[data-fname="${n}"]`);
    const prod   = f(retail ? 'upc' : 'name');
    const qty    = f(retail ? 'qty' : 'weight');
    if (!prod.value.trim()) valid = markInvalid(prod, retail ? 'Enter a UPC or item number' : 'Search for an item');
    if (!(parseFloat(qty.value) > 0)) valid = markInvalid(qty, retail ? 'Enter a quantity' : 'Enter the weight in lbs');
    return {
      type:    retail ? 'Retail' : 'Chub / Deli',
      product: prod.value.trim(),
      qty:     `${qty.value.trim()} ${retail ? 'units' : 'lbs'}`,
      reason:  f('reason').value,
    };
  });
  return valid ? items : null;
}

function buildCreditSuccessSummary(store, date, items) {
  const rows = items.map(item => `
    <div class="credit-success-item">
      <span class="credit-success-item__type">${item.type}</span>
      <span class="credit-success-item__product">${esc(item.product)}</span>
      <span class="credit-success-item__qty">${esc(item.qty)}</span>
      <span class="credit-success-item__reason">${esc(item.reason)}</span>
    </div>`).join('');
  return `<div class="credit-success-meta">${esc(store)} &middot; ${fmtDate(date)}</div>${rows}`;
}

function handleCreditSubmit(e) {
  e.preventDefault();
  const dateEl     = $('credit-date');
  const storeInput = $('credit-store-input');
  let valid = true;
  if (!dateEl.value) valid = markInvalid(dateEl, 'Pick a date');
  if (!storeInput.value.trim()) valid = markInvalid(storeInput, 'Choose or type a store');
  const items = collectCreditItems();
  if (!valid || !items) { focusFirstInvalid($('credit-form')); return; }

  const store = storeInput.value.trim();
  const date  = dateEl.value;
  submitForm({
    draftKey:    CREDIT_DRAFT_KEY,
    endpoint:    '/api/submit-credit',
    payload:     { salesperson: getName(), store, date, notes: $('credit-notes').value.trim(), items, timestamp: new Date().toISOString() },
    btn:         $('credit-submit-btn'),
    label:       'Submit Credits',
    type:        'Credit',
    histLabel:   `${store} · ${plural(items.length, 'item')}`,
    formEl:      $('credit-form'),
    successEl:   $('credit-success-state'),
    summaryEl:   $('credit-success-summary'),
    summaryHTML: buildCreditSuccessSummary(store, date, items),
  });
}

function resetCreditForm() {
  localStorage.removeItem(CREDIT_DRAFT_KEY);
  $('credit-date').value = today();
  $('credit-store-input').value = '';
  $('credit-notes').value = '';
  creditList.reset();
  $('credit-success-state').classList.add('hidden');
  $('credit-form').classList.remove('hidden');
}

/* ── Bookmark guide ─── */
const BOOKMARK_CONTENT = {
  ios: {
    homescreen: [
      { text: 'Open Route Command in <strong>Safari</strong> (must be Safari, not Chrome).' },
      { text: 'Tap the <strong>Share button</strong> (the box with an arrow pointing up) at the bottom of the screen.' },
      { text: 'Scroll down and tap <strong>"Add to Home Screen."</strong>' },
      { text: 'Tap <strong>"Add"</strong> in the top right. The icon will appear on your home screen.' },
    ],
    bookmark: [
      { text: 'Open Route Command in <strong>Safari</strong>.' },
      { text: 'Tap the <strong>Share button</strong> (box with arrow pointing up) at the bottom.' },
      { text: 'Tap <strong>"Add Bookmark."</strong>' },
      { text: 'Choose a location and tap <strong>"Save."</strong>' },
    ],
  },
  android: {
    homescreen: [
      { text: 'Open Route Command in <strong>Chrome</strong>.' },
      { text: 'Tap the <strong>three-dot menu</strong> (⋮) in the top right corner.' },
      { text: 'Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App."</strong>' },
      { text: 'Confirm the prompt. The icon will appear on your home screen.' },
    ],
    bookmark: [
      { text: 'Open Route Command in <strong>Chrome</strong>.' },
      { text: 'Tap the <strong>three-dot menu</strong> (⋮) in the top right corner.' },
      { text: 'Tap the <strong>star icon</strong> to save a bookmark.' },
      { text: 'Edit the name if you like and tap <strong>"Save."</strong>' },
    ],
  },
};

function renderBookmarkInstructions(os, type) {
  const el    = document.getElementById('bookmark-instructions');
  if (!el) return;
  const steps = BOOKMARK_CONTENT[os]?.[type] || [];
  el.innerHTML = steps.map((s, i) => `
    <div class="bookmark-step">
      <span class="bookmark-step__num">${i + 1}</span>
      <p>${s.text}</p>
    </div>`).join('');
}

function initBookmarkGuide() {
  let os   = 'ios';
  let type = 'homescreen';

  renderBookmarkInstructions(os, type);

  const osToggle   = document.getElementById('bookmark-os-toggle');
  const typeToggle = document.getElementById('bookmark-type-toggle');

  osToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-os]');
    if (!btn) return;
    os = btn.dataset.os;
    osToggle.querySelectorAll('.pill-toggle__btn').forEach(b =>
      b.classList.toggle('pill-toggle__btn--active', b.dataset.os === os));
    renderBookmarkInstructions(os, type);
  });

  typeToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-btype]');
    if (!btn) return;
    type = btn.dataset.btype;
    typeToggle.querySelectorAll('.pill-toggle__btn').forEach(b =>
      b.classList.toggle('pill-toggle__btn--active', b.dataset.btype === type));
    renderBookmarkInstructions(os, type);
  });
}

function initCredits() {
  $('credit-date').value = today();

  creditList = createItemList({ listId: 'credit-items-list', countId: 'credit-items-count', buildHTML: createCreditItemHTML });
  const draft = loadDraft(CREDIT_DRAFT_KEY);
  if (draft) {
    $('credit-store-input').value = draft.store || '';
    $('credit-notes').value       = draft.notes || '';
    creditList.restore(draft.items || []);
  } else {
    creditList.add();
  }
  autosaveDraft(CREDIT_DRAFT_KEY, $('credit-form'), () => ({
    store: $('credit-store-input').value,
    notes: $('credit-notes').value,
    items: creditList.serialize(),
  }));

  $('add-credit-item-btn').addEventListener('click', creditList.add);
  $('credit-form').addEventListener('submit', handleCreditSubmit);
  $('credit-submit-another-btn').addEventListener('click', resetCreditForm);

  initStoreSearch();
}

/* ═══════════════════════════════════════════════════════════
   10. DONATIONS FEATURE
═══════════════════════════════════════════════════════════ */

const DONATION_LAST_TYPE_KEY   = 'rc_donation_last_type';
const DONATION_LAST_REASON_KEY = 'rc_donation_last_reason';


const DONATION_DRAFT_KEY = 'rc_draft_donation';
let donationList;

function createDonationItemHTML(id) {
  const defaultType   = localStorage.getItem(DONATION_LAST_TYPE_KEY)   || 'chub';
  const defaultReason = localStorage.getItem(DONATION_LAST_REASON_KEY) || 'Out of Date';
  const active = (t) => defaultType === t ? 'pill-toggle__btn--active' : '';
  const reasonOptions = ['Out of Date', 'Damaged Packaging', 'Bad Seal', 'Other'].map(r =>
    `<option value="${r}"${r === defaultReason ? ' selected' : ''}>${r}</option>`
  ).join('');
  return `
    <div class="donation-item" data-id="${id}">
      <div class="credit-item__header">
        <div class="pill-toggle">
          <button type="button" class="pill-toggle__btn ${active('chub')}" data-type-btn="chub">Chub</button>
          <button type="button" class="pill-toggle__btn ${active('retail')}" data-type-btn="retail">Retail</button>
        </div>${REMOVE_BTN_HTML}
      </div>
      <div class="store-search-wrap">
        <input type="text" class="form-input" placeholder="Search item or UPC…" autocomplete="off" autocorrect="off" spellcheck="false" inputmode="search" data-fname="name" />
        <div class="store-suggestions hidden" role="listbox" aria-label="Item suggestions"></div>
      </div>
      <div class="donation-item__row">
        <div class="donation-item__field">
          <span class="donation-item__label">Qty</span>
          <div class="qty-stepper">
            <button type="button" class="qty-stepper__btn" data-dir="-1">−</button>
            <input type="number" class="qty-stepper__input" value="1" min="1" inputmode="numeric" data-fname="qty" />
            <button type="button" class="qty-stepper__btn" data-dir="1">+</button>
          </div>
        </div>
        <div class="donation-item__field">
          <span class="donation-item__label">Sell-By Date</span>
          <input type="date" class="form-input" data-fname="sellby" />
        </div>
      </div>
      <select class="form-select" data-fname="reason">
        ${reasonOptions}
      </select>
    </div>`;
}

/* Returns the items, or null if any required field is empty (fields get highlighted). */
function collectDonationItems() {
  let valid = true;
  const items = [...donationList.el.children].map(itemEl => {
    const f      = (n) => itemEl.querySelector(`[data-fname="${n}"]`);
    const type   = itemEl.querySelector('.pill-toggle__btn--active')?.dataset.typeBtn || 'chub';
    const raw    = f('name').value.trim();
    const space  = raw.indexOf(' ');
    if (!raw) valid = markInvalid(f('name'), 'Search for an item');
    if (!f('sellby').value) valid = markInvalid(f('sellby'), 'Pick a sell-by date');
    return {
      type:   type === 'chub' ? 'Chub' : 'Retail',
      upc:    space > -1 ? raw.slice(0, space) : '',
      name:   space > -1 ? raw.slice(space + 1) : raw,
      qty:    parseInt(f('qty').value, 10) || 1,
      sellBy: f('sellby').value,
      reason: f('reason').value,
    };
  });
  return valid ? items : null;
}

function buildDonationSuccessSummary(items) {
  return items.map(item => `
    <div class="credit-success-item">
      <span class="credit-success-item__type">${item.type}</span>
      <span class="credit-success-item__product">${esc([item.upc, item.name || '—'].filter(Boolean).join(' — '))}</span>
      <span class="credit-success-item__qty">x${item.qty} &middot; ${fmtDate(item.sellBy)}</span>
      <span class="credit-success-item__reason">${esc(item.reason)}</span>
    </div>`).join('');
}

function handleDonationSubmit(e) {
  e.preventDefault();
  const items = collectDonationItems();
  if (!items) { focusFirstInvalid($('donation-form')); return; }

  const employee = getName();
  submitForm({
    draftKey:    DONATION_DRAFT_KEY,
    endpoint:    '/api/submit-donation',
    payload:     { employee, notes: $('donation-notes').value.trim(), items, timestamp: new Date().toISOString() },
    btn:         $('donation-submit-btn'),
    label:       'Submit Donation Log',
    type:        'Donation',
    histLabel:   `${employee} · ${plural(items.length, 'item')}`,
    formEl:      $('donation-form'),
    successEl:   $('donation-success-state'),
    summaryEl:   $('donation-success-summary'),
    summaryHTML: buildDonationSuccessSummary(items),
  });
}

function initDonations() {
  donationList = createItemList({
    listId: 'donation-items-list',
    countId: 'donation-items-count',
    buildHTML: createDonationItemHTML,
    onType: (type) => localStorage.setItem(DONATION_LAST_TYPE_KEY, type),
  });
  const draft = loadDraft(DONATION_DRAFT_KEY);
  if (draft) {
    $('donation-notes').value = draft.notes || '';
    donationList.restore(draft.items || []);
  } else {
    donationList.add();
  }
  autosaveDraft(DONATION_DRAFT_KEY, $('donation-form'), () => ({
    notes: $('donation-notes').value,
    items: donationList.serialize(),
  }));

  donationList.el.addEventListener('change', (e) => {
    if (e.target.matches('[data-fname="reason"]')) localStorage.setItem(DONATION_LAST_REASON_KEY, e.target.value);
  });

  /* A new item starts with the previous item's sell-by date: one pile usually shares it */
  $('add-donation-item-btn').addEventListener('click', () => {
    const prev = donationList.el.lastElementChild?.querySelector('[data-fname="sellby"]').value;
    donationList.add();
    if (prev) donationList.el.lastElementChild.querySelector('[data-fname="sellby"]').value = prev;
  });
  $('donation-form').addEventListener('submit', handleDonationSubmit);
  $('donation-submit-another-btn').addEventListener('click', () => {
    localStorage.removeItem(DONATION_DRAFT_KEY);
    $('donation-notes').value = '';
    donationList.reset();
    $('donation-success-state').classList.add('hidden');
    $('donation-form').classList.remove('hidden');
  });
}

/* ═══════════════════════════════════════════════════════════
   11. SUBMISSION HISTORY
═══════════════════════════════════════════════════════════ */
const loadHistory = () => JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
const openHistoryRows = new Set();   // rows the user expanded; survives re-renders

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* Storage full: keep the rows but drop the (large) retry payloads */
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.map(({ retry, ...h }) => h))); } catch { /* give up quietly */ }
  }
  renderHistory();
}

/* Returns the new entry's id so the caller can update its status later. */
function saveToHistory(entry) {
  const id = Date.now() + Math.random();
  /* A retry of a failed submission replaces the old failed row */
  const history = loadHistory().filter(h => !(h.status === 'failed' && h.type === entry.type && h.label === entry.label));
  history.unshift({ ...entry, id, timestamp: new Date().toISOString() });
  history.length = Math.min(history.length, 15);
  saveHistory(history);
  return id;
}

/* `retry` ({endpoint, payload}) is kept on failed rows so they can be sent again */
function setHistoryStatus(id, status, retry) {
  const history = loadHistory();
  const entry = history.find(h => h.id === id);
  if (entry) {
    entry.status = status;
    if (retry) entry.retry = retry; else delete entry.retry;
  }
  saveHistory(history);
}

/* Failed rows go back through the offline queue, so they also wait for a connection */
function retryHistoryRow(id) {
  const entry = loadHistory().find(h => h.id === id);
  if (!entry || !entry.retry || !enqueue({ ...entry.retry, historyId: id })) return;
  setHistoryStatus(id, 'queued');
  flushQueue();
  updateQueueBadge();
  updateOnlineState();
  initBookmarkGuide();
}

function dayLabel(iso) {
  const day = new Date(iso).toLocaleDateString('en-CA');
  if (day === today()) return 'Today';
  if (day === new Date(Date.now() - 864e5).toLocaleDateString('en-CA')) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function renderHistory() {
  if (!submissionHistoryEl) return;
  const history = loadHistory();
  $('clear-history-btn').classList.toggle('hidden', !history.length);
  if (!history.length) {
    submissionHistoryEl.innerHTML = '<p class="settings-hint">No submissions yet on this device.</p>';
    return;
  }
  let lastDay = '';
  submissionHistoryEl.innerHTML = history.map(entry => {
    const day    = dayLabel(entry.timestamp);
    const time   = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const status = entry.status || 'saved';   // rows from before statuses existed were all saved
    const heading = day !== lastDay ? `<h4 class="history-day">${esc(day)}</h4>` : '';
    lastDay = day;

    const head = `
        <span class="settings-card__label history-type history-type--${esc(entry.type.toLowerCase())}">${esc(entry.type)}
          <span class="history-status history-status--${status}">${status}</span></span>
        <span class="settings-card__value history-label">${esc(entry.label)}</span>
        <span class="settings-hint history-date">${time}</span>`;
    const retry = entry.retry ? `<button type="button" class="btn btn--outline history-retry" data-retry="${entry.id}">Retry</button>` : '';

    /* Rows saved before details were stored have nothing to expand */
    if (!entry.summary) return `${heading}<div class="settings-card history-card">${head}${retry}</div>`;
    const open = openHistoryRows.has(String(entry.id)) ? ' open' : '';
    return `${heading}<details class="settings-card history-card" data-id="${entry.id}"${open}>
        <summary>${head}</summary>
        <div class="history-body">${entry.summary}</div>${retry}
      </details>`;
  }).join('');
}

submissionHistoryEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-retry]');
  if (btn) retryHistoryRow(Number(btn.dataset.retry));
});
submissionHistoryEl.addEventListener('toggle', (e) => {
  const row = e.target.closest('details[data-id]');
  if (row) openHistoryRows[row.open ? 'add' : 'delete'](row.dataset.id);
}, true);
$('clear-history-btn').addEventListener('click', () => {
  if (confirm('Clear submission history on this device?')) saveHistory([]);
});

/* ═══════════════════════════════════════════════════════════
   12. BOOTSTRAP
═══════════════════════════════════════════════════════════ */
function onAppReady() {
  flushQueue();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().map(h => h.status === 'sending' ? { ...h, status: 'failed' } : h)));
  initIdentity();
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
