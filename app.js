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
const NAMES = ['David Lindholm', 'Hannah', 'Ian Aps', 'Kaleb', 'Nick', 'Steve', 'Syreese Delos Santos', 'Tagen Garris', 'Teresa', 'Tyler Sharpe'];
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

function initIdentity() {
  const opts = NAMES.map(n => `<option value="${n}">${n}</option>`).join('');
  const gate = document.getElementById('name-gate');
  const gateSel = document.getElementById('name-gate-select');
  const settingsSel = document.getElementById('identity-select');
  gateSel.innerHTML = '<option value="" disabled selected>Select your name</option>' + opts;
  settingsSel.innerHTML = opts;
  document.querySelectorAll('[data-recipient]').forEach(el => { el.textContent = RECIPIENT; });

  const sync = () => { settingsSel.value = getName(); };
  if (NAMES.includes(getName())) sync(); else gate.classList.remove('hidden');

  document.getElementById('name-gate-submit').addEventListener('click', () => {
    if (!gateSel.value) return;
    localStorage.setItem(NAME_KEY, gateSel.value);
    sync();
    gate.classList.add('hidden');
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

/* Red border until the user edits the field. Returns false so callers can do `valid = markInvalid(el)`. */
function markInvalid(el) {
  el.classList.add('is-invalid');
  ['input', 'change'].forEach(ev => el.addEventListener(ev, () => el.classList.remove('is-invalid'), { once: true }));
  return false;
}

/* POST a form, drive the button spinner, error text, history status, and success screen. */
/* ── Offline queue: submissions that failed for lack of network wait here and retry ── */
const QUEUE_KEY = 'rc_queue';
const loadQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch { return []; } };

/* Returns false if the item couldn't be stored (e.g. storage full), so the caller can show the error instead */
function enqueue(item) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([...loadQueue(), item]));
    return true;
  } catch { return false; }
}

let flushing = false;
async function flushQueue() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  for (const item of loadQueue()) {
    try {
      const res  = await fetch(item.endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(item.payload),
      });
      const data = await res.json();
      /* Any server reply ends the item: retrying a rejected submission would just fail again */
      setHistoryStatus(item.historyId, data.status === 'success' ? 'saved' : 'failed');
      localStorage.setItem(QUEUE_KEY, JSON.stringify(loadQueue().filter(q => q.historyId !== item.historyId)));
    } catch { break; }   // still offline; try again on the next tick
  }
  flushing = false;
}
window.addEventListener('online', flushQueue);
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
  };

  const historyId = saveToHistory({ type, label: histLabel, status: 'sending' });
  try {
    const res  = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.status !== 'success') throw new Error(data.message || 'Server error');

    setHistoryStatus(historyId, 'saved');
    if (draftKey) localStorage.removeItem(draftKey);
    showSuccess(false);
  } catch (err) {
    /* fetch() rejects with a TypeError ("Failed to fetch") when the network is down */
    if ((err instanceof TypeError || !navigator.onLine) && enqueue({ endpoint, payload, historyId })) {
      setHistoryStatus(historyId, 'queued');
      if (draftKey) localStorage.removeItem(draftKey);
      showSuccess(true);
    } else {
      setHistoryStatus(historyId, 'failed');
      errEl.textContent = err instanceof TypeError || !navigator.onLine
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

  el.addEventListener('input', (e) => {
    const input = e.target.closest('[data-fname="name"]');
    if (!input) return;
    const box = input.closest('.store-search-wrap').querySelector('.store-suggestions');
    const q   = input.value.trim();
    showSuggestions(input, box, q ? searchDonationItems(q) : []);
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
    const rm = e.target.closest('[data-remove]');
    if (rm) { rm.closest('[data-id]').remove(); refresh(); }
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
    const vehicle  = document.getElementById('vehicle-tag').value;
    const notes    = document.getElementById('notes').value;

    if (!name || !date || !category || !(parseFloat(amount) > 0)) {
      /* Basic validation — highlight empty required fields */
      [
        { id: 'receipt-date',     val: date     },
        { id: 'expense-category', val: category },
        { id: 'expense-amount',   val: parseFloat(amount) > 0 },
      ].forEach(({ id, val }) => {
        const el = document.getElementById(id);
        if (el && !val) markInvalid(el);
      });
      return;
    }

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
if (pwaModalOverlay) pwaModalOverlay.addEventListener('click', closePwaModal);
if (pwaModalClose)   pwaModalClose.addEventListener('click', closePwaModal);

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset Route Command? This will clear all saved data and return to the login screen.')) return;
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


const STORES = [
  'Air Culinaire Worldwide','Aldarra Golf Club','Alki Bakery','Bangor',
  'Brownsville Deli','Cascade Valley Hospital','Chateau Bothell',
  'Chateau Lynnwood','Chateau Valley Center','FB Crashpad','FB Homestead',
  'FB-Like Place Market','Farmhouse Market','Fort Lewis','Fort Lewis North Express',
  'Fred Meyer 210 Monroe','Fred Meyer 459 Renton','Freemann Foods',
  'Graze Craze','Hansgrill','Highland Park Corner Store','Jake\'s Pickup',
  'Ken\'s Market','Liberty Express','Lombardi Specialty FD','Longhouse Market',
  'McChord','Meat the Live Butcher','Meta Grail Cafe','Mirabella Seattle',
  'North Creek Chevron','North Point Markets','NYC Deli','OC Whole Enchilada',
  'Overlake Country Club','Post Pike','Post Pike Georgetown',
  'QFC 101 Belfair','QFC 105 Parkland','QFC 106 Port Townsend',
  'QFC 126 Lacey','QFC 803 Kent','QFC 805 Manhattan','QFC 819 Bothell',
  'QFC 821 Issaquah','QFC 824 Pine Lake','QFC 829 North Bend',
  'QFC 831 Northshore','QFC 837 Maple Valley','QFC 839 Mercer Island',
  'QFC 840 Klahanie','QFC 841 Sequim','QFC 850 Canyon Park',
  'QFC 858 North Seattle','QFC 863 Enumclaw','QFC 869 Wallingford',
  'QFC 870 Port Hadlock','QFC 871 Renton','Ridge NE','Ridge Pizza',
  'Skagit Hospital','Skooders','Smoothie Shack','Spring Deli',
  'Sprouts 458','The Salmeri','Tower 12 Deli','Volunteer Park Cafe',
  'Walt\'s Market','Whidbey NAS Comm','Wing Point Golf Club','Yellow Deli',
];

const DONATION_ITEMS = [
  // Ham
  'Smokemaster Black Forest Ham Whole',
  '11069 Bourbonridge Smoked Ham',
  '102 Deluxe Ham Baby',
  '150 Maple Honey Ham Whole',
  '11018 Service Deli Sweet Slice',
  '11082 Tavern Ham',
  '159 Lower Sodium Ham Half',
  '11093 Brown Sugar & Spice Deluxe Ham',
  // Bologna
  '358 Beef Bologna',
  '354 Garlic Bologna',
  '781 Lebanon Bologna',
  // Beef
  '12011 London Broil Roast Beef',
  '197 Corned Beef Top Round',
  '205 Pastrami Top Round',
  '235 Deluxe Roast Beef Half',
  '915 Londonport Roast Beef',
  // Turkey
  '13018 No Salt Added Turkey',
  '13033 Blackened Turkey',
  '13063 Pitcraft Smoked Turkey',
  '270 Maple Honey Turkey',
  '275 Pastrami Turkey',
  '276 Cracked Peppermill Turkey',
  '278 Ovengold Turkey',
  '284 Salsalito Turkey',
  '294 Mesquite Turkey',
  '296 Cajun Turkey',
  '297 Black Forest Turkey',
  '326 Oven Roasted Turkey Breast',
  '421 Lower Sodium Turkey',
  // Chicken
  '13014 Everroast Chicken',
  '13034 Chipotle Chicken',
  '13044 Ichiban Teriyaki Chicken',
  '13086 Firesmith Grilled Chicken Breast',
  '13096 Sweet Bourbon Honey BBQ Chicken Breast',
  '437 Golden Classic Chicken',
  '439 Lemon Pepper Chicken',
  '440 Blazing Buffalo Chicken',
  // Bacon
  '480 Fully Cooked Bacon 2.29oz',
  '533 Fully Cooked Bacon (300 Slices)',
  '539 Domestic Layer Bacon 18/22',
  '542 Imported Bacon 1lb',
  '546 Imported Layer Bacon 12/14',
  '11078 Extra Thick Smoked Bacon 20oz',
  // Franks & Sausage
  '14003 Beef Frank Skinless 12.5oz',
  '14008 Beef Frank 8/1 14oz',
  '14013 Italian Chicken Sausage',
  '14014 Buffalo Chicken Sausage',
  '14017 Bratwurst Chicken Sausage',
  '14018 Apple Chicken Sausage',
  '14025 Chorizo Andouille Chicken Sausage',
  '14033 Andouille Chicken Sausage',
  '399 Bratwurst 1lb',
  '410 Beef Knockwurst 1lb',
  '415 Beef Frank Skinless 4/1 8"',
  // Italian / Specialty Meats (Bulk)
  '16137 Mortadella',
  '16146 Peppered Salame',
  '16147 Prosciutto Di Parma',
  '502 Capocollo Hot',
  '527 Pepperoni 3lb',
  '530 Prosciutto Piccolo Half',
  '531 Prosciutto Skinless/Shankless',
  '545 Pancetta',
  '547 Genoa Salami Half',
  '557 Hard Salami Half',
  '558 Pepperoni Sandwich Style',
  "568 Bianco D'Oro Salame",
  '872 Capocollo Hot Half',
  '873 Capocollo Sweet Half',
  // Italian / Specialty Meats (Packaged)
  '16307 Uncured Genoa & Mozzarella Cheese Tray',
  '16308 Uncured Pepperoni & Vermont Cheddar',
  "16030 Bianco D'Oro Salame 7oz",
  '16057 Genoa Salami 9oz',
  '16072 Rolled Mozzarella Prosciutto 8oz',
  '16073 All Natural Salame',
  '16078 Pepperoni Stick 6.5oz',
  '16088 Diced Pancetta 4oz',
  '16093 Peppered Salame 8oz',
  '16154 Turkey Pepperoni Pouch',
  '16188 Superiore Italian Dry Sausage Hot',
  '16189 Superiore Italian Dry Sausage Sweet',
  '16191 Superiore Sopressata Sweet',
  '16206 Sliced Sopressata 4oz',
  '16208 Genoa Salami Sliced 4oz',
  '16209 Superiore Chorizo',
  '16235 Hard Salami Pouch 5oz',
  '16253 Pouch Genoa',
  '595 Pouch Pepperoni 6oz',
  '16271 PS Trio Sopressata Copa Genoa',
  '16275 PS Duet Hard Salami Gouda',
  '16279 PS Trio Prosciutto Genoa Sopressata',
  '16321 Trio Milano Calabrese Fennel Tray',
  '16328 UC Napoli Salame Tray',
  '16329 UC Fennel Salame Tray',
  '16330 UC Calabrese Salame Tray',
  '16349 Speck Chiffonade Tray',
  '16350 Speck Trio with Napoli Milano',
  // Cheese (Bulk)
  '15010 Asiago Cheese',
  '15035 Smoked Gouda Cheese',
  '15060 Chipotle Gouda Cheese',
  '15061 3 Pepper Colby Jack',
  '15179 Smoked Wisconsin Cheddar',
  '15206 Cheddar Yellow Black Wax',
  '15207 Cheddar White Red Wax',
  '15217 Caramelized Onion Jack',
  '620 Mozzarella Cheese',
  '627 Horseradish Cheddar',
  '628 Vermont Cheddar White',
  '629 Vermont Cheddar Yellow',
  '648 Picante Provolone',
  '652 American Cheese Yellow',
  '653 American Cheese White',
  '654 Muenster Cheese',
  '663 Mild Swiss Cheese',
  '668 Low Sodium Provolone',
  '670 Lacey Swiss Cheese',
  '672 Baby Swiss Cheese',
  '682 Imported Swiss Cheese',
  '700 Colby Jack Cheese',
  '725 Havarti Cheese',
  '726 Havarti Dill Cheese',
  '727 Havarti Jalapeno Cheese',
  '751 Pepper Jack Cheese',
  // Cheese (Sliced / Packaged)
  '15118 Colby Jack Shreds',
  '15121 Mozzarella & Provolone Shreds',
  '15189 Provolone Sliced',
  '15191 Pepper Jack Sliced',
  '15192 Vermont Cheddar Sliced Yellow',
  '15194 Mild Swiss Sliced',
  '644 American Cheese Yellow 160 Slice',
  '645 American Cheese Yellow 120 Slice',
  '647 American Cheese White 160 Slice',
  '671 Cream Cheese Tub 5lb',
  // Cheese (Portion Cut)
  '15011 PC Vermont Cheddar Yellow',
  '15012 PC Vermont Cheddar White',
  '15022 PC Asiago',
  '15038 PC French Brie',
  '15041 PC Chevre',
  '15062 PC Smoked Gouda',
  '15070 PC Chipotle Gouda',
  '15071 PC 3 Pepper Colby Jack',
  '15161 PC Parmesan Reggiano',
  '15164 PC Manchego',
  '15167 PC Aged Gouda',
  '15181 PC Caramella',
  '15212 Irish Cheddar 7oz',
  '15213 French Brie Round 250g',
  '15216 PC Sriracha Gouda',
  '859 Grated Parmesan',
  '930 Blue Cheese Crumbles 6oz',
  '931 Gorgonzola Crumbles 6oz',
  '932 Feta Cheese Crumbles 6oz',
  '961 PC Butterkase',
  '966 PC Horseradish Cheddar',
  '971 PC Feta',
  '972 PC Fontina',
  '973 PC Gouda',
  '974 PC Gruyere',
  '975 PC Hickory Smoked Gruyere',
  '976 PC Cream Havarti',
  '977 PC Cream Havarti Dill',
  '978 PC Havarti Jalapeno',
  '980 PC Pepper Jack',
  '985 PC Imported Swiss',
  // Pre-Sliced
  '50001 Pre-Sliced American Yellow',
  '50002 Pre-Sliced Hard Salami',
  '50003 Pre-Sliced Imported Swiss',
  '50007 Pre-Sliced LS Provolone',
  '50009 Pre-Sliced Vermont Cheddar White',
  '50010 Pre-Sliced Muenster',
  '50011 Pre-Sliced Pepper Jack',
  '50012 Pre-Sliced American White',
  '50013 Pre-Sliced Colby Jack',
  '50015 Pre-Sliced Genoa Salami',
  '50016 Pre-Sliced Sopressata',
  '50017 Pre-Sliced Pepperoni',
  '50019 Pre-Sliced Prosciutto',
  '50021 Pre-Sliced Capocollo Hot',
  '50024 Pre-Sliced Honey Smoked Turkey',
  '50026 Pre-Sliced Smoked Ham',
  '50087 Pre-Sliced Canadian Style Bacon',
  '50037 Pre-Sliced Prosciutto Di Parma',
  '50039 Pre-Sliced Smoked Gouda',
  '50063 Ham Steak',
  '50071 Pre-Sliced 3 Pepper Colby Jack',
  '50073 Pre-Sliced Applewood Turkey',
  '50074 Pre-Sliced Roasted Turkey',
  '50076 Pre-Sliced Organic Cheddar',
  '50083 Pre-Sliced Organic Roasted Turkey',
  '50084 Pre-Sliced Rotisserie Chicken',
  // Pork / Other
  '11034 Refrigerated Sausage Patties',
  '569 Trenton Pork Roll',
  '572 Taylor Pork Roll 1lb',
  // Hummus
  '16159 Traditional Hummus 10oz',
  '16160 Pine Nut Hummus 10oz',
  '16161 Garlic Hummus 10oz',
  '16162 Red Pepper Hummus 10oz',
  '16196 Kalamata Olive Hummus 10oz',
  '16237 Everything Bagel Hummus 10oz',
  '16246 Sweet Chili Garlic Hummus 10oz',
  '16288 Pepperhouse Hummus',
  '16299 Meyer Lemon Hummus 10oz',
  '16301 Dark Chocolate Dessert Hummus 10oz',
  '16312 Dill Pickle Hummus 10oz',
  '16313 Mango Jalapeno Hummus',
  '16158 Traditional Hummus & Pretzels',
  '16167 Red Pepper Hummus & Pretzels',
  // Dips
  '16260 Tzatziki 12oz',
  '16276 French Onion Dip 12oz',
  '16282 Spinach Dip 12oz',
  '16294 Garden Ranch Greek Yogurt Dip',
  '16298 Key Lime Pie Greek Yogurt Dip',
  '16311 Espresso Chocolate Greek Yogurt Dip',
  '16354 Churro Greek Yogurt Dip',
  // Pickles & Olives
  '16031 Sauerkraut 5 Gallon',
  '16224 Bread & Butter Pickles 26oz',
  '16261 Dill Pickle Chips 26oz',
  '485 Horseradish Pickle Chips 15.5oz',
  '486 Dill Pickle Spears 26oz',
  '487 Dill Pickle Whole 26oz',
  '488 Dill Pickle 1/2 Cut 26oz',
  '791 HJ Pickles Whole 5 Gallon',
  '796 HJ Pickles Spears 5 Gallon',
  '813 HJ Pickle Sandwich Chips',
  '16333 Jubilee Olives',
  '16335 Kalamata Olives',
  '16342 Mediterranean Feta Salad',
  // Condiments (Squeeze)
  '16001 Deli Mustard 9.5oz',
  '16002 Honey Mustard 10.5oz',
  '16003 Horseradish Sauce 9.5oz',
  '788 Deli Dressing 8.5oz',
  '16087 Mayonnaise 9oz',
  '16132 Chipotle Gourmaise 8.5oz',
  '16135 Pepperhouse Gourmaise 8.5oz',
  '16202 Low Sodium Yellow Mustard 9oz',
  '16203 Low Sodium Yellow Mustard PC',
  '731 Sauerkraut 1lb',
  '896 Jalapeno Pepper Sauce',
  '16296 Garlic Aioli Gourmaise',
  // Condiments (Bulk)
  '16058 Mayonnaise 1 Gallon',
  '16204 Low Sodium Yellow Mustard 1 Gallon',
  '16257 Chipotle Gourmaise 16oz',
  '16264 Honey Mustard (Bulk)',
  '16249 Deli Dressing 16oz',
  '740 Deli Mustard 1 Gallon',
  '16267 PC Real Mayonnaise',
  '737 Honey Mustard PC',
  '743 Deli Mustard PC',
  '785 Horseradish Sauce PC',
  '16268 PC Chipotle Gourmaise',
  '8779 Horseradish Sauce 1/2 Gallon',
  '16252 Pepperhouse Gourmaise 16oz',
];

let fuseInstance = null;
let donationFuse = null;
let creditItemCounter = 0;

function searchStores(query) {
  if (typeof Fuse !== 'undefined') {
    if (!fuseInstance) fuseInstance = new Fuse(STORES, { threshold: 0.4, minMatchCharLength: 1 });
    return fuseInstance.search(query).map(r => r.item).slice(0, 8);
  }
  const q = query.toLowerCase();
  return STORES.filter(s => s.toLowerCase().includes(q)).slice(0, 8);
}

function searchDonationItems(query) {
  if (typeof Fuse !== 'undefined') {
    if (!donationFuse) donationFuse = new Fuse(DONATION_ITEMS, { threshold: 0.4, minMatchCharLength: 2 });
    return donationFuse.search(query).map(r => r.item).slice(0, 8);
  }
  const q = query.toLowerCase();
  return DONATION_ITEMS.filter(s => s.toLowerCase().includes(q)).slice(0, 8);
}

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
  input.classList.remove('is-invalid');
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

  input.addEventListener('input', () => {
    const q = input.value.trim();
    showSuggestions(input, box, q ? searchStores(q) : []);
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
          <input type="number" class="form-input" placeholder="Qty" inputmode="numeric" min="1" data-fname="qty" />
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
    if (!prod.value.trim()) valid = markInvalid(prod);
    if (!(parseFloat(qty.value) > 0)) valid = markInvalid(qty);
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
  if (!dateEl.value) valid = markInvalid(dateEl);
  if (!storeInput.value.trim()) valid = markInvalid(storeInput);
  const items = collectCreditItems();
  if (!valid || !items) return;

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
  initBookmarkGuide();
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
    if (!raw) valid = markInvalid(f('name'));
    if (!f('sellby').value) valid = markInvalid(f('sellby'));
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
  if (!items) return;

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

  donationList.el.addEventListener('click', (e) => {
    const btn = e.target.closest('.qty-stepper__btn');
    if (!btn) return;
    const qty = btn.closest('.qty-stepper').querySelector('[data-fname="qty"]');
    qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) + parseInt(btn.dataset.dir, 10));
  });

  donationList.el.addEventListener('change', (e) => {
    if (e.target.matches('[data-fname="reason"]')) {
      localStorage.setItem(DONATION_LAST_REASON_KEY, e.target.value);
    } else if (e.target.matches('[data-fname="qty"]') && !(parseInt(e.target.value, 10) >= 1)) {
      e.target.value = 1;
    }
  });

  $('add-donation-item-btn').addEventListener('click', donationList.add);
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

/* Returns the new entry's id so the caller can update its status later. */
function saveToHistory(entry) {
  const id = Date.now() + Math.random();
  /* A retry of a failed submission replaces the old failed row */
  const history = loadHistory().filter(h => !(h.status === 'failed' && h.type === entry.type && h.label === entry.label));
  history.unshift({ ...entry, id, timestamp: new Date().toISOString() });
  history.length = Math.min(history.length, 15);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
  return id;
}

function setHistoryStatus(id, status) {
  const history = loadHistory();
  const entry = history.find(h => h.id === id);
  if (entry) entry.status = status;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  if (!submissionHistoryEl) return;
  const history = loadHistory();
  if (!history.length) {
    submissionHistoryEl.innerHTML = '<p class="settings-hint">No submissions yet on this device.</p>';
    return;
  }
  submissionHistoryEl.innerHTML = history.map(entry => {
    const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    const status = entry.status || 'saved';   // rows from before statuses existed were all saved
    return `
      <div class="settings-card history-card">
        <span class="settings-card__label history-type history-type--${esc(entry.type.toLowerCase())}">${esc(entry.type)}
          <span class="history-status history-status--${status}">${status}</span></span>
        <span class="settings-card__value history-label">${esc(entry.label)}</span>
        <span class="settings-hint history-date">${date}</span>
      </div>`;
  }).join('');
}

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
