/* Route Command — shared constants and helpers */
export const AUTH_KEY             = 'rc_auth';
export const NAME_KEY             = 'rc_employee_name';
export const RECIPIENT            = 'Ian';   // who receives receipts and credit requests
export const APP_VERSION = '1.4';
/* Short commit hash, injected by esbuild --define at deploy time; 'dev' when running unbundled */
export const BUILD = typeof __BUILD__ === 'undefined' ? 'dev' : __BUILD__.slice(0, 7);
export const ERROR_KEY = 'rc_last_error';
export const getName = () => localStorage.getItem(NAME_KEY) || '';
export const DEFAULT_VEHICLE_KEY  = 'rc_default_vehicle';
export const HISTORY_KEY          = 'rc_history';

/* Catalog (names, stores, donation items) lives in data.json; fetched on first use, then cached by the service worker */
let dataPromise = null;
export function loadData() {
  dataPromise = dataPromise || fetch('/data.json').then(r => r.json()).catch(err => { dataPromise = null; throw err; });
  return dataPromise;
}
export const catalog = (key) => loadData().then(d => d[key], () => []);

export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
/* Local YYYY-MM-DD (toISOString would give the UTC date, which is tomorrow after ~5pm Pacific) */
export const today = () => new Date().toLocaleDateString('en-CA');
/* Submit buttons say what will happen: sent now, or saved for later when offline */
export const submitLabel = (btn) => navigator.onLine ? btn.dataset.label : 'Save for later (offline)';
/* Unique per submission: lets the server recognise a resend of something it already saved */
export const newId = () => crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`;

/* Inline field errors: red border, message under the field, aria-invalid. Cleared when the user edits the field.
   Returns false so callers can do `valid = markInvalid(el, 'message')`. */
let errorSeq = 0;

export function clearInvalid(el) {
  el.classList.remove('is-invalid');
  el.removeAttribute('aria-invalid');
  el.removeAttribute('aria-describedby');
  if (el._err) el._err.remove();
  if (el._onEdit) ['input', 'change'].forEach(ev => el.removeEventListener(ev, el._onEdit));
  el._err = el._onEdit = null;
}

export function markInvalid(el, message) {
  clearInvalid(el);
  el.classList.add('is-invalid');
  el.setAttribute('aria-invalid', 'true');

  /* Put the message after the whole control */
  let anchor = el.closest('.store-search-wrap, .input-prefix, .qty-stepper') || el;
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
export function focusFirstInvalid(formEl) {
  const el = formEl.querySelector('.is-invalid');
  if (!el) return;
  el.scrollIntoView({ block: 'center' });
  el.focus({ preventScroll: true });
}

/* POST JSON with a timeout, so a stalled server call can't hang the button forever */
const FETCH_TIMEOUT_MS = 20000;
export async function postJSON(endpoint, payload) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  ctrl.signal,
    });
    /* A gateway or Google HTML error page isn't JSON: report it as a normal server error */
    return await res.json().catch(() => ({ status: 'error', message: 'The server sent an unexpected reply. Try again in a minute.' }));
  } finally {
    clearTimeout(timer);
  }
}

/* Remembered for the Settings "Copy diagnostics" button */
export function recordError(message) {
  try { localStorage.setItem(ERROR_KEY, JSON.stringify({ at: new Date().toISOString(), message: String(message) })); } catch { /* storage full */ }
}

/* fetch() rejects with a TypeError ("Failed to fetch") when offline; a timeout aborts it */
export const isNetworkError = (err) => err.name === 'TypeError' || err.name === 'AbortError' || !navigator.onLine;

/* In-app replacement for confirm(): resolves true on OK, false on Cancel, Escape, or a tap outside */
export function confirmDialog(message, okLabel = 'Continue', danger = false) {
  return new Promise(resolve => {
    const parts = [$('confirm-overlay'), $('confirm-modal')];
    const ok = $('confirm-ok');
    const ctl = new AbortController();
    const done = (v) => { parts.forEach(p => p.classList.add('hidden')); ctl.abort(); resolve(v); };
    $('confirm-message').textContent = message;
    ok.textContent = okLabel;
    ok.classList.toggle('btn--danger-outline', danger);
    ok.classList.toggle('btn--gold', !danger);
    parts.forEach(p => p.classList.remove('hidden'));
    (danger ? $('confirm-cancel') : ok).focus();   // a stray Enter must not hit the destructive button
    const on = { signal: ctl.signal };
    ok.addEventListener('click', () => done(true), on);
    $('confirm-cancel').addEventListener('click', () => done(false), on);
    $('confirm-overlay').addEventListener('click', () => done(false), on);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(false); }, on);
  });
}

let toastTimer;
export function showToast(message) {
  const t = $('toast');
  t.textContent = message;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 4000);
}
