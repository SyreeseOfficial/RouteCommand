/**
 * Route Command — app.js
 * Vanilla ES6+ SPA logic for the Boar's Head internal operations dashboard.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const AUTH_KEY          = 'rc_auth';
const NAME_KEY          = 'rc_employee_name';
const LAST_SUB_KEY      = 'rc_last_submission';
const SUBMISSION_COUNT_KEY = 'rc_submission_count';
const DEFAULT_VEHICLE_KEY  = 'rc_default_vehicle';

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
const employeeSelect   = document.getElementById('employee-name');
const lastSubEl        = document.getElementById('last-submission');
const activeIdentityEl = document.getElementById('active-identity');
const uploadLabel      = document.getElementById('upload-label');
const uploadLabelText  = document.getElementById('upload-label-text');
const uploadConfirm    = document.getElementById('upload-confirm');
const receiptPhotoInput = document.getElementById('receipt-photo');
const resetBtn         = document.getElementById('reset-btn');
const darkModeToggle   = document.getElementById('dark-mode-toggle');
const submissionCountEl  = document.getElementById('submission-count');
const defaultVehicleEl   = document.getElementById('default-vehicle');
const installPwaBtn      = document.getElementById('install-pwa-btn');
const pwaModalOverlay    = document.getElementById('pwa-modal-overlay');
const pwaModal           = document.getElementById('pwa-modal');
const pwaModalClose      = document.getElementById('pwa-modal-close');

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
function navigateTo(viewId) {
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

  /* Scroll to top of new view */
  window.scrollTo(0, 0);

  /* Trigger scroll-based animations for the new view */
  observeAnimatables();
}

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
  /* Auto-fill employee name */
  const savedName = localStorage.getItem(NAME_KEY);
  if (savedName && employeeSelect) {
    employeeSelect.value = savedName;
  }

  /* Last submission time */
  const lastSub = localStorage.getItem(LAST_SUB_KEY);
  if (lastSubEl) {
    lastSubEl.textContent = lastSub ? lastSub : 'No submissions yet';
  }

  /* Active identity in settings */
  if (activeIdentityEl) {
    activeIdentityEl.textContent = savedName ? savedName : 'Not set';
  }

  /* Submission count */
  const count = parseInt(localStorage.getItem(SUBMISSION_COUNT_KEY) || '0', 10);
  if (submissionCountEl) {
    submissionCountEl.textContent = `${count} submission${count !== 1 ? 's' : ''}`;
  }

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
}

function saveEmployeeName() {
  if (employeeSelect && employeeSelect.value) {
    localStorage.setItem(NAME_KEY, employeeSelect.value);
  }
}

function updateLastSubmission() {
  const now = new Date();
  const formatted = now.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
  localStorage.setItem(LAST_SUB_KEY, formatted);
  if (lastSubEl) lastSubEl.textContent = formatted;
}

if (employeeSelect) {
  employeeSelect.addEventListener('change', () => {
    saveEmployeeName();
    if (activeIdentityEl) activeIdentityEl.textContent = employeeSelect.value;
  });
}

/* ═══════════════════════════════════════════════════════════
   5. IMAGE COMPRESSION (Canvas)
═══════════════════════════════════════════════════════════ */
function handleImageUpload(file) {
  if (!file) return;

  const MAX_WIDTH = 1024;
  const QUALITY   = 0.7;

  const reader = new FileReader();
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

      /* Visual confirmation */
      if (uploadLabelText)  uploadLabelText.textContent  = 'Receipt Attached ✓';
      if (uploadLabel)      uploadLabel.style.borderColor = 'var(--color-success)';
      if (uploadLabel)      uploadLabel.style.color       = 'var(--color-success)';
      if (uploadConfirm)    uploadConfirm.classList.remove('hidden');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

if (receiptPhotoInput) {
  receiptPhotoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file);
  });
}

/* ═══════════════════════════════════════════════════════════
   6. EXPENSE FORM SUBMISSION
═══════════════════════════════════════════════════════════ */
let isSubmitting = false;

if (expenseForm) {
  expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const name     = document.getElementById('employee-name').value;
    const date     = document.getElementById('receipt-date').value;
    const category = document.getElementById('expense-category').value;
    const amount   = document.getElementById('expense-amount').value;
    const vehicle  = document.getElementById('vehicle-tag').value;
    const notes    = document.getElementById('notes').value;

    if (!name || !date || !category || !amount) {
      /* Basic validation — highlight empty required fields */
      [
        { id: 'employee-name',    val: name     },
        { id: 'receipt-date',     val: date     },
        { id: 'expense-category', val: category },
        { id: 'expense-amount',   val: amount   },
      ].forEach(({ id, val }) => {
        const el = document.getElementById(id);
        if (el && !val) {
          el.style.borderColor = 'var(--color-error)';
          el.addEventListener('input', () => el.style.borderColor = '', { once: true });
          el.addEventListener('change', () => el.style.borderColor = '', { once: true });
        }
      });
      return;
    }

    /* Save name for future visits */
    saveEmployeeName();

    /* Lock UI */
    isSubmitting = true;
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Uploading…';

    /* Unload guard */
    window.addEventListener('beforeunload', beforeUnloadHandler);

    const payload = {
      employeeName: name,
      receiptDate:  date,
      category,
      amount,
      vehicleTag:   vehicle,
      notes,
      imageData:    compressedImageData || null,
      timestamp:    new Date().toISOString(),
    };

    try {
      const API_URL = '/api/submit-receipt';

      const res = await fetch(API_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.status === 'success') {
        handleSuccess();
      } else {
        throw new Error(data.message || 'Server error');
      }
    } catch (err) {
      handleError(err.message);
    } finally {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      isSubmitting = false;
    }
  });
}

function handleSuccess() {
  updateLastSubmission();

  /* Increment submission count */
  const newCount = parseInt(localStorage.getItem(SUBMISSION_COUNT_KEY) || '0', 10) + 1;
  localStorage.setItem(SUBMISSION_COUNT_KEY, newCount);
  if (submissionCountEl) {
    submissionCountEl.textContent = `${newCount} submission${newCount !== 1 ? 's' : ''}`;
  }

  expenseForm.classList.add('hidden');
  successState.classList.remove('hidden');

  submitBtn.disabled    = false;
  submitBtn.textContent = 'Submit Expense';
}

function handleError(msg) {
  submitBtn.disabled    = false;
  submitBtn.textContent = 'Submit Expense';

  /* Show error message below submit button */
  let errEl = document.getElementById('submit-error');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.id        = 'submit-error';
    errEl.style.cssText = 'color:var(--color-error);font-size:0.875rem;margin-top:0.5rem;text-align:center;';
    submitBtn.insertAdjacentElement('afterend', errEl);
  }
  errEl.textContent = msg || 'Network error. Please check your connection and try again.';
}

function beforeUnloadHandler(e) {
  e.preventDefault();
  e.returnValue = '';
}

/* Submit Another */
if (submitAnotherBtn) {
  submitAnotherBtn.addEventListener('click', () => {
    const savedName = employeeSelect ? employeeSelect.value : '';

    expenseForm.reset();
    compressedImageData = null;

    if (savedName && employeeSelect) employeeSelect.value = savedName;
    if (uploadLabelText)  uploadLabelText.textContent  = 'Attach Photo';
    if (uploadLabel) {
      uploadLabel.style.borderColor = '';
      uploadLabel.style.color       = '';
    }
    if (uploadConfirm) uploadConfirm.classList.add('hidden');

    successState.classList.add('hidden');
    expenseForm.classList.remove('hidden');

    /* Clear any error */
    const errEl = document.getElementById('submit-error');
    if (errEl) errEl.textContent = '';
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
  const savedTheme = localStorage.getItem('rc_theme');
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light');
    darkModeToggle.checked = false;
  }

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

const CREDIT_NAME_KEY     = 'rc_credit_name';
const CREDIT_REMEMBER_KEY = 'rc_credit_remember';

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

let fuseInstance = null;
let creditItemCounter = 0;

function searchStores(query) {
  if (typeof Fuse !== 'undefined') {
    if (!fuseInstance) fuseInstance = new Fuse(STORES, { threshold: 0.4, minMatchCharLength: 1 });
    return fuseInstance.search(query).map(r => r.item).slice(0, 8);
  }
  const q = query.toLowerCase();
  return STORES.filter(s => s.toLowerCase().includes(q)).slice(0, 8);
}

function initStoreSearch() {
  const input       = document.getElementById('credit-store-input');
  const suggestions = document.getElementById('store-suggestions');
  if (!input || !suggestions) return;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q) { suggestions.classList.add('hidden'); return; }

    const results = searchStores(q);
    if (!results.length) { suggestions.classList.add('hidden'); return; }

    suggestions.innerHTML = results
      .map(s => `<div class="store-suggestion" role="option" tabindex="-1">${s}</div>`)
      .join('');
    suggestions.classList.remove('hidden');
  });

  suggestions.addEventListener('click', (e) => {
    const hit = e.target.closest('.store-suggestion');
    if (!hit) return;
    input.value = hit.textContent;
    suggestions.classList.add('hidden');
    input.blur();
    input.style.borderColor = '';
  });

  /* Keyboard navigation inside suggestions */
  input.addEventListener('keydown', (e) => {
    if (suggestions.classList.contains('hidden')) return;
    const items = suggestions.querySelectorAll('.store-suggestion');
    const focused = suggestions.querySelector('.focused');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focused ? (focused.nextElementSibling || items[0]) : items[0];
      focused?.classList.remove('focused');
      next?.classList.add('focused');
      next?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = focused ? (focused.previousElementSibling || items[items.length - 1]) : items[items.length - 1];
      focused?.classList.remove('focused');
      prev?.classList.add('focused');
      prev?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && focused) {
      e.preventDefault();
      input.value = focused.textContent;
      suggestions.classList.add('hidden');
    } else if (e.key === 'Escape') {
      suggestions.classList.add('hidden');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.store-search-wrap')) suggestions.classList.add('hidden');
  });
}

function createCreditItemHTML(id, isFirst) {
  const removeClass = isFirst ? 'credit-item__remove credit-item__remove--hidden' : 'credit-item__remove';
  return `
    <div class="credit-item" data-id="${id}">
      <div class="credit-item__header">
        <div class="pill-toggle">
          <button type="button" class="pill-toggle__btn pill-toggle__btn--active" data-item="${id}" data-type-btn="retail">Retail</button>
          <button type="button" class="pill-toggle__btn" data-item="${id}" data-type-btn="chub">Chub / Deli</button>
        </div>
        <button type="button" class="${removeClass}" data-remove="${id}" aria-label="Remove item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div data-fields="${id}" data-fields-type="retail">
        <div class="credit-item__row">
          <input type="text" class="form-input" placeholder="UPC / Item #" inputmode="numeric" autocomplete="off" data-fid="${id}" data-fname="upc" />
          <input type="number" class="form-input" placeholder="Qty" inputmode="numeric" min="1" data-fid="${id}" data-fname="qty" />
        </div>
      </div>
      <div class="hidden" data-fields="${id}" data-fields-type="chub">
        <input type="text" class="form-input" placeholder="Product name (e.g. Ovengold Turkey)" autocomplete="off" data-fid="${id}" data-fname="name" style="margin-bottom:0.5rem;" />
        <input type="number" class="form-input" placeholder="Weight (lbs)" inputmode="decimal" step="0.01" min="0" data-fid="${id}" data-fname="weight" />
      </div>
      <select class="form-select" data-fid="${id}" data-fname="reason">
        <option value="10-Day" selected>10-Day</option>
        <option value="Expired">Expired</option>
        <option value="Damaged Packaging">Damaged Packaging</option>
        <option value="Poor Quality">Poor Quality</option>
        <option value="Bad Seal">Bad Seal</option>
        <option value="Other">Other</option>
      </select>
    </div>`;
}

function addCreditItem() {
  creditItemCounter++;
  const list    = document.getElementById('credit-items-list');
  const isFirst = list && list.children.length === 0;
  if (list) list.insertAdjacentHTML('beforeend', createCreditItemHTML(creditItemCounter, isFirst));
  updateCreditRemoveButtons();
  updateCreditItemsCount();
}

function removeCreditItem(id) {
  const el = document.querySelector(`.credit-item[data-id="${id}"]`);
  if (el) el.remove();
  updateCreditRemoveButtons();
  updateCreditItemsCount();
}

function switchCreditItemType(id, type) {
  const item = document.querySelector(`.credit-item[data-id="${id}"]`);
  if (!item) return;
  item.querySelectorAll('[data-type-btn]').forEach(btn => {
    btn.classList.toggle('pill-toggle__btn--active', btn.dataset.typeBtn === type);
  });
  item.querySelectorAll(`[data-fields="${id}"]`).forEach(el => {
    el.classList.toggle('hidden', el.dataset.fieldsType !== type);
  });
}

function updateCreditRemoveButtons() {
  const items   = document.querySelectorAll('.credit-item');
  const btns    = document.querySelectorAll('.credit-item__remove');
  const hide    = items.length <= 1;
  btns.forEach(btn => btn.classList.toggle('credit-item__remove--hidden', hide));
}

function updateCreditItemsCount() {
  const el    = document.getElementById('credit-items-count');
  const count = document.querySelectorAll('.credit-item').length;
  if (el) el.textContent = `${count} item${count !== 1 ? 's' : ''}`;
}

function collectCreditItems() {
  const items = [];
  document.querySelectorAll('.credit-item').forEach(itemEl => {
    const id          = itemEl.dataset.id;
    const activeBtn   = itemEl.querySelector('.pill-toggle__btn--active[data-type-btn]');
    const type        = activeBtn ? activeBtn.dataset.typeBtn : 'retail';
    let product = '', qty = '';

    if (type === 'retail') {
      const upc = itemEl.querySelector(`[data-fid="${id}"][data-fname="upc"]`);
      const q   = itemEl.querySelector(`[data-fid="${id}"][data-fname="qty"]`);
      product = upc ? upc.value.trim() : '';
      qty     = q && q.value.trim() ? `${q.value.trim()} units` : '';
    } else {
      const name   = itemEl.querySelector(`[data-fid="${id}"][data-fname="name"]`);
      const weight = itemEl.querySelector(`[data-fid="${id}"][data-fname="weight"]`);
      product = name   ? name.value.trim()   : '';
      qty     = weight && weight.value.trim() ? `${weight.value.trim()} lbs` : '';
    }

    const reason = itemEl.querySelector(`[data-fid="${id}"][data-fname="reason"]`);
    items.push({
      type:    type === 'retail' ? 'Retail' : 'Chub / Deli',
      product,
      qty,
      reason: reason ? reason.value : '10-Day',
    });
  });
  return items;
}

function buildCreditSuccessSummary(store, date, items) {
  const fmt = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const rows = items.map(item => `
    <div class="credit-success-item">
      <span class="credit-success-item__type">${item.type}</span>
      <span class="credit-success-item__product">${item.product || '—'}</span>
      ${item.qty ? `<span class="credit-success-item__qty">${item.qty}</span>` : ''}
      <span class="credit-success-item__reason">${item.reason}</span>
    </div>`).join('');
  return `<div class="credit-success-meta">${store} &middot; ${fmt}</div>${rows}`;
}

let isCreditSubmitting = false;

function handleCreditSubmit(e) {
  e.preventDefault();
  if (isCreditSubmitting) return;

  const salesperson = document.getElementById('credit-salesperson').value;
  const store       = document.getElementById('credit-store-input').value.trim();
  const date        = document.getElementById('credit-date').value;
  const notes       = document.getElementById('credit-notes').value.trim();
  const submitBtn   = document.getElementById('credit-submit-btn');

  /* Validate */
  let valid = true;
  [
    { id: 'credit-salesperson', val: salesperson },
    { id: 'credit-date',        val: date },
  ].forEach(({ id, val }) => {
    const el = document.getElementById(id);
    if (!val && el) {
      el.style.borderColor = 'var(--color-error)';
      el.addEventListener('change', () => { el.style.borderColor = ''; }, { once: true });
      el.addEventListener('input',  () => { el.style.borderColor = ''; }, { once: true });
      valid = false;
    }
  });

  const storeInput = document.getElementById('credit-store-input');
  if (!store && storeInput) {
    storeInput.style.borderColor = 'var(--color-error)';
    storeInput.addEventListener('input', () => { storeInput.style.borderColor = ''; }, { once: true });
    valid = false;
  }

  const items = collectCreditItems();
  let itemsValid = true;
  document.querySelectorAll('.credit-item').forEach(itemEl => {
    const id        = itemEl.dataset.id;
    const activeBtn = itemEl.querySelector('.pill-toggle__btn--active[data-type-btn]');
    const type      = activeBtn ? activeBtn.dataset.typeBtn : 'retail';
    const fieldName = type === 'retail' ? 'upc' : 'name';
    const prodInput = itemEl.querySelector(`[data-fid="${id}"][data-fname="${fieldName}"]`);
    if (prodInput && !prodInput.value.trim()) {
      prodInput.style.borderColor = 'var(--color-error)';
      prodInput.addEventListener('input', () => { prodInput.style.borderColor = ''; }, { once: true });
      itemsValid = false;
    }
  });
  if (!itemsValid) valid = false;

  if (!valid) return;

  /* Save name if remember me is on */
  const rememberMe = document.getElementById('credit-remember-me');
  if (rememberMe && rememberMe.checked) {
    localStorage.setItem(CREDIT_NAME_KEY, salesperson);
  }

  /* Lock UI */
  isCreditSubmitting  = true;
  submitBtn.disabled  = true;
  submitBtn.textContent = 'Submitting…';
  window.addEventListener('beforeunload', beforeUnloadHandler);

  const payload = { salesperson, store, date, notes, items, timestamp: new Date().toISOString() };

  fetch('/api/submit-credit', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        const summary = document.getElementById('credit-success-summary');
        if (summary) summary.innerHTML = buildCreditSuccessSummary(store, date, items);
        document.getElementById('credit-form').classList.add('hidden');
        document.getElementById('credit-success-state').classList.remove('hidden');
      } else {
        throw new Error(data.message || 'Server error');
      }
    })
    .catch(err => {
      let errEl = document.getElementById('credit-submit-error');
      if (!errEl) {
        errEl = document.createElement('p');
        errEl.id = 'credit-submit-error';
        errEl.style.cssText = 'color:var(--color-error);font-size:0.875rem;margin-top:0.5rem;text-align:center;';
        submitBtn.insertAdjacentElement('afterend', errEl);
      }
      errEl.textContent = err.message || 'Network error. Please check your connection and try again.';
    })
    .finally(() => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      isCreditSubmitting    = false;
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Submit Credits';
    });
}

function resetCreditForm() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('credit-date').value = today;
  document.getElementById('credit-store-input').value = '';
  document.getElementById('credit-notes').value = '';

  const savedName = localStorage.getItem(CREDIT_NAME_KEY);
  const sel = document.getElementById('credit-salesperson');
  if (sel) sel.value = savedName || '';

  /* Clear and re-seed items */
  const list = document.getElementById('credit-items-list');
  if (list) list.innerHTML = '';
  creditItemCounter = 0;
  addCreditItem();

  const errEl = document.getElementById('credit-submit-error');
  if (errEl) errEl.textContent = '';

  document.getElementById('credit-success-state').classList.add('hidden');
  document.getElementById('credit-form').classList.remove('hidden');
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
  /* Pre-fill date */
  const today   = new Date().toISOString().split('T')[0];
  const dateEl  = document.getElementById('credit-date');
  if (dateEl) dateEl.value = today;

  /* Load saved salesperson */
  const savedName  = localStorage.getItem(CREDIT_NAME_KEY);
  const nameSelect = document.getElementById('credit-salesperson');
  if (savedName && nameSelect) nameSelect.value = savedName;

  /* Remember me default (true unless explicitly set to false) */
  const rememberEl = document.getElementById('credit-remember-me');
  if (rememberEl) {
    rememberEl.checked = localStorage.getItem(CREDIT_REMEMBER_KEY) !== 'false';
    rememberEl.addEventListener('change', () => {
      localStorage.setItem(CREDIT_REMEMBER_KEY, rememberEl.checked ? 'true' : 'false');
      if (rememberEl.checked) {
        const n = document.getElementById('credit-salesperson')?.value;
        if (n) localStorage.setItem(CREDIT_NAME_KEY, n);
      }
    });
  }

  /* Save name on change */
  if (nameSelect) {
    nameSelect.addEventListener('change', () => {
      if (rememberEl && rememberEl.checked) {
        localStorage.setItem(CREDIT_NAME_KEY, nameSelect.value);
      }
    });
  }

  /* First credit item */
  addCreditItem();

  /* Item list event delegation */
  const itemsList = document.getElementById('credit-items-list');
  if (itemsList) {
    itemsList.addEventListener('click', (e) => {
      const typeBtn  = e.target.closest('[data-type-btn]');
      if (typeBtn) { switchCreditItemType(typeBtn.dataset.item, typeBtn.dataset.typeBtn); return; }
      const removeBtn = e.target.closest('[data-remove]');
      if (removeBtn) removeCreditItem(removeBtn.dataset.remove);
    });
  }

  /* Add item button */
  document.getElementById('add-credit-item-btn')?.addEventListener('click', addCreditItem);

  /* Form submit */
  document.getElementById('credit-form')?.addEventListener('submit', handleCreditSubmit);

  /* Submit another */
  document.getElementById('credit-submit-another-btn')?.addEventListener('click', resetCreditForm);

  /* Store search */
  initStoreSearch();

  /* Bookmark guide */
  initBookmarkGuide();
}

/* ═══════════════════════════════════════════════════════════
   10. BOOTSTRAP
═══════════════════════════════════════════════════════════ */
function onAppReady() {
  loadPersistedData();
  initCredits();
  navigateTo('receipts');
}

/* Kick off */
initAuth();
