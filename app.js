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
const employeeSelect   = document.getElementById('employee-name');
const activeIdentityEl = document.getElementById('active-identity');
const uploadLabel      = document.getElementById('upload-label');
const uploadLabelText  = document.getElementById('upload-label-text');
const uploadConfirm    = document.getElementById('upload-confirm');
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
const VALID_VIEWS = new Set(['receipts', 'credits', 'donations', 'settings']);

function navigateTo(viewId, updateHistory = true) {
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

  /* Update browser URL */
  if (updateHistory) history.pushState(null, '', '/' + viewId);
}

/* Handle browser back / forward */
window.addEventListener('popstate', () => {
  const seg = window.location.pathname.slice(1);
  navigateTo(VALID_VIEWS.has(seg) ? seg : 'receipts', false);
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
  /* Auto-fill employee name */
  const savedName = localStorage.getItem(NAME_KEY);
  if (savedName && employeeSelect) {
    employeeSelect.value = savedName;
  }

  /* Active identity in settings */
  if (activeIdentityEl) {
    activeIdentityEl.textContent = savedName ? savedName : 'Not set';
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

  /* Auto-fill today's date on receipt form */
  const receiptDateEl = document.getElementById('receipt-date');
  if (receiptDateEl && !receiptDateEl.value) {
    receiptDateEl.value = new Date().toISOString().split('T')[0];
  }

  /* Render submission history */
  renderHistory();
}

function saveEmployeeName() {
  if (employeeSelect && employeeSelect.value) {
    localStorage.setItem(NAME_KEY, employeeSelect.value);
  }
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
  const category = document.getElementById('expense-category')?.value || '';
  const amount   = document.getElementById('expense-amount')?.value   || '0';
  saveToHistory({ type: 'Receipt', label: `$${parseFloat(amount).toFixed(2)} · ${category}` });

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
        <div class="store-search-wrap" style="margin-bottom:0.5rem;">
          <input type="text" class="form-input" placeholder="Search item or UPC…" autocomplete="off" autocorrect="off" spellcheck="false" inputmode="search" data-fid="${id}" data-fname="name" />
          <div class="store-suggestions hidden" data-csuggestions="${id}" role="listbox" aria-label="Item suggestions"></div>
        </div>
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
        saveToHistory({ type: 'Credit', label: `${store} · ${items.length} item${items.length !== 1 ? 's' : ''}` });
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
    itemsList.addEventListener('input', (e) => {
      const nameInput = e.target.closest('[data-fname="name"]');
      if (!nameInput) return;
      const id     = nameInput.dataset.fid;
      const q      = nameInput.value.trim();
      const suggEl = itemsList.querySelector(`[data-csuggestions="${id}"]`);
      if (!suggEl) return;
      if (!q) { suggEl.classList.add('hidden'); return; }
      const results = searchDonationItems(q);
      if (!results.length) { suggEl.classList.add('hidden'); return; }
      suggEl.innerHTML = results.map(s => `<div class="store-suggestion" role="option" tabindex="-1">${s}</div>`).join('');
      suggEl.classList.remove('hidden');
    });

    itemsList.addEventListener('click', (e) => {
      const suggHit = e.target.closest('.store-suggestion');
      if (suggHit) {
        const suggEl    = suggHit.closest('[data-csuggestions]');
        const id        = suggEl?.dataset.csuggestions;
        const nameInput = id ? itemsList.querySelector(`[data-fid="${id}"][data-fname="name"]`) : null;
        if (nameInput) { nameInput.value = suggHit.textContent; nameInput.style.borderColor = ''; }
        suggEl?.classList.add('hidden');
        return;
      }
      const typeBtn  = e.target.closest('[data-type-btn]');
      if (typeBtn) { switchCreditItemType(typeBtn.dataset.item, typeBtn.dataset.typeBtn); return; }
      const removeBtn = e.target.closest('[data-remove]');
      if (removeBtn) removeCreditItem(removeBtn.dataset.remove);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.store-search-wrap')) {
        itemsList.querySelectorAll('[data-csuggestions]').forEach(el => el.classList.add('hidden'));
      }
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
   10. DONATIONS FEATURE
═══════════════════════════════════════════════════════════ */

const DONATION_NAME_KEY        = 'rc_donation_name';
const DONATION_REMEMBER_KEY    = 'rc_donation_remember';
const DONATION_LAST_TYPE_KEY   = 'rc_donation_last_type';
const DONATION_LAST_REASON_KEY = 'rc_donation_last_reason';

const DONATION_KNOWN_NAMES = ['Nick', 'Steve', 'Ian', 'David', 'Syreese', 'Kaleb', 'Tyler', 'Tagen'];

let donationItemCounter  = 0;
let isDonationSubmitting = false;

function createDonationItemHTML(id, isFirst, defaultType, defaultReason) {
  const removeClass = isFirst ? 'credit-item__remove credit-item__remove--hidden' : 'credit-item__remove';
  const chubClass   = defaultType !== 'retail' ? 'pill-toggle__btn--active' : '';
  const retailClass = defaultType === 'retail'  ? 'pill-toggle__btn--active' : '';
  const reasons     = ['Out of Date', 'Damaged Packaging', 'Bad Seal', 'Other'];
  const reasonOptions = reasons.map(r =>
    `<option value="${r}"${r === defaultReason ? ' selected' : ''}>${r}</option>`
  ).join('');
  return `
    <div class="donation-item" data-id="${id}">
      <div class="credit-item__header">
        <div class="pill-toggle">
          <button type="button" class="pill-toggle__btn ${chubClass}" data-ditem="${id}" data-dtype-btn="chub">Chub</button>
          <button type="button" class="pill-toggle__btn ${retailClass}" data-ditem="${id}" data-dtype-btn="retail">Retail</button>
        </div>
        <button type="button" class="${removeClass}" data-dremove="${id}" aria-label="Remove item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="store-search-wrap">
        <input type="text" class="form-input" placeholder="Search item or UPC…" autocomplete="off" autocorrect="off" spellcheck="false" inputmode="search" data-dfid="${id}" data-dfname="name" />
        <div class="store-suggestions hidden" data-dsuggestions="${id}" role="listbox" aria-label="Item suggestions"></div>
      </div>
      <div class="donation-item__row">
        <div class="donation-item__field">
          <span class="donation-item__label">Qty</span>
          <div class="qty-stepper">
            <button type="button" class="qty-stepper__btn" data-dfid="${id}" data-dir="-1">−</button>
            <input type="number" class="qty-stepper__input" value="1" min="1" inputmode="numeric" data-dfid="${id}" data-dfname="qty" />
            <button type="button" class="qty-stepper__btn" data-dfid="${id}" data-dir="1">+</button>
          </div>
        </div>
        <div class="donation-item__field">
          <span class="donation-item__label">Sell-By Date</span>
          <input type="date" class="form-input" data-dfid="${id}" data-dfname="sellby" />
        </div>
      </div>
      <select class="form-select" data-dfid="${id}" data-dfname="reason">
        ${reasonOptions}
      </select>
    </div>`;
}

function addDonationItem() {
  donationItemCounter++;
  const list      = document.getElementById('donation-items-list');
  const isFirst   = list && list.children.length === 0;
  const lastType  = localStorage.getItem(DONATION_LAST_TYPE_KEY)   || 'chub';
  const lastReason = localStorage.getItem(DONATION_LAST_REASON_KEY) || 'Out of Date';
  if (list) list.insertAdjacentHTML('beforeend', createDonationItemHTML(donationItemCounter, isFirst, lastType, lastReason));
  updateDonationRemoveButtons();
  updateDonationItemsCount();
}

function removeDonationItem(id) {
  const el = document.querySelector(`.donation-item[data-id="${id}"]`);
  if (el) el.remove();
  updateDonationRemoveButtons();
  updateDonationItemsCount();
}

function switchDonationItemType(id, type) {
  const item = document.querySelector(`.donation-item[data-id="${id}"]`);
  if (!item) return;
  item.querySelectorAll('[data-dtype-btn]').forEach(btn => {
    btn.classList.toggle('pill-toggle__btn--active', btn.dataset.dtypeBtn === type);
  });
  localStorage.setItem(DONATION_LAST_TYPE_KEY, type);
}

function updateDonationRemoveButtons() {
  const items = document.querySelectorAll('.donation-item');
  const hide  = items.length <= 1;
  document.querySelectorAll('.donation-item .credit-item__remove').forEach(btn => {
    btn.classList.toggle('credit-item__remove--hidden', hide);
  });
}

function updateDonationItemsCount() {
  const el    = document.getElementById('donation-items-count');
  const count = document.querySelectorAll('.donation-item').length;
  if (el) el.textContent = `${count} item${count !== 1 ? 's' : ''}`;
}

function collectDonationItems() {
  const items = [];
  document.querySelectorAll('.donation-item').forEach(itemEl => {
    const id        = itemEl.dataset.id;
    const activeBtn = itemEl.querySelector('.pill-toggle__btn--active[data-dtype-btn]');
    const type      = activeBtn ? activeBtn.dataset.dtypeBtn : 'chub';
    const nameEl    = itemEl.querySelector(`[data-dfid="${id}"][data-dfname="name"]`);
    const qtyEl     = itemEl.querySelector(`[data-dfid="${id}"][data-dfname="qty"]`);
    const sellbyEl  = itemEl.querySelector(`[data-dfid="${id}"][data-dfname="sellby"]`);
    const reasonEl  = itemEl.querySelector(`[data-dfid="${id}"][data-dfname="reason"]`);
    const raw       = nameEl ? nameEl.value.trim() : '';
    const spaceIdx  = raw.indexOf(' ');
    const upc       = spaceIdx > -1 ? raw.slice(0, spaceIdx) : '';
    const itemName  = spaceIdx > -1 ? raw.slice(spaceIdx + 1) : raw;
    items.push({
      type:   type === 'chub' ? 'Chub' : 'Retail',
      upc:    upc,
      name:   itemName,
      qty:    qtyEl    ? (parseInt(qtyEl.value, 10) || 1) : 1,
      sellBy: sellbyEl ? sellbyEl.value                    : '',
      reason: reasonEl ? reasonEl.value                    : 'Out of Date',
    });
  });
  return items;
}

function buildDonationSuccessSummary(items) {
  return items.map(item => {
    const fmt = item.sellBy
      ? new Date(item.sellBy + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';
    const productLine = [item.upc, item.name || '—'].filter(Boolean).join(' — ');
    return `
      <div class="credit-success-item">
        <span class="credit-success-item__type">${item.type}</span>
        <span class="credit-success-item__product">${productLine}</span>
        <span class="credit-success-item__qty">x${item.qty} &middot; ${fmt}</span>
        <span class="credit-success-item__reason">${item.reason}</span>
      </div>`;
  }).join('');
}

function handleDonationSubmit(e) {
  e.preventDefault();
  if (isDonationSubmitting) return;

  const nameSelect = document.getElementById('donation-employee');
  const otherInput = document.getElementById('donation-employee-other');
  const submitBtn  = document.getElementById('donation-submit-btn');
  const notes      = document.getElementById('donation-notes').value.trim();

  let employee = nameSelect.value;
  let valid    = true;

  if (!employee) {
    nameSelect.style.borderColor = 'var(--color-error)';
    nameSelect.addEventListener('change', () => { nameSelect.style.borderColor = ''; }, { once: true });
    valid = false;
  } else if (employee === 'Other') {
    const otherVal = otherInput.value.trim();
    if (!otherVal) {
      otherInput.style.borderColor = 'var(--color-error)';
      otherInput.addEventListener('input', () => { otherInput.style.borderColor = ''; }, { once: true });
      valid = false;
    } else {
      employee = otherVal;
    }
  }

  document.querySelectorAll('.donation-item').forEach(itemEl => {
    const id       = itemEl.dataset.id;
    const nameInput  = itemEl.querySelector(`[data-dfid="${id}"][data-dfname="name"]`);
    const sellbyInput = itemEl.querySelector(`[data-dfid="${id}"][data-dfname="sellby"]`);
    if (nameInput && !nameInput.value.trim()) {
      nameInput.style.borderColor = 'var(--color-error)';
      nameInput.addEventListener('input', () => { nameInput.style.borderColor = ''; }, { once: true });
      valid = false;
    }
    if (sellbyInput && !sellbyInput.value) {
      sellbyInput.style.borderColor = 'var(--color-error)';
      sellbyInput.addEventListener('change', () => { sellbyInput.style.borderColor = ''; }, { once: true });
      valid = false;
    }
  });

  if (!valid) return;

  const rememberEl = document.getElementById('donation-remember-me');
  if (rememberEl && rememberEl.checked) {
    localStorage.setItem(DONATION_NAME_KEY, employee);
  }

  isDonationSubmitting    = true;
  submitBtn.disabled      = true;
  submitBtn.textContent   = 'Submitting…';
  window.addEventListener('beforeunload', beforeUnloadHandler);

  const items   = collectDonationItems();
  const payload = { employee, notes, items, timestamp: new Date().toISOString() };

  fetch('/api/submit-donation', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'success') {
        const summary = document.getElementById('donation-success-summary');
        if (summary) summary.innerHTML = buildDonationSuccessSummary(items);
        saveToHistory({ type: 'Donation', label: `${employee} · ${items.length} item${items.length !== 1 ? 's' : ''}` });
        document.getElementById('donation-form').classList.add('hidden');
        document.getElementById('donation-success-state').classList.remove('hidden');
      } else {
        throw new Error(data.message || 'Server error');
      }
    })
    .catch(err => {
      let errEl = document.getElementById('donation-submit-error');
      if (!errEl) {
        errEl = document.createElement('p');
        errEl.id = 'donation-submit-error';
        errEl.style.cssText = 'color:var(--color-error);font-size:0.875rem;margin-top:0.5rem;text-align:center;';
        submitBtn.insertAdjacentElement('afterend', errEl);
      }
      errEl.textContent = err.message || 'Network error. Please check your connection and try again.';
    })
    .finally(() => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      isDonationSubmitting  = false;
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Submit Donation Log';
    });
}

function resetDonationForm() {
  const nameSelect = document.getElementById('donation-employee');
  const otherInput = document.getElementById('donation-employee-other');
  const savedName  = localStorage.getItem(DONATION_NAME_KEY);

  if (savedName) {
    if (DONATION_KNOWN_NAMES.includes(savedName)) {
      nameSelect.value = savedName;
      otherInput.classList.add('hidden');
      otherInput.value = '';
    } else {
      nameSelect.value = 'Other';
      otherInput.value = savedName;
      otherInput.classList.remove('hidden');
    }
  } else {
    nameSelect.value = '';
    otherInput.classList.add('hidden');
    otherInput.value = '';
  }

  document.getElementById('donation-notes').value = '';

  const list = document.getElementById('donation-items-list');
  if (list) list.innerHTML = '';
  donationItemCounter = 0;
  addDonationItem();

  const errEl = document.getElementById('donation-submit-error');
  if (errEl) errEl.textContent = '';

  document.getElementById('donation-success-state').classList.add('hidden');
  document.getElementById('donation-form').classList.remove('hidden');
}

function initDonations() {
  const nameSelect = document.getElementById('donation-employee');
  const otherInput = document.getElementById('donation-employee-other');
  const rememberEl = document.getElementById('donation-remember-me');

  /* Restore saved name */
  const savedName = localStorage.getItem(DONATION_NAME_KEY);
  if (savedName) {
    if (DONATION_KNOWN_NAMES.includes(savedName)) {
      nameSelect.value = savedName;
    } else {
      nameSelect.value = 'Other';
      otherInput.value = savedName;
      otherInput.classList.remove('hidden');
    }
  }

  /* Remember me */
  if (rememberEl) {
    rememberEl.checked = localStorage.getItem(DONATION_REMEMBER_KEY) !== 'false';
    rememberEl.addEventListener('change', () => {
      localStorage.setItem(DONATION_REMEMBER_KEY, rememberEl.checked ? 'true' : 'false');
    });
  }

  /* Name select: show/hide Other input */
  if (nameSelect) {
    nameSelect.addEventListener('change', () => {
      if (nameSelect.value === 'Other') {
        otherInput.classList.remove('hidden');
        otherInput.focus();
      } else {
        otherInput.classList.add('hidden');
        otherInput.value = '';
        if (rememberEl && rememberEl.checked) {
          localStorage.setItem(DONATION_NAME_KEY, nameSelect.value);
        }
      }
    });
  }

  /* Other input: save on type */
  if (otherInput) {
    otherInput.addEventListener('input', () => {
      if (rememberEl && rememberEl.checked && otherInput.value.trim()) {
        localStorage.setItem(DONATION_NAME_KEY, otherInput.value.trim());
      }
    });
  }

  /* First item */
  addDonationItem();

  /* Item list event delegation */
  const itemsList = document.getElementById('donation-items-list');
  if (itemsList) {
    itemsList.addEventListener('input', (e) => {
      const nameInput = e.target.closest('[data-dfname="name"]');
      if (!nameInput) return;
      const id     = nameInput.dataset.dfid;
      const q      = nameInput.value.trim();
      const suggEl = itemsList.querySelector(`[data-dsuggestions="${id}"]`);
      if (!suggEl) return;
      if (!q) { suggEl.classList.add('hidden'); return; }
      const results = searchDonationItems(q);
      if (!results.length) { suggEl.classList.add('hidden'); return; }
      suggEl.innerHTML = results.map(s => `<div class="store-suggestion" role="option" tabindex="-1">${s}</div>`).join('');
      suggEl.classList.remove('hidden');
    });

    itemsList.addEventListener('click', (e) => {
      const suggHit = e.target.closest('.store-suggestion');
      if (suggHit) {
        const suggEl  = suggHit.closest('[data-dsuggestions]');
        const id      = suggEl?.dataset.dsuggestions;
        const nameInput = id ? itemsList.querySelector(`[data-dfid="${id}"][data-dfname="name"]`) : null;
        if (nameInput) { nameInput.value = suggHit.textContent; nameInput.style.borderColor = ''; }
        suggEl?.classList.add('hidden');
        return;
      }
      const typeBtn = e.target.closest('[data-dtype-btn]');
      if (typeBtn) {
        switchDonationItemType(typeBtn.dataset.ditem, typeBtn.dataset.dtypeBtn);
        return;
      }
      const removeBtn = e.target.closest('[data-dremove]');
      if (removeBtn) {
        removeDonationItem(removeBtn.dataset.dremove);
        return;
      }
      const stepperBtn = e.target.closest('.qty-stepper__btn');
      if (stepperBtn) {
        const dfid     = stepperBtn.dataset.dfid;
        const dir      = parseInt(stepperBtn.dataset.dir, 10);
        const qtyInput = itemsList.querySelector(`[data-dfid="${dfid}"][data-dfname="qty"]`);
        if (qtyInput) qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) + dir);
        return;
      }
    });

    itemsList.addEventListener('change', (e) => {
      const reasonSel = e.target.closest('[data-dfname="reason"]');
      if (reasonSel) {
        localStorage.setItem(DONATION_LAST_REASON_KEY, reasonSel.value);
        return;
      }
      const qtyInput = e.target.closest('[data-dfname="qty"]');
      if (qtyInput) {
        const val = parseInt(qtyInput.value, 10);
        if (!val || val < 1) qtyInput.value = 1;
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.store-search-wrap')) {
      document.querySelectorAll('#donation-items-list [data-dsuggestions]').forEach(el => el.classList.add('hidden'));
    }
  });

  document.getElementById('add-donation-item-btn')?.addEventListener('click', addDonationItem);
  document.getElementById('donation-form')?.addEventListener('submit', handleDonationSubmit);
  document.getElementById('donation-submit-another-btn')?.addEventListener('click', resetDonationForm);
}

/* ═══════════════════════════════════════════════════════════
   11. SUBMISSION HISTORY
═══════════════════════════════════════════════════════════ */
function saveToHistory(entry) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  history.unshift({ ...entry, timestamp: new Date().toISOString() });
  if (history.length > 15) history.length = 15;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  if (!submissionHistoryEl) return;
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  if (!history.length) {
    submissionHistoryEl.innerHTML = '<p class="settings-hint">No submissions yet on this device.</p>';
    return;
  }
  const typeColors = { Receipt: '#625636', Credit: '#841b2a', Donation: '#2a6084' };
  submissionHistoryEl.innerHTML = history.map(entry => {
    const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    const color = typeColors[entry.type] || '#555';
    return `
      <div class="settings-card" style="gap:0.25rem;">
        <span class="settings-card__label" style="color:${color};">${entry.type}</span>
        <span class="settings-card__value" style="font-size:0.9rem;">${entry.label}</span>
        <span class="settings-hint" style="margin:0;font-size:0.75rem;">${date}</span>
      </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════
   12. BOOTSTRAP
═══════════════════════════════════════════════════════════ */
function onAppReady() {
  loadPersistedData();
  initCredits();
  initDonations();
  const seg = window.location.pathname.slice(1);
  const initial = VALID_VIEWS.has(seg) ? seg : 'receipts';
  history.replaceState(null, '', '/' + initial);
  navigateTo(initial, false);
}

/* Kick off */
initAuth();
