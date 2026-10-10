/* Route Command — settings, identity, install tip, bookmark guide */
import { $, plural, catalog, confirmDialog, showToast, showTip, dismiss, setPill, getName, APP_VERSION, BUILD, ERROR_KEY, NAME_KEY, RECIPIENT, DEFAULT_VEHICLE_KEY } from './util.js';
import { navigateTo } from './nav.js';
import { outbox, queuedCount } from './outbox.js';
import { updateQueueBadge } from './queue.js';

const resetBtn         = document.getElementById('reset-btn');
const darkModeToggle   = document.getElementById('dark-mode-toggle');
const defaultVehicleEl = document.getElementById('default-vehicle');

export async function initIdentity() {
  const NAMES = await catalog('names');
  const opts = NAMES.map(n => `<option value="${n}">${n}</option>`).join('');
  const gate = document.getElementById('name-gate');
  const gateSel = document.getElementById('name-gate-select');
  const settingsSel = document.getElementById('identity-select');
  gateSel.innerHTML = '<option value="" disabled selected>Select your name</option>' + opts;
  settingsSel.innerHTML = opts;
  document.querySelectorAll('[data-recipient]').forEach(el => { el.textContent = RECIPIENT; });

  const sync = () => { settingsSel.value = getName(); updateQueueBadge(); };
  if (NAMES.includes(getName())) { sync(); showInstallTip(); } else gate.classList.remove('hidden');

  gateSel.addEventListener('change', () => { $('name-gate-error').textContent = ''; });
  document.getElementById('name-gate-submit').addEventListener('click', () => {
    if (!gateSel.value) { $('name-gate-error').textContent = 'Choose your name'; return; }
    localStorage.setItem(NAME_KEY, gateSel.value);
    sync();
    gate.classList.add('hidden');
    showInstallTip();
  });
  settingsSel.addEventListener('change', () => {
    localStorage.setItem(NAME_KEY, settingsSel.value);
    updateQueueBadge();
    showToast(`Submitting as ${settingsSel.value} now`);
  });
}

/* Default vehicle persistence */
if (defaultVehicleEl) {
  defaultVehicleEl.addEventListener('change', () => {
    localStorage.setItem(DEFAULT_VEHICLE_KEY, defaultVehicleEl.value);
    showToast('Default vehicle saved');
    const vehicleTagEl = document.getElementById('vehicle-tag');
    if (vehicleTagEl) vehicleTagEl.value = defaultVehicleEl.value;
  });
}

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
  tip.innerHTML = `<p>Tip: install Route Command on your phone. Open <button type="button" class="tip__link">Settings → Add to home screen</button>.</p>
    <button type="button" class="tip__close" aria-label="Dismiss">×</button>`;
  tip.querySelector('.tip__link').addEventListener('click', () => { navigateTo('settings'); dismiss(tip); });
  tip.querySelector('.tip__close').addEventListener('click', () => dismiss(tip));
  showTip(tip);
  setTimeout(() => dismiss(tip), 8000);   // it's a hint, not a notice
}

$('app-version').textContent = `v${APP_VERSION} · build ${BUILD}`;
$('copy-diagnostics-btn').addEventListener('click', async () => {
  let err = null;
  try { err = JSON.parse(localStorage.getItem(ERROR_KEY)); } catch { /* treat as none */ }
  const text = [
    `Route Command v${APP_VERSION} · build ${BUILD}`,
    `Name: ${getName() || 'not set'}`,
    `Online: ${navigator.onLine ? 'yes' : 'no'}`,
    `Waiting to send: ${await queuedCount().catch(() => '?')}`,
    `Last sent: ${localStorage.getItem('rc_last_synced') || 'never'}`,
    `Last error: ${err ? `${err.at} ${err.message}` : 'none'}`,
    `Installed app: ${isStandalone() ? 'yes' : 'no'}`,
    `Browser: ${navigator.userAgent}`,
  ].join('\n');
  try { await navigator.clipboard.writeText(text); showToast('Diagnostics copied'); } catch { showToast("Couldn't copy"); }
});

if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    const unsent = await queuedCount().catch(() => 0);
    const warning = unsent
      ? `${plural(unsent, 'submission')} ${unsent === 1 ? "hasn't" : "haven't"} sent yet and will be lost. Reset anyway?`
      : 'Reset Route Command? This will clear all saved data and return to the login screen.';
    if (!await confirmDialog(warning, 'Reset', true)) return;
    localStorage.clear();
    await outbox.clear().catch(() => {});
    location.reload();
  });
}

if (darkModeToggle) {
  /* The <head> script already applied the saved or system theme; just sync the toggle */
  darkModeToggle.checked = !document.documentElement.classList.contains('light');

  darkModeToggle.addEventListener('change', () => {
    const dark = darkModeToggle.checked;
    document.querySelector('meta[name=theme-color]').content = dark ? '#0b0b0b' : '#f0f0f0';
    document.documentElement.classList.toggle('light', !dark);
    /* Choosing what the phone already uses means "follow my phone": store nothing, so the theme keeps following it */
    if (dark === !matchMedia('(prefers-color-scheme: light)').matches) localStorage.removeItem('rc_theme');
    else localStorage.setItem('rc_theme', dark ? 'dark' : 'light');
  });
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

export function initBookmarkGuide() {
  let os   = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'ios' : 'android';   // iPadOS 13+ reports as Mac; rare for this app
  let type = 'homescreen';

  const osToggle   = document.getElementById('bookmark-os-toggle');
  const typeToggle = document.getElementById('bookmark-type-toggle');
  osToggle?.querySelectorAll('.pill-toggle__btn').forEach(b => setPill(b, b.dataset.os === os));
  renderBookmarkInstructions(os, type);

  osToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-os]');
    if (!btn) return;
    os = btn.dataset.os;
    osToggle.querySelectorAll('.pill-toggle__btn').forEach(b => setPill(b, b.dataset.os === os));
    renderBookmarkInstructions(os, type);
  });

  typeToggle?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-btype]');
    if (!btn) return;
    type = btn.dataset.btype;
    typeToggle.querySelectorAll('.pill-toggle__btn').forEach(b => setPill(b, b.dataset.btype === type));
    renderBookmarkInstructions(os, type);
  });
}
