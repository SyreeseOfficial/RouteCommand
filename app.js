/**
 * Route Command — app.js
 * Vanilla ES6+ SPA logic for the Boar's Head internal operations dashboard.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const AUTH_KEY     = 'rc_auth';
const NAME_KEY     = 'rc_employee_name';
const LAST_SUB_KEY = 'rc_last_submission';

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

const moreBtn          = document.getElementById('more-btn');
const drawerOverlay    = document.getElementById('drawer-overlay');
const moreDrawer       = document.getElementById('more-drawer');
const drawerItems      = document.querySelectorAll('.drawer__item[data-view]');

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
   3. MORE DRAWER
═══════════════════════════════════════════════════════════ */
function openDrawer() {
  drawerOverlay.classList.remove('hidden');
  moreDrawer.classList.remove('hidden');
  moreDrawer.classList.remove('slide-down');
  moreBtn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  moreDrawer.classList.add('slide-down');
  moreBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  setTimeout(() => {
    drawerOverlay.classList.add('hidden');
    moreDrawer.classList.add('hidden');
    moreDrawer.classList.remove('slide-down');
  }, 300);
}

moreBtn.addEventListener('click', openDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

drawerItems.forEach(item => {
  item.addEventListener('click', () => {
    closeDrawer();
    setTimeout(() => navigateTo(item.dataset.view), 60);
  });
});

/* ═══════════════════════════════════════════════════════════
   4. LOCALSTORAGE PERSISTENCE
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
      const GAS_URL = ''; /* TODO: Insert Google Apps Script web app URL after deployment */

      if (!GAS_URL) {
        /* Dev/staging mode: simulate success */
        await new Promise(r => setTimeout(r, 1200));
        handleSuccess();
        return;
      }

      const res = await fetch(GAS_URL, {
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
    '.stat-card:not(.visible), .form-card:not(.visible), .placeholder-card:not(.visible), .roadmap-item:not(.visible)'
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
   9. BOOTSTRAP
═══════════════════════════════════════════════════════════ */
function onAppReady() {
  loadPersistedData();
  navigateTo('receipts');
}

/* Kick off */
initAuth();
